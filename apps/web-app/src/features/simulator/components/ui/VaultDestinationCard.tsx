"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { getTokenIcon, getTokenIconFitClass } from "@/lib/helpers/tokenUtils";
import type { SimulatorDestination } from "../../types/simulator.types";

interface VaultDestinationCardProps {
  destination: SimulatorDestination;
  isSelected: boolean;
  onSelect: (dest: SimulatorDestination) => void;
}

function tokenInitial(code: string | undefined): string {
  if (!code || code.trim().length === 0) return "?";
  return code.trim()[0]!.toUpperCase();
}

export function VaultDestinationCard({
  destination,
  isSelected,
  onSelect,
}: VaultDestinationCardProps) {
  const codes = destination.acceptedTokenCodes;
  const primaryCode = codes[0];
  const primaryIconSrc = primaryCode ? getTokenIcon(primaryCode) : null;

  const apy = destination.apy;
  const hasPositiveApy =
    apy !== null && apy !== undefined && !Number.isNaN(apy) && apy > 0;

  const tvlLabel = destination.tvlLabel;

  return (
    <div
      onClick={() => {
        onSelect(destination);
      }}
      className={cn(
        "group isolate flex flex-col rounded-2xl overflow-hidden border transition-all duration-300 hover:scale-[1.01] cursor-pointer",
        isSelected
          ? "border-[#229EDF] ring-1 ring-[#229EDF]/40"
          : "border-white/[0.05]"
      )}
      style={{ boxShadow: "0 2px 16px 0 rgba(0,0,0,0.4)" }}
    >
      <div
        className="relative overflow-hidden"
        style={{ background: "#242424", minHeight: 124 }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 85% 50%, rgba(34,158,223,0.08) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 flex items-center gap-3 px-5 py-4 pr-[46%]">
          <div className="w-12 h-12 shrink-0 rounded-full bg-white overflow-hidden flex items-center justify-center">
            {primaryIconSrc ? (
              <Image
                src={primaryIconSrc}
                alt={primaryCode ?? "Token"}
                width={48}
                height={48}
                unoptimized
                className={getTokenIconFitClass(primaryCode ?? "")}
              />
            ) : (
              <span className="text-sm font-bold text-[#121212]">
                {tokenInitial(primaryCode)}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <h3 className="font-bold text-base leading-tight text-white">
              {destination.name}
            </h3>
            <span
              className="inline-block mt-1.5 px-3 py-0.5 rounded-full text-xs font-semibold"
              style={{
                border: "1px solid rgba(34,158,223,0.45)",
                color: "#229EDF",
                background: "rgba(34,158,223,0.1)",
              }}
            >
              {destination.protocol}
            </span>
          </div>
        </div>

        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
          {codes.slice(0, 3).map((code, index) => {
            const iconSrc = getTokenIcon(code);
            return (
              <div
                key={`${code}-${index}`}
                className={cn(
                  "w-10 h-10 rounded-full bg-white ring-2 ring-[#242424] overflow-hidden flex items-center justify-center shrink-0",
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
                    {tokenInitial(code)}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {isSelected ? (
          <span className="absolute top-3 right-3 z-20 rounded-md bg-[#229EDF]/15 px-2 py-0.5 text-[10px] font-semibold text-[#229EDF]">
            Selected
          </span>
        ) : null}
      </div>

      <div
        style={{ background: "#181818" }}
        className="flex items-stretch px-5 py-3"
      >
        <div className="flex flex-col justify-center gap-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-white/40 text-xs">Supply</span>
            {primaryCode ? (
              <>
                <div className="w-4 h-4 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-white">
                  {primaryIconSrc ? (
                    <Image
                      src={primaryIconSrc}
                      alt={primaryCode}
                      width={16}
                      height={16}
                      unoptimized
                      className={getTokenIconFitClass(primaryCode)}
                    />
                  ) : (
                    <span className="text-[8px] font-bold text-[#121212]">
                      {tokenInitial(primaryCode)}
                    </span>
                  )}
                </div>
                <span className="text-white/80 text-xs font-medium">
                  {primaryCode}
                </span>
              </>
            ) : null}
          </div>

          {codes.length > 1 ? (
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <span className="text-white/40 text-xs">Also accepts</span>
              <span className="text-white/80 text-xs font-medium">
                {codes.slice(1).join(", ")}
              </span>
            </div>
          ) : null}
        </div>

        {tvlLabel ? <div className="w-px bg-white/8 mx-4 shrink-0" /> : null}

        {tvlLabel ? (
          <div className="flex flex-col justify-center gap-0.5 shrink-0">
            <span className="text-white/40 text-[10px] font-semibold uppercase tracking-widest">
              TVL
            </span>
            <span className="text-white text-xl font-bold tabular-nums">
              {tvlLabel}
            </span>
          </div>
        ) : null}

        <div className="w-px bg-white/8 mx-4 shrink-0" />

        <div className="flex flex-col justify-center gap-0.5 shrink-0">
          <span className="text-white/40 text-[10px] font-semibold uppercase tracking-widest">
            APY
          </span>
          {hasPositiveApy ? (
            <span className="text-[#4ADE80] text-xl font-bold tabular-nums">
              {apy!.toFixed(2)}%
            </span>
          ) : (
            <span className="text-white/30 text-xl font-bold tabular-nums">
              —
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
