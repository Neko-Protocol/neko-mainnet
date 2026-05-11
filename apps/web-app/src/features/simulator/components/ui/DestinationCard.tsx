"use client";

import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/useHaptics";
import { useVaultApy } from "@/features/shared/vault/hooks/useVaultApy";
import type { SimulatorDestination } from "../../types/simulator.types";

interface DestinationCardProps {
  destination: SimulatorDestination;
  isSelected: boolean;
  onSelect: (next: SimulatorDestination) => void;
}

export function DestinationCard({
  destination,
  isSelected,
  onSelect,
}: DestinationCardProps) {
  const { light } = useHaptics();
  const isVault = destination.kind === "vault";
  const { vaultApy, isLoading: apyLoading } = useVaultApy(
    isVault ? destination.id : null
  );

  const apy = isVault ? vaultApy : destination.apy;

  const showApySkeleton = apyLoading && isVault;
  const showPositiveApy =
    !showApySkeleton && apy !== null && apy !== undefined && apy > 0;

  const handleClick = () => {
    light();
    onSelect({
      ...destination,
      apy: apy ?? destination.apy,
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex w-full flex-col rounded-2xl border border-white/8 bg-[#1C1C1C] p-4 text-left transition-all",
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
        <div className="flex shrink-0 flex-col items-end text-right">
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
              {destination.blndEmissionsApy &&
              destination.blndEmissionsApy > 0 ? (
                <p className="mt-1 text-xs font-medium text-emerald-400">
                  +{destination.blndEmissionsApy.toFixed(2)}% BLND
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-2xl leading-tight text-white/30"></p>
          )}
        </div>
      </div>
    </button>
  );
}
