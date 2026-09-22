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
import { useTranslations } from "next-intl";
import { AppTooltip } from "@/components/ui/AppTooltip";
import { fromSmallestUnit } from "@neko-protocol/orchestrator";
import { formatCurrency } from "@/lib/helpers/currency";
import { useLocaleFormatter } from "@/lib/helpers/useLocaleFormatter";
import type { SupportedCurrency } from "@/stores/currency.store";
import {
  useVaultPpsHistory,
  type VaultPpsPoint,
} from "@/features/shared/vault/hooks/useVaultPpsHistory";

const ONE_SHARE = 1_000_000_000_000n;
const MS_PER_YEAR = 365 * 24 * 60 * 60 * 1000;
const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
const INTRO_DURATION_MS = 1200;
const HISTORY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const HISTORY_BUCKET_MS = 4 * 60 * 60 * 1000;
const MAX_PROJECTION_MS = 7 * 24 * 60 * 60 * 1000;
const EMPTY_PPS_POINTS: VaultPpsPoint[] = [];

function formatChartLabel(
  t: number,
  formatDate: ReturnType<typeof useLocaleFormatter>["formatDate"]
): string {
  return formatDate(new Date(t), { day: "numeric", month: "short" });
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
    if (skipAnimation) return;

    let rafId = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      setValue(target * easeOutCubic(p));
      if (p < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

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
  const t = useTranslations("sharedVault.earningsCard");
  const { formatDate } = useLocaleFormatter();
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const apyDecimal = Math.max(0, apyPercent) / 100;
  const perSecond = apyDecimal / SECONDS_PER_YEAR;
  const [chartNow] = useState(Date.now);

  const liveBaseRef = useRef(currentValue);
  const liveStartRef = useRef(0);
  const introDoneRef = useRef(prefersReduced);
  const [displayValue, setDisplayValue] = useState(
    prefersReduced ? currentValue : 0
  );

  const depositedAnim = useCountUp(netDeposited);
  const apyAnim = useCountUp(apyPercent, 1000, apyPercent > 0);

  const { data } = useVaultPpsHistory(vaultId);
  const points = data?.points ?? EMPTY_PPS_POINTS;

  useEffect(() => {
    if (prefersReduced) {
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
    const now = chartNow;
    const historyStart = Math.max(
      firstDepositMs ?? now - HISTORY_WINDOW_MS,
      now - HISTORY_WINDOW_MS
    );

    type HistoryPoint = {
      t: number;
      value: number;
      kind: "real" | "modeled";
    };

    let historyPoints: HistoryPoint[] = [];
    let modeled = false;

    const sampledPoints = new Map<number, (typeof points)[number]>();
    for (const point of points) {
      const timestamp = Date.parse(point.recordedAt);
      if (!Number.isFinite(timestamp) || timestamp < historyStart) continue;
      sampledPoints.set(Math.floor(timestamp / HISTORY_BUCKET_MS), point);
    }

    if (sampledPoints.size >= 2 && userShares > 0n) {
      historyPoints = [...sampledPoints.values()].map((point) => {
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
      const startTs = historyStart;
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

    const projectionCount = 12;
    const firstHistoryTimestamp = historyPoints[0]?.t ?? historyStart;
    const projectionSpan = Math.min(
      MAX_PROJECTION_MS,
      Math.max(now - firstHistoryTimestamp, 1)
    );

    const rows: {
      timestamp: number;
      actual: number | null;
      projected: number | null;
    }[] = [];

    for (let i = 0; i < historyPoints.length; i++) {
      const p = historyPoints[i];
      if (modeled && i === historyPoints.length - 1) {
        rows.push({
          timestamp: p.t,
          actual: currentValue,
          projected: currentValue,
        });
      } else {
        rows.push({
          timestamp: p.t,
          actual: p.value,
          projected: null,
        });
      }
    }

    if (!modeled) {
      rows.push({
        timestamp: now,
        actual: currentValue,
        projected: currentValue,
      });
    }

    for (let i = 1; i < projectionCount; i++) {
      const projectedTs = now + (i / (projectionCount - 1)) * projectionSpan;
      const yearsForward = (projectedTs - now) / MS_PER_YEAR;
      const value = currentValue * (1 + apyDecimal * yearsForward);
      rows.push({
        timestamp: projectedTs,
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
    chartNow,
  ]);

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

  const renderedValue = prefersReduced ? currentValue : displayValue;
  const liveEarnings = Math.max(0, renderedValue - netDeposited);
  const showEarningsPulse = apyDecimal > 0 && !prefersReduced;
  const statEnterClass = prefersReduced
    ? ""
    : "animate-in fade-in slide-in-from-bottom-1";

  return (
    <div className="animate-in fade-in">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-white/70 text-sm font-medium">
          {t("yourEarnings")}
        </h3>
        <Info size={13} className="text-white/30" />
      </div>

      <div
        className="rounded-xl border border-white/7 p-5 animate-in fade-in slide-in-from-bottom-2 duration-500"
        style={{ background: "#1a1a1a" }}
      >
        <div className="mb-5">
          <p className="text-white/40 text-xs mb-1">{t("currentValue")}</p>
          <p className="text-white text-3xl sm:text-4xl font-bold tabular-nums leading-none [font-variant-numeric:tabular-nums]">
            {renderedValue.toFixed(6)} {assetSymbol}
          </p>
          {tokenPriceInCurrency != null &&
            tokenPriceInCurrency > 0 &&
            selectedCurrency != null && (
              <p className="text-white/40 text-sm mt-1.5 tabular-nums">
                {formatCurrency(
                  renderedValue * tokenPriceInCurrency,
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
              {t("earnedSinceFirstDeposit")}
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
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickCount={6}
              tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={36}
              tickFormatter={(timestamp) =>
                formatChartLabel(Number(timestamp), formatDate)
              }
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
                t("value"),
              ]}
              labelFormatter={(timestamp) =>
                formatDate(new Date(Number(timestamp)), {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              }
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
            />
            <Area
              type="monotone"
              dataKey="projected"
              stroke="#22c55e"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill="transparent"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="inline-flex items-center gap-1.5 text-white/40 text-xs">
            <span
              className="inline-block w-4 h-0 border-t-2 border-dashed border-emerald-500"
              aria-hidden
            />
            {t("projectedAt", { apy: apyPercent.toFixed(2) })}
          </span>
          {isModeled && (
            <span className="text-white/25 text-xs">
              {t("projectedDescription")}
            </span>
          )}
        </div>

        <div className="border-t border-white/5 my-4" />

        <div className="grid grid-cols-2 gap-4">
          <div
            className={statEnterClass}
            style={prefersReduced ? undefined : { animationDelay: "60ms" }}
          >
            <p className="text-white/40 text-xs mb-1">{t("deposited")}</p>
            <p className="text-white font-bold text-sm tabular-nums">
              {depositedAnim.toFixed(2)} {assetSymbol}
            </p>
          </div>
          <div
            className={statEnterClass}
            style={prefersReduced ? undefined : { animationDelay: "120ms" }}
          >
            <div className="flex items-center gap-1 mb-1">
              <p className="text-white/40 text-xs">{t("effectiveApy")}</p>
              <AppTooltip
                content={t("effectiveApyTooltip")}
                widthClassName="w-64"
                position="top"
              >
                <button
                  type="button"
                  aria-label={t("effectiveApyAriaLabel")}
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
