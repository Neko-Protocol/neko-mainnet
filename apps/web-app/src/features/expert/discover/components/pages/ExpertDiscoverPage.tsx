"use client";

import { DiscoverPageLayout } from "@/features/shared/discover/components/pages/DiscoverPageLayout";
import { AssetPriceCard } from "../ui/AssetPriceCard";

export function ExpertDiscoverPage() {
  return (
    <DiscoverPageLayout
      renderCard={(tokenCode) => <AssetPriceCard tokenCode={tokenCode} />}
    />
  );
}
