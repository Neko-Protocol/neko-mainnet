"use client";

import { AssetDetailLayout } from "@/features/shared/discover/components/pages/AssetDetailLayout";
import { BasicBuyForm } from "../ui/BasicBuyForm";

export function BasicAssetDetail() {
  return (
    <AssetDetailLayout
      renderRightPanel={({ symbolUpper }) => (
        <BasicBuyForm symbol={symbolUpper} />
      )}
      renderMobilePanelLabel={({ symbolUpper }) => `Buy ${symbolUpper}`}
    />
  );
}
