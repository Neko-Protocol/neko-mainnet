"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { useFxRate } from "@/hooks/useFxRate";
import { useCurrencyStore } from "@/stores/currency.store";
import { convertUsdToSelected, formatCurrency } from "@/lib/helpers/currency";
import { getAvailableTokens } from "@/lib/helpers/stellar/soroswap";
import { ROUTES } from "@/features/shared/discover/constants/discover";
import { ASSET_INFO } from "@/features/shared/discover/utils/assetInfo";
import type { AssetInfo } from "@/features/shared/discover/types/discover";
import { useAssetInfo } from "@/features/shared/discover/hooks/useAssetInfo";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  CLASS_ACCENT,
  getAssetTaxonomy,
} from "@/features/shared/discover/utils/assetClass";
import { AddToCartModal } from "./AddToCartModal";

export interface BasicAssetPriceCardProps {
  tokenCode: string;
  assetInfo?: AssetInfo | null;
}

export function BasicAssetPriceCard({
  tokenCode,
  assetInfo: assetInfoProp,
}: BasicAssetPriceCardProps) {
  const codeUpper = tokenCode.toUpperCase();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

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

  const displayName = assetInfo?.name ?? assetConfig?.name ?? codeUpper;
  const logoSrc = assetInfo?.logo ?? assetConfig?.icon;
  const convertedPrice = convertUsdToSelected(price, fxRate);
  const hasPrice = Number.isFinite(price) && price > 0;
  const formattedPrice = hasPrice
    ? formatCurrency(convertedPrice, selectedCurrency)
    : "No data";

  const detailHref = ROUTES.assetDetail(codeUpper);

  return (
    <>
      <div
        className="relative rounded-2xl bg-[#1C1C1C] border border-white/5 p-5 h-full flex flex-col transition-all duration-200 hover:border-white/15 hover:bg-[#202020] hover:-translate-y-0.5 cursor-pointer overflow-hidden group"
        onClick={() => router.push(detailHref)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") router.push(detailHref);
        }}
      >
        {accent && (
          <div
            aria-hidden
            className={`pointer-events-none absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl opacity-50 ${accent.bg}`}
          />
        )}

        <div className="relative flex items-start justify-between mb-5">
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
              <h3 className="text-white font-semibold text-sm leading-tight truncate">
                {codeUpper}
              </h3>
              <p className="text-white/50 text-xs mt-0.5 truncate">
                {displayName}
              </p>
            </div>
          </div>
        </div>

        <div className="relative flex-1 flex flex-col justify-between gap-4">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <LoadingSpinner variant="dots" size="sm" />
              <span className="text-white/40 text-xs">Loading price…</span>
            </div>
          ) : (
            <div>
              <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest mb-1">
                Price ({selectedCurrency})
              </p>
              <p
                className={`text-3xl font-bold tabular-nums ${hasPrice ? "text-white" : "text-white/40"}`}
              >
                {formattedPrice}
              </p>
            </div>
          )}

          {taxonomy && accent && (
            <span
              className={`self-start inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${accent.chip}`}
            >
              {taxonomy.classLabel}
            </span>
          )}
        </div>

        {/* Two-button CTA — stopPropagation so clicks don't navigate the card */}
        <div
          className="relative mt-4 grid grid-cols-2 gap-2"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Link
            href={detailHref}
            className="flex items-center justify-center rounded-xl border border-[#229EDF]/20 bg-[#229EDF]/10 px-3 py-2.5 text-sm font-semibold text-[#229EDF] transition-colors hover:bg-[#229EDF]/20"
            onClick={(e) => e.stopPropagation()}
          >
            Buy
          </Link>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-semibold text-white/60 transition-colors hover:bg-white/10 hover:text-white/90"
          >
            <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
            Shopping Cart
          </button>
        </div>
      </div>

      <AddToCartModal
        symbol={codeUpper}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
