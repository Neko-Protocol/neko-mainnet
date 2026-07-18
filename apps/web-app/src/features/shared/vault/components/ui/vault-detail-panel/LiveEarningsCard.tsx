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
import { AppTooltip } from "@/components/ui/AppTooltip";
import { fromSmallestUnit } from "@neko/orchestrator";
import { formatCurrency } from "@/lib/helpers/currency";
import type { SupportedCurrency } from "@/stores/currency.store";
import { useVaultPpsHistory } from "@/features/shared/vault/hooks/useVaultPpsHistory";

const ONE_SHARE = 1_000_000_000_000n;
const MS_PER_YEAR = 365 * 24 * 60 * 60 * 1000;
const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
const INTRO_DURATION_MS = 1200;

function formatChartLabel(t: number): string {
  const d = new Date(t);
  return `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}`;
}

function easeOutCubic(p: number): number {
  return 1 - Math.pow(1 - p, 3);
}

function useCountUp(target: number, durationMs = 1000, enabled = true): number {
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const skipAnimation = prefersReduced || !enabled;
  const [value, setValue] = useState(skipAnimation ? target : 0);

  useEffect(() => {
    if (skipAnimation) {
      setValue(target);
      return;
    }

    let rafId = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      setValue(target * easeOutCubic(p));
      if (p < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    setValue(0);
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, durationMs, skipAnimation]);

  if (skipAnimation) {
    return target;
  }

  return value;
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
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const apyDecimal = Math.max(0, apyPercent) / 100;
  const perSecond = apyDecimal / SECONDS_PER_YEAR;

  const liveBaseRef = useRef(currentValue);
  const liveStartRef = useRef(Date.now());
  const introDoneRef = useRef(prefersReduced);
  const [displayValue, setDisplayValue] = useState(currentValue);

  const depositedAnim = useCountUp(netDeposited);
  const apyAnim = useCountUp(apyPercent, 1000, apyPercent > 0);

  const { data } = useVaultPpsHistory(vaultId);
  const points = data?.points ?? [];

  useEffect(() => {
    if (prefersReduced) {
      setDisplayValue(currentValue);
      liveBaseRef.current = currentValue;
      liveStartRef.current = Date.now();
      introDoneRef.current = true;
      return;
    }

    introDoneRef.current = false;
    let rafId = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / INTRO_DURATION_MS);
      setDisplayValue(currentValue * easeOutCubic(p));
      if (p < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        liveBaseRef.current = currentValue;
        liveStartRef.current = Date.now();
        introDoneRef.current = true;
        setDisplayValue(currentValue);
      }
    };

    setDisplayValue(0);
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [currentValue, prefersReduced]);

  useEffect(() => {
    if (prefersReduced || apyDecimal === 0) return;

    const id = window.setInterval(() => {
      if (!introDoneRef.current) return;
      const elapsedSec = (Date.now() - liveStartRef.current) / 1000;
      setDisplayValue(liveBaseRef.current * (1 + perSecond * elapsedSec));
    }, 50);

    return () => window.clearInterval(id);
  }, [apyDecimal, perSecond, prefersReduced]);

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

  const liveEarnings = Math.max(0, displayValue - netDeposited);
  const showEarningsPulse = apyDecimal > 0 && !prefersReduced;
  const statEnterClass = prefersReduced
    ? ""
    : "animate-in fade-in slide-in-from-bottom-1";

  return (
    <div className="animate-in fade-in">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-white/70 text-sm font-medium">Your earnings</h3>
        <Info size={13} className="text-white/30" />
      </div>

      <div
        className="rounded-xl border border-white/7 p-5 animate-in fade-in slide-in-from-bottom-2 duration-500"
        style={{ background: "#1a1a1a" }}
      >
        <div className="mb-5">
          <p className="text-white/40 text-xs mb-1">Current value</p>
          <p className="text-white text-3xl sm:text-4xl font-bold tabular-nums leading-none [font-variant-numeric:tabular-nums]">
            {displayValue.toFixed(6)} {assetSymbol}
          </p>
          {tokenPriceInCurrency != null &&
            tokenPriceInCurrency > 0 &&
            selectedCurrency != null && (
              <p className="text-white/40 text-sm mt-1.5 tabular-nums">
                {formatCurrency(
                  displayValue * tokenPriceInCurrency,
                  selectedCurrency,
                  4
                )}
              </p>
            )}
          <div className="mt-3 flex items-center gap-1.5">
            <TrendingUp size={14} className="text-emerald-400 shrink-0" />
            <span className="text-emerald-400 text-sm font-semibold tabular-nums">
              <span
                className={
                  showEarningsPulse
                    ? "animate-pulse [animation-duration:2.5s]"
                    : undefined
                }
              >
                +{liveEarnings.toFixed(6)}
              </span>{" "}
              {assetSymbol}
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

        <div className="border-t border-white/5 my-4" />

        <div className="grid grid-cols-2 gap-4">
          <div
            className={statEnterClass}
            style={prefersReduced ? undefined : { animationDelay: "60ms" }}
          >
            <p className="text-white/40 text-xs mb-1">Deposited</p>
            <p className="text-white font-bold text-sm tabular-nums">
              {depositedAnim.toFixed(2)} {assetSymbol}
            </p>
          </div>
          <div
            className={statEnterClass}
            style={prefersReduced ? undefined : { animationDelay: "120ms" }}
          >
            <div className="flex items-center gap-1 mb-1">
              <p className="text-white/40 text-xs">Effective APY</p>
              <AppTooltip
                content="This is your annualized return based on actual earnings since your first deposit. This may differ from the vault's current APY, which reflects today's rate. Effective rate averages over your entire holding period, including earlier periods when the rate may have been different."
                widthClassName="w-64"
                position="top"
              >
                <button
                  type="button"
                  aria-label="More information about Effective APY"
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full text-white/40 hover:text-white/70 transition-colors"
                >
                  <Info className="h-3 w-3" />
                </button>
              </AppTooltip>
            </div>
            <p
              className={`font-bold text-sm tabular-nums ${
                apyPercent > 0 ? "text-emerald-400" : "text-white"
              }`}
            >
              {apyPercent > 0 ? `${apyAnim.toFixed(2)}%` : "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
