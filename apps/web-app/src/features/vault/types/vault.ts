export type VaultCategory = "lending" | "amm" | "staking" | "rwa";

export type VaultCardVariant = "light" | "dark";

export type VaultStatus = "active" | "paused" | "deprecated";

export interface VaultAsset {
  symbol: string;
  name: string;
  iconSrc: string;
  iconWhiteSrc?: string;
  logoSrc: string;
  network: "Stellar";
}

export interface VaultStrategy {
  protocol: string;
  description: string;
}

export interface VaultContracts {
  vault: string;
  pools: Record<string, string>;
  strategies: Record<string, string>;
}

/**
 * Per-strategy deployed amount from DeFindex `totalManagedFunds` (via
 * `fetch_total_managed_funds`). The API does not expose separate AMM pool
 * contract IDs; liquidity is routed through these strategy contracts.
 */
export interface VaultStrategyAllocation {
  assetSymbol: string;
  strategyName: string;
  strategyAddress: string;
  amountLabel: string;
  paused: boolean;
}

export interface VaultDetail {
  description: string;
  strategies: VaultStrategy[];
  contracts: VaultContracts;
  liquidity: string;
  strategyAllocations?: VaultStrategyAllocation[];
}

/** Static metadata — defined by the protocol, never changes at runtime. */
export interface VaultConfig {
  id: string;
  name: string;
  description: string;
  category: VaultCategory;
  status: VaultStatus;
  supplyAsset: VaultAsset;
  collateralAssets: VaultAsset[];
  createdBy: string;
  creatorIconSrc?: string;
  variant?: VaultCardVariant;
  featured?: boolean;
  detail?: VaultDetail;
}

/** Dynamic data — fetched from contracts at runtime. */
export interface VaultStats {
  tvl: string;
  apy7d: string;
  utilization: string;
  totalSupply: string;
}

/** Raw data fetched from the DeFindex vault contract. */
export interface VaultLiveStats {
  tvl: bigint;
  totalShares: bigint;
  pricePerShare: bigint;
  userShares?: bigint;
}

/** View model consumed by UI components: static config merged with live stats. */
export type VaultView = VaultConfig & VaultStats;
