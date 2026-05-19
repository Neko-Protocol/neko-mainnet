"use client";

import Image from "next/image";
import { Play, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTokenIcon, getTokenIconFitClass } from "@/lib/helpers/tokenUtils";
import {
  CLASS_ACCENT,
  getAssetTaxonomy,
} from "@/features/shared/discover/utils/assetClass";
import type { SavedStrategy } from "@/stores/strategies.store";

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
  } = strategy;

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

  const apyLabel =
    snapshotApy !== null && snapshotApy !== undefined
      ? `${snapshotApy.toFixed(2)}%`
      : "No data";

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
  const labels = [
    destination.protocol,
    ...destination.strategyLabels,
    ...(stackVenue ? [stackVenue.protocol, ...stackVenue.strategyLabels] : []),
  ];
  const visibleLabels = Array.from(new Set(labels.filter(Boolean))).slice(0, 3);

  return (
    <div className="group flex h-full min-h-[270px] flex-col overflow-hidden rounded-2xl border border-white/5 bg-[#1C1C1C] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:bg-[#202020]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-sm font-bold text-[#121212] ring-1 ring-white/10">
            {(() => {
              const icon = getTokenIcon(token.code) ?? token.iconSrc;
              return icon ? (
                <Image
                  src={icon}
                  alt={token.code}
                  width={44}
                  height={44}
                  unoptimized
                  className={getTokenIconFitClass(token.code)}
                />
              ) : (
                token.code[0]
              );
            })()}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold leading-tight text-white">
              {name}
            </h3>
            <p className="mt-0.5 truncate text-xs text-white/50">
              {token.code}
              {token.name && token.name !== token.code
                ? ` · ${token.name}`
                : ""}
            </p>
          </div>
        </div>

        <span
          className={cn(
            "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold",
            accent?.chip ?? "bg-white/8 text-white/50"
          )}
        >
          {taxonomy?.classLabel ?? typeLabel}
        </span>
      </div>

      <div className="mt-5 flex flex-1 flex-col justify-between gap-4">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/40">
            Strategy APY
          </p>
          <p
            className={cn(
              "text-3xl font-bold tabular-nums",
              snapshotApy !== null && snapshotApy !== undefined
                ? "text-white"
                : "text-white/40"
            )}
          >
            {apyLabel}
            {snapshotApy !== null && snapshotApy !== undefined ? (
              <span className="text-sm font-medium text-white/35"> /yr</span>
            ) : null}
          </p>
        </div>

        <div className="flex flex-col gap-2 text-xs">
          <div className="flex items-start justify-between gap-3 border-t border-white/8 pt-3">
            <span className="shrink-0 text-white/35">Route</span>
            <span className="min-w-0 truncate text-right font-medium text-white/70">
              {destinationLabel}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-white/35">Protocol</span>
            <span className="min-w-0 truncate text-right text-white/55">
              {protocolLabel}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-white/35">Amount</span>
            <span className="font-mono text-white/55">{amountLabel}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-white/35">Saved</span>
            <span className="text-white/45">{dateLabel}</span>
          </div>
        </div>

        {visibleLabels.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {visibleLabels.map((label) => (
              <span
                key={label}
                className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-white/45"
              >
                {label}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
        <button
          type="button"
          onClick={onExecute}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#229EDF]/20 bg-[#229EDF]/10 px-3 text-sm font-semibold text-[#229EDF] transition-colors hover:bg-[#229EDF]/20"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          Execute
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${name}`}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/35 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
