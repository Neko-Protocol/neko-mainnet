"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AssetDetailLayout } from "@/features/shared/discover/components/pages/AssetDetailLayout";
import { InstitutionalNotice } from "@/features/shared/discover/components/ui/InstitutionalNotice";
import { BasicBuyForm } from "../ui/BasicBuyForm";

export function BasicAssetDetail() {
  return (
    <AssetDetailLayout
      renderRightPanel={({ symbolUpper, stockInfo }) =>
        stockInfo.taxonomy?.institutional ? (
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <InstitutionalNotice className="h-8 w-8" />
              <div>
                <p className="text-white font-semibold text-sm">
                  Institutional access required
                </p>
                <p className="mt-1 text-xs leading-relaxed text-white/45">
                  {symbolUpper} is shown for reference and cannot be bought
                  in-app.
                </p>
              </div>
            </div>
            {stockInfo.buyInfo && (
              <Link
                href={stockInfo.buyInfo.url}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-sm transition-colors border border-white/20"
              >
                <ExternalLink className="h-4 w-4" />
                Discover more on {stockInfo.buyInfo.platform}
              </Link>
            )}
          </div>
        ) : (
          <BasicBuyForm symbol={symbolUpper} />
        )
      }
      renderMobilePanelLabel={({ symbolUpper, stockInfo }) =>
        stockInfo.taxonomy?.institutional
          ? `Discover ${symbolUpper}`
          : `Buy ${symbolUpper}`
      }
    />
  );
}
