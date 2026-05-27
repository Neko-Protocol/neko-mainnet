"use client";

import { useCallback, useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useQueryClient } from "@tanstack/react-query";
import { depositToPool } from "@/lib/helpers/stellar/lending";
import { getAvailableTokens } from "@/lib/helpers/stellar/soroswap";
import { POOLS_QUERY_KEY } from "@/lib/orchestrator";
import { extractSignedTxXdr } from "@/lib/helpers/stellar/transaction";
import { pollTransactionStatus, txApi } from "@/lib/services/transaction.api";

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
        const depositXdr = (await depositToPool(
          assetCode,
          amount,
          decimals,
          address,
          contractId
        )) as string;

        await txApi.prepare({ unsignedXdr: depositXdr });

        const signedDeposit = await signTransaction(depositXdr, {
          networkPassphrase,
          address,
        });
        const signedXdr = extractSignedTxXdr(signedDeposit);

        const submitResult = await txApi.submit({ signedXdr });
        const final =
          submitResult.status === "PENDING"
            ? await pollTransactionStatus(submitResult.hash)
            : submitResult;

        if (final.status !== "SUCCESS") {
          const errMsg =
            final.error?.message ?? final.error?.code ?? final.status;
          throw new Error(`Lending deposit failed (${errMsg})`);
        }

        await queryClient.invalidateQueries({ queryKey: ["lendingPools"] });
        await queryClient.invalidateQueries({ queryKey: ["stellar-balances"] });
        await queryClient.invalidateQueries({ queryKey: [...POOLS_QUERY_KEY] });
        return final.hash;
      } finally {
        setIsPending(false);
      }
    },
    [address, networkPassphrase, signTransaction, queryClient]
  );

  return { submit, isPending };
}
