import { useQuery } from "@tanstack/react-query";
import {
  fetchBalances,
  type FetchBalancesResult,
  type MappedBalances,
} from "@/lib/helpers/stellar/wallet";

const EMPTY_RESULT: FetchBalancesResult = {
  balances: {},
  subentryCount: 0,
  nativeBalanceStroops: 0n,
};

export const useBalances = (
  address: string | undefined,
  options?: {
    enabled?: boolean;

    refetchInterval?: number;

    refetchOnWindowFocus?: boolean;

    keepPreviousData?: boolean;

    retry?: number;
  }
) => {
  const {
    enabled = true,
    refetchInterval = 60_000, // 60s default polling (was 10s)
    refetchOnWindowFocus = false,
    keepPreviousData = true,
    retry = 2,
  } = options ?? {};

  return useQuery<FetchBalancesResult, Error, MappedBalances>({
    queryKey: ["balances", address],
    queryFn: async () => {
      if (!address) {
        return EMPTY_RESULT;
      }
      return fetchBalances(address);
    },
    select: (data) => data.balances,
    enabled: enabled && Boolean(address),
    refetchInterval: refetchInterval > 0 ? refetchInterval : false,
    refetchOnWindowFocus,

    placeholderData: keepPreviousData
      ? (previousData) => previousData ?? EMPTY_RESULT
      : undefined,
    retry: (failureCount, error) => {
      if (failureCount >= retry) {
        return false;
      }

      if (error instanceof Error && error.message.match(/not found/i)) {
        return false;
      }

      return true;
    },
    retryOnMount: true,
    staleTime: 30_000, // Stale after 30s (was 5s — caused refetch waves)
    gcTime: 60000, // Keep unused data in cache for 60 seconds

    throwOnError: false,
  });
};
