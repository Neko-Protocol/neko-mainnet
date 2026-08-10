import React from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

export type OrderType = "swap" | "limit" | "twap";

interface SwapButtonProps {
  address: string | undefined;
  canGetQuote: boolean;
  isLoading: boolean;
  txHash: string | null;
  isLoadingQuote: boolean;
  orderType: OrderType;
  isInsufficientBalance?: boolean;
  onClick: () => void;
}

const baseClass =
  "w-full font-bold py-4 text-base rounded-2xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";

export const SwapButton: React.FC<SwapButtonProps> = ({
  address,
  canGetQuote,
  isLoading,
  txHash,
  isLoadingQuote,
  orderType,
  isInsufficientBalance,
  onClick,
}) => {
  const t = useTranslations("expert.swap");
  if (!address) {
    return (
      <button disabled className={`${baseClass} bg-white/10 text-white/40`}>
        {t("button.connectWallet")}
      </button>
    );
  }

  if (orderType !== "swap") {
    return (
      <button disabled className={`${baseClass} bg-white/10 text-white/40`}>
        {t("comingSoon")}
      </button>
    );
  }

  if (!canGetQuote) {
    return (
      <button disabled className={`${baseClass} bg-[#229EDF]/40 text-white/60`}>
        {t("button.enterAmount")}
      </button>
    );
  }

  if (isInsufficientBalance) {
    return (
      <button disabled className={`${baseClass} bg-red-500/20 text-red-400`}>
        {t("button.insufficientBalance")}
      </button>
    );
  }

  if (txHash) {
    return (
      <button
        disabled
        className={`${baseClass} bg-green-500/20 text-green-400`}
      >
        <CheckCircle2 className="h-5 w-5" />
        {t("button.swapCompleted")}
      </button>
    );
  }

  if (isLoading) {
    return (
      <button
        disabled
        className={`${baseClass} bg-[#229EDF] text-white shadow-lg shadow-[#229EDF]/20`}
      >
        <Loader2 className="h-5 w-5 animate-spin" />
        {t("button.processing")}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={isLoadingQuote}
      className={`${baseClass} bg-[#229EDF] hover:bg-[#1a8bc7] text-white shadow-lg shadow-[#229EDF]/20`}
    >
      {t("button.swap")}
    </button>
  );
};
