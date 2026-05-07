"use client";

import { DiscoverPageLayout } from "@/features/shared/discover/components/pages/DiscoverPageLayout";
import { BasicAssetPriceCard } from "../ui/BasicAssetPriceCard";

export function BasicDiscoverPage() {
  return (
    <DiscoverPageLayout
      renderCard={(tokenCode) => <BasicAssetPriceCard tokenCode={tokenCode} />}
    />
  );
}
