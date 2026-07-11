"use client";

import Image from "next/image";
import { ArrowRight, Bookmark, BookmarkCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTokenIcon, getTokenIconFitClass } from "@/lib/helpers/tokenDisplay";
import {
  CLASS_ACCENT,
  getAssetTaxonomy,
} from "@/features/shared/discover/utils/assetClass";
import type { ResolvedRecommendedStrategy } from "../../hooks/useRecommendedStrategies";
import { useLiveStrategyApy } from "../../hooks/useLiveStrategyApy";

interface RecommendedStrategyCardProps {
  item: ResolvedRecommendedStrategy;
  onUse: () => void;
  onSave: () => void;
  isSaved: boolean;
  canSave: boolean;
}

export function RecommendedStrategyCard({
  item,
  onUse,
  onSave,
  isSaved,
  canSave,
}: RecommendedStrategyCardProps) {
  const { dto, token, destination, stackVenue } = item;

  const { apy: liveApy, isLoading: apyLoading } = useLiveStrategyApy({
    token,
    destination,
    stackVenue,
  });
  const effectiveApy = apyLoading
    ? null
    : (liveApy ??
      dto.snapshotApy ??
      destination.apy ??
      stackVenue?.apy ??
      null);
  const hasApy =
    !apyLoading &&
    effectiveApy !== null &&
    effectiveApy !== undefined &&
    Number.isFinite(effectiveApy);
  const apyLabel = hasApy ? `${effectiveApy!.toFixed(2)}%` : null;

  const destinationLabel = stackVenue
    ? `${destination.name} + ${stackVenue.name}`
    : destination.name;

  const protocolLabel = stackVenue
    ? `${destination.protocol} + ${stackVenue.protocol}`
    : destination.protocol;

  const typeLabel = stackVenue
    ? "Stacked"
    : destination.kind === "yield-token"
      ? "Bond hold"
      : destination.kind === "vault"
        ? "Auto-invest"
        : "Pool";

  const amountNum = dto.amount ? parseFloat(dto.amount) : NaN;
  const hasAmount = Number.isFinite(amountNum) && amountNum > 0;
  const amountLabel = hasAmount
    ? `${amountNum.toLocaleString("en-US", {
        maximumFractionDigits: 6,
      })} ${token.code}`
    : "Set on execute";

  const taxonomy = getAssetTaxonomy(token.code);
  const accent = taxonomy ? CLASS_ACCENT[taxonomy.class] : null;
  const iconSrc = getTokenIcon(token.code) ?? token.iconSrc;

  return (
    <div className="group relative flex h-full min-h-[260px] flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-[#161616] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:bg-[#1A1A1A]">
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
              {dto.name}
            </h3>
            <p className="mt-0.5 truncate text-[11px] text-white/45">
              {token.code}
              {token.name && token.name !== token.code
                ? ` · ${token.name}`
                : ""}
            </p>
          </div>
        </div>

        <span className="shrink-0 rounded-md bg-[#229EDF]/15 px-2 py-0.5 text-[10px] font-semibold text-[#5BB8E8]">
          Recommended
        </span>
      </div>

      <div className="relative mt-3 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-[10px] font-semibold",
            accent?.chip ?? "bg-white/[0.06] text-white/50"
          )}
        >
          {taxonomy?.classLabel ?? typeLabel}
        </span>
      </div>

      <div className="relative mt-4">
        {hasApy ? (
          <>
            <p className="text-4xl font-bold leading-none tracking-tight tabular-nums text-white">
              {apyLabel}
            </p>
            <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
              APY - per year
            </p>
          </>
        ) : apyLoading ? (
          <>
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

      <div className="relative mt-4 flex flex-1 flex-col gap-2 border-t border-white/[0.06] pt-4 text-xs">
        <div className="flex items-start justify-between gap-3">
          <span className="shrink-0 text-white/40">Route</span>
          <span className="min-w-0 truncate text-right font-medium text-white/80">
            {destinationLabel}
          </span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className="shrink-0 text-white/40">Protocol</span>
          <span className="min-w-0 truncate text-right font-medium text-white/80">
            {protocolLabel}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/40">Amount</span>
          <span className="font-mono text-white/65 tabular-nums">
            {amountLabel}
          </span>
        </div>
      </div>

      <div className="relative mt-5 grid grid-cols-[auto_1fr] gap-2">
        {isSaved ? (
          <button
            type="button"
            disabled
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[#229EDF]/30 bg-transparent px-3 text-sm font-semibold text-[#5BB8E8]"
          >
            <BookmarkCheck className="h-3.5 w-3.5" />
            Saved
          </button>
        ) : (
          <button
            type="button"
            onClick={onSave}
            title={canSave ? undefined : "Connect your wallet to save"}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-transparent px-3 text-sm font-semibold text-white/70 transition-colors hover:border-white/20 hover:bg-white/[0.04] hover:text-white active:scale-[0.98]"
          >
            <Bookmark className="h-3.5 w-3.5" />
            Save
          </button>
        )}
        <button
          type="button"
          onClick={onUse}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#229EDF] px-3 text-sm font-semibold text-white transition-colors hover:bg-[#1a8ac9] active:scale-[0.98]"
        >
          Use this strategy
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
