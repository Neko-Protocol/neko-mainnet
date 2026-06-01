import { orchestrator } from "@/lib/orchestrator";
import { fetchDefindexVaultViews } from "@/lib/defindex/fetchVaultViewsServer";
import { getAssetsConfig } from "@/lib/constants/assets.config";
import {
  ETHERFUSE_BOND_SYMBOLS,
  FALLBACK_APY,
  type EtherfuseBondSymbol,
} from "@/features/simulator/constants/etherfuseBonds";
import {
  getPoolProtocolLabel,
  getVaultProtocolLabel,
} from "@/features/simulator/utils/strategyLabels";
import type { CatalogDestination } from "@/features/simulator/types/recommended.types";

export async function buildCatalogDestinations(): Promise<
  CatalogDestination[]
> {
  const destinations: CatalogDestination[] = [];

  try {
    const pools = await orchestrator.getAllPools();
    for (const pool of pools) {
      destinations.push({
        kind: "pool",
        id: pool.id,
        name: pool.name,
        apy: typeof pool.apy === "number" ? pool.apy : null,
        acceptedTokenCodes: pool.tokens.map((t) => t.code),
        protocol: getPoolProtocolLabel(pool),
      });
    }
  } catch (err) {
    console.error("[buildCatalogDestinations] pools", err);
  }

  try {
    const vaults = await fetchDefindexVaultViews();
    for (const vault of vaults) {
      destinations.push({
        kind: "vault",
        id: vault.id,
        name: vault.name,
        apy: null,
        acceptedTokenCodes: [vault.supplyAsset.symbol],
        protocol: getVaultProtocolLabel(vault),
      });
    }
  } catch (err) {
    console.error("[buildCatalogDestinations] vaults", err);
  }

  const assets = getAssetsConfig();
  for (const symbol of ETHERFUSE_BOND_SYMBOLS) {
    const cfg = assets[symbol];
    if (!cfg) continue;
    const bond = symbol as EtherfuseBondSymbol;
    destinations.push({
      kind: "yield-token",
      id: cfg.contract,
      name: cfg.name,
      apy: FALLBACK_APY[bond],
      acceptedTokenCodes: [symbol],
      protocol: "Sovereign Bond",
    });
  }

  return destinations;
}
