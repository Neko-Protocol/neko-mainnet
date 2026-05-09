"use client";

import { Globe } from "lucide-react";
import type { CollateralOption, PoolDetailPanelPool } from "./types";
import { InfoRow } from "./InfoRow";
import { PanelTokenIcon } from "./PanelTokenIcon";

export function PoolSummaryRows({
  pool,
  mode,
  isPair,
  pairLabel,
  collateralAmount,
  collateralUsdDisplay,
  borrowAmount,
  borrowUsdDisplay,
  selectedCollateral,
}: {
  pool: PoolDetailPanelPool;
  mode: "lend" | "borrow";
  isPair: boolean;
  pairLabel: string;
  collateralAmount: string;
  collateralUsdDisplay: string;
  borrowAmount: string;
  borrowUsdDisplay: string;
  selectedCollateral: CollateralOption | undefined;
}) {
  return (
    <div className="rounded-xl px-4 py-1">
      <InfoRow
        label="Network"
        valueEl={
          <div className="flex items-center gap-1.5">
            <Globe className="h-3 w-3 text-[#229EDF]" />
            <span className="text-white/80 text-xs font-medium">
              {pool.network}
            </span>
          </div>
        }
      />
      {mode === "lend" && (
        <InfoRow
          labelEl={
            <div className="flex items-center gap-1.5">
              {isPair ? (
                <div className="relative flex items-center w-8 h-5 shrink-0">
                  <div className="absolute left-0">
                    <PanelTokenIcon
                      symbol={pool.token1.symbol}
                      icon={pool.token1.icon}
                      size={20}
                    />
                  </div>
                  <div className="absolute left-3.5">
                    <PanelTokenIcon
                      symbol={pool.token2.symbol}
                      icon={pool.token2.icon}
                      size={20}
                    />
                  </div>
                </div>
              ) : (
                <PanelTokenIcon
                  symbol={pool.token1.symbol}
                  icon={pool.token1.icon}
                  size={20}
                />
              )}
              <span className="text-white/40 text-xs">{`Supplied (${pairLabel})`}</span>
            </div>
          }
          valueEl={
            <div className="text-right">
              <span className="text-xs font-medium tabular-nums text-white/80">
                {collateralAmount || "0.00"}
              </span>
              <span className="block text-[10px] tabular-nums text-white/35">
                {collateralUsdDisplay}
              </span>
            </div>
          }
        />
      )}
      {mode === "borrow" && selectedCollateral && (
        <InfoRow
          labelEl={
            <div className="flex items-center gap-1.5">
              <PanelTokenIcon symbol={selectedCollateral.symbol} size={20} />
              <span className="text-white/40 text-xs">{`Collateral (${selectedCollateral.symbol})`}</span>
            </div>
          }
          valueEl={
            <div className="text-right">
              <span className="text-xs font-medium tabular-nums text-white/80">
                {selectedCollateral.userBalance || "0.00"}
              </span>
            </div>
          }
        />
      )}
      {mode === "borrow" && (
        <InfoRow
          labelEl={
            <div className="flex items-center gap-1.5">
              <PanelTokenIcon
                symbol={pool.token2.symbol}
                icon={pool.token2.icon}
                size={20}
              />
              <span className="text-white/40 text-xs">{`Loan (${pool.token2.symbol})`}</span>
            </div>
          }
          valueEl={
            <div className="text-right">
              <span className="text-xs font-medium tabular-nums text-white/80">
                {borrowAmount || "0.00"}
              </span>
              <span className="block text-[10px] tabular-nums text-white/35">
                {borrowUsdDisplay}
              </span>
            </div>
          }
        />
      )}
      {pool.liquidationLtv > 0 && (
        <InfoRow label="Liquidation LTV" value={`${pool.liquidationLtv}%`} />
      )}
      {mode !== "borrow" && (
        <InfoRow
          label="Supply APY"
          valueEl={
            <span className="text-xs font-medium tabular-nums text-white/80 text-right max-w-[min(12rem,55vw)]">
              {pool.supplyApy}
            </span>
          }
        />
      )}
      {mode === "borrow" && pool.borrowApyLabel != null && (
        <InfoRow label="Borrow APY" value={pool.borrowApyLabel} />
      )}
    </div>
  );
}
