export const PACKAGE_NAME = "@neko/keeper";

export {
  getAssetsConfig,
  getCurrentNetworkId,
  getCoinGeckoIdForToken,
  getReflectorAssetForToken,
  getRwaTokenCodes,
  getStablecoinCodes,
  getTokenIconMap,
  getContractToCodeMap,
} from "./assets/assets.config.js";
export type {
  AssetConfig,
  AssetPriceSource,
  ReflectorAsset,
  NetworkId,
} from "./assets/assets.config.js";

export { defindexNetworkFromString } from "./defindex/network.js";

export { StellarPriceService } from "./prices/stellar-price.service.js";
export type {
  PriceSource,
  PricedResult,
  StellarPriceServiceDeps,
} from "./prices/stellar-price.service.js";

export {
  REBALANCE_THRESHOLD_STROOPS,
  planVaultRebalance,
} from "./defindex/rebalancePlanner.js";
export type {
  RebalancePlanReason,
  ManagedFundsStrategyAllocationLike,
  ManagedFundsEntryLike,
  PlannedInstruction,
  TargetAllocation,
  RebalanceInstructionPlan,
} from "./defindex/rebalancePlanner.js";

export {
  VAULT_REBALANCE_CONFIGS,
  assertValidRebalanceConfig,
  getVaultRebalanceConfig,
  getConfiguredRebalanceVaultIds,
} from "./defindex/rebalanceConfig.js";
export type {
  VaultRebalanceStrategyConfig,
  VaultRebalanceConfig,
} from "./defindex/rebalanceConfig.js";

export {
  getVaultContractId,
  resolveVaultIdForApi,
} from "./defindex/vaultContract.js";

export {
  BLEND_KEEPER_VAULT_IDS,
  parseDefindexVaultIds,
  parseAllVaultIds,
} from "./defindex/vaultIds.js";

export { createDefindexServerSdk } from "./defindex/createServerSdk.js";
