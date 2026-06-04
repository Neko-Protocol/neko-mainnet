"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Info, TrendingUp } from "lucide-react";
import { fromSmallestUnit } from "@/lib/helpers/tokenUtils";
import { formatCurrency } from "@/lib/helpers/currency";
import type { SupportedCurrency } from "@/stores/currency.store";
import { useVaultPpsHistory } from "@/features/shared/vault/hooks/useVaultPpsHistory";

const ONE_SHARE = 1_000_000_000_000n;
const MS_PER_YEAR = 365 * 24 * 60 * 60 * 1000;
const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;

function formatChartLabel(t: number): string {
  const d = new Date(t);
  return `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}`;
}

export function LiveEarningsCard({
  vaultId,
  userShares,
  assetSymbol,
  currentValue,
  netDeposited,
  firstDepositMs,
  apyPercent,
  tokenPriceInCurrency,
  selectedCurrency,
}: {
  vaultId: string;
  userShares: bigint;
  assetSymbol: string;
  currentValue: number;
  netDeposited: number;
  firstDepositMs: number | null;
  apyPercent: number;
  tokenPriceInCurrency?: number;
  selectedCurrency?: SupportedCurrency;
}) {
  const apyDecimal = Math.max(0, apyPercent) / 100;
  const perSecond = apyDecimal / SECONDS_PER_YEAR;

  const baseValueRef = useRef(currentValue);
  const mountTsRef = useRef(Date.now());
  const [liveValue, setLiveValue] = useState(currentValue);

  const { data } = useVaultPpsHistory(vaultId);
  const points = data?.points ?? [];

  useEffect(() => {
    baseValueRef.current = currentValue;
    mountTsRef.current = Date.now();
    setLiveValue(currentValue);
  }, [currentValue]);

  useEffect(() => {
    if (apyDecimal === 0) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) return;

    const id = window.setInterval(() => {
      const elapsedSec = (Date.now() - mountTsRef.current) / 1000;
      setLiveValue(baseValueRef.current * (1 + perSecond * elapsedSec));
    }, 50);

    return () => window.clearInterval(id);
  }, [apyDecimal, perSecond]);

  const { chartData, isModeled } = useMemo(() => {
    const now = Date.now();

    type HistoryPoint = {
      t: number;
      value: number;
      kind: "real" | "modeled";
    };

    let historyPoints: HistoryPoint[] = [];
    let modeled = false;

    if (points.length >= 2 && userShares > 0n) {
      historyPoints = points.map((point) => {
        const underlyingStroops = (userShares * BigInt(point.pps)) / ONE_SHARE;
        const value = parseFloat(
          fromSmallestUnit(underlyingStroops.toString(), 7)
        );
        return {
          t: Date.parse(point.recordedAt),
          value,
          kind: "real" as const,
        };
      });
    } else {
      modeled = true;
      const startTs = firstDepositMs ?? now - 30 * 86400000;
      const count = 40;
      const span = Math.max(now - startTs, 1);

      for (let i = 0; i < count; i++) {
        const t = startTs + (i / (count - 1)) * span;
        const yearsElapsed = (t - startTs) / MS_PER_YEAR;
        const value = netDeposited * (1 + apyDecimal * yearsElapsed);
        historyPoints.push({ t, value, kind: "modeled" });
      }

      const lastVal = historyPoints[historyPoints.length - 1]?.value ?? 0;
      if (lastVal > 0 && Math.abs(lastVal - currentValue) > 1e-9) {
        const scale = currentValue / lastVal;
        historyPoints = historyPoints.map((p) => ({
          ...p,
          value: p.value * scale,
        }));
      } else if (historyPoints.length > 0) {
        historyPoints[historyPoints.length - 1].value = currentValue;
      }
    }

    const projectionCount = 20;
    const projectionEnd = now + 30 * 86400000;
    const projectionSpan = projectionEnd - now;

    const rows: {
      label: string;
      actual: number | null;
      projected: number | null;
    }[] = [];

    for (let i = 0; i < historyPoints.length; i++) {
      const p = historyPoints[i];
      if (modeled && i === historyPoints.length - 1) {
        rows.push({
          label: formatChartLabel(p.t),
          actual: currentValue,
          projected: currentValue,
        });
      } else {
        rows.push({
          label: formatChartLabel(p.t),
          actual: p.value,
          projected: null,
        });
      }
    }

    if (!modeled) {
      rows.push({
        label: formatChartLabel(now),
        actual: currentValue,
        projected: currentValue,
      });
    }

    for (let i = 1; i < projectionCount; i++) {
      const t = now + (i / (projectionCount - 1)) * projectionSpan;
      const yearsForward = (t - now) / MS_PER_YEAR;
      const value = currentValue * (1 + apyDecimal * yearsForward);
      rows.push({
        label: formatChartLabel(t),
        actual: null,
        projected: value,
      });
    }

    return { chartData: rows, isModeled: modeled };
  }, [
    points,
    userShares,
    currentValue,
    netDeposited,
    firstDepositMs,
    apyDecimal,
  ]);

  const tickIndices = useMemo(
    () =>
      new Set(
        chartData
          .map((_, i) => i)
          .filter((i) => i % 12 === 0 || i === chartData.length - 1)
      ),
    [chartData]
  );

  const yDomain = useMemo((): [number, number] => {
    const values = chartData.flatMap((d) =>
      [d.actual, d.projected].filter((v): v is number => v != null)
    );
    if (values.length === 0) return [0, 1];
    const min = Math.min(...values);
    const max = Math.max(...values);
    return [min * 0.999, max * 1.001];
  }, [chartData]);

  if (currentValue <= 0) return null;

  const liveEarnings = Math.max(0, liveValue - netDeposited);
  const showLiveIndicator = apyDecimal > 0;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-white/70 text-sm font-medium">
          Your earnings, live
        </h3>
        <Info size={13} className="text-white/30" />
        {showLiveIndicator && (
          <span className="ml-1 flex items-center gap-1 text-emerald-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        )}
      </div>

      <div
        className="rounded-xl border border-white/7 p-5"
        style={{ background: "#0e0e0e" }}
      >
        <div className="mb-5">
          <p className="text-white/40 text-xs mb-1">Current value</p>
          <p className="text-white text-3xl sm:text-4xl font-bold tabular-nums leading-none [font-variant-numeric:tabular-nums]">
            {liveValue.toFixed(6)} {assetSymbol}
          </p>
          {tokenPriceInCurrency != null &&
            tokenPriceInCurrency > 0 &&
            selectedCurrency != null && (
              <p className="text-white/40 text-sm mt-1.5 tabular-nums">
                {formatCurrency(
                  liveValue * tokenPriceInCurrency,
                  selectedCurrency,
                  4
                )}
              </p>
            )}
          <div className="mt-3 flex items-center gap-1.5">
            <TrendingUp size={14} className="text-emerald-400 shrink-0" />
            <span className="text-emerald-400 text-sm font-semibold tabular-nums">
              +{liveEarnings.toFixed(6)} {assetSymbol}
            </span>
            <span className="text-white/30 text-xs">
              earned since first deposit
            </span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <AreaChart
            data={chartData}
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="liveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="0"
              stroke="rgba(255,255,255,0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
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
                `${v.toFixed(4)} ${assetSymbol}`,
                "Value",
              ]}
              labelStyle={{
                color: "rgba(255,255,255,0.5)",
                marginBottom: 4,
              }}
              cursor={{ stroke: "rgba(255,255,255,0.1)" }}
            />
            <Area
              type="monotone"
              dataKey="actual"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#liveGrad)"
              dot={false}
              isAnimationActive
              connectNulls
            />
            <Area
              type="monotone"
              dataKey="projected"
              stroke="#22c55e"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill="transparent"
              dot={false}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="inline-flex items-center gap-1.5 text-white/40 text-xs">
            <span
              className="inline-block w-4 h-0 border-t-2 border-dashed border-emerald-500"
              aria-hidden
            />
            Projected at {apyPercent.toFixed(2)}% APY
          </span>
          {isModeled && (
            <span className="text-white/25 text-xs">
              Estimated from APY until live history accumulates.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
