"use client";

import { useFxRate } from "@/hooks/useFxRate";
import { useCurrencyStore } from "@/stores/currency.store";
import { convertUsdToSelected, formatCurrency } from "@/lib/helpers/currency";
import { formatAmount } from "@/lib/helpers/formatUtils";
import type {
  Projection,
  SimulatorDestination,
  SimulatorToken,
} from "../../types/simulator.types";

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
  const selectedCurrency = useCurrencyStore((s) => s.selectedCurrency);
  const { rate: fxRate } = useFxRate({ currency: selectedCurrency });

  const isHoldBondOnly = destination.kind === "yield-token";

  const amountLabel = `${formatAmount(amount)} ${token.code}`;
  const apyLabel =
    apy === null || apy <= 0 ? "current" : `${apy.toFixed(2)}% yearly`;

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
        Type an amount on the left to see projected growth after a year.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#229EDF]/30 bg-[#229EDF]/10 p-4 text-sm text-white">
      <p className="leading-relaxed">
        {isHoldBondOnly ? (
          <>
            You hold <span className="font-semibold">{amountLabel}</span> of{" "}
            <span className="font-semibold">{destination.name}</span>. After 1
            year at <span className="font-semibold">{apyLabel}</span> growth,
            you&apos;d have approximately{" "}
          </>
        ) : (
          <>
            You put <span className="font-semibold">{amountLabel}</span> into{" "}
            <span className="font-semibold">{destination.name}</span>. After 1
            year at <span className="font-semibold">{apyLabel}</span> earnings,
            you&apos;d have approximately{" "}
          </>
        )}
        <span className="font-semibold text-[#229EDF]">{totalLabel ?? ""}</span>
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
