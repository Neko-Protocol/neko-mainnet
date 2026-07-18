import { useQuery } from "@tanstack/react-query";
import { XLM_TESTNET_ADDRESS } from "@/lib/config/stellar.config";
import { useWallet } from "./useWallet";
import { getTokens, getAvailableTokens } from "@/lib/helpers/stellar/swap-kit";
import { getTokenAddress } from "@/lib/helpers/stellar/swap-kit";
import { getTokenBalanceFromContract } from "@/lib/helpers/stellar/sorobanBalance";
import { spendableNativeStroops } from "@/lib/helpers/stellar/stellarAccountReserve";
import { fromSmallestUnit } from "@neko/orchestrator";

const BASE_RESERVE = 0.5;

/** Full XLM balance (Horizon), same notion as Freighter “balance”. */
const getTotalXlm = (
  balances: Record<string, { balance?: string } | undefined>
): string => {
  const xlmBalance = balances.xlm?.balance;
  if (xlmBalance) {
    const n = parseFloat(xlmBalance.replace(/,/g, "") || "0");
    return n.toString();
  }
  return "0";
};

/** XLM available to send after base + per-entry reserves (Stellar protocol). */
const getSpendableXlm = (
  balances: Record<string, { balance?: string } | undefined>,
  subentryCount: number
): string => {
  const xlmBalance = balances.xlm?.balance;
  if (xlmBalance) {
    const balance = parseFloat(xlmBalance.replace(/,/g, "") || "0");
    const minReserve = (2 + subentryCount) * BASE_RESERVE;
    const spendable = Math.max(0, balance - minReserve);
    return spendable.toString();
  }
  return "0";
};

const getTokenDecimals = (tokenAddress: string): number => {
  const tokens = getTokens();
  const availableTokens = getAvailableTokens();

  if (tokenAddress === tokens.XLM || tokenAddress === XLM_TESTNET_ADDRESS) {
    return 7;
  }

  for (const [, info] of Object.entries(availableTokens)) {
    if (info.contract === tokenAddress) {
      return info.decimals || 7;
    }
  }

  return 7;
};

export const useTokenBalance = (
  token:
    | string
    | { type: "native" | "contract"; code?: string; contract?: string }
    | undefined
) => {
  const { address, balances, subentryCount, nativeBalanceStroops } =
    useWallet();

  const tokenAddress = token ? getTokenAddress(token) : null;

  const tokens = getTokens();

  const xlmSacFromConfig = getAvailableTokens().XLM?.contract;
  const isXlm =
    tokenAddress === tokens.XLM ||
    tokenAddress === xlmSacFromConfig ||
    (typeof token !== "string" && token?.type === "native") ||
    tokenAddress === XLM_TESTNET_ADDRESS;

  const {
    data: contractBalance = "0",
    isLoading,
    error,
  } = useQuery<string, Error>({
    queryKey: ["tokenBalance", tokenAddress, address],
    queryFn: async () => {
      if (!tokenAddress || !address) {
        return "0";
      }

      const decimals = getTokenDecimals(tokenAddress);
      return await getTokenBalanceFromContract(tokenAddress, address, decimals);
    },
    enabled: Boolean(tokenAddress && address && !isXlm),
    refetchInterval: 60_000, // Poll every 60s (was 10s)
    staleTime: 30_000, // Stale after 30s (was 5s)
    retry: 2,
    throwOnError: false,
  });

  if (isXlm) {
    const totalBalance =
      nativeBalanceStroops > 0n
        ? fromSmallestUnit(nativeBalanceStroops.toString(), 7)
        : getTotalXlm(balances);
    const spendable =
      nativeBalanceStroops > 0n
        ? fromSmallestUnit(
            spendableNativeStroops(
              nativeBalanceStroops,
              subentryCount
            ).toString(),
            7
          )
        : getSpendableXlm(balances, subentryCount);
    return {
      /** Amount you can spend in a tx (after reserve); use for Max + validation. */
      balance: spendable,
      /** Full wallet balance (matches explorers / Freighter). Omitted when same as spendable. */
      totalBalance: totalBalance,
      isLoading: false,
      error: null,
    };
  }

  return {
    balance: contractBalance,
    totalBalance: contractBalance,
    isLoading,
    error: error ? error.message : null,
  };
};
