"use client";

import { useMemo } from "react";
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
import { fromSmallestUnit } from "@/lib/helpers/tokenUtils";
import { useVaultPpsHistory } from "@/features/shared/vault/hooks/useVaultPpsHistory";

const ONE_SHARE = 1_000_000_000_000n;

export function PositionValueChart({
  vaultId,
  userShares,
  assetSymbol,
}: {
  vaultId: string;
  userShares: bigint;
  assetSymbol: string;
}) {
  const { data } = useVaultPpsHistory(vaultId);
  const points = data?.points ?? [];

  const chartData = useMemo(() => {
    return points.map((point) => {
      const valueStroops = (userShares * BigInt(point.pps)) / ONE_SHARE;
      const value = parseFloat(fromSmallestUnit(valueStroops.toString(), 7));
      return { date: point.date, value };
    });
  }, [points, userShares]);

  const hasChart = userShares !== 0n && chartData.length >= 2;
  const lastValue = hasChart ? chartData[chartData.length - 1].value : 0;

  const tickIndices = useMemo(
    () =>
      new Set(
        chartData
          .map((_, i) => i)
          .filter((i) => i % 12 === 0 || i === chartData.length - 1)
      ),
    [chartData]
  );

  const yDomain = useMemo(() => {
    if (!hasChart) return [0, 1] as [number, number];
    const values = chartData.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return [min * 0.999, max * 1.001] as [number, number];
  }, [chartData, hasChart]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-white/70 text-sm font-medium">Position Value</h3>
        <Info size={13} className="text-white/30" />
      </div>

      <div
        className="rounded-xl border border-white/7 p-5"
        style={{ background: "#0e0e0e" }}
      >
        {hasChart ? (
          <>
            <div className="mb-5">
              <p className="text-white/40 text-xs mb-1">Current Value</p>
              <p className="text-white text-4xl font-bold tabular-nums leading-none">
                {lastValue.toFixed(2)} {assetSymbol}
              </p>
            </div>

            <ResponsiveContainer width="100%" height={200}>
              <LineChart
                data={chartData}
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
                  domain={yDomain}
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v.toFixed(2)}
                  width={48}
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
                    `${v.toFixed(2)} ${assetSymbol}`,
                    "Value",
                  ]}
                  labelStyle={{
                    color: "rgba(255,255,255,0.5)",
                    marginBottom: 4,
                  }}
                  cursor={{ stroke: "rgba(255,255,255,0.1)" }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#22c55e"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3, fill: "#22c55e" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </>
        ) : (
          <p className="text-white/30 text-sm text-center py-12">
            Not enough history yet — your position chart will fill in as
            snapshots are recorded.
          </p>
        )}
      </div>
    </div>
  );
}
