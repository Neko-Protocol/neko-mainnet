"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { getTokens, getTokenAddress } from "@/lib/helpers/stellar/swap-kit";
import { useSwapQuote } from "@/features/shared/swap-engine/hooks/useSwapQuote";
import { useSwapExecution } from "@/features/shared/swap-engine/hooks/useSwapExecution";
import { useWallet } from "@/hooks/useWallet";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useToast } from "@/hooks/useToast";
import { getPaymentTokenForAsset } from "@/lib/constants/buy.config";
import { sanitizeAmountInput } from "@/lib/helpers/tokenDisplay";
import { extractContractError, getGenericErrorCode } from "@neko-protocol/orchestrator";
import { useApiErrorMessage } from "@/lib/helpers/useApiErrorMessage";
import { TOAST_CONFIG } from "@/lib/constants/toast.config";

export interface BuyFormState {
  paymentAmount: string;
  amountOut: string;
  isLoadingQuote: boolean;
  quoteError: string | null;
  isLoading: boolean;
  txHash: string | null;
  paymentToken: string;
  paymentBalance: string | undefined;
  isLoadingBalance: boolean;
}

export interface BuyFormActions {
  handleAmountChange: (raw: string) => void;
  handleBuy: () => Promise<void>;
}

export function useBuyForm(
  targetSymbol: string
): BuyFormState & BuyFormActions {
  const t = useTranslations("basic");
  const getErrorMessage = useApiErrorMessage();
  const { address, networkPassphrase, refetchBalances } = useWallet();
  const { addNotification } = useToast();
  const queryClient = useQueryClient();

  const paymentToken = getPaymentTokenForAsset(targetSymbol);
  const tokens = getTokens();
  const tokenIn = tokens[paymentToken] ?? paymentToken;
  const tokenOut = tokens[targetSymbol] ?? targetSymbol;

  const [paymentAmount, setPaymentAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { balance: paymentBalance, isLoading: isLoadingBalance } =
    useTokenBalance(tokenIn);

  const { amountOut, isLoadingQuote, quoteError } = useSwapQuote(
    address,
    paymentAmount,
    tokenIn,
    tokenOut
  );

  const { executeSwap } = useSwapExecution();

  const handleAmountChange = useCallback((raw: string) => {
    setPaymentAmount(sanitizeAmountInput(raw));
    setTxHash(null);
  }, []);

  const handleBuy = useCallback(async () => {
    if (!address || !paymentAmount || parseFloat(paymentAmount) <= 0) return;

    setIsLoading(true);
    try {
      const result = await executeSwap({
        amountIn: paymentAmount,
        tokenIn,
        tokenOut,
        address,
        networkPassphrase,
      });

      if (result.txHash) {
        setTxHash(result.txHash);
        setPaymentAmount("");
        addNotification(t("buyToasts.purchaseComplete"), "success", {
          ...TOAST_CONFIG.defaultOpts,
          description: t("buyToasts.addedToWallet", { symbol: targetSymbol }),
        });

        void refetchBalances();

        const tokenOutAddress = getTokenAddress(
          tokenOut as Parameters<typeof getTokenAddress>[0]
        );
        const tokenInAddress = getTokenAddress(
          tokenIn as Parameters<typeof getTokenAddress>[0]
        );
        void queryClient.invalidateQueries({
          queryKey: ["tokenBalance", tokenOutAddress, address],
        });
        void queryClient.invalidateQueries({
          queryKey: ["tokenBalance", tokenInAddress, address],
        });
        void queryClient.invalidateQueries({
          queryKey: ["balances", address],
        });
      }
    } catch (err) {
      if (err instanceof Error && err.message === "USER_REJECTED") return;

      const errorCode = getGenericErrorCode(err);
      const msg = errorCode
        ? getErrorMessage(errorCode)
        : t("errors.contractError", { error: extractContractError(err) });
      addNotification(t("buyToasts.purchaseFailed"), "error", {
        ...TOAST_CONFIG.defaultOpts,
        description: msg,
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    address,
    paymentAmount,
    tokenIn,
    tokenOut,
    networkPassphrase,
    executeSwap,
    addNotification,
    refetchBalances,
    queryClient,
    targetSymbol,
    getErrorMessage,
    t,
  ]);

  return {
    paymentAmount,
    amountOut,
    isLoadingQuote,
    quoteError,
    isLoading,
    txHash,
    paymentToken,
    paymentBalance,
    isLoadingBalance,
    handleAmountChange,
    handleBuy,
  };
}
