import { useRef, useCallback } from "react";
import type { Token } from "@/lib/helpers/stellar/soroswap";
import { getQuote, type QuoteRequest } from "@/lib/helpers/stellar/soroswap";
import { formatAmount } from "@/lib/helpers/formatUtils";
import { fromSmallestUnit } from "@neko/orchestrator";
import {
  DEFAULT_SLIPPAGE_BPS,
  MAX_HOPS,
  PLATFORM_FEE_BPS,
  NEKO_TREASURY_ADDRESS,
} from "@/features/expert/swap/constants/swapConfig";
import type { PlatformFee } from "@/lib/helpers/stellar/soroswap";

export interface StellarQuoteResult {
  amount: string | null;
  error: string | null;
  platformFee?: PlatformFee;
}

export function useStellarQuote(
  amountIn: string,
  tokenIn: Token | string,
  tokenOut: Token | string,
  apiKeyConfigured: boolean
): {
  fetchStellarQuote: () => Promise<StellarQuoteResult>;
  cancelStellarQuote: () => void;
} {
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelStellarQuote = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const fetchStellarQuote =
    useCallback(async (): Promise<StellarQuoteResult> => {
      const trimmedAmount = amountIn?.trim() || "";
      const parsedAmount = parseFloat(trimmedAmount);

      if (!trimmedAmount || isNaN(parsedAmount) || parsedAmount <= 0)
        return { amount: null, error: null };
      if (!apiKeyConfigured)
        return { amount: null, error: "API key not configured" };

      cancelStellarQuote();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const quoteRequest: QuoteRequest = {
          assetIn: tokenIn as Token | string,
          assetOut: tokenOut as Token | string,
          amount: trimmedAmount,
          tradeType: "EXACT_IN",
          protocols: NEKO_TREASURY_ADDRESS
            ? ["sdex"]
            : ["soroswap", "phoenix", "aqua"],
          slippageBps: DEFAULT_SLIPPAGE_BPS,
          maxHops: MAX_HOPS,
          ...(NEKO_TREASURY_ADDRESS
            ? { feeBps: PLATFORM_FEE_BPS, referralId: NEKO_TREASURY_ADDRESS }
            : {}),
        };

        const quote = await getQuote(quoteRequest);

        if (abortController.signal.aborted)
          return { amount: null, error: null };

        if (quote?.amountOut) {
          const amountOutStr = quote.amountOut.toString();
          const amountOutBigInt = BigInt(amountOutStr);
          if (amountOutBigInt > BigInt(0)) {
            return {
              amount: formatAmount(fromSmallestUnit(amountOutStr, 7)),
              error: null,
              platformFee: quote.platformFee,
            };
          }
        }

        return {
          amount: null,
          error: "No liquidity found for this pair",
        };
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError")
          return { amount: null, error: null };

        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorWithCode = error as { code?: string } | null;
        const isTimeout =
          errorMessage.includes("timeout") ||
          errorMessage.includes("ECONNABORTED") ||
          errorWithCode?.code === "ECONNABORTED";

        if (isTimeout) {
          return { amount: null, error: "Quote request timed out" };
        }

        return {
          amount: null,
          error: errorMessage || "Failed to get quote",
        };
      }
    }, [amountIn, tokenIn, tokenOut, apiKeyConfigured, cancelStellarQuote]);

  return { fetchStellarQuote, cancelStellarQuote };
}
