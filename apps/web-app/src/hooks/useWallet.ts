"use client";

import { useSignRawHash } from "@privy-io/react-auth/extended-chains";
import { useQuery } from "@tanstack/react-query";
import {
  fetchBalances,
  signStellarTxWithPrivy,
  signStellarTransactionWithWallet,
  type MappedBalances,
} from "@/lib/helpers/stellar/wallet";
import { stellarNetwork, networkPassphrase } from "@/lib/constants/network";
import { useStellarWalletStore } from "@/stores/stellarWalletStore";

export function useWallet() {
  const { address: stellarAddress, source } = useStellarWalletStore();
  const { signRawHash } = useSignRawHash();
  const address = stellarAddress ?? undefined;

  const {
    data: {
      balances = {} as MappedBalances,
      subentryCount = 0,
      nativeBalanceStroops = 0n,
    } = {},
    isFetching: isFetchingBalances,
    refetch: refetchBalances,
  } = useQuery({
    queryKey: ["stellar-balances", address],
    queryFn: () => fetchBalances(address!),
    enabled: Boolean(address),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1,
  });

  const signTransaction = async (
    xdr: string,
    options?: { networkPassphrase?: string; address?: string }
  ) => {
    if (!address) {
      throw new Error("Connect Stellar wallet to sign");
    }
    const signerPublicKey = options?.address ?? address;
    const signedTxXdr =
      source === "privy"
        ? await signStellarTxWithPrivy(xdr, signerPublicKey, signRawHash)
        : await signStellarTransactionWithWallet({
            unsignedTransactionXdr: xdr,
            signerPublicKey,
          });

    return { signedTxXdr };
  };

  return {
    address: address ?? undefined,
    network: stellarNetwork,
    networkPassphrase,
    balances,
    subentryCount,
    nativeBalanceStroops,
    isFetchingBalances,
    isPending: false,
    refetchBalances: async () => {
      await refetchBalances();
    },
    signTransaction,
  };
}
