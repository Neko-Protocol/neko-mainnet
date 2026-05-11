import { useMemo } from "react";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { useFxRate } from "@/hooks/useFxRate";
import { convertUsdToSelected, formatCurrency } from "@/lib/helpers/currency";
import type { Token } from "@/lib/helpers/stellar/soroswap";
import { SUSPICIOUS_VALUE_THRESHOLD_PCT } from "@/features/expert/swap/constants/swapConfig";
import type { SupportedCurrency } from "@/stores/currency.store";

export interface SwapPrices {
  tokenInPrice: number;
  tokenOutPrice: number;
  isLoadingPrice: boolean;
  isLoadingOutPrice: boolean;
  fiatValue: string;
  fiatValueOut: string;
  selectedCurrency: SupportedCurrency;
  swapValueAnalysis: {
    expectedOutput: number;
    actualOutput: number;
    differencePercent: number;
    isSuspiciouslyLow: boolean;
  } | null;
}

export function useSwapPrices(
  amountIn: string,
  amountOut: string,
  tokenIn: Token | string,
  tokenOut: Token | string
): SwapPrices {
  const { rate: fxRate, currency: selectedCurrency } = useFxRate();
  const { price: tokenInPrice, isLoading: isLoadingPrice } = useTokenPrice(
    tokenIn as Token | string | undefined
  );
  const { price: tokenOutPrice, isLoading: isLoadingOutPrice } = useTokenPrice(
    tokenOut as Token | string | undefined
  );

  const fiatValue = useMemo(() => {
    if (amountIn && parseFloat(amountIn) > 0 && tokenInPrice > 0) {
      const amountUsd = parseFloat(amountIn) * tokenInPrice;
      return formatCurrency(
        convertUsdToSelected(amountUsd, fxRate),
        selectedCurrency,
        2
      );
    }
    return formatCurrency(0, selectedCurrency, 2);
  }, [amountIn, tokenInPrice, fxRate, selectedCurrency]);

  const fiatValueOut = useMemo(() => {
    if (amountOut && parseFloat(amountOut) > 0 && tokenOutPrice > 0) {
      const amountUsd = parseFloat(amountOut) * tokenOutPrice;
      return formatCurrency(
        convertUsdToSelected(amountUsd, fxRate),
        selectedCurrency,
        2
      );
    }
    return formatCurrency(0, selectedCurrency, 2);
  }, [amountOut, tokenOutPrice, fxRate, selectedCurrency]);

  const swapValueAnalysis = useMemo(() => {
    if (
      !amountIn ||
      !amountOut ||
      parseFloat(amountIn) <= 0 ||
      parseFloat(amountOut) <= 0
    ) {
      return null;
    }

    if (
      !tokenInPrice ||
      !tokenOutPrice ||
      tokenInPrice <= 0 ||
      tokenOutPrice <= 0
    ) {
      return null;
    }

    const inputAmount = parseFloat(amountIn);
    const outputAmount = parseFloat(amountOut);
    const inputUsdValue = inputAmount * tokenInPrice;
    const expectedOutput = inputUsdValue / tokenOutPrice;
    const differencePercent =
      ((expectedOutput - outputAmount) / expectedOutput) * 100;
    const isSuspiciouslyLow =
      differencePercent > SUSPICIOUS_VALUE_THRESHOLD_PCT;

    return {
      expectedOutput,
      actualOutput: outputAmount,
      differencePercent,
      isSuspiciouslyLow,
    };
  }, [amountIn, amountOut, tokenInPrice, tokenOutPrice]);

  return {
    tokenInPrice,
    tokenOutPrice,
    isLoadingPrice,
    isLoadingOutPrice,
    fiatValue,
    fiatValueOut,
    selectedCurrency,
    swapValueAnalysis,
  };
}
