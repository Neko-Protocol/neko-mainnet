import { useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { Token } from "@/lib/helpers/stellar/swap-kit";
import { getQuote, type QuoteRequest } from "@/lib/helpers/stellar/swap-kit";
import { formatAmount } from "@/lib/helpers/formatUtils";
import { fromSmallestUnit } from "@neko/orchestrator";
import { resolveDecimalsForSwapToken } from "@/lib/helpers/auditAssetAmounts";
import { DEFAULT_SLIPPAGE_BPS } from "@/features/shared/swap-engine/constants/swapConfig";

export interface StellarQuoteResult {
  amount: string | null;
  error: string | null;
}

export function useStellarQuote(
  amountIn: string,
  tokenIn: Token | string,
  tokenOut: Token | string
): {
  fetchStellarQuote: () => Promise<StellarQuoteResult>;
  cancelStellarQuote: () => void;
} {
  const t = useTranslations("sharedSwapEngine.quote");
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
      cancelStellarQuote();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const quoteRequest: QuoteRequest = {
          assetIn: tokenIn as Token | string,
          assetOut: tokenOut as Token | string,
          amount: trimmedAmount,
          tradeType: "EXACT_IN",
          slippageBps: DEFAULT_SLIPPAGE_BPS,
        };

        const quote = await getQuote(quoteRequest);

        if (abortController.signal.aborted)
          return { amount: null, error: null };

        if (quote?.amountOut) {
          const amountOutStr = quote.amountOut.toString();
          const amountOutBigInt = BigInt(amountOutStr);
          if (amountOutBigInt > BigInt(0)) {
            return {
              amount: formatAmount(
                fromSmallestUnit(
                  amountOutStr,
                  resolveDecimalsForSwapToken(tokenOut) ?? 7
                )
              ),
              error: null,
            };
          }
        }

        return {
          amount: null,
          error: t("noLiquidity"),
        };
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError")
          return { amount: null, error: null };

        // TODO(i18n/phase5): errorMessage may be a raw error string from the
        // swap-kit/anchor API and stays untranslated until Phase 5 maps it
        // to a stable error code.
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorWithCode = error as { code?: string } | null;
        const isTimeout =
          errorMessage.includes("timeout") ||
          errorMessage.includes("ECONNABORTED") ||
          errorWithCode?.code === "ECONNABORTED";

        if (isTimeout) {
          return { amount: null, error: t("timeout") };
        }

        return {
          amount: null,
          error: errorMessage || t("failedToGetQuote"),
        };
      }
    }, [amountIn, tokenIn, tokenOut, cancelStellarQuote, t]);

  return { fetchStellarQuote, cancelStellarQuote };
}
