"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { Client as DefindexVaultClient } from "@neko/defindex-vault";
import {
  rpcUrl,
  networkPassphrase,
  allowHttpForSoroban,
} from "@/lib/constants/network";
import { fromSmallestUnit } from "@/lib/helpers/tokenUtils";
import { formatLiquidity } from "@/lib/helpers/formatUtils";
import {
  stellarPriceService,
  type PricedResult,
} from "@/lib/services/stellar-price.service";
import { getAssetsConfig } from "@/lib/constants/assets.config";
import { useDashboardVaultPositions } from "./useDashboardVaultPositions";
import { USE_BACKEND_DASHBOARD } from "./useBackendDashboardPositions";
import type { VaultLiveStats } from "@/features/shared/vault/types/vault";

const ONE_SHARE = 1_000_000_000_000n;

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

// Shared queryFn — identical return type to useVaultData so React Query cache is shared.
async function fetchVaultLiveStats(
  contractId: string
): Promise<VaultLiveStats & { tvlFormatted: string }> {
  const client = new DefindexVaultClient({
    contractId,
    rpcUrl,
    networkPassphrase,
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
  const pricePerShare = totalShares > 0n ? (tvl * ONE_SHARE) / totalShares : 0n;
  const tvlFormatted = formatLiquidity(
    Number(fromSmallestUnit(tvl.toString(), 7))
  );
  return { tvl, totalShares, pricePerShare, tvlFormatted };
}

export function useVaultsTotalUsd() {
  const { positions, isLoading: isLoadingPositions } =
    useDashboardVaultPositions();

  // Build a stable symbol→contractAddress map using the canonical assets config
  // as the primary source (same as useTokenPrice), so Soroswap can price
  // assets like CETES/USTRY even when DeFindex leaves contractAddress empty.
  const uniqueAssets = useMemo(() => {
    const assetsConfig = getAssetsConfig();
    const map = new Map<string, string | undefined>();
    for (const { vault } of positions) {
      const { symbol, contractAddress } = vault.supplyAsset;
      if (!map.has(symbol)) {
        const canonicalContract =
          assetsConfig[symbol]?.contract || contractAddress || undefined;
        map.set(symbol, canonicalContract);
      }
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [positions]);

  const uniqueSymbols = useMemo(
    () => uniqueAssets.map(([s]) => s),
    [uniqueAssets]
  );

  // Shares ["vaultData", id] with useVaultData (vault table), so this reads from a
  // populated cache. Acts as fallback when backend pricePerShare comes back 0n.
  const vaultDataQueries = useQueries({
    queries: positions.map(({ vault }, i) => ({
      queryKey: ["vaultData", vault.id],
      queryFn: async () => {
        if (i > 0) await new Promise((r) => setTimeout(r, i * 400));
        return fetchVaultLiveStats(vault.id);
      },
      enabled: true,
      staleTime: 5 * 60_000,
      gcTime: 15 * 60_000,
      refetchInterval: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: false,
      throwOnError: false,
    })),
  });

  // Per-symbol queries using the same queryKey as useTokenPrice so the cache is
  // shared. Pass the canonical contractAddress so Soroswap can price assets like
  // CETES/USTRY even when DeFindex leaves contractAddress empty.
  const priceQueries = useQueries({
    queries: uniqueAssets.map(([symbol, contractAddress]) => ({
      queryKey: ["tokenPrice", symbol] as const,
      queryFn: (): Promise<PricedResult> =>
        stellarPriceService.getPriceWithSource(symbol, contractAddress),
      enabled: uniqueSymbols.length > 0,
      staleTime: 2 * 60_000,
      refetchInterval: 3 * 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: 2,
      throwOnError: false,
    })),
  });

  const priceMap = useMemo(() => {
    const map: Record<string, number> = {};
    uniqueAssets.forEach(([symbol], i) => {
      const price = priceQueries[i]?.data?.price ?? 0;
      if (price > 0) map[symbol] = price;
    });
    return map;
  }, [uniqueAssets, priceQueries]);

  const totalUsd = useMemo(() => {
    return positions.reduce(
      (sum, { vault, userShares, pricePerShare: backendPPS }, i) => {
        const backendPPSValue = USE_BACKEND_DASHBOARD ? (backendPPS ?? 0n) : 0n;
        const pricePerShare =
          USE_BACKEND_DASHBOARD && backendPPSValue > 0n
            ? backendPPSValue
            : vaultDataQueries[i]?.data?.pricePerShare;
        if (!pricePerShare || userShares === 0n) return sum;
        const underlyingStroops = (userShares * pricePerShare) / ONE_SHARE;
        const underlyingAmount = parseFloat(
          fromSmallestUnit(underlyingStroops.toString(), 7)
        );
        const price = priceMap[vault.supplyAsset.symbol] ?? 0;
        const vaultUsd = underlyingAmount * price;
        return sum + vaultUsd;
      },
      0
    );
  }, [positions, vaultDataQueries, priceMap]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading =
    isLoadingPositions ||
    (positions.length > 0 && vaultDataQueries.some((q) => q.isLoading)) ||
    (uniqueSymbols.length > 0 && priceQueries.some((q) => q.isLoading));

  return { totalUsd, isLoading };
}
