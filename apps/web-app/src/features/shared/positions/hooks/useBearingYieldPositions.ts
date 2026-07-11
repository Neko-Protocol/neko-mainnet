"use client";

import { useQueries } from "@tanstack/react-query";
import { useWallet } from "@/hooks/useWallet";
import { getTokenBalanceFromContract } from "@/lib/helpers/stellar/sorobanBalance";
import { getAssetsConfig } from "@/lib/constants/assets.config";
import type { AssetConfig } from "@/lib/constants/assets.config";
import type { VaultPositionEntry } from "./useDashboardVaultPositions";

const BEARING_YIELD_CODES = ["CETES", "USTRY", "TESOURO", "USDY"] as const;
const BEARING_YIELD_SET = new Set<string>(BEARING_YIELD_CODES);

export type BearingYieldPosition =
  | { source: "wallet"; asset: AssetConfig; balance: string }
  | { source: "vault"; asset: AssetConfig; vaultEntry: VaultPositionEntry };

export function useBearingYieldPositions(
  vaultPositions: VaultPositionEntry[] = []
) {
  const { address } = useWallet();
  const available = getAssetsConfig();

  const assets = BEARING_YIELD_CODES.map((code) => available[code]).filter(
    (a): a is AssetConfig => Boolean(a)
  );

  const queries = useQueries({
    queries: assets.map((asset) => ({
      queryKey: ["bearingYieldBalance", asset.code, address],
      queryFn: () =>
        getTokenBalanceFromContract(asset.contract, address!, asset.decimals),
      enabled: Boolean(address),
      staleTime: 2 * 60_000,
      refetchInterval: 3 * 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
      throwOnError: false,
    })),
  });

  const positions: BearingYieldPosition[] = [];

  // Direct wallet balances
  queries.forEach((q, i) => {
    const balance = q.data ?? "0";
    if (parseFloat(balance) > 0 && assets[i]) {
      positions.push({ source: "wallet", asset: assets[i], balance });
    }
  });

  // Vault positions whose underlying asset is a bearing yield token
  for (const entry of vaultPositions) {
    const symbol = entry.vault.supplyAsset.symbol;
    if (!BEARING_YIELD_SET.has(symbol)) continue;
    const asset = available[symbol];
    if (asset) {
      positions.push({ source: "vault", asset, vaultEntry: entry });
    }
  }

  const isLoading = Boolean(address) && queries.some((q) => q.isLoading);

  return { positions, isLoading, hasWallet: Boolean(address) };
}
