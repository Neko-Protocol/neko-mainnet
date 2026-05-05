"use client";

import {
  usePortfolioValue,
  type PortfolioHolding,
} from "@/features/shared/dashboard/hooks/usePortfolioValue";
import { getAssetsConfig } from "@/lib/constants/assets.config";
import { ASSET_INFO } from "@/features/shared/discover/utils/assetInfo";

export interface WalletHolding {
  code: string;
  name: string;
  icon: string;
  balance: number;
  valueUsd: number;
}

export interface UseWalletHoldingsResult {
  holdings: WalletHolding[];
  isLoading: boolean;
}

export function useWalletHoldings(): UseWalletHoldingsResult {
  const { holdings: portfolioHoldings, isLoading } = usePortfolioValue();
  const assetsConfig = getAssetsConfig();

  const holdings: WalletHolding[] = portfolioHoldings.map(
    (h: PortfolioHolding): WalletHolding => {
      const cfg = assetsConfig[h.code];
      const staticInfo = ASSET_INFO[h.code];
      return {
        code: h.code,
        name: cfg?.name ?? staticInfo?.name ?? h.code,
        icon: cfg?.icon ?? staticInfo?.logo ?? "",
        balance: h.balance,
        valueUsd: h.valueUsd,
      };
    }
  );

  return { holdings, isLoading };
}
