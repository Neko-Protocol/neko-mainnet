"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { BannerPage } from "@/components/ui/BannerPage";
import { PageContainer } from "@/components/ui/PageContainer";
import MainStats from "@/features/shared/dashboard/components/ui/MainStats";
import DiscoverAssets from "@/features/shared/dashboard/components/ui/DiscoverAssets";
import { EmailNudgeBanner } from "@/features/shared/dashboard/components/ui/EmailNudgeBanner";
import AssetBreakdown from "@/features/shared/positions/components/ui/AssetBreakdown";
import YourPositions from "@/features/shared/positions/components/ui/YourPositions";

const Dashboard: React.FC = () => {
  const t = useTranslations("expert.dashboard.banner");
  return (
    <div className="w-full min-w-0 max-w-full min-h-screen overflow-x-hidden">
      <PageContainer maxWidth="7xl" className="space-y-8 sm:space-y-10">
        <BannerPage
          title={t("title")}
          subtitle={t("subtitle")}
          badge={t("badge")}
          imageSrc="/banners/oracle.svg"
          imageAlt={t("imageAlt")}
          imageLayoutClassName="-right-16 -bottom-[240px] h-[126%] w-[92%] opacity-60 sm:bottom-auto sm:right-0 sm:top-0 sm:h-full sm:w-[55%] sm:opacity-100"
        />
        <EmailNudgeBanner />
        <MainStats />
        <YourPositions />
        <DiscoverAssets />
        <AssetBreakdown />
      </PageContainer>
    </div>
  );
};

export default Dashboard;
