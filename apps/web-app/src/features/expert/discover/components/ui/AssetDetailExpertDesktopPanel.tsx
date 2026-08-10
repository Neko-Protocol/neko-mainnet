"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeftRight, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import type { AssetInfo } from "@/features/shared/discover/types/discover";

interface AssetDetailExpertDesktopPanelProps {
  symbol: string;
  stockInfo: AssetInfo;
}

export function AssetDetailExpertDesktopPanel({
  symbol,
  stockInfo,
}: AssetDetailExpertDesktopPanelProps) {
  const t = useTranslations("expert.discover");
  const isInstitutional = Boolean(stockInfo.taxonomy?.institutional);
  const buyLabel = isInstitutional ? t("discoverMoreOn") : t("buyOn");

  return (
    <div className="p-6 flex flex-col gap-3 rounded-2xl lg:rounded-none">
      {!isInstitutional && (
        <Link
          href={`/swap?to=${symbol}`}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#229EDF] text-white font-semibold text-sm hover:bg-[#1a8bc7] transition-colors border border-[#229EDF]/50"
        >
          <ArrowLeftRight className="h-4 w-4" />
          {t("swapOnNeko")}
        </Link>
      )}

      {stockInfo.buyInfo && (
        <Link
          href={stockInfo.buyInfo.url}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-sm transition-colors border border-white/20"
        >
          <ExternalLink className="h-4 w-4" />
          {buyLabel} {stockInfo.buyInfo.platform}
        </Link>
      )}
    </div>
  );
}
