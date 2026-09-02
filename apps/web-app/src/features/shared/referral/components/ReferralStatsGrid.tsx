"use client";

import { useTranslations } from "next-intl";
import { useLocaleFormatter } from "@/lib/helpers/useLocaleFormatter";
import { SUMMARY_DISPLAY_DECIMALS } from "@/lib/constants/display";

export interface ReferralStatsGridProps {
  referredConfirmed: number;
  purchasesSwapsUsd: number;
  vaultTvlUsd: number;
}

/** TVL gets its own prominent, colored hero row since it's the metric worth
 * the most; volume/purchases-swaps/referred users are secondary tiles. */
export function ReferralStatsGrid({
  referredConfirmed,
  purchasesSwapsUsd,
  vaultTvlUsd,
}: ReferralStatsGridProps) {
  const t = useTranslations("sharedReferral.settings");
  const { formatCurrency } = useLocaleFormatter();

  const volumeUsd = purchasesSwapsUsd + vaultTvlUsd;

  const tiles = [
    {
      key: "volume",
      label: t("volume"),
      value: formatCurrency(volumeUsd, "USD", SUMMARY_DISPLAY_DECIMALS),
    },
    {
      key: "purchasesSwaps",
      label: t("purchasesSwaps"),
      value: formatCurrency(purchasesSwapsUsd, "USD", SUMMARY_DISPLAY_DECIMALS),
    },
    { key: "referred", label: t("referred"), value: String(referredConfirmed) },
  ];

  return (
    <div className="flex flex-col gap-2">
      <p className="mt-1 text-sm font-semibold text-white">{t("statsTitle")}</p>

      <div className="rounded-xl bg-[#2A2A2A] px-4 py-5">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-white/40">
          {t("vaultTvl")}
        </p>
        <p className="text-2xl font-bold tabular-nums text-white">
          {formatCurrency(vaultTvlUsd, "USD", SUMMARY_DISPLAY_DECIMALS)}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {tiles.map((tile) => (
          <div key={tile.key} className="rounded-xl bg-[#2A2A2A] px-3 py-5">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-white/40">
              {tile.label}
            </p>
            <p className="text-xl font-bold tabular-nums text-white">
              {tile.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
