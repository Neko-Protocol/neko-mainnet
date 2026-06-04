import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Client as DefindexVaultClient } from "@neko/defindex-vault";
import {
  rpcUrl,
  networkPassphrase,
  allowHttpForSoroban,
} from "@/lib/constants/network";
import { useWallet } from "@/hooks/useWallet";
import { fromSmallestUnit } from "@/lib/helpers/tokenUtils";
export function useVaultBalance(contractId: string | null | undefined) {
  const { address } = useWallet();

  const client = useMemo(
    () =>
      contractId
        ? new DefindexVaultClient({
            contractId,
            rpcUrl,
            networkPassphrase,
            ...(allowHttpForSoroban && { allowHttp: true }),
          })
        : null,
    [contractId]
  );

  const {
    data: userShares,
    isLoading,
    refetch,
  } = useQuery<bigint>({
    queryKey: ["vaultBalance", contractId, address],
    queryFn: async () => {
      if (!address || !client) return 0n;
      const tx = await client.balance({ id: address }, { simulate: true });
      return BigInt(tx.result?.toString() ?? "0");
    },
    enabled: !!address && !!contractId && !!client,
    staleTime: 120_000,
    gcTime: 5 * 60_000,
    refetchInterval: 120_000,
    refetchOnWindowFocus: false,
    retry: false,
    throwOnError: false,
  });

  const sharesFormatted = userShares
    ? fromSmallestUnit(userShares.toString(), 7)
    : "0";

  return {
    userShares: userShares ?? 0n,
    sharesFormatted,
    isLoading,
    hasWallet: !!address,
    refetch,
  };
}
