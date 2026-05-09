"use client";

import React from "react";
import { DollarSign, Coins } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useFxRate } from "@/hooks/useFxRate";
import { useCurrencyStore } from "@/stores/currency.store";
import { convertUsdToSelected, formatCurrency } from "@/lib/helpers/currency";
import { usePortfolioValue } from "@/features/shared/dashboard/hooks/usePortfolioValue";
import { StatCard } from "@/features/shared/discover/components/ui/StatCard";

const BasicMainStats: React.FC = () => {
  const { address, isFetchingBalances } = useWallet();
  const {
    totalUsd,
    holdings,
    isLoading: isLoadingPortfolio,
  } = usePortfolioValue();
  const selectedCurrency = useCurrencyStore((state) => state.selectedCurrency);
  const { rate: fxRate } = useFxRate();

  const isLoading = isFetchingBalances || isLoadingPortfolio;
  const totalInSelected = convertUsdToSelected(totalUsd, fxRate);
  const formattedTotal = formatCurrency(totalInSelected, selectedCurrency);
  const formattedZero = formatCurrency(0, selectedCurrency);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Total Portfolio Value"
          value={address ? formattedTotal : formattedZero}
          isLoading={isLoading && !!address}
        />
        <StatCard
          icon={<Coins className="h-5 w-5" />}
          label="Assets Held"
          value={address ? holdings.length : 0}
          isLoading={isLoading && !!address}
        />
      </div>
    </div>
  );
};

export default BasicMainStats;
