"use client";

import { useCallback, useState } from "react";
import { TransactionBuilder, rpc } from "@stellar/stellar-sdk";
import { useWallet } from "@/hooks/useWallet";
import { useQueryClient } from "@tanstack/react-query";
import { depositToPool } from "@/lib/helpers/stellar/lending";
import { getAvailableTokens } from "@/lib/helpers/stellar/soroswap";
import { rpcUrl, stellarNetwork } from "@/lib/config/stellar.config";
import { POOLS_QUERY_KEY } from "@/lib/orchestrator";

export function useLendingDepositSubmit() {
  const { address, signTransaction, networkPassphrase } = useWallet();
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const submit = useCallback(
    async (params: {
      assetCode: string;
      amount: string;
      contractId: string;
    }) => {
      if (!address) throw new Error("Wallet not connected");
      if (!networkPassphrase) {
        throw new Error("Network passphrase not available");
      }
      const { assetCode, amount, contractId } = params;
      const availableTokens = getAvailableTokens();
      const token = availableTokens[assetCode];
      if (!token?.contract) {
        throw new Error(`Token ${assetCode} not found`);
      }
      const decimals = token.decimals || 7;

      setIsPending(true);
      try {
        const depositXdr = await depositToPool(
          assetCode,
          amount,
          decimals,
          address,
          contractId
        );
        const signedDeposit = await signTransaction(depositXdr as string, {
          networkPassphrase,
          address,
        });
        const sorobanServer = new rpc.Server(rpcUrl, {
          allowHttp: stellarNetwork === "LOCAL",
        });
        const sendResult = await sorobanServer.sendTransaction(
          TransactionBuilder.fromXDR(
            signedDeposit.signedTxXdr,
            networkPassphrase
          )
        );
        await queryClient.invalidateQueries({ queryKey: ["lendingPools"] });
        await queryClient.invalidateQueries({ queryKey: ["stellar-balances"] });
        await queryClient.invalidateQueries({ queryKey: [...POOLS_QUERY_KEY] });
        return sendResult.hash;
      } finally {
        setIsPending(false);
      }
    },
    [address, networkPassphrase, signTransaction, queryClient]
  );

  return { submit, isPending };
}
