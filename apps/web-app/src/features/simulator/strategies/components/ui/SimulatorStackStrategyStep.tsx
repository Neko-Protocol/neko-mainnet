"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useFilteredDestinations } from "@/features/simulator/strategies/hooks/useFilteredDestinations";
import { DestinationCard } from "@/features/simulator/strategies/components/ui/DestinationCard";
import type {
  SimulatorDestination,
  SimulatorToken,
} from "@/features/simulator/strategies/types/simulator.types";

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
  const t = useTranslations("simulator.stackStep");
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
        <h2 className="text-xl font-semibold text-white">{t("header")}</h2>
        <p className="text-sm text-white/60">
          {t.rich("body", {
            symbol: bondSymbol,
            b: (chunks) => <span className="text-white/80">{chunks}</span>,
          })}
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
        {t("keepSimple")}
      </button>

      <div className="flex shrink-0 flex-wrap items-center gap-2 self-start rounded-full bg-[#2A2A2A] p-1">
        {(
          [
            {
              id: "pools" as const,
              label: t("tabs.pools"),
              count: pools.length,
            },
            {
              id: "vaults" as const,
              label: t("tabs.vaults"),
              count: vaults.length,
            },
          ] as const
        ).map((tabItem) => (
          <button
            key={tabItem.id}
            type="button"
            onClick={() => setTabOverride(tabItem.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              tab === tabItem.id
                ? "bg-[#229EDF] text-white"
                : "text-white/60 hover:text-white"
            )}
          >
            {tabItem.label}
            <span className="ml-2 text-xs text-white/50">{tabItem.count}</span>
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
            {t("empty", { symbol: bondSymbol })}
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
