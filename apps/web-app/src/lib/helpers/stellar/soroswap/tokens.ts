import { soroswap } from "@neko/orchestrator";
import {
  getAssetsConfig,
  getCurrentNetworkId,
} from "@/lib/constants/assets.config";

export type TokenInfo = soroswap.TokenInfo;

export const buildRegistry = (): soroswap.SoroswapTokenRegistry => ({
  availableTokens: getAssetsConfig(),
  currentNetwork: getCurrentNetworkId(),
});

export const getCurrentNetwork = (): string =>
  soroswap.getCurrentNetwork(buildRegistry());

export const getAvailableTokens = (): Record<string, TokenInfo> =>
  soroswap.getAvailableTokens(buildRegistry());

export const getTokens = (): Record<string, string> =>
  soroswap.getTokens(buildRegistry());

export const getTokenAddress = (token: soroswap.Token | string): string =>
  soroswap.getTokenAddress(token, buildRegistry());

export const TOKENS: Record<string, string> = getTokens();
