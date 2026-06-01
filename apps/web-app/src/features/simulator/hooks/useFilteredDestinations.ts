"use client";

import { useMemo } from "react";
import { usePools } from "@/lib/orchestrator/hooks/usePools";
import { useDefindexVaults } from "@/features/shared/vault/hooks/useDefindexVaults";
import { getAssetsConfig } from "@/lib/constants/assets.config";
import { getAssetTaxonomy } from "@/features/shared/discover/utils/assetClass";
import { fromSmallestUnit } from "@/lib/helpers/tokenUtils";
import {
  getPoolProtocolLabel,
  getPoolStrategyLabels,
  getVaultProtocolLabel,
  getVaultStrategyLabels,
  getYieldTokenHoldExplanation,
  getYieldTokenStrategyLabel,
} from "../utils/strategyLabels";
import type {
  SimulatorDestination,
  SimulatorToken,
} from "../types/simulator.types";
import {
  ETHERFUSE_BOND_SYMBOLS,
  type EtherfuseBondSymbol,
} from "../constants/etherfuseBonds";
import { resolveEtherfuseBondApy } from "../utils/etherfuseBondApy";
import { useEtherfuseYields } from "./useEtherfuseYields";

export { ETHERFUSE_BOND_SYMBOLS } from "../constants/etherfuseBonds";
export { resolveEtherfuseBondApy } from "../utils/etherfuseBondApy";

function safeNumber(value: number | string | undefined | null): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function bondSymbolsForSelectedToken(code: string): EtherfuseBondSymbol[] {
  const upper = code.toUpperCase();
  if ((ETHERFUSE_BOND_SYMBOLS as readonly string[]).includes(upper)) {
    return [upper as EtherfuseBondSymbol];
  }

  const taxonomy = getAssetTaxonomy(upper);
  if (taxonomy?.class === "stablecoin" && upper !== "USDY") {
    return [...ETHERFUSE_BOND_SYMBOLS];
  }

  return [];
}

export function isEtherfuseBondToken(code: string): boolean {
  return (ETHERFUSE_BOND_SYMBOLS as readonly string[]).includes(
    code.toUpperCase()
  );
}

/**
 * Filters pools, vaults, and Etherfuse yield tokens for the simulator by
 * selected token (step 1).
 */
export function useFilteredDestinations(token: SimulatorToken | null) {
  const pools = usePools(Boolean(token));
  const vaults = useDefindexVaults();
  const yieldsQuery = useEtherfuseYields();
  const yieldsData = yieldsQuery.data;

  const result = useMemo<{
    pools: SimulatorDestination[];
    vaults: SimulatorDestination[];
    yieldTokens: SimulatorDestination[];
  }>(() => {
    if (!token) return { pools: [], vaults: [], yieldTokens: [] };

    const orchestratorPools: SimulatorDestination[] = (pools.data ?? [])
      .filter((pool) => pool.tokens.some((t) => t.code === token.code))
      .map((pool) => {
        const decimals = pool.tokens[0]?.decimals ?? 7;
        const tvlNumber = safeNumber(
          fromSmallestUnit(pool.tvl.toString(), decimals)
        );
        return {
          kind: "pool" as const,
          id: pool.id,
          name: pool.name,
          apy: typeof pool.apy === "number" ? pool.apy : null,
          tvlUsd: tvlNumber,
          tvlLabel: tvlNumber.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
            notation: "compact",
            maximumFractionDigits: 2,
          }),
          protocol: getPoolProtocolLabel(pool),
          strategyLabels: getPoolStrategyLabels(pool),
          acceptedTokenCodes: pool.tokens.map((t) => t.code),
          blndEmissionsApy:
            pool.type === "blend" &&
            typeof pool.metadata.emissionsApy === "number" &&
            pool.metadata.emissionsApy > 0
              ? pool.metadata.emissionsApy
              : null,
          raw: pool,
        };
      });

    const matchingPools = orchestratorPools;

    const matchingVaults: SimulatorDestination[] = (vaults.data?.vaults ?? [])
      .filter((vault) => vault.supplyAsset.symbol === token.code)
      .map((vault) => ({
        kind: "vault" as const,
        id: vault.id,
        name: vault.name,
        apy: null,
        tvlUsd: null,
        tvlLabel: vault.tvl,
        protocol: getVaultProtocolLabel(vault),
        strategyLabels: getVaultStrategyLabels(vault),
        acceptedTokenCodes: [vault.supplyAsset.symbol],
        raw: vault,
      }));

    const assets = getAssetsConfig();
    const wantSymbols = bondSymbolsForSelectedToken(token.code);

    const yieldTokens: SimulatorDestination[] = [];

    for (const symbol of wantSymbols) {
      const cfg = assets[symbol];
      if (!cfg) continue;

      const resolved = resolveEtherfuseBondApy(symbol, yieldsData);
      if (!resolved) continue;

      const { apy, isFallback: isFallbackApy, bondCurrency } = resolved;

      yieldTokens.push({
        kind: "yield-token",
        id: cfg.contract,
        name: cfg.name,
        apy,
        tvlUsd: null,
        tvlLabel: "",
        protocol: "Sovereign Bond",
        strategyLabels: [
          getYieldTokenStrategyLabel(symbol),
          getYieldTokenHoldExplanation(symbol),
        ],
        acceptedTokenCodes: [symbol],
        raw: null,
        bondCurrency,
        bondIcon: cfg.icon,
        bondSymbol: symbol,
        isFallbackApy,
      });
    }

    return { pools: matchingPools, vaults: matchingVaults, yieldTokens };
  }, [token, pools.data, vaults.data, yieldsData]);

  return {
    ...result,
    isLoading: pools.isLoading || vaults.isLoading || yieldsQuery.isPending,
  };
}
