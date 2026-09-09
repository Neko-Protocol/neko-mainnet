import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Client as DefindexVaultClient } from "@neko/defindex-vault";
import {
  rpcUrl,
  networkPassphrase,
  allowHttpForSoroban,
} from "@/lib/constants/network";
import { fromSmallestUnit } from "@neko/orchestrator";
import { auditService } from "@/lib/services/audit.service";
import { useWallet } from "@/hooks/useWallet";
import type { AuditLog } from "@/lib/types/audit.types";
import type { VaultView, VaultLiveStats } from "../types/vault";

const ONE_SHARE = 1_000_000_000_000n;

/**
 * Calculates net deposited for the CURRENT session only.
 * A new session starts whenever a withdrawal drains the position to ~0
 * (i.e. the user withdrew everything, including accrued interest).
 * This ensures earnings reset after a full withdraw + re-deposit cycle.
 */
export function computeCurrentVaultSession(logs: AuditLog[]): {
  netDeposited: number;
  hasData: boolean;
  startedAt: number | null;
} {
  const sorted = [...logs].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  let sessionDeposited = 0;
  let sessionWithdrawn = 0;
  let pendingReset = false;
  let startedAt: number | null = null;

  for (const log of sorted) {
    if (log.action_type === "vaults_deposit") {
      if (pendingReset) {
        sessionDeposited = 0;
        sessionWithdrawn = 0;
        pendingReset = false;
        startedAt = null;
      }
      if (startedAt == null) startedAt = new Date(log.created_at).getTime();
      sessionDeposited += log.token_amount_in ?? 0;
    } else if (log.action_type === "vaults_withdraw") {
      sessionWithdrawn += log.amount_out ?? 0;
      // If withdrawn >= deposited (with tiny tolerance), position is fully drained
      if (sessionWithdrawn >= sessionDeposited - 0.001) {
        pendingReset = true;
      }
    }
    // vaults_claim_earnings: only earnings are taken out — principal stays intact
    // (no changes to sessionDeposited/sessionWithdrawn)
  }

  return {
    netDeposited: Math.max(0, sessionDeposited - sessionWithdrawn),
    hasData: sessionDeposited > 0,
    startedAt,
  };
}

type SdkResultLike = {
  unwrap?: () => unknown;
  tag?: string;
  value?: unknown;
};

function unwrapResult<T>(result: unknown, fallback: T): T {
  if (result === null || result === undefined) return fallback;
  const r = result as SdkResultLike;
  if (typeof r.unwrap === "function") {
    try {
      return r.unwrap() as T;
    } catch {
      return fallback;
    }
  }
  if (r.tag === "ok") return r.value as T;
  return result as T;
}

export interface VaultEarning {
  vaultId: string;
  vaultName: string;
  assetSymbol: string;
  currentValueTokens: number;
  netDepositedTokens: number;
  earningsTokens: number;
  hasAuditData: boolean;
}

export interface VaultEarningsCardData {
  perVault: VaultEarning[];
  totalEarningsByAsset: Record<string, number>;
  totalDepositedByAsset: Record<string, number>;
  totalValueByAsset: Record<string, number>;
  isLoading: boolean;
  hasAnyAuditData: boolean;
}

export function useVaultEarningsCard(
  positionVaults: VaultView[],
  userBalances: Record<string, bigint>
): VaultEarningsCardData {
  const { address } = useWallet();

  // Uses same queryKey as useVaultData — hits TanStack cache from row-level calls
  const vaultDataQueries = useQueries({
    queries: positionVaults.map((v) => ({
      queryKey: ["vaultData", v.id],
      queryFn: async (): Promise<VaultLiveStats & { tvlFormatted: string }> => {
        const client = new DefindexVaultClient({
          contractId: v.id,
          rpcUrl,
          networkPassphrase,
          ...(address && { publicKey: address }),
          ...(allowHttpForSoroban && { allowHttp: true }),
        });
        const [totalManagedTx, totalSupplyTx] = await Promise.all([
          client.fetch_total_managed_funds({ simulate: true }),
          client.total_supply({ simulate: true }),
        ]);
        const allocations = unwrapResult<Array<{ total_amount: bigint }>>(
          totalManagedTx.result,
          []
        );
        const tvl =
          allocations.length > 0
            ? BigInt(allocations[0].total_amount.toString())
            : 0n;
        const totalShares = BigInt(totalSupplyTx.result?.toString() ?? "0");
        const pricePerShare =
          totalShares > 0n ? (tvl * ONE_SHARE) / totalShares : 0n;
        return { tvl, totalShares, pricePerShare, tvlFormatted: "" };
      },
      staleTime: 5 * 60_000,
      gcTime: 15 * 60_000,
      refetchInterval: 60_000,
      refetchOnWindowFocus: true,
      retry: false,
      throwOnError: false,
      enabled: !!v.id,
    })),
  });

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ["vaultAuditActivity", address],
    queryFn: () => auditService.getVaultActivity(address!),
    enabled: !!address,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });

  const isLoading = logsLoading || vaultDataQueries.some((q) => q.isLoading);

  const result = useMemo(() => {
    const perVault: VaultEarning[] = [];
    const totalEarningsByAsset: Record<string, number> = {};
    const totalDepositedByAsset: Record<string, number> = {};
    const totalValueByAsset: Record<string, number> = {};
    let hasAnyAuditData = false;

    positionVaults.forEach((vault, idx) => {
      const shares = userBalances[vault.id] ?? 0n;
      const vaultData = vaultDataQueries[idx]?.data;
      if (!vaultData?.pricePerShare || shares === 0n) return;

      const underlyingStroops = (shares * vaultData.pricePerShare) / ONE_SHARE;
      const currentValueTokens = parseFloat(
        fromSmallestUnit(underlyingStroops.toString(), 7)
      );

      const vaultLogs = (logs ?? []).filter(
        (l) =>
          l.pool_id === vault.id &&
          (l.action_type === "vaults_deposit" ||
            l.action_type === "vaults_withdraw" ||
            l.action_type === "vaults_claim_earnings")
      );

      const { netDeposited: netDepositedTokens, hasData } =
        computeCurrentVaultSession(vaultLogs);

      const hasAuditData = hasData;
      const earningsTokens = hasAuditData
        ? currentValueTokens - netDepositedTokens
        : 0;

      const sym = vault.supplyAsset.symbol;

      perVault.push({
        vaultId: vault.id,
        vaultName: vault.name,
        assetSymbol: sym,
        currentValueTokens,
        netDepositedTokens,
        earningsTokens,
        hasAuditData,
      });

      totalValueByAsset[sym] =
        (totalValueByAsset[sym] ?? 0) + currentValueTokens;

      if (hasAuditData) {
        hasAnyAuditData = true;
        totalEarningsByAsset[sym] =
          (totalEarningsByAsset[sym] ?? 0) + earningsTokens;
        totalDepositedByAsset[sym] =
          (totalDepositedByAsset[sym] ?? 0) + netDepositedTokens;
      }
    });

    return {
      perVault,
      totalEarningsByAsset,
      totalDepositedByAsset,
      totalValueByAsset,
      hasAnyAuditData,
    };
  }, [positionVaults, userBalances, vaultDataQueries, logs]);

  return { ...result, isLoading };
}
