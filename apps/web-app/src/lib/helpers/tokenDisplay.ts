import {
  STELLAR_TOKEN_ICON_MAP,
  STELLAR_FALLBACK_CONTRACTS,
} from "@/lib/constants/tokenIcons";
import { getAvailableTokens } from "./stellar/soroswap";
import type { Token } from "./stellar/soroswap";

export const getExplorerUrl = (
  txHash: string,
  network?: string
): string | null => {
  switch (network?.toUpperCase()) {
    case "PUBLIC":
    case "MAINNET":
      return `https://stellar.expert/explorer/public/tx/${txHash}`;
    case "TESTNET":
      return `https://stellar.expert/explorer/testnet/tx/${txHash}`;
    case "FUTURENET":
      return `https://stellar.expert/explorer/futurenet/tx/${txHash}`;
    case "LOCAL":
    case "STANDALONE":
      return null;
    default:
      return `https://stellar.expert/explorer/public/tx/${txHash}`;
  }
};

export const sanitizeAmountInput = (value: string): string => {
  const stripped = value.replace(/[^0-9.]/g, "");
  const parts = stripped.split(".");
  return parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : stripped;
};

export const getTokenId = (
  token: Token | string,
  availableTokens: Record<string, { contract: string }>
): string => {
  if (typeof token === "string") {
    for (const [code, info] of Object.entries(availableTokens)) {
      if (info.contract === token) return code;
    }
    return token;
  }

  if (token.type === "native") return "XLM";
  if (token.contract) {
    for (const [code, info] of Object.entries(availableTokens)) {
      if (info.contract === token.contract) return code;
    }
    return token.contract;
  }
  if (token.code) return token.code;
  return "";
};

export const getTokenIcon = (
  token:
    | { type: "native" | "contract"; code?: string; contract?: string }
    | string
): string | null => {
  let tokenCode: string | null = null;

  if (typeof token === "string") {
    try {
      const availableTokens = getAvailableTokens();
      for (const [code, info] of Object.entries(availableTokens)) {
        if (info.contract === token) {
          tokenCode = code;
          break;
        }
      }
    } catch {
      tokenCode = STELLAR_FALLBACK_CONTRACTS[token] || null;
    }

    if (!tokenCode) {
      tokenCode = STELLAR_FALLBACK_CONTRACTS[token] || null;
    }
    if (!tokenCode) {
      tokenCode = token.toUpperCase();
    }
  } else if (typeof token === "object" && "type" in token) {
    tokenCode = token.type === "native" ? "XLM" : token.code || null;
  }

  if (!tokenCode) return null;
  return STELLAR_TOKEN_ICON_MAP[tokenCode] ?? null;
};

/**
 * Tailwind classes for token icons inside circular avatars.
 * XLM uses contain + padding so the Stellar mark is not cropped; other
 * assets use cover so square artwork clips cleanly to the circle.
 */
export function getTokenIconFitClass(tokenCode: string): string {
  if (tokenCode.trim().toUpperCase() === "XLM") {
    return "h-full w-full object-contain";
  }
  return "h-full w-full object-cover";
}
