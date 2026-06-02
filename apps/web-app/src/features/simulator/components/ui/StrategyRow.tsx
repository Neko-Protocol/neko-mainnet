"use client";

import Image from "next/image";
import { Play, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTokenIcon, getTokenIconFitClass } from "@/lib/helpers/tokenUtils";
import {
  CLASS_ACCENT,
  getAssetTaxonomy,
} from "@/features/shared/discover/utils/assetClass";
import type { SavedStrategy } from "@/stores/strategies.store";
import { useLiveStrategyApy } from "../../hooks/useLiveStrategyApy";

interface StrategyRowProps {
  strategy: SavedStrategy;
  onExecute: () => void;
  onDelete: () => void;
}

export function StrategyRow({
  strategy,
  onExecute,
  onDelete,
}: StrategyRowProps) {
  const {
    name,
    token,
    destination,
    stackVenue,
    amount,
    snapshotApy,
    createdAt,
    sourceRecommendationId,
  } = strategy;

  const { apy: liveApy, isLoading: apyLoading } = useLiveStrategyApy(strategy);
  const effectiveApy = snapshotApy ?? liveApy;
  const hasApy = effectiveApy !== null && effectiveApy !== undefined;

  const destinationLabel = stackVenue
    ? `${destination.name} + ${stackVenue.name}`
    : destination.name;

  const _protocolLabel = stackVenue
    ? `${destination.protocol} + ${stackVenue.protocol}`
    : destination.protocol;

  const typeLabel = stackVenue
    ? "Stacked"
    : destination.kind === "yield-token"
      ? "Bond hold"
      : destination.kind === "vault"
        ? "Auto-invest"
        : "Pool";

  const apyLabel = hasApy ? `${effectiveApy!.toFixed(2)}%` : null;

  const amountNum = parseFloat(amount);
  const hasAmount = Number.isFinite(amountNum) && amountNum > 0;
  const amountLabel = hasAmount
    ? `${amountNum.toLocaleString("en-US", {
        maximumFractionDigits: 6,
      })} ${token.code}`
    : "Set on execute";

  const dateLabel = new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const taxonomy = getAssetTaxonomy(token.code);
  const accent = taxonomy ? CLASS_ACCENT[taxonomy.class] : null;
  const iconSrc = getTokenIcon(token.code) ?? token.iconSrc;
  const labels = [
    destination.protocol,
    ...destination.strategyLabels,
    ...(stackVenue ? [stackVenue.protocol, ...stackVenue.strategyLabels] : []),
  ];
  const _visibleLabels = Array.from(new Set(labels.filter(Boolean))).slice(
    0,
    3
  );

  return (
    <div className="group relative flex h-full min-h-[260px] flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-[#161616] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:bg-[#1A1A1A]">
      {/* Soft accent glow in corner */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-[#229EDF]/[0.07] blur-3xl"
      />

      {/* Header */}
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-sm font-bold text-[#121212] ring-1 ring-white/10">
            {iconSrc ? (
              <Image
                src={iconSrc}
                alt={token.code}
                width={40}
                height={40}
                unoptimized
                className={getTokenIconFitClass(token.code)}
              />
            ) : (
              token.code[0]
            )}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold leading-tight text-white">
              {name}
            </h3>
            <p className="mt-0.5 truncate text-[11px] text-white/45">
              {token.code}
              {token.name && token.name !== token.code
                ? ` · ${token.name}`
                : ""}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {sourceRecommendationId ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#229EDF]/15 px-2 py-0.5 text-[10px] font-semibold text-[#5BB8E8]">
              <Sparkles className="h-2.5 w-2.5" />
              Curated by Neko
            </span>
          ) : null}
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-[10px] font-semibold",
              accent?.chip ?? "bg-white/[0.06] text-white/50"
            )}
          >
            {taxonomy?.classLabel ?? typeLabel}
          </span>
        </div>
      </div>

      {/* APY hero */}
      <div className="relative mt-4">
        {hasApy ? (
          <>
            <p className="bg-gradient-to-r from-white to-[#5BB8E8] bg-clip-text text-4xl font-bold leading-none tracking-tight tabular-nums text-transparent">
              {apyLabel}
            </p>
            <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
              APY · per year
            </p>
          </>
        ) : apyLoading ? (
          <>
            <div className="h-9 w-32 animate-pulse rounded-md bg-white/[0.06]" />
            <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
              Loading APY…
            </p>
          </>
        ) : (
          <>
            <p className="text-4xl font-bold leading-none tracking-tight tabular-nums text-white/30">
              No data
            </p>
            <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
              APY unavailable
            </p>
          </>
        )}
      </div>

      {/* Metadata */}
      <div className="relative mt-4 flex flex-1 flex-col gap-2 border-t border-white/[0.06] pt-4 text-xs">
        <div className="flex items-start justify-between gap-3">
          <span className="shrink-0 text-white/40">Route</span>
          <span className="min-w-0 truncate text-right font-medium text-white/80">
            {destinationLabel}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/40">Amount</span>
          <span className="font-mono text-white/65 tabular-nums">
            {amountLabel}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/40">Saved</span>
          <span className="text-white/55">{dateLabel}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="relative mt-5 grid grid-cols-[1fr_auto] gap-2">
        <button
          type="button"
          onClick={onExecute}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#229EDF] px-3 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(34,158,223,0.3)] transition-all hover:bg-[#1a8ac9] hover:shadow-[0_4px_25px_rgba(34,158,223,0.45)] active:scale-[0.98]"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          Execute strategy
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${name}`}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/40 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
