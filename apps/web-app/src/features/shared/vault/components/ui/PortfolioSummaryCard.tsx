"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { useFxRate } from "@/hooks/useFxRate";
import { useCurrencyStore } from "@/stores/currency.store";
import { convertUsdToSelected, formatCurrency } from "@/lib/helpers/currency";
import { useVaultEarningsCard } from "../../hooks/useVaultEarningsCard";
import type { VaultView } from "../../types/vault";

function parseApy7d(apy7d: string): number {
  if (!apy7d) return 0;
  const numeric = apy7d.replace(/[^\d.]/g, "");
  const parsed = parseFloat(numeric);
  return Number.isFinite(parsed) ? parsed : 0;
}

function AssetPriceReporter({
  symbol,
  onPrice,
}: {
  symbol: string;
  onPrice: (symbol: string, price: number) => void;
}) {
  const { price } = useTokenPrice(symbol);
  React.useEffect(() => {
    onPrice(symbol, price);
  }, [symbol, price, onPrice]);
  return null;
}

function StatSkeleton() {
  return <div className="h-7 w-24 rounded-md bg-white/8 animate-pulse" />;
}

interface PortfolioSummaryCardProps {
  vaults: VaultView[];
  userBalances: Record<string, bigint>;
}

const PortfolioSummaryCard: React.FC<PortfolioSummaryCardProps> = ({
  vaults,
  userBalances,
}) => {
  const t = useTranslations("sharedVault.summary");
  const positionVaults = vaults.filter((v) => (userBalances[v.id] ?? 0n) > 0n);
  const earnings = useVaultEarningsCard(positionVaults, userBalances);

  const [priceBySymbol, setPriceBySymbol] = useState<Record<string, number>>(
    {}
  );

  const handlePrice = useCallback((symbol: string, price: number) => {
    setPriceBySymbol((prev) => {
      if (prev[symbol] === price) return prev;
      return { ...prev, [symbol]: price };
    });
  }, []);

  const selectedCurrency = useCurrencyStore((s) => s.selectedCurrency);
  const { rate: fxRate } = useFxRate({ currency: selectedCurrency });

  const symbols = useMemo(
    () => Object.keys(earnings.totalValueByAsset),
    [earnings.totalValueByAsset]
  );

  const vaultById = useMemo(
    () => Object.fromEntries(vaults.map((v) => [v.id, v])),
    [vaults]
  );

  const { totalDeposited, totalEarnings, totalValue, netApy, projectedYield } =
    useMemo(() => {
      const toCurrency = (tokenAmount: number, sym: string): number | null => {
        const price = priceBySymbol[sym] ?? 0;
        if (price <= 0) return null;
        return convertUsdToSelected(tokenAmount * price, fxRate);
      };

      let deposited = 0;
      let earningsSum = 0;
      let valueSum = 0;

      for (const sym of Object.keys(earnings.totalDepositedByAsset)) {
        const converted = toCurrency(
          earnings.totalDepositedByAsset[sym] ?? 0,
          sym
        );
        if (converted !== null) deposited += converted;
      }

      for (const sym of Object.keys(earnings.totalEarningsByAsset)) {
        const converted = toCurrency(
          Math.max(0, earnings.totalEarningsByAsset[sym] ?? 0),
          sym
        );
        if (converted !== null) earningsSum += converted;
      }

      for (const sym of Object.keys(earnings.totalValueByAsset)) {
        const converted = toCurrency(earnings.totalValueByAsset[sym] ?? 0, sym);
        if (converted !== null) valueSum += converted;
      }

      let weightedApyNum = 0;
      let weightedApyDenom = 0;

      for (const row of earnings.perVault) {
        const price = priceBySymbol[row.assetSymbol] ?? 0;
        if (price <= 0) continue;
        const usdValue = row.currentValueTokens * price;
        const vault = vaultById[row.vaultId];
        const apy = parseApy7d(vault?.apy7d ?? "");
        weightedApyNum += usdValue * apy;
        weightedApyDenom += usdValue;
      }

      const blendedApy =
        weightedApyDenom > 0 ? weightedApyNum / weightedApyDenom : 0;

      return {
        totalDeposited: deposited,
        totalEarnings: earningsSum,
        totalValue: valueSum,
        netApy: blendedApy,
        projectedYield: valueSum * (blendedApy / 100),
      };
    }, [
      earnings.totalDepositedByAsset,
      earnings.totalEarningsByAsset,
      earnings.totalValueByAsset,
      earnings.perVault,
      priceBySymbol,
      fxRate,
      vaultById,
    ]);

  if (positionVaults.length === 0) {
    return null;
  }

  const stats = [
    {
      label: t("totalDeposited"),
      value: formatCurrency(totalDeposited, selectedCurrency, 2),
      valueClassName: "text-white",
    },
    {
      label: t("totalEarnings"),
      value: formatCurrency(totalEarnings, selectedCurrency, 2),
      valueClassName: "text-green-400",
    },
    {
      label: t("netApy"),
      value: `${netApy.toFixed(2)}%`,
      valueClassName: "text-green-400",
    },
    {
      label: t("projectedYield"),
      value: formatCurrency(projectedYield, selectedCurrency, 2),
      valueClassName: "text-white",
    },
  ];

  return (
    <div className="w-full rounded-2xl bg-[#1C1C1C] border border-white/5 overflow-hidden">
      {symbols.map((sym) => (
        <AssetPriceReporter key={sym} symbol={sym} onPrice={handlePrice} />
      ))}

      <div className="flex items-center px-4 py-3 border-b border-white/5">
        <span className="text-white/40 text-xs font-semibold uppercase tracking-wide">
          {t("title")}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-[#1C1C1C] px-4 py-4">
            <p className="text-white/40 text-xs mb-1">{stat.label}</p>
            {earnings.isLoading ? (
              <StatSkeleton />
            ) : (
              <p
                className={`font-bold text-sm tabular-nums ${stat.valueClassName}`}
              >
                {stat.value}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PortfolioSummaryCard;
