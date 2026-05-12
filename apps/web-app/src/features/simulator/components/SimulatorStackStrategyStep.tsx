"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useFilteredDestinations } from "../hooks/useFilteredDestinations";
import { DestinationCard } from "./ui/DestinationCard";
import type {
  SimulatorDestination,
  SimulatorToken,
} from "../types/simulator.types";

type StackTab = "pools" | "vaults";

interface SimulatorStackStrategyStepProps {
  walletToken: SimulatorToken;
  bondDestination: SimulatorDestination;
  selectedVenue: SimulatorDestination | null;
  onSelectVenue: (venue: SimulatorDestination | null) => void;
}

function venueLookupToken(
  walletToken: SimulatorToken,
  bondSymbol: string
): SimulatorToken {
  return {
    ...walletToken,
    code: bondSymbol,
    name: bondSymbol,
    balance:
      walletToken.code.toUpperCase() === bondSymbol.toUpperCase()
        ? walletToken.balance
        : 0,
    hasWallet: walletToken.hasWallet,
  };
}

export function SimulatorStackStrategyStep({
  walletToken,
  bondDestination,
  selectedVenue,
  onSelectVenue,
}: SimulatorStackStrategyStepProps) {
  const bondSymbol =
    bondDestination.bondSymbol ?? bondDestination.acceptedTokenCodes[0] ?? "";

  const lookupToken = useMemo(
    () => venueLookupToken(walletToken, bondSymbol),
    [walletToken, bondSymbol]
  );

  const { pools, vaults, isLoading } = useFilteredDestinations(lookupToken);

  const defaultTab = useMemo<StackTab>(() => {
    if (pools.length === 0 && vaults.length > 0) return "vaults";
    return "pools";
  }, [pools.length, vaults.length]);

  const [tabOverride, setTabOverride] = useState<StackTab | null>(null);
  const tab = tabOverride ?? defaultTab;

  const visible = tab === "pools" ? pools : vaults;
  const total = pools.length + vaults.length;

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <header className="shrink-0 flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-white">
          Want to earn even more?
        </h2>
        <p className="text-sm text-white/60">
          Your <span className="text-white/80">{bondSymbol}</span> is already
          earning bond yield. Add it to a pool or vault to stack an extra layer
          of returns on top, or keep it simple.
        </p>
      </header>

      <button
        type="button"
        onClick={() => onSelectVenue(null)}
        className={cn(
          "shrink-0 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors",
          selectedVenue === null
            ? "border-[#229EDF] bg-[#229EDF]/15 text-white"
            : "border-white/10 bg-[#2A2A2A] text-white/75 hover:border-white/20"
        )}
      >
        Just the bond. Keep it simple.
      </button>

      <div className="flex shrink-0 flex-wrap items-center gap-2 self-start rounded-full bg-[#2A2A2A] p-1">
        {(
          [
            {
              id: "pools" as const,
              label: "Liquidity Pools",
              count: pools.length,
            },
            {
              id: "vaults" as const,
              label: "Auto-Invest",
              count: vaults.length,
            },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTabOverride(t.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-[#229EDF] text-white"
                : "text-white/60 hover:text-white"
            )}
          >
            {t.label}
            <span className="ml-2 text-xs text-white/50">{t.count}</span>
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]">
        {isLoading && total === 0 ? (
          <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-white/10 bg-[#2A2A2A]">
            <LoadingSpinner />
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#2A2A2A] p-6 text-center text-sm text-white/60">
            No options accept {bondSymbol} yet. Use the button above or try
            another tab.
          </div>
        ) : (
          <div className="flex flex-col gap-3 pb-1">
            {visible.map((destination) => (
              <DestinationCard
                key={`${destination.kind}:${destination.id}`}
                destination={destination}
                isSelected={selectedVenue?.id === destination.id}
                onSelect={(d) => {
                  onSelectVenue(d);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
