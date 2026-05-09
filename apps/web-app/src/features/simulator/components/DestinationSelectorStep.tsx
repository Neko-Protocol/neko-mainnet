"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { CLASS_ACCENT } from "@/features/shared/discover/utils/assetClass";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useFilteredDestinations } from "../hooks/useFilteredDestinations";
import { DestinationCard } from "./ui/DestinationCard";
import type {
  SimulatorDestination,
  SimulatorToken,
} from "../types/simulator.types";

interface DestinationSelectorStepProps {
  token: SimulatorToken;
  selected: SimulatorDestination | null;
  onSelect: (destination: SimulatorDestination) => void;
  onBackToTokens?: () => void;
}

type Tab = "pools" | "vaults" | "hold-bond";

function EtherfuseBondCard({
  destination,
  isSelected,
  onSelect,
}: {
  destination: SimulatorDestination;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const accent = CLASS_ACCENT["sovereign-bond"];
  const symbol =
    destination.bondSymbol ?? destination.acceptedTokenCodes[0] ?? "";
  const apy = destination.apy ?? 0;
  const currency = destination.bondCurrency ?? "";
  const icon = destination.bondIcon;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full flex-col gap-3 rounded-2xl border border-transparent p-4 text-left ring-1 transition-all",
        accent.bg,
        accent.text,
        accent.ring,
        "hover:brightness-110",
        isSelected && "border-[#229EDF] ring-2 ring-[#229EDF]/40"
      )}
      aria-pressed={isSelected}
    >
      <div className="flex items-start gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-blue-500/20 shadow-md">
          {icon ? (
            <Image
              src={icon}
              alt={symbol}
              width={40}
              height={40}
              unoptimized
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-bold">
              {symbol[0]}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-white">
              {destination.name}
            </h3>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                accent.chip
              )}
            >
              Sovereign Bond
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-blue-200">
            Yield-bearing · ~{apy.toFixed(2)}% per year in {currency} while held
          </p>
          {destination.isFallbackApy && (
            <p className="mt-1 text-xs text-white/40">
              Rate estimated · Updates daily
            </p>
          )}
        </div>
      </div>

      <ul className="flex flex-col gap-1 text-xs text-white/80">
        {destination.strategyLabels.map((label) => (
          <li key={label} className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}

export function DestinationSelectorStep({
  token,
  selected,
  onSelect,
  onBackToTokens,
}: DestinationSelectorStepProps) {
  const { pools, vaults, yieldTokens, isLoading } =
    useFilteredDestinations(token);

  const defaultTab = useMemo<Tab>(() => {
    if (pools.length === 0 && vaults.length === 0 && yieldTokens.length > 0) {
      return "hold-bond";
    }
    if (pools.length === 0 && vaults.length > 0) return "vaults";
    return "pools";
  }, [pools.length, vaults.length, yieldTokens.length]);

  const [tabOverride, setTabOverride] = useState<Tab | null>(null);

  const tab = tabOverride ?? defaultTab;

  const handleTabChange = (next: Tab) => setTabOverride(next);

  const visible =
    tab === "pools" ? pools : tab === "vaults" ? vaults : yieldTokens;

  const total = pools.length + vaults.length + yieldTokens.length;

  const tabs = useMemo<{ id: Tab; label: string; count: number }[]>(
    () => [
      { id: "pools", label: "Pools", count: pools.length },
      { id: "vaults", label: "Vaults", count: vaults.length },
      {
        id: "hold-bond",
        label: "Hold bond",
        count: yieldTokens.length,
      },
    ],
    [pools.length, vaults.length, yieldTokens.length]
  );

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <header className="shrink-0 flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-white">
          Where should your {token.code} go?
        </h2>
        <p className="text-sm text-white/60">
          {yieldTokens.length > 0
            ? "Yield-bearing bonds accrue while you hold them. You can also supply the same asset-or stablecoins from step 1-to Pools (AMM liquidity + Neko lending supply) and Vaults for stacked scenarios."
            : "Choose a pool or vault to simulate how your tokens might perform."}
        </p>
      </header>

      <div className="flex shrink-0 flex-wrap items-center gap-2 self-start rounded-full bg-[#2A2A2A] p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => handleTabChange(t.id)}
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
          <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-white/10 bg-[#2A2A2A]">
            <LoadingSpinner />
          </div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-[#2A2A2A] p-8 text-center">
            <p className="text-sm text-white/70">
              No pools, vaults, or bond options match {token.code} yet.
            </p>
            {onBackToTokens && (
              <button
                type="button"
                onClick={onBackToTokens}
                className="text-sm font-medium text-[#229EDF] hover:underline"
              >
                Pick another token
              </button>
            )}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#2A2A2A] p-6 text-center text-sm text-white/60">
            {tab === "hold-bond"
              ? `No sovereign bond options are available for ${token.code} in this network's asset list.`
              : `No ${tab} accept ${token.code} yet. Try another tab.`}
          </div>
        ) : tab === "hold-bond" ? (
          <div className="flex flex-col gap-3 pb-1">
            {(visible as SimulatorDestination[]).map((destination) => (
              <EtherfuseBondCard
                key={`yield:${destination.id}`}
                destination={destination}
                isSelected={selected?.id === destination.id}
                onSelect={() => onSelect(destination)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3 pb-1">
            {(visible as SimulatorDestination[]).map((destination) => (
              <DestinationCard
                key={`${destination.kind}:${destination.id}`}
                destination={destination}
                isSelected={selected?.id === destination.id}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
