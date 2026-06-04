"use client";

import { Info } from "lucide-react";
import { formatCurrency } from "@/lib/helpers/currency";
import type { SupportedCurrency } from "@/stores/currency.store";
import type { VaultPositionSummary } from "./types";

export function YourPositionPanel({
  sharesFormatted,
  positionSummary,
  effectiveApy,
  tokenPriceInCurrency,
  selectedCurrency,
  isWalletConnected,
}: {
  sharesFormatted: string;
  positionSummary?: VaultPositionSummary;
  effectiveApy: number | null;
  tokenPriceInCurrency?: number;
  selectedCurrency?: SupportedCurrency;
  isWalletConnected: boolean;
}) {
  if (!isWalletConnected || !positionSummary) return null;

  const { netDeposited, currentValue, earnings, assetSymbol } = positionSummary;

  return (
    <div
      className="rounded-xl border border-white/7 p-5"
      style={{ background: "#0e0e0e" }}
    >
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-white/70 text-sm font-medium">Your Position</h3>
        <Info size={13} className="text-white/30" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <p className="text-white/40 text-xs mb-1">Your Shares</p>
          <p className="text-white font-bold text-sm tabular-nums">
            {sharesFormatted}
          </p>
        </div>

        <div>
          <p className="text-white/40 text-xs mb-1">Current Value</p>
          <p className="text-white font-bold text-sm tabular-nums">
            {currentValue.toFixed(2)} {assetSymbol}
          </p>
          {tokenPriceInCurrency != null && selectedCurrency && (
            <p className="text-white/40 text-xs mt-0.5 tabular-nums">
              {formatCurrency(
                currentValue * tokenPriceInCurrency,
                selectedCurrency,
                2
              )}
            </p>
          )}
        </div>

        <div>
          <p className="text-white/40 text-xs mb-1">Deposited</p>
          <p className="text-white font-bold text-sm tabular-nums">
            {netDeposited.toFixed(2)} {assetSymbol}
          </p>
        </div>

        <div>
          <p className="text-white/40 text-xs mb-1">Earnings</p>
          <p className="text-green-400 font-bold text-sm tabular-nums">
            +{Math.max(0, earnings).toFixed(2)} {assetSymbol}
          </p>
        </div>

        <div>
          <p className="text-white/40 text-xs mb-1">Effective APY</p>
          <p
            className={`font-bold text-sm tabular-nums ${
              effectiveApy != null ? "text-green-400" : "text-white"
            }`}
          >
            {effectiveApy != null ? `${effectiveApy.toFixed(2)}%` : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
