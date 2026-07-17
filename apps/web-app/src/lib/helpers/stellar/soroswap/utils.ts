import { soroswap } from "@neko/orchestrator";
import type { SoroswapSDK, SupportedNetworks } from "@soroswap/sdk";
import { buildRegistry } from "./tokens";

export const getApiKey = (): string | null => {
  const envKey = process.env.NEXT_PUBLIC_SOROSWAP_API_KEY;
  const envKeyStr = typeof envKey === "string" ? envKey : "";
  if (envKeyStr && envKeyStr.trim() !== "") {
    return envKeyStr.trim();
  }
  const localKey = localStorage.getItem("soroswap_api_key");
  if (localKey && localKey.trim() !== "") {
    return localKey.trim();
  }
  return null;
};

export const setApiKey = (apiKey: string): void => {
  localStorage.setItem("soroswap_api_key", apiKey);
};

export const hasApiKey = (): boolean => soroswap.hasApiKey(getApiKey());

export const getSDKNetwork = (): SupportedNetworks =>
  soroswap.getSDKNetwork(buildRegistry());

export const invalidateSoroswapSDK = (): void =>
  soroswap.invalidateSoroswapSDK();

export const getSoroswapSDK = (): SoroswapSDK =>
  soroswap.getSoroswapSDK(buildRegistry(), getApiKey());

export const makeAPIRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => soroswap.makeAPIRequest(endpoint, options, getApiKey());

export const toSmallestUnit = soroswap.toSmallestUnit;
export const isValidContractAddress = soroswap.isValidContractAddress;
export const getTokenExplorerUrl = soroswap.getTokenExplorerUrl;

export const formatTokenForAPI = (token: soroswap.Token | string): string =>
  soroswap.formatTokenForAPI(token, buildRegistry());
