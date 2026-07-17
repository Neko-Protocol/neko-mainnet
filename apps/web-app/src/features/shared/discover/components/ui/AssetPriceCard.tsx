"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { useFxRate } from "@/hooks/useFxRate";
import { useCurrencyStore } from "@/stores/currency.store";
import { convertUsdToSelected, formatCurrency } from "@/lib/helpers/currency";
import { getAvailableTokens } from "@/lib/helpers/stellar/swap-kit";
import { ROUTES } from "@/features/shared/discover/constants/discover";
import { ASSET_INFO } from "@/features/shared/discover/utils/assetInfo";
import type { AssetInfo } from "@/features/shared/discover/types/discover";
import { useAssetInfo } from "@/features/shared/discover/hooks/useAssetInfo";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  CLASS_ACCENT,
  getAssetTaxonomy,
} from "@/features/shared/discover/utils/assetClass";
import { InstitutionalNotice } from "./InstitutionalNotice";

export interface AssetPriceCardProps {
  tokenCode: string;
  assetInfo?: AssetInfo | null;
  apy?: number;
}

export function AssetPriceCard({
  tokenCode,
  assetInfo: assetInfoProp,
  apy,
}: AssetPriceCardProps) {
  const codeUpper = tokenCode.toUpperCase();
  const { price, isLoading } = useTokenPrice(tokenCode);
  const selectedCurrency = useCurrencyStore((state) => state.selectedCurrency);
  const { rate: fxRate } = useFxRate();
  const fromStatic = useAssetInfo(codeUpper);
  const assetInfo = assetInfoProp ?? fromStatic ?? ASSET_INFO[codeUpper];

  const assetConfig = React.useMemo(
    () => getAvailableTokens()[codeUpper],
    [codeUpper]
  );

  const taxonomy = assetInfo?.taxonomy ?? getAssetTaxonomy(codeUpper);
  const accent = taxonomy ? CLASS_ACCENT[taxonomy.class] : undefined;
  const isInstitutional = Boolean(taxonomy?.institutional);

  const displayName = assetInfo?.name ?? assetConfig?.name ?? codeUpper;
  const logoSrc = assetInfo?.logo ?? assetConfig?.icon;
  const convertedPrice = convertUsdToSelected(price, fxRate);
  const hasPrice = Number.isFinite(price) && price > 0;
  const formattedPrice = hasPrice
    ? formatCurrency(convertedPrice, selectedCurrency)
    : "No data";

  return (
    <Link
      href={ROUTES.assetDetail(codeUpper)}
      className="block h-full group focus:outline-none"
    >
      <div className="relative rounded-2xl bg-[#1C1C1C] border border-white/5 p-5 h-full flex flex-col transition-all duration-200 hover:border-white/15 hover:bg-[#202020] hover:-translate-y-0.5 cursor-pointer">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3 min-w-0">
            {logoSrc && (
              <div className="relative w-11 h-11 rounded-full bg-white overflow-hidden shrink-0 ring-1 ring-white/10 flex items-center justify-center">
                <Image
                  src={logoSrc}
                  alt={displayName}
                  fill
                  unoptimized
                  className="object-cover scale-110"
                />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-semibold text-sm leading-tight truncate">
                  {codeUpper}
                </h3>
                {isInstitutional && <InstitutionalNotice className="h-5 w-5" />}
              </div>
              <p className="text-white/50 text-xs mt-0.5 truncate">
                {displayName}
              </p>
            </div>
          </div>

          <ArrowUpRight className="h-4 w-4 text-white/20 group-hover:text-white/60 transition-colors shrink-0" />
        </div>

        <div className="flex-1 flex flex-col justify-between gap-4">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <LoadingSpinner variant="dots" size="sm" />
              <span className="text-white/40 text-xs">Loading price…</span>
            </div>
          ) : (
            <div>
              <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest mb-1">
                Spot ({selectedCurrency})
              </p>
              <div className="flex items-baseline gap-3">
                <p
                  className={`text-3xl font-bold tabular-nums ${hasPrice ? "text-white" : "text-white/40"}`}
                >
                  {formattedPrice}
                </p>
                {apy !== undefined && (
                  <span className="text-emerald-400 text-sm font-semibold tabular-nums">
                    ~{apy.toFixed(2)}% APY
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            {taxonomy && accent && (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${accent.chip}`}
              >
                {taxonomy.classLabel}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
