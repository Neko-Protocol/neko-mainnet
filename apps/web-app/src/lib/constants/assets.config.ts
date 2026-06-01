import { stellarNetwork } from "@/lib/constants/network";
import {
  getAssetsConfig as pkgGetAssetsConfig,
  getCurrentNetworkId as pkgGetCurrentNetworkId,
  getCoinGeckoIdForToken as pkgGetCoinGeckoIdForToken,
  getReflectorAssetForToken as pkgGetReflectorAssetForToken,
  getRwaTokenCodes as pkgGetRwaTokenCodes,
  getStablecoinCodes as pkgGetStablecoinCodes,
  getTokenIconMap as pkgGetTokenIconMap,
  getContractToCodeMap as pkgGetContractToCodeMap,
} from "@neko/keeper";

export type {
  AssetConfig,
  AssetPriceSource,
  ReflectorAsset,
  NetworkId,
} from "@neko/keeper";

const currentNetworkId = () => pkgGetCurrentNetworkId(stellarNetwork);

export const getAssetsConfig = () => pkgGetAssetsConfig(currentNetworkId());

export const getCurrentNetworkId = () => currentNetworkId();

export const getCoinGeckoIdForToken = (code: string) =>
  pkgGetCoinGeckoIdForToken(currentNetworkId(), code);

export const getReflectorAssetForToken = (code: string) =>
  pkgGetReflectorAssetForToken(currentNetworkId(), code);

export const getRwaTokenCodes = () => pkgGetRwaTokenCodes(currentNetworkId());

export const getStablecoinCodes = () =>
  pkgGetStablecoinCodes(currentNetworkId());

export const getTokenIconMap = () => pkgGetTokenIconMap(currentNetworkId());

export const getContractToCodeMap = () =>
  pkgGetContractToCodeMap(currentNetworkId());
