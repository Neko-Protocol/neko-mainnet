"use client";

import { useQuery } from "@tanstack/react-query";
import { Horizon } from "@stellar/stellar-sdk";
import { horizonUrl, stellarNetwork } from "@/lib/constants/network";
import { useStellarWalletStore } from "@/stores/stellarWalletStore";

export interface MultisigInfo {
  isMultisig: boolean;
  signersCount: number;
  medThreshold: number;
  signersRequired: number;
  signers: Array<{ key: string; weight: number; type: string }>;
}

const EMPTY_MULTISIG_INFO: MultisigInfo = {
  isMultisig: false,
  signersCount: 0,
  medThreshold: 0,
  signersRequired: 0,
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
      // Only signers with weight > 0 can actually authorize. Stellar's
      // signers array can include a disabled master key with weight 0, so we
      // exclude those from the active count.
      const activeSigners = signers.filter((s) => s.weight > 0);
      const isMultisig = activeSigners.length > 1 && medThreshold > 1;

      // Stellar uses signature weights, not signer counts. Compute the minimum
      // number of signers needed to reach the medium threshold by greedily
      // adding the heaviest weights first.
      const sortedWeights = activeSigners
        .map((s) => s.weight)
        .sort((a, b) => b - a);
      let cumulativeWeight = 0;
      let signersRequired = 0;
      for (const w of sortedWeights) {
        if (cumulativeWeight >= medThreshold) break;
        cumulativeWeight += w;
        signersRequired++;
      }
      if (signersRequired === 0) signersRequired = 1;

      return {
        isMultisig,
        signersCount: activeSigners.length,
        medThreshold,
        signersRequired,
        signers: activeSigners,
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
