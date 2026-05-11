"use client";

import { cn } from "@/lib/utils";
import { useVaultApy } from "@/features/shared/vault/hooks/useVaultApy";
import { getVaultStrategyLabels } from "../../utils/strategyLabels";
import type { SimulatorDestination } from "../../types/simulator.types";
import type { VaultView } from "@/features/shared/vault/types/vault";

interface DestinationCardProps {
  destination: SimulatorDestination;
  isSelected: boolean;
  onSelect: (next: SimulatorDestination) => void;
}

function kindBadgeClass(kind: SimulatorDestination["kind"]) {
  if (kind === "vault")
    return "bg-violet-500/15 text-violet-300 border border-violet-500/20";
  if (kind === "pool")
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  return "bg-white/8 text-white/50";
}

function kindBadgeLabel(kind: SimulatorDestination["kind"]) {
  if (kind === "vault") return "Managed";
  if (kind === "pool") return "Active";
  return "Variable";
}

export function DestinationCard({
  destination,
  isSelected,
  onSelect,
}: DestinationCardProps) {
  const isVault = destination.kind === "vault";
  const {
    vaultApy,
    strategies,
    isLoading: apyLoading,
  } = useVaultApy(isVault ? destination.id : null);

  const apy = isVault ? vaultApy : destination.apy;
  const labels = isVault
    ? getVaultStrategyLabels(destination.raw as VaultView, strategies)
    : destination.strategyLabels;

  const showApySkeleton = apyLoading && isVault;
  const showPositiveApy =
    !showApySkeleton && apy !== null && apy !== undefined && apy > 0;

  const handleClick = () => {
    onSelect({
      ...destination,
      apy: apy ?? destination.apy,
      strategyLabels: labels,
    });
  };

  const badgeLabel = kindBadgeLabel(destination.kind);
  const badgeClass = kindBadgeClass(destination.kind);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex w-full flex-col gap-3 rounded-2xl border border-white/8 bg-[#1C1C1C] p-4 text-left transition-all",
        "hover:bg-[#222222]",
        isSelected && "border-[#229EDF] ring-1 ring-[#229EDF]/40"
      )}
      aria-pressed={isSelected}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold text-white">
              {destination.name}
            </h3>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/70">
              {destination.protocol}
            </span>
          </div>
          {destination.tvlLabel ? (
            <p className="mt-1 flex flex-wrap items-baseline gap-1.5">
              <span className="text-[10px] text-white/30">Pool size</span>
              <span className="text-sm font-medium text-white/80">
                <span className="text-white/50" aria-hidden>
                  $
                </span>
                {destination.tvlLabel}
              </span>
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="text-right">
            {showApySkeleton ? (
              <div
                className="h-8 w-[4.5rem] animate-pulse rounded-md bg-white/[0.08]"
                aria-hidden
              />
            ) : showPositiveApy ? (
              <>
                <p className="text-2xl font-bold leading-tight text-[#229EDF]">
                  {apy!.toFixed(2)}%
                </p>
                <p className="mt-0.5 text-xs text-white/40">/ year</p>
              </>
            ) : (
              <p className="text-2xl leading-tight text-white/30"></p>
            )}
          </div>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
              badgeClass
            )}
          >
            {badgeLabel}
          </span>
        </div>
      </div>

      <ul className="flex flex-col gap-1 text-xs text-white/50">
        {labels.map((label) => (
          <li key={label} className="flex items-center gap-2">
            <span className="h-px w-3 shrink-0 bg-white/20" aria-hidden />
            {label}
          </li>
        ))}
      </ul>
    </button>
  );
}
