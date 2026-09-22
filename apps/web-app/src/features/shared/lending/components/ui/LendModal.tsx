"use client";

import { useState, useMemo } from "react";
import { X, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { formatAmount } from "@/lib/helpers/formatUtils";
import { decimalToAtomic } from "@neko-protocol/orchestrator";
import type { PoolData } from "../../types/lending";

interface LendModalProps {
  pool: PoolData;
  isDeposit: boolean;
  isLoading: boolean;
  bTokenBalance: string | null;
  isLoadingBalance: boolean;
  hasWallet: boolean;
  onClose: () => void;
  onConfirm: (amount: string) => Promise<void>;
  onRefreshBalance: () => void;
}

export function LendModal({
  pool,
  isDeposit,
  isLoading,
  bTokenBalance,
  isLoadingBalance,
  hasWallet,
  onClose,
  onConfirm,
  onRefreshBalance,
}: LendModalProps) {
  const [amount, setAmount] = useState("");
  const t = useTranslations("sharedLending.modal");

  const isAggregated = !!pool.isAggregated;
  const isPairPool =
    !!pool.token2 && pool.token2 !== "Lending" && pool.token2 !== pool.token1;
  const isPairWithdraw = !isDeposit && pool.protocolId === "aqua" && isPairPool;
  const pairLabel = isPairPool
    ? `${pool.token1} / ${pool.token2}`
    : pool.token1;
  const withdrawLabel =
    pool.withdrawAction === "withdrawCollateral"
      ? t("withdrawLabelRemoveCollateral")
      : t("withdrawLabelWithdraw");
  const withdrawUnitLabel =
    isPairWithdraw && pool.withdrawUnit === "lp_shares"
      ? t("lpShares")
      : pool.token1;
  const positionDisplay = `${pool.depositedAmount} ${withdrawUnitLabel}`;
  const inputLabel = isDeposit
    ? t("amountToDeposit", { token: pool.token1 })
    : isPairWithdraw
      ? t("amountToWithdrawPair", { pair: pairLabel })
      : t("amountToAction", { action: withdrawLabel, token: pool.token1 });
  const estimatedSecondaryOut = useMemo(() => {
    if (
      !isPairWithdraw ||
      pool.withdrawUnit === "lp_shares" ||
      !amount ||
      !pool.depositedAmount ||
      !pool.secondaryDepositedAmount
    ) {
      return null;
    }
    const input = parseFloat(amount);
    const primary = parseFloat(pool.depositedAmount);
    const secondary = parseFloat(pool.secondaryDepositedAmount);
    if (!input || !primary || !secondary) return null;
    return formatAmount((input / primary) * secondary);
  }, [
    amount,
    isPairWithdraw,
    pool.depositedAmount,
    pool.secondaryDepositedAmount,
    pool.withdrawUnit,
  ]);

  const bTokensToBurn = useMemo(() => {
    if (isAggregated) return null;
    if (
      !amount ||
      parseFloat(amount) <= 0 ||
      !pool.bTokenRate ||
      parseFloat(pool.bTokenRate) <= 0
    )
      return null;
    return (parseFloat(amount) / parseFloat(pool.bTokenRate)).toFixed(4);
  }, [amount, pool.bTokenRate, isAggregated]);

  const exceedsAggregatedPosition = useMemo(() => {
    if (isDeposit || !isAggregated || !pool.depositedRaw || !amount) {
      return false;
    }
    try {
      return (
        decimalToAtomic(amount, pool.assetDecimals ?? 7) >
        BigInt(pool.depositedRaw)
      );
    } catch {
      return true;
    }
  }, [amount, isAggregated, isDeposit, pool.assetDecimals, pool.depositedRaw]);

  const canSubmit =
    hasWallet &&
    !!amount &&
    parseFloat(amount) > 0 &&
    (isDeposit ||
      (isAggregated && !exceedsAggregatedPosition) ||
      (!!bTokensToBurn &&
        parseFloat(bTokensToBurn) > 0 &&
        (bTokenBalance === null ||
          parseFloat(bTokensToBurn) <= parseFloat(bTokenBalance))));

  const stats = isAggregated
    ? [
        { label: t("statSupplyApy"), value: pool.roi },
        { label: t("statLiquidity"), value: pool.liquidity },
      ]
    : [
        { label: t("statSupplyApy"), value: pool.roi },
        { label: t("statLiquidity"), value: pool.liquidity },
        {
          label: t("statBTokenRate"),
          value: pool.bTokenRate
            ? formatAmount(pool.bTokenRate)
            : formatAmount(1),
        },
      ];

  const modalContent = (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate__animated animate__fadeIn animate__faster">
      <div className="bg-[#1C1C1C] border border-white/10 rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl p-4 sm:p-5 animate__animated animate__fadeInUp animate__faster">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white text-lg font-bold">
            {isDeposit
              ? t("depositTitle", { name: pool.name })
              : `${withdrawLabel} — ${pool.name}`}
          </h3>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors -mr-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isDeposit && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {stats.map(({ label, value }) => (
              <div key={label} className="bg-white/5 rounded-lg p-2.5">
                <p className="text-white/40 text-[10px] sm:text-xs mb-0.5">
                  {label}
                </p>
                <p className="text-white font-semibold text-xs sm:text-sm truncate">
                  {value}
                </p>
              </div>
            ))}
          </div>
        )}

        {!isDeposit && pool.depositedAmount && (
          <div className="mb-3 rounded-xl bg-[#229EDF]/10 border border-[#229EDF]/20 p-3">
            <p className="text-[#229EDF]/70 text-xs mb-0.5">
              {t("yourPosition")}
            </p>
            <p className="text-[#229EDF] font-bold text-base">
              {positionDisplay}
            </p>
            {isPairWithdraw &&
              pool.secondaryDepositedAmount &&
              pool.secondaryAssetCode && (
                <p className="text-[#229EDF] font-bold text-base mt-1">
                  {pool.secondaryDepositedAmount} {pool.secondaryAssetCode}
                </p>
              )}
          </div>
        )}

        {!isDeposit && !isAggregated && (
          <div className="mb-3 rounded-xl bg-[#229EDF]/10 border border-[#229EDF]/20 p-3 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[#229EDF]/70 text-xs">
                {t("yourBTokenBalance")}
              </p>
              <p className="text-[#229EDF] font-bold text-base truncate">
                {isLoadingBalance ? t("loading") : (bTokenBalance ?? "--")} b
                {pool.token1}
              </p>
            </div>
            <button
              onClick={onRefreshBalance}
              disabled={isLoadingBalance}
              className="text-[#229EDF]/60 hover:text-[#229EDF] transition-colors disabled:opacity-40 shrink-0 ml-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoadingBalance ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        )}

        <div className="mb-3">
          <label className="text-white/60 text-xs font-medium block mb-1">
            {inputLabel}
          </label>
          <div className="relative">
            <input
              type="number"
              placeholder={t("amountPlaceholder")}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isLoading}
              className="w-full bg-[#2A2A2A] border border-white/10 rounded-lg px-3 py-2.5 pr-14 text-sm text-white placeholder:text-white/20 outline-none focus:border-[#229EDF]/50 transition-colors disabled:opacity-50"
            />
            {!isDeposit && pool.depositedAmount && (
              <button
                type="button"
                onClick={() => setAmount(pool.depositedAmount!)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#229EDF] text-xs font-bold hover:text-[#1a8bc7] transition-colors"
              >
                {t("max")}
              </button>
            )}
          </div>
          {!isDeposit && !isAggregated && amount && bTokensToBurn && (
            <p className="text-white/30 text-xs mt-1 italic">
              {t("burnEstimate", { amount: formatAmount(bTokensToBurn) })}
            </p>
          )}
          {isPairWithdraw &&
            estimatedSecondaryOut &&
            pool.secondaryAssetCode && (
              <p className="text-white/40 text-xs mt-1">
                {t("estimatedOutput", {
                  amount,
                  token: pool.token1,
                  secondaryAmount: estimatedSecondaryOut,
                  secondaryToken: pool.secondaryAssetCode,
                })}
              </p>
            )}
          {!isDeposit && exceedsAggregatedPosition && (
            <p className="text-red-400/90 text-xs mt-1">
              {t("exceedsPosition")}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded-xl border border-white/10 py-2.5 text-white/60 font-semibold text-sm hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            {t("cancel")}
          </button>
          <button
            onClick={() => void onConfirm(amount)}
            disabled={isLoading || !canSubmit}
            className="flex-1 rounded-xl bg-[#229EDF] py-2.5 text-white font-semibold text-sm hover:bg-[#1a8bc7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading
              ? t("processing")
              : !hasWallet
                ? t("connectWallet")
                : isDeposit
                  ? t("confirmDeposit")
                  : t("confirmAction", { action: withdrawLabel })}
          </button>
        </div>
      </div>
    </div>
  );

  return <ModalPortal>{modalContent}</ModalPortal>;
}
