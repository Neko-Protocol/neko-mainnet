import type { PoolInfo } from "@/lib/orchestrator/types/pool.types";
import type { VaultView } from "@/features/shared/vault/types/vault";
import { getAssetsConfig } from "@/lib/constants/assets.config";
import { fromSmallestUnit } from "@neko-protocol/orchestrator";
import {
  getPoolProtocolLabel,
  getPoolStrategyLabels,
  getVaultProtocolLabel,
  getVaultStrategyLabels,
  getYieldTokenHoldExplanation,
  getYieldTokenStrategyLabel,
  YIELD_TOKEN_PROTOCOL_KEY,
} from "@/features/simulator/strategies/utils/strategyLabels";
import {
  ETHERFUSE_BOND_SYMBOLS,
  type EtherfuseBondSymbol,
} from "@/features/shared/yields/constants/etherfuseBonds";
import { resolveEtherfuseBondApy } from "@/features/shared/yields/utils/etherfuseBondApy";
import type { EtherfuseYieldEntry } from "@/features/shared/yields/hooks/useEtherfuseYields";
import type { SimulatorDestination } from "@/features/simulator/strategies/types/simulator.types";

function safeNumber(value: number | string | undefined | null): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseApy7d(s: string): number | null {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

export function buildDestinationIndex(
  pools: PoolInfo[] | undefined,
  vaults: VaultView[] | undefined,
  yieldsData: EtherfuseYieldEntry[] | undefined
): SimulatorDestination[] {
  const out: SimulatorDestination[] = [];

  for (const pool of pools ?? []) {
    const decimals = pool.tokens[0]?.decimals ?? 7;
    const tvlNumber = safeNumber(
      fromSmallestUnit(pool.tvl.toString(), decimals)
    );
    out.push({
      kind: "pool",
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
    });
  }

  for (const vault of vaults ?? []) {
    out.push({
      kind: "vault",
      id: vault.id,
      name: vault.name,
      apy: parseApy7d(vault.apy7d),
      tvlUsd: null,
      tvlLabel: vault.tvl,
      protocol: getVaultProtocolLabel(vault),
      strategyLabels: getVaultStrategyLabels(vault),
      acceptedTokenCodes: [vault.supplyAsset.symbol],
      raw: vault,
    });
  }

  const assets = getAssetsConfig();
  for (const symbol of ETHERFUSE_BOND_SYMBOLS) {
    const cfg = assets[symbol];
    if (!cfg) continue;

    const resolved = resolveEtherfuseBondApy(symbol, yieldsData);
    if (!resolved) continue;

    const { apy, isFallback: isFallbackApy, bondCurrency } = resolved;

    out.push({
      kind: "yield-token",
      id: cfg.contract,
      name: cfg.name,
      apy,
      tvlUsd: null,
      tvlLabel: "",
      protocol: YIELD_TOKEN_PROTOCOL_KEY,
      strategyLabels: [
        getYieldTokenStrategyLabel(symbol),
        getYieldTokenHoldExplanation(symbol),
      ],
      acceptedTokenCodes: [symbol],
      raw: null,
      bondCurrency,
      bondIcon: cfg.icon,
      bondSymbol: symbol as EtherfuseBondSymbol,
      isFallbackApy,
    });
  }

  return out;
}

export function findDestinationById(
  index: SimulatorDestination[],
  kind: SimulatorDestination["kind"],
  id: string
): SimulatorDestination | null {
  return index.find((d) => d.kind === kind && d.id === id) ?? null;
}
