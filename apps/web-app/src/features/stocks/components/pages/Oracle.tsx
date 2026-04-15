"use client";

import React from "react";
import { getAvailableTokens } from "@/lib/helpers/stellar/soroswap";
import { AssetPriceCard } from "../ui/AssetPriceCard";
import { PageContainer } from "@/components/ui/PageContainer";
import { BannerPage } from "@/components/ui/BannerPage";

const DiscoverPage: React.FC = () => {
  const tokenCodes = React.useMemo(
    () => Object.keys(getAvailableTokens()),
    []
  );

  return (
    <PageContainer maxWidth="7xl">
      <BannerPage
        title="Discover Assets"
        subtitle="Spot USD prices from Soroswap for Stellar assets on your network"
        badge="Market data"
        imageSrc="/banners/oracle.svg"
        imageAlt="Discover assets"
        className="mb-10"
      />

      {tokenCodes.length > 0 ? (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">
              Assets &amp; prices
            </h2>
            <p className="text-white/40 text-sm">
              Requires SoroSwap API key for live quotes
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {tokenCodes.map((code) => (
              <AssetPriceCard key={code} tokenCode={code} />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#1C1C1C] border border-white/5 p-12 text-center">
          <p className="text-white/40 text-base">No assets configured</p>
        </div>
      )}
    </PageContainer>
  );
};

export default DiscoverPage;
