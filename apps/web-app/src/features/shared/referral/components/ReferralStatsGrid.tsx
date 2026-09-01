"use client";

import { useTranslations } from "next-intl";
import { useLocaleFormatter } from "@/lib/helpers/useLocaleFormatter";
import { SUMMARY_DISPLAY_DECIMALS } from "@/lib/constants/display";

export interface ReferralStatsGridProps {
  referredConfirmed: number;
  swapVolumeUsd: number;
  vaultTvlUsd: number;
}

export function ReferralStatsGrid({
  referredConfirmed,
  swapVolumeUsd,
  vaultTvlUsd,
}: ReferralStatsGridProps) {
  const t = useTranslations("sharedReferral.settings");
  const { formatCurrency } = useLocaleFormatter();

  const tiles = [
    { key: "referred", label: t("referred"), value: String(referredConfirmed) },
    {
      key: "swapVolume",
      label: t("swapVolume"),
      value: formatCurrency(swapVolumeUsd, "USD", SUMMARY_DISPLAY_DECIMALS),
    },
    {
      key: "vaultTvl",
      label: t("vaultTvl"),
      value: formatCurrency(vaultTvlUsd, "USD", SUMMARY_DISPLAY_DECIMALS),
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {tiles.map((tile) => (
        <div key={tile.key} className="rounded-xl bg-[#2A2A2A] px-3 py-3">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-white/40">
            {tile.label}
          </p>
          <p className="text-base font-semibold text-white">{tile.value}</p>
        </div>
      ))}
    </div>
  );
}
