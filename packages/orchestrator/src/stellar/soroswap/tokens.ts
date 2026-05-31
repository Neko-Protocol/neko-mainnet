import type { Token } from "./types.js";

export interface TokenInfo {
  name: string;
  contract: string;
  code: string;
  decimals: number;
  icon?: string;
}

export interface SoroswapTokenRegistry {
  /** Maps token code (e.g. "XLM", "USDC") → metadata including contract address. */
  availableTokens: Record<string, TokenInfo>;
  /** Network id used by Soroswap API: "mainnet" | "testnet" | "standalone" | "local". */
  currentNetwork: string;
}

export const getAvailableTokens = (
  registry: SoroswapTokenRegistry
): Record<string, TokenInfo> => registry.availableTokens;

export const getCurrentNetwork = (registry: SoroswapTokenRegistry): string =>
  registry.currentNetwork;

export const getTokens = (
  registry: SoroswapTokenRegistry
): Record<string, string> => {
  const result: Record<string, string> = {};
  Object.entries(registry.availableTokens).forEach(([code, info]) => {
    result[code] = info.contract;
  });
  return result;
};

export const getTokenAddress = (
  token: Token | string,
  registry: SoroswapTokenRegistry
): string => {
  if (typeof token === "string") {
    if (token.startsWith("C") && token.length === 56) {
      return token;
    }
    const tokens = getTokens(registry);
    if (tokens[token]) {
      return tokens[token];
    }
    return token;
  }

  if (token.type === "native") {
    const tokens = getTokens(registry);
    return tokens.XLM ?? registry.availableTokens.XLM?.contract ?? "";
  }

  if (token.contract) {
    return token.contract;
  }

  throw new Error(
    "Invalid token format: must be string address or Token with contract"
  );
};
