"use client";

import { useState, useMemo } from "react";
import { X, AlertTriangle } from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { formatAmount } from "@/lib/helpers/formatUtils";
import { toSmallestUnit, fromSmallestUnit } from "@/lib/helpers/tokenUtils";

interface RepayPositionModalProps {
  tokenCode: string;
  debtFormatted: string;
  decimals: number;
  walletBalance: bigint;
  isBalanceLoading: boolean;
  isProcessing: boolean;
  onClose: () => void;
  onConfirm: (amount: bigint) => Promise<void>;
}

export function RepayPositionModal({
  tokenCode,
  debtFormatted,
  decimals,
  walletBalance,
  isBalanceLoading,
  isProcessing,
  onClose,
  onConfirm,
}: RepayPositionModalProps) {
  const [amount, setAmount] = useState("");

  // Convert stale debt string to stroops for comparison
  const debtInStroops = useMemo(() => {
    try {
      return BigInt(toSmallestUnit(debtFormatted, decimals));
    } catch {
      return 0n;
    }
  }, [debtFormatted, decimals]);

  const maxRepayStroops = useMemo(() => {
    if (walletBalance <= 0n || debtInStroops <= 0n) return 0n;
    return walletBalance >= debtInStroops ? debtInStroops : walletBalance;
  }, [walletBalance, debtInStroops]);

  const maxRepayFormatted = useMemo(
    () => fromSmallestUnit(maxRepayStroops.toString(), decimals),
    [maxRepayStroops, decimals]
  );

  const canFullyRepay = walletBalance >= debtInStroops;

  // Parse input amount to bigint
  const amountBigInt = useMemo(() => {
    const num = parseFloat(amount);
    if (!Number.isFinite(num) || num <= 0) return 0n;
    try {
      return BigInt(toSmallestUnit(amount, decimals));
    } catch {
      return 0n;
    }
  }, [amount, decimals]);

  const exceedsBalance = walletBalance > 0n && amountBigInt > walletBalance;
  const exceedsDebt = amountBigInt > debtInStroops && debtInStroops > 0n;
  const insufficientBalance = walletBalance === 0n && !isBalanceLoading;

  const canSubmit =
    !isProcessing && !isBalanceLoading && amountBigInt > 0n && !exceedsBalance;

  const handleMax = () => setAmount(maxRepayFormatted);

  const handleChange = (value: string) =>
    setAmount(value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"));

  const handleConfirm = async () => {
    if (!canSubmit) return;
    // Cap at walletBalance as a final safety net
    const safeAmount =
      amountBigInt > walletBalance ? walletBalance : amountBigInt;
    await onConfirm(safeAmount);
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate__animated animate__fadeIn animate__faster">
        <div className="bg-[#1C1C1C] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-4 sm:p-5 animate__animated animate__fadeInUp animate__faster">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white text-lg font-bold">Repay {tokenCode}</h3>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="text-white/40 hover:text-white transition-colors -mr-1 disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Debt info */}
          <div className="mb-4">
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
              <p className="text-amber-400/70 text-xs mb-0.5">Amount Owed</p>
              <p className="text-amber-400 font-bold text-sm tabular-nums">
                {formatAmount(debtFormatted)}{" "}
                <span className="text-amber-400/50 font-normal text-xs">
                  {tokenCode}
                </span>
              </p>
            </div>
          </div>

          {/* Insufficient balance warning */}
          {insufficientBalance && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-400 text-xs leading-relaxed">
                You have no {tokenCode} in your wallet to repay this position.
              </p>
            </div>
          )}

          {/* Partial repay notice */}
          {!canFullyRepay && !insufficientBalance && !isBalanceLoading && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-amber-400 text-xs leading-relaxed">
                Your balance is below the full debt. You can partially repay up
                to{" "}
                <span className="font-semibold">
                  {formatAmount(maxRepayFormatted)} {tokenCode}
                </span>
                .
              </p>
            </div>
          )}

          {/* Amount input */}
          <div className="mb-4">
            <label className="text-white/60 text-xs font-medium block mb-1.5">
              Amount to repay
            </label>
            <div className="flex items-center bg-[#2A2A2A] border border-white/10 rounded-lg px-3 py-2.5 gap-2 focus-within:border-[#229EDF]/50 transition-colors">
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => handleChange(e.target.value)}
                disabled={isProcessing}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/20 outline-none disabled:opacity-50"
              />
              <span className="text-white/30 text-xs font-medium shrink-0">
                {tokenCode}
              </span>
              <button
                type="button"
                onClick={handleMax}
                disabled={
                  isProcessing || isBalanceLoading || maxRepayStroops <= 0n
                }
                className="text-[#229EDF] text-[8px] font-semibold hover:text-[#229EDF]/80 transition-colors disabled:opacity-50 shrink-0"
              >
                MAX
              </button>
            </div>
            {exceedsBalance && (
              <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                Exceeds your wallet balance
              </p>
            )}
            {exceedsDebt && !exceedsBalance && (
              <p className="text-amber-400 text-xs mt-1.5 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                Exceeds current debt will repay in full
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 rounded-xl border border-white/10 py-2.5 text-white/60 font-semibold text-sm hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={!canSubmit}
              className="flex-1 rounded-xl bg-[#229EDF] hover:bg-[#1a8bc7] py-2.5 text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isProcessing ? "Processing…" : "Repay"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
