"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Wallet } from "lucide-react";
import { useFxRate } from "@/hooks/useFxRate";
import { useCurrencyStore } from "@/stores/currency.store";
import { convertUsdToSelected, formatCurrency } from "@/lib/helpers/currency";
import { formatAmount } from "@/lib/helpers/formatUtils";
import { getTokenIconFitClass } from "@/lib/helpers/tokenUtils";
import type { WalletHolding } from "@/features/shared/wallet/hooks/useWalletHoldings";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface WalletHoldingsCardProps {
  holdings: WalletHolding[];
  isLoading: boolean;
}

export function WalletHoldingsCard({
  holdings,
  isLoading,
}: WalletHoldingsCardProps) {
  const selectedCurrency = useCurrencyStore((state) => state.selectedCurrency);
  const { rate: fxRate } = useFxRate();

  return (
    <div className="w-full">
      <div className="flex flex-col gap-1 mb-5">
        <h2 className="text-xl sm:text-2xl font-bold text-white">
          Your Holdings
        </h2>
        <div className="flex items-center justify-between">
          <p className="text-white/40 text-sm">Assets in your wallet</p>
          <Link
            href="/discover"
            className="flex items-center gap-1.5 text-sm font-semibold text-white/40 hover:text-white transition-colors"
          >
            Explore assets
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl bg-[#1C1C1C] border border-white/5 p-10 flex items-center justify-center gap-3">
          <LoadingSpinner variant="dots" size="md" />
        </div>
      ) : holdings.length === 0 ? (
        <div className="rounded-2xl bg-[#1C1C1C] border border-white/5 p-10 text-center">
          <Wallet className="h-8 w-8 text-white/20 mx-auto mb-3" />
          <p className="text-white font-semibold text-sm mb-1">No assets yet</p>
          <p className="text-white/40 text-xs mb-5">
            Browse Discover to find assets you can add to your portfolio
          </p>
          <Link
            href="/discover"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#2A2A2A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#333] transition-colors"
          >
            Explore Assets
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#1C1C1C] border border-white/5 overflow-hidden">
          {holdings.map((holding, index) => {
            const valueInSelected = convertUsdToSelected(
              holding.valueUsd,
              fxRate
            );
            const formattedValue = formatCurrency(
              valueInSelected,
              selectedCurrency
            );

            return (
              <div
                key={holding.code}
                className={`flex items-center gap-4 px-5 py-4 ${
                  index < holdings.length - 1 ? "border-b border-white/5" : ""
                }`}
              >
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#2A2A2A] ring-1 ring-white/10">
                  {holding.icon ? (
                    <Image
                      src={holding.icon}
                      alt={holding.name}
                      fill
                      unoptimized
                      className={getTokenIconFitClass(holding.code)}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="text-white/40 text-xs font-bold">
                        {holding.code.slice(0, 2)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">
                    {holding.name}
                  </p>
                  <p className="text-white/40 text-xs">{holding.code}</p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-white font-semibold text-sm tabular-nums">
                    {formatAmount(holding.balance)}{" "}
                    <span className="text-white/40 font-normal">
                      {holding.code}
                    </span>
                  </p>
                  <p className="text-white/40 text-xs tabular-nums">
                    {formattedValue}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
