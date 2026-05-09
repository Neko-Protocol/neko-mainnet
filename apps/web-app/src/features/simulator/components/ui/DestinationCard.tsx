"use client";

import { cn } from "@/lib/utils";
import { useVaultApy } from "@/features/shared/vault/hooks/useVaultApy";
import { getVaultStrategyLabels } from "../../utils/strategyLabels";
import type { SimulatorDestination } from "../../types/simulator.types";
import type { VaultView } from "@/features/vault/types/vault";

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

  const apyLabel = (() => {
    if (apyLoading && isVault) return "Calculating earnings...";
    if (apy === null) return "Earnings rate not available";
    if (apy <= 0) return "Earn 0% per year (variable)";
    return `Earn ${apy.toFixed(2)}% per year`;
  })();

  const handleClick = () => {
    onSelect({
      ...destination,
      apy: apy ?? destination.apy,
      strategyLabels: labels,
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex w-full flex-col gap-3 rounded-2xl border bg-[#2A2A2A] p-4 text-left transition-all",
        "hover:border-white/20 hover:bg-[#2F2F2F]",
        isSelected
          ? "border-[#229EDF] ring-1 ring-[#229EDF]/40"
          : "border-white/10"
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
          <p className="mt-1 text-xs text-white/50">
            Total deposited: {destination.tvlLabel || "-"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p
            className={cn(
              "text-base font-semibold",
              apyLoading && isVault
                ? "text-white/50"
                : apy && apy > 0
                  ? "text-[#229EDF]"
                  : "text-white/70"
            )}
          >
            {apyLabel}
          </p>
        </div>
      </div>

      <ul className="flex flex-col gap-1 text-xs text-white/70">
        {labels.map((label) => (
          <li key={label} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#229EDF]" />
            {label}
          </li>
        ))}
      </ul>
    </button>
  );
}
