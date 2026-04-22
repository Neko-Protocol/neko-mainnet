import { STELLAR_FALLBACK_CONTRACTS } from "@/lib/constants/tokenIcons";
import { getAvailableTokens } from "@/lib/helpers/stellar/soroswap";
import { getTokenIcon } from "@/lib/helpers/tokenUtils";

/**
 * Icons used only in pool-oriented UIs. Not merged into the global token map
 * so swap, wallet balances, and other non-pool screens stay unchanged.
 */
const POOL_ONLY_TOKEN_ICONS: Record<string, string> = {
  AQUA: "https://coin-images.coingecko.com/coins/images/20026/small/aqua-logo.png?1696519446",
  USDGLO:
    "https://coin-images.coingecko.com/coins/images/29319/small/GLO_logo_pine_on_cyan_1_3.png?1716971065",
  BLND: "/assets/vault-creators/blend.png",
  XLM: "/assets/xlm-negro-logo.png",
};

type TokenArg = Parameters<typeof getTokenIcon>[0];

function resolveTokenCode(token: TokenArg): string | null {
  if (typeof token === "string") {
    let tokenCode: string | null = null;
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
      tokenCode = token.toUpperCase();
    }
    return tokenCode;
  }
  if (typeof token === "object" && token && "type" in token) {
    return token.type === "native" ? "XLM" : token.code || null;
  }
  return null;
}

/** Resolve icon URL for tokens shown on pool cards and pool detail (includes AQUA, USDGLO). */
export function getPoolTokenIcon(token: TokenArg): string | null {
  const code = resolveTokenCode(token);
  if (code) {
    const poolIcon = POOL_ONLY_TOKEN_ICONS[code.toUpperCase()];
    if (poolIcon) return poolIcon;
  }
  return getTokenIcon(token);
}
