import {
  StellarPriceService,
  type StellarPriceServiceDeps,
} from "@neko/keeper";
import {
  getApiKey,
  getSDKNetwork,
  getSoroswapSDK,
} from "@/lib/helpers/stellar/soroswap/utils";
import { getAssetsConfig } from "@/lib/constants/assets.config";
import { getReflectorClient } from "@/lib/helpers/stellar/reflector-client";

export type { PriceSource, PricedResult } from "@neko/keeper";
export { StellarPriceService };

const deps: StellarPriceServiceDeps = {
  getSoroswapSDK: () => getSoroswapSDK(),
  getSoroswapApiKey: () => getApiKey(),
  getSoroswapNetwork: () => getSDKNetwork(),
  getReflectorClient: () => getReflectorClient(),
  getAssetConfig: (code) => getAssetsConfig()[code],
};

export const stellarPriceService = new StellarPriceService(deps);
