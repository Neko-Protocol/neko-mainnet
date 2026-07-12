"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { getTokenIcon, getTokenIconFitClass } from "@/lib/helpers/tokenUtils";
import type { SimulatorDestination } from "@/features/simulator/strategies/types/simulator.types";

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
  const apy = destination.apy;
  const hasPositiveApy =
    apy !== null && apy !== undefined && !Number.isNaN(apy) && apy > 0;

  const blndEmissions =
    destination.blndEmissionsApy != null && destination.blndEmissionsApy > 0
      ? destination.blndEmissionsApy
      : null;

  const handleClick = () => {
    onSelect(destination);
  };

  const tokenCodes = destination.acceptedTokenCodes.slice(0, 2);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border bg-[#1C1C1C] px-5 py-4 text-left transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-white/15 hover:bg-[#202020]",
        isSelected
          ? "border-[#229EDF] ring-1 ring-[#229EDF]/40"
          : "border-white/5"
      )}
      aria-pressed={isSelected}
    >
      {/* Token icons */}
      <div className="flex shrink-0 items-center">
        {tokenCodes.map((code, index) => {
          const iconSrc = getTokenIcon(code);
          const initial =
            code.trim().length > 0 ? code.trim()[0].toUpperCase() : "?";
          return (
            <div
              key={`${code}-${index}`}
              className={cn(
                "relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-[#1C1C1C]",
                index > 0 && "-ml-3"
              )}
            >
              {iconSrc ? (
                <Image
                  src={iconSrc}
                  alt={code}
                  width={40}
                  height={40}
                  unoptimized
                  className={getTokenIconFitClass(code)}
                />
              ) : (
                <span className="text-sm font-bold text-[#121212]">
                  {initial}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Name + protocol */}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold leading-tight text-white">
          {destination.name}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/50">
            {destination.protocol}
          </span>
          {destination.tvlLabel ? (
            <span className="text-[10px] text-white/35">
              {destination.tvlLabel}
            </span>
          ) : null}
          {blndEmissions != null ? (
            <span className="text-[10px] font-medium text-emerald-400">
              +{blndEmissions.toFixed(2)}% BLND
            </span>
          ) : null}
        </div>
      </div>

      {/* APY + Selected */}
      <div className="shrink-0 text-right">
        {isSelected ? (
          <span className="mb-1.5 inline-block rounded-md bg-[#229EDF]/15 px-2 py-0.5 text-[10px] font-semibold text-[#229EDF]">
            Selected
          </span>
        ) : null}
        {hasPositiveApy ? (
          <>
            <p className="text-xl font-bold tabular-nums text-white">
              {apy!.toFixed(2)}%
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
              APY
            </p>
          </>
        ) : (
          <>
            <p className="text-xl font-bold tabular-nums text-white/30">-</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
              APY
            </p>
          </>
        )}
      </div>
    </button>
  );
}
