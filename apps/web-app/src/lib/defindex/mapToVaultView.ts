import type { VaultInfoResponse } from "@defindex/sdk";
import type {
  VaultAsset,
  VaultConfig,
  VaultView,
  VaultStrategyAllocation,
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

function shortAddr(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatManagedAmount(amountStr: string): string {
  const n = Number(amountStr) / 1e7;
  if (Number.isNaN(n)) return "—";
  if (n <= 0) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}k`;
  if (n < 0.0001) return n.toExponential(2);
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function buildStrategyAllocations(
  info: VaultInfoResponse
): VaultStrategyAllocation[] | undefined {
  const funds = info.totalManagedFunds;
  if (!funds?.length) return undefined;

  const assets = info.assets ?? [];
  const assetByAddr = new Map(assets.map((a) => [a.address, a]));
  const strategyNameByAddr = new Map<string, string>();
  for (const a of assets) {
    for (const s of a.strategies ?? []) {
      strategyNameByAddr.set(s.address, s.name);
    }
  }

  const rows: VaultStrategyAllocation[] = [];
  for (const mf of funds) {
    const asset = assetByAddr.get(mf.asset);
    const symbol = asset?.symbol ?? shortAddr(mf.asset);
    for (const alloc of mf.strategy_allocations ?? []) {
      rows.push({
        assetSymbol: symbol,
        strategyName:
          strategyNameByAddr.get(alloc.strategy_address) ?? "Strategy",
        strategyAddress: alloc.strategy_address,
        amountLabel: formatManagedAmount(alloc.amount),
        paused: alloc.paused,
      });
    }
  }
  return rows.length ? rows : undefined;
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
  const strategyNameCount = new Map<string, number>();
  for (const a of assets) {
    for (const s of a.strategies ?? []) {
      const n = (strategyNameCount.get(s.name) ?? 0) + 1;
      strategyNameCount.set(s.name, n);
      const label =
        n === 1 ? s.name : `${s.name} (${s.address.slice(0, 5)}…)`;
      strategyRecord[label] = s.address;
    }
  }

  const strategyAllocations = buildStrategyAllocations(info);

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
    creatorIconSrc: "/defindex-logo.svg",
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
      strategyAllocations,
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
