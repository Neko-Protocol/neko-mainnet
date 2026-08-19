"use client";

import { useTranslations } from "next-intl";
import { useFxRate } from "@/hooks/useFxRate";
import { useCurrencyStore } from "@/stores/currency.store";
import { convertUsdToSelected, formatCurrency } from "@/lib/helpers/currency";
import { formatAmount } from "@/lib/helpers/formatUtils";
import type {
  Projection,
  SimulatorDestination,
  SimulatorToken,
} from "@/features/simulator/strategies/types/simulator.types";

interface StrategySummaryCardProps {
  token: SimulatorToken;
  destination: SimulatorDestination;
  amount: number;
  apy: number | null;
  oneYearProjection?: Projection;
  hasPrice: boolean;
}

export function StrategySummaryCard({
  token,
  destination,
  amount,
  apy,
  oneYearProjection,
  hasPrice,
}: StrategySummaryCardProps) {
  const t = useTranslations("simulator.summaryCard");
  const selectedCurrency = useCurrencyStore((s) => s.selectedCurrency);
  const { rate: fxRate } = useFxRate({ currency: selectedCurrency });

  const isHoldBondOnly = destination.kind === "yield-token";

  const amountLabel = `${formatAmount(amount)} ${token.code}`;
  const apyLabel =
    apy === null || apy <= 0
      ? t("current")
      : t("yearlyApy", { apy: apy.toFixed(2) });

  const fmtFiat = (usd: number) =>
    !hasPrice
      ? null
      : formatCurrency(convertUsdToSelected(usd, fxRate), selectedCurrency);

  const totalLabel = oneYearProjection
    ? hasPrice
      ? fmtFiat(oneYearProjection.totalUsd)
      : `${formatAmount(oneYearProjection.totalToken)} ${token.code}`
    : null;

  const earningsLabel = oneYearProjection
    ? hasPrice
      ? fmtFiat(oneYearProjection.earningsUsd)
      : `${formatAmount(oneYearProjection.earningsToken)} ${token.code}`
    : null;

  if (amount <= 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#2A2A2A] p-4 text-sm text-white/60">
        {t("emptyState")}
      </div>
    );
  }

  const boldSpan = (chunks: React.ReactNode) => (
    <span className="font-semibold">{chunks}</span>
  );
  const totalSpan = (chunks: React.ReactNode) => (
    <span className="font-semibold text-[#229EDF]">{chunks}</span>
  );

  return (
    <div className="rounded-2xl border border-[#229EDF]/30 bg-[#229EDF]/10 p-4 text-sm text-white">
      <p className="leading-relaxed">
        {t.rich(isHoldBondOnly ? "holdSentence" : "depositSentence", {
          amountValue: amountLabel,
          destinationValue: destination.name,
          apyValue: apyLabel,
          totalValue: totalLabel ?? "",
          amt: boldSpan,
          dest: boldSpan,
          apy: boldSpan,
          total: totalSpan,
        })}
        {earningsLabel ? (
          <>
            {" "}
            (
            <span className="font-semibold text-[#229EDF]">
              +{earningsLabel}
            </span>
            ).
          </>
        ) : (
          "."
        )}
      </p>
    </div>
  );
}
