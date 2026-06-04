import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useWallet } from "@/hooks/useWallet";
import {
  stellarPriceService,
  type PricedResult,
} from "@/lib/services/stellar-price.service";
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

  const balanceEntries = useMemo(
    () =>
      Object.entries(balances)
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
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [balances]
  );

  // Per-token queries keyed by ["tokenPrice", code] — shared cache with useTokenPrice.
  const priceQueries = useQueries({
    queries: balanceEntries.map((entry) => ({
      queryKey: ["tokenPrice", entry.code] as const,
      queryFn: (): Promise<PricedResult> =>
        stellarPriceService.getPriceWithSource(
          entry.code,
          getContractForToken(entry.code)
        ),
      enabled: Boolean(address) && balanceEntries.length > 0,
      refetchInterval: 5 * 60_000,
      staleTime: 3 * 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: 2,
      throwOnError: false,
    })),
  });

  const isLoadingPrices = priceQueries.some((q) => q.isLoading);
  const error = priceQueries.find((q) => q.isError)?.error ?? null;

  const holdings = useMemo<PortfolioHolding[]>(() => {
    return balanceEntries
      .map((entry, i) => {
        const balance = parseBalance(entry.rawBalance);
        const priceUsd = priceQueries[i]?.data?.price ?? 0;
        return {
          code: entry.code,
          balance,
          priceUsd,
          valueUsd: balance * priceUsd,
        };
      })
      .sort((a, b) => b.valueUsd - a.valueUsd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balanceEntries, priceQueries]);

  const totalUsd = useMemo(
    () => holdings.reduce((sum, h) => sum + h.valueUsd, 0),
    [holdings]
  );

  return {
    totalUsd,
    holdings,
    isLoading: isFetchingBalances || isLoadingPrices,
    error: error as Error | null,
  };
}
