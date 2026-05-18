import { useQueries } from "@tanstack/react-query";
import { useWallet } from "@/hooks/useWallet";
import { getBTokenBalanceRaw } from "@/lib/helpers/stellar/lending";
import { formatAmount } from "@/lib/helpers/formatUtils";
import { useLendingPools } from "./useLendingPools";
import { STELLAR_DECIMALS } from "@/lib/constants/network";
import { mulDivFloor } from "@/lib/helpers/amount";

export interface LendingPosition {
  assetCode: string;
  bTokens: bigint;
  bTokensFormatted: string;
  bTokenRate: string;
  depositedRaw: bigint;
  depositedFormatted: string;
  interestRate: number;
}

const RATE_SCALAR = 1_000_000_000_000n;

export function useUserLendingPositions() {
  const { address } = useWallet();
  const { data: pools = [], isLoading: poolsLoading } = useLendingPools();

  const balanceQueries = useQueries({
    queries: pools.map((pool, i) => ({
      queryKey: [
        "userLendingBTokens",
        pool.assetCode,
        pool.contractId,
        address,
      ],
      queryFn: async () => {
        if (i > 0) await new Promise((r) => setTimeout(r, i * 150));
        return getBTokenBalanceRaw(pool.assetCode, address!, pool.contractId);
      },
      enabled: Boolean(address) && pools.length > 0,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 2,
      retryDelay: (attempt: number) => attempt * 800,
      throwOnError: false,
    })),
  });

  const isLoading =
    poolsLoading ||
    (Boolean(address) && balanceQueries.some((q) => q.isLoading));

  const positions: LendingPosition[] = [];

  balanceQueries.forEach((q, i) => {
    const bTokens = q.data ?? 0n;
    if (bTokens === 0n) return;

    const pool = pools[i];
    const bTokenRate = pool.bTokenRate ?? "1";
    const bTokenRateRaw = BigInt(pool.bTokenRateRaw ?? RATE_SCALAR.toString());
    const depositedRaw = mulDivFloor(bTokens, bTokenRateRaw, RATE_SCALAR);
    const bTokensHuman = Number(bTokens) / 10 ** STELLAR_DECIMALS;
    const deposited = Number(depositedRaw) / 10 ** STELLAR_DECIMALS;

    positions.push({
      assetCode: pool.assetCode,
      bTokens,
      bTokensFormatted: formatAmount(bTokensHuman),
      bTokenRate,
      depositedRaw,
      depositedFormatted: formatAmount(deposited),
      interestRate: pool.interestRate,
    });
  });

  return { positions, isLoading, hasWallet: Boolean(address) };
}
