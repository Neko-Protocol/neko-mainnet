"use client";

import { useMemo } from "react";
import { usePools } from "@/lib/orchestrator/hooks/usePools";
import { useLendingPools } from "@/features/shared/lending/hooks/useLendingPools";
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
  useEtherfuseYields,
  type EtherfuseYieldEntry,
} from "./useEtherfuseYields";

export const ETHERFUSE_BOND_SYMBOLS = [
  "CETES",
  "USTRY",
  "TESOURO",
  "KTB",
] as const;

type EtherfuseBondSymbol = (typeof ETHERFUSE_BOND_SYMBOLS)[number];

const FALLBACK_APY: Record<EtherfuseBondSymbol, number> = {
  CETES: 9.5,
  USTRY: 4.8,
  TESOURO: 13.5,
  KTB: 3.5,
};

const FALLBACK_CURRENCY: Record<EtherfuseBondSymbol, string> = {
  CETES: "MXN",
  USTRY: "USD",
  TESOURO: "BRL",
  KTB: "KRW",
};

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
 * Resolved sovereign-bond APR and denomination for a bond symbol (CETES,
 * USTRY, etc.). Returns null if `symbol` is not an Etherfuse bond code.
 */
export function resolveEtherfuseBondApy(
  symbol: string,
  yieldsData: EtherfuseYieldEntry[] | undefined
): { apy: number; isFallback: boolean; bondCurrency: string } | null {
  const upper = symbol.toUpperCase();
  if (!(ETHERFUSE_BOND_SYMBOLS as readonly string[]).includes(upper)) {
    return null;
  }
  const bond = upper as EtherfuseBondSymbol;
  const entry = yieldsData?.find(
    (y) => y.symbol.toUpperCase() === bond.toUpperCase()
  );
  const apy =
    entry && typeof entry.apy === "number" && Number.isFinite(entry.apy)
      ? entry.apy
      : FALLBACK_APY[bond];
  const bondCurrency = entry?.currency?.trim() || FALLBACK_CURRENCY[bond];
  const isFallback = Boolean(
    entry?.isFallback ||
    !entry ||
    typeof entry.apy !== "number" ||
    !Number.isFinite(entry.apy)
  );
  return { apy, isFallback, bondCurrency };
}

/**
 * Filters pools, vaults, and Etherfuse yield tokens for the simulator by
 * selected token (step 1).
 */
export function useFilteredDestinations(token: SimulatorToken | null) {
  const pools = usePools(Boolean(token));
  const lendingPoolsQuery = useLendingPools();
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

    const lendingAsPools: SimulatorDestination[] = (
      lendingPoolsQuery.data ?? []
    )
      .filter((lp) => lp.assetCode === token.code && lp.isActive)
      .map((lp) => {
        const deposited = parseFloat(lp.poolBalance);
        const tvlUsd = Number.isFinite(deposited) ? deposited : null;
        const tvlLabel = Number.isFinite(deposited)
          ? `${deposited.toLocaleString("en-US", {
              maximumFractionDigits: 2,
            })} ${lp.assetCode}`
          : "";
        const apy = Number.isFinite(lp.interestRate) ? lp.interestRate : null;
        return {
          kind: "pool" as const,
          id: `lending:${lp.contractId}:${lp.assetCode}`,
          name: `${lp.assetCode} Pool`,
          apy,
          tvlUsd,
          tvlLabel,
          protocol: "Neko Lending",
          strategyLabels: [
            "Supply to Neko on-chain lending and earn interest on deposits",
          ],
          acceptedTokenCodes: [lp.assetCode],
          raw: null,
          lendingContractId: lp.contractId,
          lendingAssetCode: lp.assetCode,
        };
      });

    const matchingPools = [...orchestratorPools, ...lendingAsPools];

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
  }, [token, pools.data, lendingPoolsQuery.data, vaults.data, yieldsData]);

  return {
    ...result,
    isLoading:
      pools.isLoading ||
      vaults.isLoading ||
      yieldsQuery.isPending ||
      lendingPoolsQuery.isPending,
  };
}
