"use client";

import Image from "next/image";
import { getPoolTokenIcon } from "../../../utils/poolTokenIcons";
import { getTokenIconFitClass } from "@/lib/helpers/tokenUtils";
import type { CollateralOption } from "./types";
import { BLEND_MIN_COLLATERAL_USD } from "./utils";

export function BlendCollateralCard({
  options,
  selectedCollateralAddress,
  onSelectCollateral,
  collateralInputAmount,
  onCollateralInputChange,
  selectedCollateral,
  isWalletConnected,
  collateralInputUsd,
  formatUsdValue,
  collateralBelowMinimum,
}: {
  options: CollateralOption[];
  selectedCollateralAddress: string;
  onSelectCollateral: (address: string) => void;
  collateralInputAmount: string;
  onCollateralInputChange: (v: string) => void;
  selectedCollateral: CollateralOption | undefined;
  isWalletConnected: boolean;
  collateralInputUsd: number;
  formatUsdValue: (amountUsd: number) => string;
  collateralBelowMinimum: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#1C1C1C] p-4 flex flex-col gap-3">
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
                className={`w-9 h-9 shrink-0 rounded-full border-2 overflow-hidden flex items-center justify-center bg-white/5 transition-colors ${
                  isSelected
                    ? "border-[#229EDF]"
                    : "border-white/10 hover:border-white/30"
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
          <div className="flex items-center justify-between">
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
              disabled={!isWalletConnected}
              className="w-full bg-transparent text-white text-xl font-semibold outline-none placeholder:text-white/15 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={() =>
                onCollateralInputChange(
                  selectedCollateral.walletBalance ??
                    selectedCollateral.userBalance
                )
              }
              disabled={!isWalletConnected}
              className="ml-3 shrink-0 text-[#229EDF] text-xs font-semibold uppercase tracking-wide hover:text-[#1a8bc7] transition-colors disabled:opacity-40"
            >
              MAX
            </button>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-white/30">
              {formatUsdValue(collateralInputUsd)}
            </span>
            <span className="text-white/30 tabular-nums">
              {selectedCollateral.walletBalance ??
                selectedCollateral.userBalance}{" "}
              {selectedCollateral.symbol}
            </span>
          </div>

          {collateralBelowMinimum && (
            <p className="text-xs text-amber-400/80">
              Minimum collateral value:{" "}
              {formatUsdValue(BLEND_MIN_COLLATERAL_USD)}
            </p>
          )}
          {selectedCollateral.walletBalance !== undefined &&
            collateralInputAmount !== "" &&
            parseFloat(collateralInputAmount) >
              parseFloat(selectedCollateral.walletBalance) && (
              <p className="text-xs text-red-400/90">
                Insufficient {selectedCollateral.symbol} balance
              </p>
            )}
        </>
      )}
    </div>
  );
}
