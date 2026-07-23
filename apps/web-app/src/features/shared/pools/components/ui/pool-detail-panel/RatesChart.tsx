"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePoolRateHistory } from "../../../hooks/usePoolRateHistory";
import { useLocaleFormatter } from "@/lib/helpers/useLocaleFormatter";
import { generateRateHistory } from "./generateRateHistory";

type RatesSeries = "supply" | "borrow";

export function RatesChart({
  poolId,
  supplyApy,
  borrowApy,
}: {
  poolId: string;
  supplyApy: string;
  borrowApy?: string;
}) {
  const t = useTranslations("sharedPools.ratesChart");
  const { formatDate } = useLocaleFormatter();
  const supplyRate = parseFloat(supplyApy) || 0;
  const borrowRate = parseFloat(borrowApy ?? "0") || 0;
  const hasBorrow = borrowRate > 0;

  const [series, setSeries] = useState<RatesSeries>(
    hasBorrow ? "borrow" : "supply"
  );

  const { data: history } = usePoolRateHistory(poolId);

  const formatChartLabel = useMemo(
    () => (date: Date) => formatDate(date, { day: "numeric", month: "short" }),
    [formatDate]
  );

  const syntheticSupply = useMemo(
    () => generateRateHistory(supplyRate, formatChartLabel),
    [supplyRate, formatChartLabel]
  );
  const syntheticBorrow = useMemo(
    () => generateRateHistory(borrowRate, formatChartLabel),
    [borrowRate, formatChartLabel]
  );

  const realSupplyData = useMemo(
    () =>
      history && history.length > 0
        ? history.map((p) => ({ date: p.date, value: p.supply_apy }))
        : null,
    [history]
  );
  const realBorrowData = useMemo(
    () =>
      history && history.length > 0 && history.some((p) => p.borrow_apy != null)
        ? history.map((p) => ({ date: p.date, value: p.borrow_apy ?? 0 }))
        : null,
    [history]
  );

  const supplyData = realSupplyData ?? syntheticSupply;
  const borrowData = realBorrowData ?? syntheticBorrow;
  const isRealData = realSupplyData != null;

  const data = series === "supply" ? supplyData : borrowData;
  const currentRate = series === "supply" ? supplyRate : borrowRate;
  const maxVal = Math.max(...data.map((d) => d.value));
  const yMax = Math.ceil(maxVal * 1.3);

  const tickIndices = new Set(
    data.map((_, i) => i).filter((i) => i % 12 === 0 || i === data.length - 1)
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-white/70 text-sm font-medium">
          {t("instantaneousRates")}
        </h3>
        <Info size={13} className="text-white/30" />
        {isRealData && (
          <span className="ml-1 flex items-center gap-1 text-emerald-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            {t("live")}
          </span>
        )}
      </div>

      <div
        className="rounded-xl border border-white/7 p-5"
        style={{ background: "#0e0e0e" }}
      >
        <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
          <div>
            <p className="text-white/40 text-xs mb-1">
              {t("instantaneousRate")}
            </p>
            <p className="text-white text-4xl font-bold tabular-nums leading-none">
              {currentRate.toFixed(4)}%
            </p>
          </div>
          <div className="flex gap-1.5">
            {hasBorrow && (
              <button
                type="button"
                onClick={() => setSeries("borrow")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  series === "borrow"
                    ? "bg-white/15 text-white"
                    : "bg-white/5 text-white/40 hover:text-white/70"
                }`}
              >
                {t("borrow")}
              </button>
            )}
            <button
              type="button"
              onClick={() => setSeries("supply")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                series === "supply"
                  ? "bg-white/15 text-white"
                  : "bg-white/5 text-white/40 hover:text-white/70"
              }`}
            >
              {t("supply")}
            </button>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <LineChart
            data={data}
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="0"
              stroke="rgba(255,255,255,0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              tickFormatter={(v, i) => (tickIndices.has(i) ? v : "")}
            />
            <YAxis
              domain={[0, yMax]}
              tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
              width={36}
            />
            <Tooltip
              contentStyle={{
                background: "#1a1a1a",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: 12,
              }}
              formatter={(v: number) => [
                `${v.toFixed(4)}%`,
                series === "supply" ? t("supply") : t("borrow"),
              ]}
              labelStyle={{ color: "rgba(255,255,255,0.5)", marginBottom: 4 }}
              cursor={{ stroke: "rgba(255,255,255,0.1)" }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: "#3b82f6" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
