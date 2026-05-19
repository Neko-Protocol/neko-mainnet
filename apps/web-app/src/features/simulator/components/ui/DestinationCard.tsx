"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/useHaptics";
import { getTokenIcon, getTokenIconFitClass } from "@/lib/helpers/tokenUtils";
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

  const apy = destination.apy;
  const hasPositiveApy =
    apy !== null && apy !== undefined && !Number.isNaN(apy) && apy > 0;

  const blndEmissions =
    destination.blndEmissionsApy != null && destination.blndEmissionsApy > 0
      ? destination.blndEmissionsApy
      : null;

  const handleClick = () => {
    light();
    onSelect(destination);
  };

  const tokenCodes = destination.acceptedTokenCodes.slice(0, 2);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "group relative flex h-full min-h-[190px] flex-col overflow-hidden rounded-2xl border bg-[#1C1C1C] p-5 text-left transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-white/15 hover:bg-[#202020]",
        isSelected
          ? "border-[#229EDF] ring-1 ring-[#229EDF]/40"
          : "border-white/5"
      )}
      aria-pressed={isSelected}
    >
      <div className="relative mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center">
          {tokenCodes.map((code, index) => {
            const iconSrc = getTokenIcon(code);
            const initial =
              code.trim().length > 0 ? code.trim()[0].toUpperCase() : "?";

            return (
              <div
                key={`${code}-${index}`}
                className={cn(
                  "relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-[#1C1C1C]",
                  index > 0 && "-ml-3"
                )}
              >
                {iconSrc ? (
                  <Image
                    src={iconSrc}
                    alt={code}
                    width={44}
                    height={44}
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

        {isSelected ? (
          <span className="shrink-0 rounded-md bg-[#229EDF]/15 px-2 py-0.5 text-[10px] font-semibold text-[#229EDF]">
            Selected
          </span>
        ) : null}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col justify-between gap-4">
        <div className="min-w-0">
          <span className="inline-flex items-center rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/50">
            {destination.protocol}
          </span>
          <h3 className="mt-1.5 truncate text-sm font-semibold leading-tight text-white">
            {destination.name}
          </h3>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/40">
              APY
            </p>
            {hasPositiveApy ? (
              <p className="flex flex-wrap items-baseline gap-x-1">
                <span className="text-3xl font-bold tabular-nums text-white">
                  {apy!.toFixed(2)}%
                </span>
                <span className="text-sm font-medium text-white/35">
                  {" /yr"}
                </span>
              </p>
            ) : (
              <p className="text-3xl font-bold tabular-nums text-white/40">—</p>
            )}
          </div>

          {destination.tvlLabel ? (
            <p className="flex flex-wrap items-baseline gap-x-1.5">
              <span className="text-[10px] text-white/30">Pool size</span>
              <span className="text-[10px] text-white/55">
                {destination.tvlLabel}
              </span>
            </p>
          ) : null}

          {blndEmissions != null ? (
            <p className="text-[10px] font-medium text-emerald-400">
              +{blndEmissions.toFixed(2)}% BLND
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
}
