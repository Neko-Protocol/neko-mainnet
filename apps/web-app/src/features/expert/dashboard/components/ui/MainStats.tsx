"use client";

import React from "react";
import { DollarSign, Coins, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/hooks/useWallet";
import { useFxRate } from "@/hooks/useFxRate";
import { useCurrencyStore } from "@/stores/currency.store";
import { SUMMARY_DISPLAY_DECIMALS } from "@/lib/constants/display";
import { convertUsdToSelected, formatCurrency } from "@/lib/helpers/currency";
import { parseBalance } from "@/lib/helpers/formatUtils";
import { fromSmallestUnit } from "@/lib/helpers/tokenUtils";
import { stellarPriceService } from "@/lib/services/stellar-price.service";
import { usePortfolioValue } from "@/features/shared/dashboard/hooks/usePortfolioValue";
import { useDashboardPools } from "@/features/expert/dashboard/hooks/useDashboardPools";
import { useDashboardPositions } from "@/features/expert/dashboard/hooks/useDashboardPositions";
import { useVaultsTotalUsd } from "@/features/expert/dashboard/hooks/useVaultsTotalUsd";
import { StatCard } from "@/features/shared/discover/components/ui/StatCard";

const MainStats: React.FC = () => {
  const { address, isFetchingBalances } = useWallet();
  const {
    totalUsd,
    holdings,
    isLoading: isLoadingPortfolio,
  } = usePortfolioValue();
  const { positions, isLoading: isLoadingPositions } = useDashboardPositions();
  const { totalUsd: vaultsTotalUsd, isLoading: isLoadingVaults } =
    useVaultsTotalUsd();
  const selectedCurrency = useCurrencyStore((state) => state.selectedCurrency);
  const { rate: fxRate } = useFxRate();
  const { assets } = useDashboardPools();

  // Average APY of pools where the user actually has positions
  const avgPoolApy = React.useMemo(() => {
    const positionsWithApy = positions.filter(({ pool }) => pool.apy > 0);
    if (positionsWithApy.length === 0) return null;
    const sum = positionsWithApy.reduce((acc, { pool }) => acc + pool.apy, 0);
    return (sum / positionsWithApy.length).toFixed(SUMMARY_DISPLAY_DECIMALS);
  }, [positions]);

  const walletPriceByCode = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const h of holdings) {
      map[h.code] = h.priceUsd;
    }
    return map;
  }, [holdings]);

  const missingPositionAssets = React.useMemo(() => {
    const dedup = new Map<string, { code: string; contract?: string }>();
    for (const entry of positions) {
      const token = entry.pool.tokens[0];
      if (!token?.code || walletPriceByCode[token.code]) continue;
      const key = `${token.code}:${token.address ?? ""}`;
      dedup.set(key, {
        code: token.code,
        contract: token.address || undefined,
      });
    }
    return Array.from(dedup.values()).sort((a, b) =>
      a.code.localeCompare(b.code)
    );
  }, [positions, walletPriceByCode]);

  const { data: missingPriceMap = {}, isLoading: isLoadingMissingPrices } =
    useQuery<Record<string, number>>({
      queryKey: [
        "dashboard-missing-position-prices",
        missingPositionAssets
          .map((asset) => `${asset.code}:${asset.contract ?? ""}`)
          .join("|"),
      ],
      queryFn: async () => {
        const entries = await Promise.all(
          missingPositionAssets.map(async ({ code, contract }) => {
            const price = await stellarPriceService.getPrice(code, contract);
            return [code, price] as const;
          })
        );
        return Object.fromEntries(entries);
      },
      enabled: missingPositionAssets.length > 0,
      staleTime: 60_000,
      refetchInterval: 120_000,
    });

  const positionsNetUsd = React.useMemo(() => {
    return positions.reduce((sum, item) => {
      const token = item.pool.tokens[0];
      if (!token?.code) return sum;

      const price =
        walletPriceByCode[token.code] ?? missingPriceMap[token.code] ?? 0;

      const deposited = parseBalance(item.position.depositedFormatted);
      const liabilitiesRaw = item.position.metadata?.liabilities;
      const liabilities =
        liabilitiesRaw == null
          ? 0
          : Number(
              fromSmallestUnit(String(liabilitiesRaw), token.decimals ?? 7)
            );

      return sum + (deposited - liabilities) * price;
    }, 0);
  }, [positions, walletPriceByCode, missingPriceMap]);

  const portfolioTotalUsd = positionsNetUsd + vaultsTotalUsd;
  // Per-stat loading: don't block cheap stats (Assets Held) behind the heavy
  // positions/vaults queries that drive the portfolio total.
  const isLoadingTotal =
    isLoadingPortfolio ||
    isLoadingPositions ||
    isLoadingMissingPrices ||
    isLoadingVaults;
  const isLoadingAssetsHeld = isFetchingBalances || isLoadingPortfolio;
  const isLoadingApy = isLoadingPositions;
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
          isLoading={isLoadingTotal && !!address}
          tooltip="Sum of pool positions + vault positions in USD."
        />
        <StatCard
          icon={<Coins className="h-5 w-5" />}
          label="Assets Held"
          value={address ? holdings.length : 0}
          isLoading={isLoadingAssetsHeld && !!address}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Avg. Pool APY"
          tooltip="Average APY across your active pool positions."
          value={avgPoolApy !== null ? `${avgPoolApy}%` : "-"}
          isLoading={isLoadingApy && !!address}
        />
      </div>
    </div>
  );
};

export default MainStats;
