"use client";

import { useWalletPositions } from "../hooks/useWalletPositions";
import { formatCurrency } from "@/lib/helpers/currency";
import { truncateAddress } from "@/lib/helpers/addressUtils";
import { AnalyticsErrorState } from "./AnalyticsErrorState";
import { AssetIcon } from "./AssetIcon";

export interface WalletPositionsProps {
  wallet: string;
}

export function WalletPositions({ wallet }: WalletPositionsProps) {
  const { data, isPending, isError } = useWalletPositions(wallet);
  const positions = data ?? [];

  return (
    <section className="rounded-2xl border border-white/5 bg-[#1C1C1C] p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Neko Wallet Admin</h2>
        <span className="text-xs text-white/40">{truncateAddress(wallet)}</span>
      </div>

      {isError ? (
        <AnalyticsErrorState />
      ) : isPending ? (
        <p className="text-sm text-white/40">Loading…</p>
      ) : positions.length === 0 ? (
        <p className="text-sm text-white/40">
          No vault positions found for this wallet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {positions.map((position) => (
            <div
              key={position.vaultId}
              className="flex items-center gap-4 rounded-xl border border-white/5 bg-[#141414] p-4 sm:p-5"
            >
              <AssetIcon symbol={position.symbol} size={32} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-white">
                  {position.symbol}
                </div>
                <div className="truncate text-xs text-white/40">
                  {position.amountTokens.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}{" "}
                  {position.symbol}
                </div>
              </div>
              <div className="text-sm font-semibold text-white">
                {formatCurrency(position.balanceUsd)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
