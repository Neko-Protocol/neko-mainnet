"use client";

import { useMemo } from "react";
import { useWallet } from "@/hooks/useWallet";
import { getAssetsConfig } from "@/lib/constants/assets.config";
import type { AssetConfig } from "@/lib/constants/assets.config";
import { parseBalance } from "@/lib/helpers/formatUtils";
import type { VaultPositionEntry } from "./useDashboardVaultPositions";

const BEARING_YIELD_CODES = ["CETES", "USTRY", "TESOURO", "USDY"] as const;
const BEARING_YIELD_SET = new Set<string>(BEARING_YIELD_CODES);

export type BearingYieldPosition =
  | { source: "wallet"; asset: AssetConfig; balance: string }
  | { source: "vault"; asset: AssetConfig; vaultEntry: VaultPositionEntry };

export function useBearingYieldPositions(
  vaultPositions: VaultPositionEntry[] = []
) {
  const { address, balances, isFetchingBalances } = useWallet();
  const available = getAssetsConfig();

  const assets = BEARING_YIELD_CODES.map((code) => available[code]).filter(
    (a): a is AssetConfig => Boolean(a)
  );

  /**
   * Read from the wallet's balances rather than fetching these four again.
   *
   * `fetchBalances` already loads the account once and simulates every token
   * in the same asset catalogue this hook reads from — these four included —
   * so asking for them separately re-fetched numbers already in hand. Worse,
   * the single-token helper loads the account on every call, so four assets
   * cost four Horizon loads of the same account plus four simulates on top of
   * what the wallet had already done.
   */
  const walletBalanceByCode = useMemo(() => {
    const map: Record<string, string> = {};
    for (const entry of Object.values(balances)) {
      if (!("asset_code" in entry) || !entry.asset_code) continue;
      if (!BEARING_YIELD_SET.has(entry.asset_code)) continue;
      map[entry.asset_code] = entry.balance;
    }
    return map;
  }, [balances]);

  const positions = useMemo(() => {
    const out: BearingYieldPosition[] = [];

    // Direct wallet balances
    for (const asset of assets) {
      const balance = walletBalanceByCode[asset.code];
      if (balance && parseBalance(balance) > 0) {
        out.push({ source: "wallet", asset, balance });
      }
    }

    // Vault positions whose underlying asset is a bearing yield token
    for (const entry of vaultPositions) {
      const symbol = entry.vault.supplyAsset.symbol;
      if (!BEARING_YIELD_SET.has(symbol)) continue;
      const asset = available[symbol];
      if (asset) {
        out.push({ source: "vault", asset, vaultEntry: entry });
      }
    }

    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletBalanceByCode, vaultPositions, available]);

  return {
    positions,
    isLoading: Boolean(address) && isFetchingBalances,
    hasWallet: Boolean(address),
  };
}
