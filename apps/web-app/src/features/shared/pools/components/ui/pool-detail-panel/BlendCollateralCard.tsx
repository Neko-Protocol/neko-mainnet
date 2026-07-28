"use client";

import Image from "next/image";
import { getPoolTokenIcon } from "../../../utils/poolTokenIcons";
import { getTokenIconFitClass } from "@/lib/helpers/tokenDisplay";
import type { CollateralOption } from "./types";
import { BLEND_MIN_COLLATERAL_USD } from "./utils";

export function BlendCollateralCard({
  options,
  selectedCollateralAddress,
  onSelectCollateral,
  selectedCollateral,
  collateralBelowMinimum,
  formatUsdValue,
  minCollateralUsd,
  collateralInputAmount,
  onCollateralInputChange,
  collateralInputUsd,
}: {
  options: CollateralOption[];
  selectedCollateralAddress: string;
  onSelectCollateral: (address: string) => void;
  selectedCollateral: CollateralOption | undefined;
  collateralBelowMinimum: boolean;
  formatUsdValue: (amountUsd: number) => string;
  minCollateralUsd?: number;
  collateralInputAmount: string;
  onCollateralInputChange: (value: string) => void;
  collateralInputUsd: number;
}) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-3">
      <p className="text-white/50 text-xs font-medium">Collateral</p>

      <div className="flex flex-wrap gap-3">
        {options.map((opt) => {
          const icon = getPoolTokenIcon({
            type: "contract",
            code: opt.symbol,
          });
          const isSelected = selectedCollateralAddress === opt.address;
          return (
            <button
              key={opt.address}
              type="button"
              onClick={() => onSelectCollateral(opt.address)}
              className="flex flex-col items-center gap-1 transition-colors"
            >
              <div
                className={`w-9 h-9 shrink-0 rounded-full overflow-hidden flex items-center justify-center transition-colors ${
                  isSelected ? "bg-white/[0.14]" : "bg-white/5"
                }`}
              >
                {icon ? (
                  <Image
                    src={icon}
                    alt={opt.symbol}
                    width={36}
                    height={36}
                    unoptimized
                    className={`w-full h-full ${getTokenIconFitClass(opt.symbol)}`}
                  />
                ) : (
                  <span className="text-[10px] font-bold text-white">
                    {opt.symbol.slice(0, 3)}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-semibold leading-none ${
                  isSelected ? "text-[#229EDF]" : "text-white/40"
                }`}
              >
                {opt.symbol}
              </span>
            </button>
          );
        })}
      </div>

      {selectedCollateral && (
        <>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={collateralInputAmount}
            onChange={(e) =>
              onCollateralInputChange(
                e.target.value
                  .replace(/[^0-9.]/g, "")
                  .replace(/(\..*)\./g, "$1")
              )
            }
            className="w-full bg-transparent text-white text-2xl font-semibold outline-none placeholder:text-white/15"
          />

          <div className="flex items-center justify-between">
            <span className="text-white/30 text-xs">
              {formatUsdValue(collateralInputUsd)}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-white/30 text-xs tabular-nums">
                {selectedCollateral.userBalance || "0"}{" "}
                {selectedCollateral.symbol}
              </span>
              <button
                type="button"
                onClick={() =>
                  onCollateralInputChange(selectedCollateral.userBalance || "0")
                }
                className="text-[#229EDF] text-xs font-semibold hover:text-[#1a8bc7] transition-colors uppercase tracking-wide"
              >
                MAX
              </button>
            </div>
          </div>

          {collateralBelowMinimum && (
            <p className="text-xs text-amber-400/80">
              Minimum collateral value:{" "}
              {formatUsdValue(
                (minCollateralUsd ?? BLEND_MIN_COLLATERAL_USD) /
                  (selectedCollateral.cFactor ?? 1)
              )}
            </p>
          )}
        </>
      )}
    </div>
  );
}
