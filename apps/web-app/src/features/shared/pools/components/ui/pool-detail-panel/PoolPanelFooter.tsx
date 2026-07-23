"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CollateralOption } from "./types";

export function PoolPanelFooter({
  depositWithdrawMode,
  isWalletConnected,
  onAmmSubmit,
  ammSubmitDisabled,
  isAmmSubmitting,
  isDepositTab,
  supportsBorrow,
  canLend,
  canWithdraw,
  canBorrow,
  mode,
  onLendSubmit,
  onWithdrawSubmit,
  collateralAmount,
  isLendingActionPending,
  onBorrowSubmit,
  borrowAmount,
  selectedCollateral,
  collateralInputAmount,
  collateralBelowMinimum,
  poolCollateralOptionsLength,
  borrowExceedsHf,
}: {
  depositWithdrawMode: boolean;
  isWalletConnected: boolean;
  onAmmSubmit?: () => void | Promise<void>;
  ammSubmitDisabled: boolean;
  isAmmSubmitting: boolean;
  isDepositTab: boolean;
  supportsBorrow: boolean;
  canLend: boolean;
  canWithdraw: boolean;
  canBorrow: boolean;
  mode: "lend" | "withdraw" | "borrow";
  onLendSubmit?: (supplyAmount: string) => void | Promise<void>;
  onWithdrawSubmit?: (withdrawAmount: string) => void | Promise<void>;
  collateralAmount: string;
  isLendingActionPending: boolean;
  onBorrowSubmit?: (
    borrowAmount: string,
    collateralAssetAddress: string,
    collateralAmount: string
  ) => void | Promise<void>;
  borrowAmount: string;
  selectedCollateral: CollateralOption | undefined;
  collateralInputAmount: string;
  collateralBelowMinimum: boolean;
  poolCollateralOptionsLength: number;
  borrowExceedsHf: boolean;
}) {
  const t = useTranslations("sharedPools.footer");
  const walletHint = !isWalletConnected && (
    <p className="text-white/35 text-xs text-center mb-2">{t("connectHint")}</p>
  );

  const primaryBtn =
    "w-full py-3.5 rounded-xl bg-[#229EDF] text-white font-semibold text-sm hover:bg-[#1a8bc7] transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

  const btnSpinner = (label: string) => (
    <span className="flex items-center justify-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </span>
  );

  return (
    <>
      {depositWithdrawMode && onAmmSubmit && (
        <div className="sticky bottom-0 pt-3 bg-[#111111]">
          {walletHint}
          <button
            type="button"
            onClick={() => void onAmmSubmit()}
            disabled={ammSubmitDisabled}
            className={primaryBtn}
          >
            {isAmmSubmitting
              ? btnSpinner(isDepositTab ? t("depositing") : t("withdrawing"))
              : isDepositTab
                ? t("deposit")
                : t("withdraw")}
          </button>
        </div>
      )}

      {!depositWithdrawMode &&
        supportsBorrow &&
        (canLend || canWithdraw || canBorrow) && (
          <div className="sticky bottom-0 pt-3 bg-[#111111]">
            {walletHint}
            {mode === "lend" && canLend && onLendSubmit && (
              <button
                type="button"
                onClick={() => void onLendSubmit(collateralAmount)}
                disabled={
                  isLendingActionPending ||
                  !isWalletConnected ||
                  !collateralAmount ||
                  parseFloat(collateralAmount) <= 0
                }
                className={primaryBtn}
              >
                {isLendingActionPending ? btnSpinner(t("lending")) : t("lend")}
              </button>
            )}
            {mode === "withdraw" && canWithdraw && onWithdrawSubmit && (
              <button
                type="button"
                onClick={() => void onWithdrawSubmit(collateralAmount)}
                disabled={
                  isLendingActionPending ||
                  !isWalletConnected ||
                  !collateralAmount ||
                  parseFloat(collateralAmount) <= 0
                }
                className={primaryBtn}
              >
                {isLendingActionPending
                  ? btnSpinner(t("withdrawing"))
                  : t("withdraw")}
              </button>
            )}
            {mode === "borrow" && canBorrow && onBorrowSubmit && (
              <button
                type="button"
                onClick={() =>
                  void onBorrowSubmit(
                    borrowAmount,
                    selectedCollateral?.address ?? "",
                    collateralInputAmount
                  )
                }
                disabled={
                  isLendingActionPending ||
                  !isWalletConnected ||
                  !borrowAmount ||
                  parseFloat(borrowAmount) <= 0 ||
                  collateralBelowMinimum ||
                  (!!poolCollateralOptionsLength &&
                    (!collateralInputAmount ||
                      parseFloat(collateralInputAmount) <= 0) &&
                    parseFloat(selectedCollateral?.userBalance ?? "0") <= 0) ||
                  (!!selectedCollateral?.walletBalance &&
                    !!collateralInputAmount &&
                    parseFloat(collateralInputAmount) >
                      parseFloat(selectedCollateral.walletBalance)) ||
                  borrowExceedsHf
                }
                className={primaryBtn}
              >
                {isLendingActionPending
                  ? btnSpinner(t("borrowing"))
                  : t("borrow")}
              </button>
            )}
          </div>
        )}

      {!depositWithdrawMode && !supportsBorrow && canLend && onLendSubmit && (
        <div className="sticky bottom-0 pt-3 bg-[#111111]">
          {walletHint}
          <button
            type="button"
            onClick={() => void onLendSubmit(collateralAmount)}
            disabled={
              isLendingActionPending ||
              !isWalletConnected ||
              !collateralAmount ||
              parseFloat(collateralAmount) <= 0
            }
            className={primaryBtn}
          >
            {isLendingActionPending ? btnSpinner(t("lending")) : t("lend")}
          </button>
        </div>
      )}
    </>
  );
}
