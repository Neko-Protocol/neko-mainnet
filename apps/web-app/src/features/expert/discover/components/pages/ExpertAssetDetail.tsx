"use client";

import { AssetDetailLayout } from "@/features/shared/discover/components/pages/AssetDetailLayout";
import { AssetDetailExpertDesktopPanel } from "../ui/AssetDetailExpertDesktopPanel";
import { ExpertAssetMobileActions } from "../ui/ExpertAssetMobileActions";

export function ExpertAssetDetail() {
  return (
    <AssetDetailLayout
      renderRightPanel={({ symbolUpper, stockInfo, assetConfig }) => (
        <AssetDetailExpertDesktopPanel
          symbol={symbolUpper}
          stockInfo={stockInfo}
          isSwappable={assetConfig.isSwappable !== false}
        />
      )}
      renderMobileActions={({ symbolUpper, stockInfo, assetConfig }) => (
        <ExpertAssetMobileActions
          symbolUpper={symbolUpper}
          stockInfo={stockInfo}
          isSwappable={assetConfig.isSwappable !== false}
        />
      )}
    />
  );
}
