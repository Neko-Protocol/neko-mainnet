"use client";

import React from "react";
import { DollarSign, Coins, TrendingUp } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useFxRate } from "@/hooks/useFxRate";
import { useCurrencyStore } from "@/stores/currency.store";
import { SUMMARY_DISPLAY_DECIMALS } from "@/lib/constants/display";
import { convertUsdToSelected, formatCurrency } from "@/lib/helpers/currency";
import { useTotalPortfolioUsd } from "@/features/shared/dashboard/hooks/useTotalPortfolioUsd";
import { useDashboardPositions } from "@/features/expert/dashboard/hooks/useDashboardPositions";
import { StatCard } from "@/features/shared/discover/components/ui/StatCard";

const MainStats: React.FC = () => {
  const { address } = useWallet();
  const {
    totalUsd: portfolioTotalUsd,
    holdings,
    isLoading,
  } = useTotalPortfolioUsd();
  const { positions } = useDashboardPositions();
  const selectedCurrency = useCurrencyStore((state) => state.selectedCurrency);
  const { rate: fxRate } = useFxRate();

  // Average APY of pools where the user actually has positions
  const avgPoolApy = React.useMemo(() => {
    const positionsWithApy = positions.filter(({ pool }) => pool.apy > 0);
    if (positionsWithApy.length === 0) return null;
    const sum = positionsWithApy.reduce((acc, { pool }) => acc + pool.apy, 0);
    return (sum / positionsWithApy.length).toFixed(SUMMARY_DISPLAY_DECIMALS);
  }, [positions]);

  const totalInSelected = convertUsdToSelected(portfolioTotalUsd, fxRate);
  const formattedTotal = formatCurrency(
    totalInSelected,
    selectedCurrency,
    SUMMARY_DISPLAY_DECIMALS
  );
  const formattedZero = formatCurrency(
    0,
    selectedCurrency,
    SUMMARY_DISPLAY_DECIMALS
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Total Portfolio Value"
          value={address ? formattedTotal : formattedZero}
          isLoading={isLoading && !!address}
          tooltip="Sum of pool positions + vault positions in USD."
        />
        <StatCard
          icon={<Coins className="h-5 w-5" />}
          label="Assets Held"
          value={address ? holdings.length : 0}
          isLoading={isLoading && !!address}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Avg. Pool APY"
          tooltip="Average APY across your active pool positions."
          value={avgPoolApy !== null ? `${avgPoolApy}%` : "-"}
          isLoading={isLoading && !!address}
        />
      </div>
    </div>
  );
};

export default MainStats;
