"use client";

import { AssetDetailLayout } from "@/features/shared/discover/components/pages/AssetDetailLayout";
import { AssetDetailExpertDesktopPanel } from "../ui/AssetDetailExpertDesktopPanel";
import { ExpertAssetMobileActions } from "../ui/ExpertAssetMobileActions";

export function ExpertAssetDetail() {
  return (
    <AssetDetailLayout
      renderRightPanel={({ symbolUpper, stockInfo }) => (
        <AssetDetailExpertDesktopPanel
          symbol={symbolUpper}
          stockInfo={stockInfo}
        />
      )}
      renderMobileActions={({ symbolUpper, stockInfo }) => (
        <ExpertAssetMobileActions
          symbolUpper={symbolUpper}
          stockInfo={stockInfo}
        />
      )}
    />
  );
}
