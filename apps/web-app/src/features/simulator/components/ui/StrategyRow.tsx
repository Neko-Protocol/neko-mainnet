"use client";

import { X } from "lucide-react";
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

  const destLabel = stackVenue
    ? `${destination.name} + ${stackVenue.name}`
    : destination.name;

  const apyLabel =
    snapshotApy !== null && snapshotApy !== undefined
      ? `${snapshotApy.toFixed(2)}%`
      : null;

  const amountNum = parseFloat(amount);
  const hasAmount = Number.isFinite(amountNum) && amountNum > 0;

  const dateLabel = new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="group flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-5 py-4 transition-colors hover:border-white/[0.12] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="truncate font-medium text-white">{name}</span>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="rounded-md bg-white/[0.07] px-2 py-0.5 font-mono text-xs text-white/70">
            {token.code}
          </span>
          <span className="text-xs text-white/25">→</span>
          <span className="text-xs text-white/50">{destLabel}</span>

          {apyLabel && (
            <>
              <span className="text-xs text-white/20">·</span>
              <span className="font-mono text-xs text-white/50">
                {apyLabel}
                <span className="text-white/30">/yr</span>
              </span>
            </>
          )}

          {hasAmount && (
            <>
              <span className="text-xs text-white/20">·</span>
              <span className="font-mono text-xs text-white/40">
                {amountNum.toLocaleString()} {token.code}
              </span>
            </>
          )}

          <span className="text-xs text-white/20">·</span>
          <span className="text-xs text-white/30">{dateLabel}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onExecute}
          className="rounded-full bg-[#229EDF] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1f8ec9]"
        >
          Execute
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete strategy"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-white/30 transition-colors hover:border-red-500/30 hover:text-red-400"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
