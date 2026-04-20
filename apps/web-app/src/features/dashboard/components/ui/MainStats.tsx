"use client";

import React from "react";
import { DollarSign, Coins, TrendingUp } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { usePortfolioValue } from "@/features/dashboard/hooks/usePortfolioValue";
import { useDashboardPools } from "@/features/dashboard/hooks/useDashboardPools";
import { StatCard } from "@/features/stocks/components/ui/StatCard";

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const MainStats: React.FC = () => {
  const { address, isFetchingBalances } = useWallet();
  const {
    totalUsd,
    holdings,
    isLoading: isLoadingPortfolio,
  } = usePortfolioValue();
  const { assets } = useDashboardPools();

  const avgPoolApy = React.useMemo(() => {
    if (assets.length === 0) return null;
    const sum = assets.reduce((acc, a) => {
      const parsed = parseFloat(a.roi.replace("%", ""));
      return acc + (Number.isFinite(parsed) ? parsed : 0);
    }, 0);
    return (sum / assets.length).toFixed(1);
  }, [assets]);

  const isLoading = isFetchingBalances || isLoadingPortfolio;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Total Portfolio Value"
          value={address ? formatUsd(totalUsd) : "$0.00"}
          isLoading={isLoading && !!address}
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
          value={avgPoolApy !== null ? `${avgPoolApy}%` : "—"}
        />
      </div>
    </div>
  );
};

export default MainStats;
