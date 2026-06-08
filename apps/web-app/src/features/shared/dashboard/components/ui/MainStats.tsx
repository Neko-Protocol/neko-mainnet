"use client";

import React from "react";
import { DollarSign, Coins, TrendingUp } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useFxRate } from "@/hooks/useFxRate";
import { useCurrencyStore } from "@/stores/currency.store";
import { SUMMARY_DISPLAY_DECIMALS } from "@/lib/constants/display";
import { convertUsdToSelected, formatCurrency } from "@/lib/helpers/currency";
import { useTotalPortfolioUsd } from "@/features/shared/dashboard/hooks/useTotalPortfolioUsd";
import { useHighestVaultApy } from "@/features/shared/dashboard/hooks/useHighestVaultApy";
import { StatCard } from "@/features/shared/discover/components/ui/StatCard";

const MainStats: React.FC = () => {
  const { address } = useWallet();
  const {
    totalUsd: portfolioTotalUsd,
    holdings,
    isLoading,
  } = useTotalPortfolioUsd();
  const { highestApy, isLoading: isLoadingHighestApy } = useHighestVaultApy();
  const selectedCurrency = useCurrencyStore((state) => state.selectedCurrency);
  const { rate: fxRate } = useFxRate();

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Total Portfolio Value"
          value={address ? formattedTotal : formattedZero}
          isLoading={isLoading && !!address}
          tooltip="Sum of vault/pool positions + assets held in your wallet."
        />
        <StatCard
          icon={<Coins className="h-5 w-5" />}
          label="Assets Held"
          value={address ? holdings.length : 0}
          isLoading={isLoading && !!address}
          tooltip="Number of total assets held in your wallet."
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Highest Vault APY"
          tooltip="Best available APY across Neko vaults."
          value={
            highestApy !== null
              ? `${highestApy.toFixed(SUMMARY_DISPLAY_DECIMALS)}%`
              : "-"
          }
          isLoading={isLoadingHighestApy}
        />
      </div>
    </div>
  );
};

export default MainStats;
