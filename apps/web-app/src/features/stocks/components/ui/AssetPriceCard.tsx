"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { getAvailableTokens } from "@/lib/helpers/stellar/soroswap";
import { formatUsdPrice } from "../../utils/assetPriceUtils";
import { ROUTES } from "../../constants/discover";
import { STOCK_INFO } from "../../utils/stockInfo";
import type { StockInfo } from "../../types/stocks";
import { useStockInfo } from "../../hooks/useStockInfo";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export interface AssetPriceCardProps {
  tokenCode: string;
  stockInfo?: StockInfo | null;
}

export function AssetPriceCard({
  tokenCode,
  stockInfo: stockInfoProp,
}: AssetPriceCardProps) {
  const codeUpper = tokenCode.toUpperCase();
  const { price, isLoading } = useTokenPrice(tokenCode);
  const fromStatic = useStockInfo(codeUpper);
  const stockInfo = stockInfoProp ?? fromStatic ?? STOCK_INFO[codeUpper];

  const assetConfig = React.useMemo(
    () => getAvailableTokens()[codeUpper],
    [codeUpper]
  );

  const displayName = stockInfo?.name ?? assetConfig?.name ?? codeUpper;
  const logoSrc = stockInfo?.logo ?? assetConfig?.icon;

  return (
    <Link href={ROUTES.stockDetail(codeUpper)} className="block h-full group">
      <div className="rounded-2xl bg-[#1C1C1C] border border-white/5 p-5 h-full flex flex-col transition-all duration-200 hover:border-white/10 hover:bg-[#222222] cursor-pointer">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            {logoSrc && (
              <div className="relative w-10 h-10 rounded-xl bg-[#2A2A2A] overflow-hidden shrink-0">
                <Image
                  src={logoSrc}
                  alt={displayName}
                  fill
                  unoptimized
                  className="object-contain p-1.5"
                />
              </div>
            )}
            <div>
              <h3 className="text-white font-semibold text-sm leading-tight">
                {displayName}
              </h3>
              <span
                className="inline-flex items-center mt-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
                style={{
                  color: "#229EDF",
                  backgroundColor: "rgba(34,158,223,0.10)",
                }}
              >
                {codeUpper}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <LoadingSpinner variant="dots" size="sm" />
              <span className="text-white/40 text-xs">Loading price…</span>
            </div>
          ) : (
            <div>
              <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest mb-1">
                Spot (USD)
              </p>
              <p className="text-white text-3xl font-bold">
                {formatUsdPrice(price)}
              </p>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
