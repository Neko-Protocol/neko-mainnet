"use client";

import { useQuery } from "@tanstack/react-query";
import { Horizon } from "@stellar/stellar-sdk";
import { horizonUrl, stellarNetwork } from "@/lib/constants/network";
import { useStellarWalletStore } from "@/stores/stellarWalletStore";

export interface MultisigInfo {
  isMultisig: boolean;
  signersCount: number;
  medThreshold: number;
  signers: Array<{ key: string; weight: number; type: string }>;
}

const EMPTY_MULTISIG_INFO: MultisigInfo = {
  isMultisig: false,
  signersCount: 0,
  medThreshold: 0,
  signers: [],
};

export function useMultisigDetection() {
  const { address: stellarAddress } = useStellarWalletStore();
  const address = stellarAddress ?? undefined;

  return useQuery<MultisigInfo>({
    queryKey: ["multisig-detection", address],
    queryFn: async () => {
      if (!address) {
        return EMPTY_MULTISIG_INFO;
      }

      const server = new Horizon.Server(horizonUrl, {
        allowHttp: stellarNetwork === "LOCAL",
      });
      const acc = await server.loadAccount(address);
      const signers = acc.signers.map((s) => ({
        key: s.key,
        weight: s.weight,
        type: s.type,
      }));
      const medThreshold = acc.thresholds.med_threshold;
      // A wallet is "multisig" when more than one signer can authorize tx and
      // the medium threshold requires more than one signer's weight to clear.
      const isMultisig = signers.length > 1 && medThreshold > 1;

      return {
        isMultisig,
        signersCount: signers.length,
        medThreshold,
        signers,
      };
    },
    enabled: Boolean(address),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1,
  });
}
