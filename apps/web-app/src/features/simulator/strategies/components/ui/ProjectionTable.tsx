"use client";

import { useFxRate } from "@/hooks/useFxRate";
import { useCurrencyStore } from "@/stores/currency.store";
import { convertUsdToSelected, formatCurrency } from "@/lib/helpers/currency";
import { formatAmount } from "@/lib/helpers/formatUtils";
import type { Projection } from "@/features/simulator/strategies/types/simulator.types";

interface ProjectionTableProps {
  projections: Projection[];
  tokenCode: string;
  hasPrice: boolean;
  isLoading?: boolean;
}

export function ProjectionTable({
  projections,
  tokenCode,
  hasPrice,
  isLoading = false,
}: ProjectionTableProps) {
  const selectedCurrency = useCurrencyStore((s) => s.selectedCurrency);
  const { rate: fxRate } = useFxRate({ currency: selectedCurrency });

  const fmtFiat = (usd: number) =>
    !hasPrice
      ? ""
      : formatCurrency(convertUsdToSelected(usd, fxRate), selectedCurrency);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#2A2A2A]">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wider text-white/40">
            <th className="px-4 py-3 text-left font-medium">Period</th>
            <th className="px-4 py-3 text-right font-medium">
              <span className="block">You earn</span>
            </th>
            <th className="px-4 py-3 text-right font-medium">Total value</th>
          </tr>
        </thead>
        <tbody>
          {projections.map((row) => (
            <tr
              key={row.periodLabel}
              className="border-t border-white/5 text-white"
            >
              <td className="px-4 py-3 font-medium">{row.periodLabel}</td>
              <td className="px-4 py-3 text-right">
                <div className="font-semibold text-[#229EDF]">
                  {isLoading ? "" : `+${fmtFiat(row.earningsUsd)}`}
                </div>
                <div className="text-xs text-white/40">
                  {isLoading
                    ? ""
                    : `+${formatAmount(row.earningsToken)} ${tokenCode}`}
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="font-semibold">
                  {isLoading ? "" : fmtFiat(row.totalUsd)}
                </div>
                <div className="text-xs text-white/40">
                  {isLoading
                    ? ""
                    : `${formatAmount(row.totalToken)} ${tokenCode}`}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-white/5 px-4 py-3 text-xs text-white/40">
        Estimates based on current rates. Actual returns will vary.
      </p>
    </div>
  );
}
