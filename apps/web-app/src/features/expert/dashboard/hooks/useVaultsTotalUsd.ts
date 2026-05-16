"use client";

import { useMemo } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Client as DefindexVaultClient } from "@neko/defindex-vault";
import {
  rpcUrl,
  networkPassphrase,
  allowHttpForSoroban,
} from "@/lib/constants/network";
import { fromSmallestUnit } from "@/lib/helpers/tokenUtils";
import { formatLiquidity } from "@/lib/helpers/formatUtils";
import { stellarPriceService } from "@/lib/services/stellar-price.service";
import { useDashboardVaultPositions } from "./useDashboardVaultPositions";
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

  // Same queryKey as useVaultData → cache hit when VaultPositionsTable already loaded them.
  const vaultDataQueries = useQueries({
    queries: positions.map(({ vault }) => ({
      queryKey: ["vaultData", vault.id],
      queryFn: () => fetchVaultLiveStats(vault.id),
      staleTime: 5 * 60_000,
      gcTime: 15 * 60_000,
      refetchInterval: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: false,
      throwOnError: false,
    })),
  });

  const uniqueSymbols = useMemo(
    () => [...new Set(positions.map((p) => p.vault.supplyAsset.symbol))].sort(),
    [positions]
  );

  const priceQuery = useQuery<Record<string, number>>({
    queryKey: ["vault-asset-prices-total", uniqueSymbols.join(",")],
    queryFn: async () => {
      const entries = await Promise.all(
        uniqueSymbols.map(async (symbol) => {
          const price = await stellarPriceService.getPrice(symbol);
          return [symbol, price] as const;
        })
      );
      return Object.fromEntries(entries);
    },
    enabled: uniqueSymbols.length > 0,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const priceMap = priceQuery.data ?? {};

  const totalUsd = useMemo(() => {
    return positions.reduce((sum, { vault, userShares }, i) => {
      const pricePerShare = vaultDataQueries[i]?.data?.pricePerShare;
      if (!pricePerShare || userShares === 0n) return sum;
      const underlyingStroops = (userShares * pricePerShare) / ONE_SHARE;
      const underlyingAmount = parseFloat(
        fromSmallestUnit(underlyingStroops.toString(), 7)
      );
      const price = priceMap[vault.supplyAsset.symbol] ?? 0;
      return sum + underlyingAmount * price;
    }, 0);
  }, [positions, vaultDataQueries, priceMap]);

  const isLoading =
    isLoadingPositions ||
    (positions.length > 0 && vaultDataQueries.some((q) => q.isLoading)) ||
    (uniqueSymbols.length > 0 && priceQuery.isLoading);

  return { totalUsd, isLoading };
}
