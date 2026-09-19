import type { Token } from "../../../types/swapTypes";
import {
  getAssetsConfig,
  getCurrentNetworkId,
  type AssetConfig,
} from "@/lib/constants/assets.config";

export type TokenInfo = Pick<
  AssetConfig,
  | "name"
  | "contract"
  | "code"
  | "issuer"
  | "decimals"
  | "icon"
  | "isInstitutional"
  | "isSwappable"
>;

export const getCurrentNetwork = (): string => getCurrentNetworkId();

export const getAvailableTokens = (): Record<string, TokenInfo> => {
  return getAssetsConfig();
};

/**
 * Tokens a user can actually trade. Institutional assets are allowlist-gated
 * by their issuer (BENJI's trustlines are `auth_required`; the Centrifuge
 * institutional share classes are contract-allowlisted), so they have no AMM
 * route and must never reach the swap UI — offering them would produce quotes
 * that can only fail at signing time.
 */
export const getSwappableTokens = (): Record<string, TokenInfo> => {
  return Object.fromEntries(
    Object.entries(getAvailableTokens()).filter(
      ([, info]) => !info.isInstitutional && info.isSwappable !== false
    )
  );
};

export const getTokens = (): Record<string, string> => {
  const tokens = getAvailableTokens();
  const result: Record<string, string> = {};
  Object.entries(tokens).forEach(([code, info]) => {
    result[code] = info.contract;
  });
  return result;
};

export const getTokenAddress = (token: Token | string): string => {
  if (typeof token === "string") {
    // Already a valid Soroban contract address.
    if (token.startsWith("C") && token.length === 56) {
      return token;
    }
    // Try to look up by token code (e.g. "XLM" → contract address)
    const tokens = getTokens();
    if (tokens[token]) {
      return tokens[token];
    }
    return token;
  }

  if (token.type === "native") {
    const tokens = getTokens();
    return tokens.XLM ?? getAvailableTokens().XLM?.contract ?? "";
  }

  if (token.contract) {
    return token.contract;
  }

  throw new Error(
    "Invalid token format: must be string address or Token with contract"
  );
};

export const TOKENS: Record<string, string> = getTokens();
