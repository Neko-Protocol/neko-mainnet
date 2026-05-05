"use client";

import React from "react";
import { BannerPage } from "@/components/ui/BannerPage";
import { PageContainer } from "@/components/ui/PageContainer";
import MainStats from "@/features/expert/dashboard/components/ui/MainStats";
import QuickActions from "@/features/expert/dashboard/components/ui/QuickActions";
import DiscoverAssets from "@/features/shared/dashboard/components/ui/DiscoverAssets";
import AssetBreakdown from "@/features/expert/dashboard/components/ui/AssetBreakdown";
import YourPositions from "@/features/expert/dashboard/components/ui/YourPositions";

const Dashboard: React.FC = () => {
  return (
    <div className="w-full min-w-0 max-w-full min-h-screen overflow-x-hidden">
      <PageContainer maxWidth="7xl" className="space-y-8 sm:space-y-10">
        <BannerPage
          title="Dashboard"
          subtitle="Overview of your portfolio, pools, and protocol activity"
          badge="Welcome back"
          imageSrc="/banners/oracle.svg"
          imageAlt="Dashboard illustration"
        />
        <MainStats />
        <QuickActions />
        <DiscoverAssets />
        <AssetBreakdown />
        <YourPositions />
      </PageContainer>
    </div>
  );
};

export default Dashboard;
