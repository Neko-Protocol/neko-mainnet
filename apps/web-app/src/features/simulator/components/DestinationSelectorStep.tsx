"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useHaptics } from "@/hooks/useHaptics";
import { useFilteredDestinations } from "../hooks/useFilteredDestinations";
import { DestinationCard } from "./ui/DestinationCard";
import { VaultDestinationCard } from "./ui/VaultDestinationCard";
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
  const { light } = useHaptics();
  const symbol =
    destination.bondSymbol ?? destination.acceptedTokenCodes[0] ?? "";
  const symbolInitial =
    symbol.trim().length > 0 ? symbol.trim()[0].toUpperCase() : "?";
  const apy = destination.apy ?? 0;
  const icon = destination.bondIcon;

  return (
    <button
      type="button"
      onClick={() => {
        light();
        onSelect();
      }}
      className={cn(
        "group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border bg-[#1C1C1C] px-5 py-5 text-left transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-white/15 hover:bg-[#202020]",
        isSelected
          ? "border-[#229EDF] ring-1 ring-[#229EDF]/40"
          : "border-white/5"
      )}
      aria-pressed={isSelected}
    >
      {/* Icon */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-[#1C1C1C]">
        {icon ? (
          <Image
            src={icon}
            alt={symbol || destination.name}
            width={48}
            height={48}
            unoptimized
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-sm font-bold text-[#121212]">
            {symbolInitial}
          </span>
        )}
      </div>

      {/* Name + protocol */}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-semibold leading-tight text-white">
          {destination.name}
        </h3>
        <span className="mt-1 inline-flex items-center rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/50">
          {destination.protocol}
        </span>
      </div>

      {/* APY */}
      <div className="shrink-0 text-right">
        {apy > 0 ? (
          <>
            <p className="text-2xl font-bold tabular-nums text-white">
              {apy.toFixed(2)}%
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
              APY
            </p>
          </>
        ) : (
          <>
            <p className="text-2xl font-bold tabular-nums text-white/30">-</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
              APY
            </p>
          </>
        )}
      </div>

      {isSelected ? (
        <span className="absolute right-3 top-3 rounded-md bg-[#229EDF]/15 px-2 py-0.5 text-[10px] font-semibold text-[#229EDF]">
          Selected
        </span>
      ) : null}
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

  const visible = useMemo(() => {
    const raw =
      tab === "pools" ? pools : tab === "vaults" ? vaults : yieldTokens;
    return [...raw].sort((a, b) => (b.apy ?? -1) - (a.apy ?? -1));
  }, [tab, pools, vaults, yieldTokens]);

  const total = pools.length + vaults.length + yieldTokens.length;

  const tabs = useMemo<{ id: Tab; label: string; count: number }[]>(
    () => [
      { id: "pools", label: "Liquidity Pools", count: pools.length },
      { id: "vaults", label: "Auto-Invest", count: vaults.length },
      {
        id: "hold-bond",
        label: "Stable Bonds",
        count: yieldTokens.length,
      },
    ],
    [pools.length, vaults.length, yieldTokens.length]
  );

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <header className="shrink-0 flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-white">
          How do you want your {token.code} to earn?
        </h2>
        <p className="text-sm text-white/60">
          Pick the strategy that fits you best.
        </p>
      </header>

      <div className="flex w-full shrink-0 rounded-full bg-[#2A2A2A] p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => handleTabChange(t.id)}
            className={cn(
              "flex-1 rounded-full px-2 py-1.5 text-xs transition-colors sm:px-4 sm:text-sm",
              tab === t.id
                ? "bg-[#229EDF] font-semibold text-white"
                : "font-medium text-white/50 hover:text-white/80"
            )}
          >
            <span className="hidden sm:inline">{t.label}</span>
            <span className="sm:hidden">
              {t.id === "pools"
                ? "Pools"
                : t.id === "vaults"
                  ? "Vaults"
                  : "Bonds"}
            </span>
            <span
              className={cn(
                "tabular-nums text-xs font-normal",
                tab === t.id ? "text-white/70" : "text-white/40"
              )}
            >
              {` · ${t.count}`}
            </span>
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
              Nothing available for {token.code} yet.
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
              ? `No bond options are available for ${token.code}.`
              : tab === "pools"
                ? `No liquidity pools accept ${token.code} yet. Try another option.`
                : `No auto-invest vaults accept ${token.code} yet. Try another option.`}
          </div>
        ) : tab === "hold-bond" ? (
          <div className="grid grid-cols-1 gap-4 pt-2 pb-5 md:grid-cols-2">
            {(visible as SimulatorDestination[]).map((destination) => (
              <EtherfuseBondCard
                key={`yield:${destination.id}`}
                destination={destination}
                isSelected={selected?.id === destination.id}
                onSelect={() => onSelect(destination)}
              />
            ))}
          </div>
        ) : tab === "vaults" ? (
          <div className="grid grid-cols-1 gap-4 pt-2 pb-5 p-2">
            {(visible as SimulatorDestination[]).map((destination) => (
              <VaultDestinationCard
                key={`vault:${destination.id}`}
                destination={destination}
                isSelected={selected?.id === destination.id}
                onSelect={onSelect}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3 pt-2 pb-5">
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
