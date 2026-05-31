import { SoroswapSDK, SupportedNetworks } from "@soroswap/sdk";
import type { Token } from "./types.js";
import {
  getCurrentNetwork,
  getAvailableTokens,
  getTokens,
  type SoroswapTokenRegistry,
} from "./tokens.js";

const SOROSWAP_API_URL = "https://api.soroswap.finance";
const DEFAULT_TIMEOUT = 50000;

/**
 * Resolve the Soroswap API key.
 *
 * Order of resolution:
 *  1. Explicit `override` argument (callers may pass an in-memory key).
 *  2. `process.env.SOROSWAP_API_KEY` (backend/server runtime).
 *  3. `process.env.NEXT_PUBLIC_SOROSWAP_API_KEY` (web-app runtime).
 */
export const getApiKey = (override?: string | null): string | null => {
  if (override && override.trim() !== "") {
    return override.trim();
  }
  const serverKey = process.env.SOROSWAP_API_KEY;
  if (typeof serverKey === "string" && serverKey.trim() !== "") {
    return serverKey.trim();
  }
  const publicKey = process.env.NEXT_PUBLIC_SOROSWAP_API_KEY;
  if (typeof publicKey === "string" && publicKey.trim() !== "") {
    return publicKey.trim();
  }
  return null;
};

export const hasApiKey = (override?: string | null): boolean =>
  getApiKey(override) !== null;

export const getSDKNetwork = (
  registry: SoroswapTokenRegistry
): SupportedNetworks => {
  const network = getCurrentNetwork(registry);
  const networkLower = network.toLowerCase();
  if (networkLower === "mainnet" || networkLower === "public") {
    return SupportedNetworks.MAINNET;
  }
  return SupportedNetworks.TESTNET;
};

let sdkInstance: SoroswapSDK | null = null;
let sdkNetwork: SupportedNetworks | null = null;

export const invalidateSoroswapSDK = (): void => {
  sdkInstance = null;
  sdkNetwork = null;
};

export const getSoroswapSDK = (
  registry: SoroswapTokenRegistry,
  apiKeyOverride?: string | null
): SoroswapSDK => {
  const currentNetwork = getSDKNetwork(registry);
  if (sdkInstance && sdkNetwork === currentNetwork) {
    return sdkInstance;
  }
  const apiKey = getApiKey(apiKeyOverride);
  if (!apiKey) {
    throw new Error(
      "Soroswap API key is not configured. Set SOROSWAP_API_KEY or NEXT_PUBLIC_SOROSWAP_API_KEY. Get a key at https://api.soroswap.finance/login"
    );
  }
  sdkInstance = new SoroswapSDK({
    apiKey,
    baseUrl: SOROSWAP_API_URL,
    defaultNetwork: currentNetwork,
    timeout: DEFAULT_TIMEOUT,
  });
  sdkNetwork = currentNetwork;
  return sdkInstance;
};

export const makeAPIRequest = async <T>(
  endpoint: string,
  options: RequestInit = {},
  apiKeyOverride?: string | null
): Promise<T> => {
  const apiKey = getApiKey(apiKeyOverride);
  if (!apiKey) {
    throw new Error(
      "Soroswap API key is not configured. Set SOROSWAP_API_KEY or NEXT_PUBLIC_SOROSWAP_API_KEY. Get a key at https://api.soroswap.finance/login"
    );
  }

  const url = `${SOROSWAP_API_URL}${endpoint}`;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}. ${JSON.stringify(errorData)}`
      );
    }
    const jsonData = await response.json();
    return jsonData as T;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Unknown error occurred during API request");
  }
};

export const toSmallestUnit = (
  amount: string,
  decimals: number = 7
): bigint => {
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount)) return BigInt(0);
  const multiplier = BigInt(10 ** decimals);
  const amountFloat = numAmount * Number(multiplier);
  return BigInt(Math.floor(amountFloat));
};

export const isValidContractAddress = (address: string): boolean => {
  return address.startsWith("C") && address.length === 56;
};

export const getTokenExplorerUrl = (contractAddress: string): string => {
  return `https://stellar.expert/explorer/public/contract/${contractAddress}`;
};

export const formatTokenForAPI = (
  token: Token | string,
  registry: SoroswapTokenRegistry
): string => {
  if (typeof token === "string") {
    return token;
  }

  if (token.type === "native") {
    const tokens = getTokens(registry);
    return tokens.XLM ?? getAvailableTokens(registry).XLM?.contract ?? "";
  }

  if (token.contract) {
    if (!token.contract.startsWith("C")) {
      throw new Error(
        `Invalid contract address format: ${token.contract}. Contract addresses should start with 'C'.`
      );
    }
    return token.contract;
  }

  if (token.code && token.issuer) {
    throw new Error(
      "Classic assets (code+issuer) not supported. Use contract addresses instead."
    );
  }

  throw new Error(
    "Invalid token format: must be string address or Token with contract"
  );
};
