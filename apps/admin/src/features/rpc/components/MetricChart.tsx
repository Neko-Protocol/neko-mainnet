"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Series } from "../grafana";

export type Format = "percent" | "rate" | "seconds" | "count";

const COLORS = ["#60A5FA", "#34D399", "#FBBF24", "#F87171", "#A78BFA"];

function formatValue(v: number | null, format: Format): string {
  if (v === null || Number.isNaN(v)) return "—";
  switch (format) {
    case "percent":
      return `${(v * 100).toFixed(1)}%`;
    case "seconds":
      return v >= 1 ? `${v.toFixed(2)}s` : `${(v * 1000).toFixed(0)}ms`;
    case "rate":
      return `${v.toFixed(2)}/s`;
    default:
      return v.toLocaleString("en-US");
  }
}

function formatTime(t: number): string {
  return new Date(t).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Merges series onto a shared time axis.
 *
 * Missing points stay `null` rather than becoming 0. Recharts draws a gap for
 * null, which is the honest rendering: an empty division means there was no
 * traffic to measure, and a line dropping to zero would read as an outage.
 */
function toRows(series: Series[]): Record<string, number | null>[] {
  const byTime = new Map<number, Record<string, number | null>>();
  for (const s of series) {
    for (const p of s.points) {
      const row = byTime.get(p.t) ?? { t: p.t };
      row[s.key] = p.v;
      byTime.set(p.t, row);
    }
  }
  return [...byTime.values()].sort((a, b) => (a.t as number) - (b.t as number));
}

export function MetricChart({
  title,
  series,
  format,
  isLoading,
  domain,
}: {
  title: string;
  series: Series[];
  format: Format;
  isLoading?: boolean;
  domain?: [number, number];
}) {
  const rows = toRows(series);
  const keys = series.map((s) => s.key);
  const hasData = rows.some((r) =>
    keys.some((k) => r[k] !== null && r[k] !== undefined)
  );

  return (
    <div className="rounded-2xl border border-white/5 bg-[#1C1C1C] p-5">
      <h3 className="mb-4 text-sm font-medium text-white/70">{title}</h3>
      {isLoading ? (
        <div className="h-48 animate-pulse rounded bg-white/5" />
      ) : !hasData ? (
        <div className="flex h-48 items-center justify-center text-sm text-white/30">
          No data in this window
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={192}>
          <AreaChart data={rows}>
            <defs>
              {keys.map((k, i) => (
                <linearGradient
                  key={k}
                  id={`g-${title}-${k}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={COLORS[i % COLORS.length]}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="100%"
                    stopColor={COLORS[i % COLORS.length]}
                    stopOpacity={0}
                  />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke="#ffffff10" vertical={false} />
            <XAxis
              dataKey="t"
              tickFormatter={formatTime}
              stroke="#ffffff30"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              minTickGap={40}
            />
            <YAxis
              stroke="#ffffff30"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={52}
              domain={domain ?? ["auto", "auto"]}
              tickFormatter={(v: number) => formatValue(v, format)}
            />
            <Tooltip
              contentStyle={{
                background: "#0F0F0F",
                border: "1px solid #ffffff1a",
                borderRadius: 12,
                fontSize: 12,
              }}
              labelFormatter={(t) => formatTime(Number(t))}
              formatter={(v) =>
                formatValue(typeof v === "number" ? v : null, format)
              }
            />
            {keys.map((k, i) => (
              <Area
                key={k}
                type="monotone"
                dataKey={k}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                fill={`url(#g-${title}-${k})`}
                // Gaps stay gaps.
                connectNulls={false}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
