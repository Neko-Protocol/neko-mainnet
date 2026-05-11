"use client";

import { useMemo } from "react";
import { usePools } from "@/lib/orchestrator/hooks/usePools";
import { useDefindexVaults } from "@/features/shared/vault/hooks/useDefindexVaults";
import { getAssetsConfig } from "@/lib/constants/assets.config";
import { useWallet } from "@/hooks/useWallet";
import { getTokenIcon } from "@/lib/helpers/tokenUtils";
import type { MappedBalances } from "@/lib/helpers/stellar/wallet";
import type { SimulatorToken } from "../types/simulator.types";

function parseBalanceString(raw: string | undefined): number {
  if (!raw) return 0;
  const parsed = parseFloat(raw.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Mirrors `getHoldingsAmount` in features/swap/components/ui/TokenSelectorModal.tsx. */
function getHoldingsAmount(balances: MappedBalances, code: string): number {
  if (code === "XLM" && balances.xlm) {
    return parseBalanceString(balances.xlm.balance);
  }
  const soroban = balances[`soroban:${code}`];
  if (soroban?.balance) {
    return parseBalanceString(String(soroban.balance));
  }
  for (const [key, entry] of Object.entries(balances)) {
    if (key.startsWith(`${code}:`) && entry.balance) {
      return parseBalanceString(String(entry.balance));
    }
  }
  return 0;
}

interface TokenAccumulator {
  code: string;
  name: string;
  contract?: string;
}

/**
 * Derives the unique set of tokens that the simulator can suggest, drawn from
 * the union of pool-supported tokens and vault supply assets, plus user
 * holdings when a wallet is connected.
 */
export function useSimulatorTokens() {
  const pools = usePools();
  const vaults = useDefindexVaults();
  const { address, balances } = useWallet();

  const isLoading = pools.isLoading || vaults.isLoading;

  const tokens = useMemo<SimulatorToken[]>(() => {
    const acc = new Map<string, TokenAccumulator>();

    for (const pool of pools.data ?? []) {
      for (const token of pool.tokens) {
        const existing = acc.get(token.code);
        if (!existing) {
          acc.set(token.code, {
            code: token.code,
            name: token.name || token.code,
            contract: token.address,
          });
        } else if (!existing.contract && token.address) {
          existing.contract = token.address;
        }
      }
    }

    for (const vault of vaults.data?.vaults ?? []) {
      const code = vault.supplyAsset.symbol;
      if (!code) continue;
      const existing = acc.get(code);
      if (!existing) {
        acc.set(code, {
          code,
          name: vault.supplyAsset.name || code,
          contract: vault.supplyAsset.contractAddress,
        });
      } else if (!existing.contract && vault.supplyAsset.contractAddress) {
        existing.contract = vault.supplyAsset.contractAddress;
      }
    }

    const assets = getAssetsConfig();
    for (const sym of ["CETES", "USTRY", "TESOURO"] as const) {
      const cfg = assets[sym];
      if (!cfg || acc.has(sym)) continue;
      acc.set(sym, {
        code: cfg.code,
        name: cfg.name,
        contract: cfg.contract,
      });
    }

    const hasWallet = Boolean(address);

    return Array.from(acc.values())
      .map<SimulatorToken>((entry) => ({
        code: entry.code,
        name: entry.name,
        iconSrc:
          getTokenIcon(entry.code) ??
          (entry.contract ? getTokenIcon(entry.contract) : null),
        contract: entry.contract,
        balance: hasWallet ? getHoldingsAmount(balances, entry.code) : 0,
        hasWallet,
      }))
      .sort((a, b) => {
        if (a.balance !== b.balance) return b.balance - a.balance;
        return a.code.localeCompare(b.code);
      });
  }, [pools.data, vaults.data, address, balances]);

  return { tokens, isLoading };
}
