"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeftRight, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import type { AssetInfo } from "@/features/shared/discover/types/discover";

interface ExpertAssetMobileActionsProps {
  symbolUpper: string;
  stockInfo: AssetInfo;
  isSwappable: boolean;
}

export function ExpertAssetMobileActions({
  symbolUpper,
  stockInfo,
  isSwappable,
}: ExpertAssetMobileActionsProps) {
  const t = useTranslations("expert.discover");
  const isInstitutional = Boolean(stockInfo.taxonomy?.institutional);
  const buyLabel =
    isInstitutional ||
    !isSwappable ||
    stockInfo.buyInfo?.actionLabel === "discover"
      ? t("discoverMoreOn")
      : t("buyOn");

  return (
    <div className="flex w-full justify-center gap-3">
      {!isInstitutional && isSwappable && (
        <Link
          href={`/swap?to=${symbolUpper}`}
          className="flex flex-1 min-w-0 items-center justify-center gap-2 px-3 py-3 rounded-xl bg-[#229EDF] text-white font-semibold text-sm text-center hover:bg-[#1a8bc7] transition-colors border border-[#229EDF]/50"
        >
          <ArrowLeftRight className="h-4 w-4 shrink-0" />
          <span className="leading-tight">{t("swapOnNeko")}</span>
        </Link>
      )}
      {stockInfo.buyInfo && (
        <Link
          href={stockInfo.buyInfo.url}
          className="flex flex-1 min-w-0 items-center justify-center gap-2 px-3 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-sm text-center transition-colors border border-white/20"
        >
          <ExternalLink className="h-4 w-4 shrink-0" />
          <span className="leading-tight">
            {buyLabel} {stockInfo.buyInfo.platform}
          </span>
        </Link>
      )}
    </div>
  );
}
