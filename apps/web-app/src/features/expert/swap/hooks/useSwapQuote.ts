import { useState, useEffect, useRef, useCallback } from "react";
import type { Token } from "@/lib/helpers/stellar/soroswap";
import { hasApiKey } from "@/lib/helpers/stellar/soroswap";
import { useStellarQuote } from "./useStellarQuote";
import {
  DEBOUNCE_MS,
  QUOTE_REFRESH_INTERVAL_MS,
} from "@/features/expert/swap/constants/swapConfig";
import type { PlatformFee } from "@/lib/helpers/stellar/soroswap";

const MAX_CONSECUTIVE_FAILURES = 3;

export interface SwapQuoteState {
  amountOut: string;
  isLoadingQuote: boolean;
  apiKeyConfigured: boolean;
  quoteError: string | null;
  platformFee: PlatformFee | undefined;
}

export interface SwapQuoteActions {
  fetchLiveQuote: () => Promise<void>;
}

export function useSwapQuote(
  address: string | undefined,
  amountIn: string,
  tokenIn: Token | string,
  tokenOut: Token | string
): SwapQuoteState & SwapQuoteActions {
  const [amountOut, setAmountOut] = useState<string>("0.0");
  const [isLoadingQuote, setIsLoadingQuote] = useState<boolean>(false);
  const [apiKeyConfigured] = useState<boolean>(() => hasApiKey());
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [platformFee, setPlatformFee] = useState<PlatformFee | undefined>(
    undefined
  );

  const quoteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const quoteIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const failureCountRef = useRef<number>(0);

  const { fetchStellarQuote, cancelStellarQuote } = useStellarQuote(
    amountIn,
    tokenIn,
    tokenOut,
    apiKeyConfigured
  );

  const fetchLiveQuote = useCallback(async () => {
    const trimmedAmount = amountIn?.trim() || "";
    const parsedAmount = parseFloat(trimmedAmount);

    if (
      !address ||
      !trimmedAmount ||
      trimmedAmount === "0" ||
      trimmedAmount === "0." ||
      isNaN(parsedAmount) ||
      parsedAmount <= 0
    ) {
      setAmountOut("0.0");
      setIsLoadingQuote(false);
      setQuoteError(null);
      return;
    }

    try {
      const result = await fetchStellarQuote();

      if (result.amount !== null) {
        setAmountOut(result.amount);
        setPlatformFee(result.platformFee ?? undefined);
        setIsLoadingQuote(false);
        setQuoteError(null);
        failureCountRef.current = 0;
        return;
      }

      if (result.error) {
        failureCountRef.current += 1;
        if (failureCountRef.current >= MAX_CONSECUTIVE_FAILURES) {
          setIsLoadingQuote(false);
          setQuoteError(result.error);
          if (quoteIntervalRef.current) {
            clearInterval(quoteIntervalRef.current);
            quoteIntervalRef.current = null;
          }
        }
      }
    } catch {
      failureCountRef.current += 1;
      if (failureCountRef.current >= MAX_CONSECUTIVE_FAILURES) {
        setIsLoadingQuote(false);
        setQuoteError("Failed to get quote - try again");
        if (quoteIntervalRef.current) {
          clearInterval(quoteIntervalRef.current);
          quoteIntervalRef.current = null;
        }
      }
    }
  }, [address, amountIn, fetchStellarQuote]);

  useEffect(() => {
    if (quoteTimeoutRef.current) {
      clearTimeout(quoteTimeoutRef.current);
      quoteTimeoutRef.current = null;
    }

    cancelStellarQuote();

    const trimmedAmount = amountIn?.trim() || "";
    const parsedAmount = parseFloat(trimmedAmount);
    const isZero =
      trimmedAmount === "0" ||
      trimmedAmount === "0." ||
      trimmedAmount === "0.0";
    const isValid =
      trimmedAmount !== "" &&
      !isZero &&
      !isNaN(parsedAmount) &&
      parsedAmount > 0;

    const shouldFetch = isValid && !!address && apiKeyConfigured;

    const resetQuote = () => {
      setAmountOut("0.0");
      setPlatformFee(undefined);
      setQuoteError(null);
    };

    const startLoading = () => {
      resetQuote();
      setIsLoadingQuote(true);
    };

    if (!shouldFetch) {
      resetQuote();
      return;
    }

    startLoading();
    failureCountRef.current = 0;

    quoteTimeoutRef.current = setTimeout(() => {
      void fetchLiveQuote();
    }, DEBOUNCE_MS);

    return () => {
      if (quoteTimeoutRef.current) {
        clearTimeout(quoteTimeoutRef.current);
        quoteTimeoutRef.current = null;
      }
      cancelStellarQuote();
    };
  }, [
    amountIn,
    tokenIn,
    tokenOut,
    address,
    apiKeyConfigured,
    fetchLiveQuote,
    cancelStellarQuote,
  ]);

  useEffect(() => {
    if (
      address &&
      tokenIn &&
      tokenOut &&
      amountIn &&
      parseFloat(amountIn) > 0
    ) {
      if (quoteIntervalRef.current) {
        clearInterval(quoteIntervalRef.current);
      }
      quoteIntervalRef.current = setInterval(() => {
        void fetchLiveQuote();
      }, QUOTE_REFRESH_INTERVAL_MS);
    } else {
      if (quoteIntervalRef.current) {
        clearInterval(quoteIntervalRef.current);
        quoteIntervalRef.current = null;
      }
    }

    return () => {
      if (quoteIntervalRef.current) {
        clearInterval(quoteIntervalRef.current);
      }
    };
  }, [amountIn, tokenIn, tokenOut, address, apiKeyConfigured, fetchLiveQuote]);

  return {
    amountOut,
    isLoadingQuote,
    apiKeyConfigured,
    quoteError,
    platformFee,
    fetchLiveQuote,
  };
}
