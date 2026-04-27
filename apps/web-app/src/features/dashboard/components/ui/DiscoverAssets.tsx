"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAvailableTokens } from "@/lib/helpers/stellar/soroswap";
import { AssetPriceCard } from "@/features/discover/components/ui/AssetPriceCard";
import { useCurrencyStore } from "@/stores/currency.store";

const DASHBOARD_ASSET_LIMIT = 3;

const DiscoverAssets: React.FC = () => {
  const selectedCurrency = useCurrencyStore((state) => state.selectedCurrency);
  const tokenCodes = React.useMemo(() => Object.keys(getAvailableTokens()), []);

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
            Discover Assets
          </h2>
          <p className="text-white/40 text-sm">
            Spot {selectedCurrency} via Reflector
          </p>
        </div>
        <Link
          href="/discover"
          className="flex items-center gap-1.5 text-sm font-semibold text-white/40 hover:text-white transition-colors"
        >
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {tokenCodes.length === 0 ? (
        <div className="rounded-2xl bg-[#1C1C1C] border border-white/5 p-12 text-center">
          <p className="text-white/40 text-base">No assets configured</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {tokenCodes.slice(0, DASHBOARD_ASSET_LIMIT).map((code) => (
            <AssetPriceCard key={code} tokenCode={code} />
          ))}
        </div>
      )}
    </div>
  );
};

export default DiscoverAssets;
