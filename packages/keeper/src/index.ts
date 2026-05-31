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
