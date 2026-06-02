import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/hooks/useWallet";
import { stellarPriceService } from "@/lib/services/stellar-price.service";
import { getAssetsConfig } from "@/lib/constants/assets.config";
import { parseBalance } from "@/lib/helpers/formatUtils";

export interface PortfolioHolding {
  code: string;
  balance: number;
  priceUsd: number;
  valueUsd: number;
}

interface PortfolioValue {
  totalUsd: number;
  holdings: PortfolioHolding[];
  isLoading: boolean;
  error: Error | null;
}

function getContractForToken(code: string): string | undefined {
  const asset = getAssetsConfig()[code];
  return asset?.contract;
}

export function usePortfolioValue(): PortfolioValue {
  const { balances, address, isFetchingBalances } = useWallet();

  const balanceEntries = useMemo(() => {
    return Object.entries(balances)
      .map(([key, bal]) => {
        let code: string | null = null;
        if (bal.asset_type === "native") {
          code = "XLM";
        } else if (bal.asset_type === "liquidity_pool_shares") {
          code = null;
        } else if ("asset_code" in bal && bal.asset_code) {
          code = bal.asset_code;
        }
        return { key, code, rawBalance: bal.balance };
      })
      .filter(
        (e): e is { key: string; code: string; rawBalance: string } =>
          e.code !== null && parseBalance(e.rawBalance) > 0
      );
  }, [balances]);

  // Prices are keyed by the SET of held tokens only — value (balance × price)
  // is derived in-render so balance polling doesn't invalidate the price cache.
  const tokenCodes = useMemo(
    () => [...new Set(balanceEntries.map((e) => e.code))].sort(),
    [balanceEntries]
  );
  const priceKey = tokenCodes.join("|");

  const {
    data: priceMap = {},
    isLoading: isLoadingPrices,
    error,
  } = useQuery<Record<string, number>>({
    queryKey: ["portfolio-prices", priceKey],
    queryFn: async () => {
      const entries = await Promise.all(
        tokenCodes.map(async (code) => {
          const price = await stellarPriceService.getPrice(
            code,
            getContractForToken(code)
          );
          return [code, price] as const;
        })
      );
      return Object.fromEntries(entries);
    },
    enabled: tokenCodes.length > 0,
    refetchInterval: 120_000,
    staleTime: 60_000,
  });

  const holdings = useMemo<PortfolioHolding[]>(() => {
    return balanceEntries
      .map((entry) => {
        const balance = parseBalance(entry.rawBalance);
        const priceUsd = priceMap[entry.code] ?? 0;
        return {
          code: entry.code,
          balance,
          priceUsd,
          valueUsd: balance * priceUsd,
        };
      })
      .sort((a, b) => b.valueUsd - a.valueUsd);
  }, [balanceEntries, priceMap]);

  const totalUsd = holdings.reduce((sum, h) => sum + h.valueUsd, 0);

  return {
    totalUsd,
    holdings,
    isLoading: isFetchingBalances || isLoadingPrices,
    error: error as Error | null,
  };
}
