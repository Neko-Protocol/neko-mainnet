"use client";

import React from "react";
import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { useBuyForm } from "../../hooks/useBuyForm";
import { formatAmount } from "@/lib/helpers/formatUtils";
import { useWallet } from "@/hooks/useWallet";
import { getTokenIconMap } from "@/lib/constants/assets.config";

export interface BuyConfirmPayload {
  paymentAmount: string;
  paymentToken: string;
  estimatedReceive: string;
}

interface BasicBuyFormProps {
  symbol: string;
  /**
   * When provided the confirm button calls this instead of executing the swap.
   * Use for "Add to cart" flows where the parent decides what happens on confirm.
   */
  onConfirm?: (payload: BuyConfirmPayload) => void;
  /** Button label. Defaults to "Buy {symbol}". */
  confirmLabel?: string;
}

export function BasicBuyForm({
  symbol,
  onConfirm,
  confirmLabel,
}: BasicBuyFormProps) {
  const { address } = useWallet();
  const tokenIconMap = getTokenIconMap();
  const {
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
  } = useBuyForm(symbol);

  const hasAmount = !!paymentAmount && parseFloat(paymentAmount) > 0;
  const hasOutput = !!(amountOut && amountOut !== "0.0");
  const isInsufficientBalance =
    hasAmount &&
    !!paymentBalance &&
    parseFloat(paymentAmount) > parseFloat(paymentBalance);

  const canConfirm =
    !!address &&
    hasAmount &&
    !isLoadingQuote &&
    !isInsufficientBalance &&
    (onConfirm ? hasOutput : !isLoading);

  const buttonLabel =
    confirmLabel ?? (isLoading && !onConfirm ? "Processing…" : `Buy ${symbol}`);

  const handleConfirmClick = () => {
    if (onConfirm) {
      onConfirm({ paymentAmount, paymentToken, estimatedReceive: amountOut });
    } else {
      void handleBuy();
    }
  };

  return (
    <div className="p-6 flex flex-col gap-4">
      <div>
        <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-3">
          You&apos;re buying {symbol}
        </p>
      </div>

      {/* Payment input */}
      <div className="flex flex-col gap-1.5">
        <span className="text-white/50 text-xs font-medium">You pay</span>
        <div className="rounded-xl bg-[#2A2A2A] p-3 flex items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative h-5 w-5 overflow-hidden rounded-full bg-white/10">
              {tokenIconMap[paymentToken] ? (
                <Image
                  src={tokenIconMap[paymentToken]}
                  alt={paymentToken}
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[8px] font-bold text-white">
                  {paymentToken[0]}
                </span>
              )}
            </div>
            <span className="text-white font-semibold text-sm">
              {paymentToken}
            </span>
          </div>
          <input
            type="text"
            inputMode="decimal"
            value={paymentAmount}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0.00"
            disabled={!address || (!onConfirm && isLoading)}
            className="flex-1 bg-transparent text-white text-xl font-bold text-right outline-none placeholder:text-white/30 disabled:opacity-50 min-w-0"
          />
        </div>
        <div className="flex justify-end">
          <span className="text-white/30 text-xs">
            {isLoadingBalance
              ? "Loading balance…"
              : paymentBalance
                ? `Balance: ${formatAmount(paymentBalance, 4)} ${paymentToken}`
                : ""}
          </span>
        </div>
        {isInsufficientBalance && (
          <p className="text-red-400 text-xs">
            Insufficient {paymentToken} balance
          </p>
        )}
      </div>

      {/* Output estimate */}
      <div className="flex flex-col gap-1.5">
        <span className="text-white/50 text-xs font-medium">
          You receive (estimated)
        </span>
        <div className="rounded-xl bg-[#252525] p-3 min-h-[48px] flex items-center">
          {isLoadingQuote ? (
            <span className="text-white/40 text-sm">Calculating…</span>
          ) : hasOutput ? (
            <span className="text-white text-xl font-bold tabular-nums">
              {formatAmount(amountOut, 6)}{" "}
              <span className="text-white/60 text-base">{symbol}</span>
            </span>
          ) : (
            <span className="text-white/30 text-xl font-bold">-</span>
          )}
        </div>
        {quoteError && !isLoadingQuote && (
          <p className="text-red-400 text-xs">{quoteError}</p>
        )}
      </div>

      {/* Action */}
      {!address ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center text-white/50 text-sm">
          Connect your wallet to continue
        </div>
      ) : (
        <button
          type="button"
          onClick={handleConfirmClick}
          disabled={!canConfirm}
          className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#229EDF] text-white font-semibold text-base hover:bg-[#1a8bc7] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {buttonLabel}
        </button>
      )}

      {/* Only shown in buy-now mode after a confirmed transaction */}
      {!onConfirm && txHash && (
        <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Purchase confirmed</span>
        </div>
      )}
    </div>
  );
}
