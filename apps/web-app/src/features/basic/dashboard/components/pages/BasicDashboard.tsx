"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { BannerPage } from "@/components/ui/BannerPage";
import { PageContainer } from "@/components/ui/PageContainer";
import MainStats from "@/features/shared/dashboard/components/ui/MainStats";
import { WalletHoldingsCard } from "@/features/basic/dashboard/components/ui/WalletHoldingsCard";
import DiscoverAssets from "@/features/shared/dashboard/components/ui/DiscoverAssets";
import { EmailNudgeBanner } from "@/features/shared/dashboard/components/ui/EmailNudgeBanner";
import AssetBreakdown from "@/features/shared/positions/components/ui/AssetBreakdown";
import { useWalletHoldings } from "@/features/shared/wallet/hooks/useWalletHoldings";
import YourPositions from "@/features/shared/positions/components/ui/YourPositions";

const BasicDashboard: React.FC = () => {
  const t = useTranslations("basic.dashboard");
  const { holdings, isLoading } = useWalletHoldings();

  return (
    <div className="w-full min-w-0 max-w-full min-h-screen overflow-x-hidden">
      <PageContainer maxWidth="7xl" className="space-y-8 sm:space-y-10">
        <BannerPage
          title={t("title")}
          subtitle={t("subtitle")}
          badge={t("badge")}
          imageSrc="/banners/oracle.svg"
          imageAlt={t("illustrationAlt")}
          imageLayoutClassName="-right-6 top-4 h-[112%] w-[78%] opacity-60 sm:right-0 sm:top-0 sm:h-full sm:w-[75%] sm:opacity-100"
        />
        <EmailNudgeBanner />
        <MainStats />
        <WalletHoldingsCard holdings={holdings} isLoading={isLoading} />
        <YourPositions />
        <AssetBreakdown />
        <DiscoverAssets />
      </PageContainer>
    </div>
  );
};

export default BasicDashboard;
