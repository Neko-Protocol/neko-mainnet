import type { VaultInfoResponse } from "@defindex/sdk";
import type {
  VaultAsset,
  VaultConfig,
  VaultView,
} from "@/features/vault/types/vault";

const DEFAULT_ICON = "/assets/vault-assets/usdc.svg";

function toVaultAsset(symbol: string, name: string): VaultAsset {
  return {
    symbol,
    name,
    iconSrc: DEFAULT_ICON,
    iconWhiteSrc: DEFAULT_ICON,
    logoSrc: DEFAULT_ICON,
    network: "Stellar",
  };
}

function formatTvl(info: VaultInfoResponse): string {
  const funds = info.totalManagedFunds ?? [];
  if (funds.length === 0) return "—";
  let sum = 0;
  for (const a of funds) {
    const n = Number(a.total_amount ?? 0);
    if (!Number.isNaN(n)) sum += n / 1e7;
  }
  if (sum <= 0) return "—";
  if (sum >= 1_000_000) return `$${(sum / 1_000_000).toFixed(2)}M`;
  if (sum >= 1_000) return `$${(sum / 1_000).toFixed(2)}k`;
  return `$${sum.toFixed(2)}`;
}

/**
 * Maps DeFindex `getVaultInfo` payload into the app `VaultView` used by cards and modals.
 */
export function defindexInfoToVaultView(
  contractId: string,
  info: VaultInfoResponse
): VaultView {
  const assets = info.assets ?? [];
  const primary = assets[0];
  const supplyAsset = primary
    ? toVaultAsset(primary.symbol, primary.name)
    : toVaultAsset(info.symbol, info.name);

  const collateralAssets =
    assets.length > 0
      ? assets.map((a) => toVaultAsset(a.symbol, a.name))
      : [supplyAsset];

  const strategiesFlat = assets.flatMap((a) =>
    (a.strategies ?? []).map((s) => ({
      protocol: s.name,
      description: s.address,
    }))
  );

  const strategyRecord: Record<string, string> = {};
  for (const a of assets) {
    for (const s of a.strategies ?? []) {
      strategyRecord[s.name] = s.address;
    }
  }

  const apyStr =
    info.apy != null && !Number.isNaN(Number(info.apy))
      ? `${Number(info.apy).toFixed(2)}%`
      : "—";

  const config: VaultConfig = {
    id: contractId,
    name: info.name,
    description: `${info.symbol} vault via DeFindex on Stellar.`,
    category: "lending",
    status: "active",
    supplyAsset,
    collateralAssets,
    createdBy: "DeFindex",
    creatorIconSrc: "/neko-logo.png",
    variant: "light",
    featured: true,
    detail: {
      description: `Vault with ${assets.length} underlying asset(s).`,
      strategies: strategiesFlat,
      contracts: {
        vault: contractId,
        pools: {},
        strategies: strategyRecord,
      },
      liquidity:
        "Liquidity depends on underlying strategies and DeFindex vault rules.",
    },
  };

  return {
    ...config,
    tvl: formatTvl(info),
    apy7d: apyStr,
    utilization: "—",
    totalSupply: "—",
  };
}
