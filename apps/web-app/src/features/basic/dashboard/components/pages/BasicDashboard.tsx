"use client";

import React from "react";
import { BannerPage } from "@/components/ui/BannerPage";
import { PageContainer } from "@/components/ui/PageContainer";
import BasicMainStats from "@/features/basic/dashboard/components/ui/BasicMainStats";
import BasicQuickActions from "@/features/basic/dashboard/components/ui/BasicQuickActions";
import { WalletHoldingsCard } from "@/features/basic/dashboard/components/ui/WalletHoldingsCard";
import DiscoverAssets from "@/features/shared/dashboard/components/ui/DiscoverAssets";
import { EmailNudgeBanner } from "@/features/shared/dashboard/components/ui/EmailNudgeBanner";
import { useWalletHoldings } from "@/features/shared/wallet/hooks/useWalletHoldings";
import YourPositions from "@/features/expert/dashboard/components/ui/YourPositions";

const BasicDashboard: React.FC = () => {
  const { holdings, isLoading } = useWalletHoldings();

  return (
    <div className="w-full min-w-0 max-w-full min-h-screen overflow-x-hidden">
      <PageContainer maxWidth="7xl" className="space-y-8 sm:space-y-10">
        <BannerPage
          title="Dashboard"
          subtitle="Overview of your portfolio and assets"
          badge="Welcome back"
          imageSrc="/banners/oracle.svg"
          imageAlt="Dashboard illustration"
          imageLayoutClassName="-right-6 top-0 h-[112%] w-[78%] opacity-60 sm:right-0 sm:top-0 sm:h-full sm:w-[75%] sm:opacity-100"
        />
        <EmailNudgeBanner />
        <BasicMainStats />
        <WalletHoldingsCard holdings={holdings} isLoading={isLoading} />
        <YourPositions />
        <BasicQuickActions />
        <DiscoverAssets />
      </PageContainer>
    </div>
  );
};

export default BasicDashboard;
