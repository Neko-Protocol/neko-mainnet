"use client";

import { useState, useCallback } from "react";
import { TransactionBuilder, Networks } from "@stellar/stellar-sdk";
import { rpc } from "@stellar/stellar-sdk";
import { Client as DefindexVaultClient } from "@neko/defindex-vault";
import { useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/hooks/useWallet";
import { useToast } from "@/hooks/useToast";
import { TOAST_CONFIG } from "@/lib/constants/toast.config";
import {
  rpcUrl,
  networkPassphrase,
  allowHttpForSoroban,
} from "@/lib/constants/network";
import {
  rpcUrl as configRpcUrl,
  stellarNetwork,
} from "@/lib/config/stellar.config";
import { extractContractErrorOrNull } from "@/lib/helpers/stellar/contractErrors";
import { toSmallestUnit } from "@/lib/helpers/tokenUtils";
import { auditService } from "@/lib/services/audit.service";
import { useVaultBalance } from "./useVaultBalance";
import { useVaultData } from "./useVaultData";

const SLIPPAGE = 0.01;

/**
 * Signs and submits a simulated AssembledTransaction by:
 * 1. Getting the XDR (already includes simulation auth entries)
 * 2. Signing with the user's wallet (Freighter handles Soroban auth in the XDR)
 * 3. Submitting via rpc.Server
 *
 * Bypasses SDK's signAndSend() which crashes on .switch() in some v14 builds.
 */
async function signAndSubmit(
  xdr: string,
  passphrase: string,
  signFn: (
    xdr: string,
    opts: { networkPassphrase: string; address?: string }
  ) => Promise<{ signedTxXdr: string }>,
  address: string
) {
  const server = new rpc.Server(configRpcUrl, {
    allowHttp: stellarNetwork === "LOCAL",
  });
  const signed = await signFn(xdr, { networkPassphrase: passphrase, address });
  return server.sendTransaction(
    TransactionBuilder.fromXDR(signed.signedTxXdr, passphrase)
  );
}

/**
 * Polls getTransaction(hash) until the tx is included in a ledger (SUCCESS / FAILED)
 * or we time out. sendTransaction only enqueues the tx and returns PENDING immediately,
 * so we MUST wait here to know the real on-chain outcome.
 */
async function waitForTx(
  hash: string,
  {
    timeoutMs = 30_000,
    intervalMs = 1_000,
  }: { timeoutMs?: number; intervalMs?: number } = {}
) {
  const server = new rpc.Server(configRpcUrl, {
    allowHttp: stellarNetwork === "LOCAL",
  });
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const res = await server.getTransaction(hash);
    if (res.status !== "NOT_FOUND") {
      return res;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(
    `Timed out waiting for transaction ${hash} to be included in a ledger`
  );
}

export function useVaultAction(
  vaultContractId: string | null | undefined,
  symbol = "tokens"
) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    address,
    signTransaction,
    networkPassphrase: walletPassphrase,
  } = useWallet();
  const { addNotification } = useToast();
  const { refetch: refetchBalance } = useVaultBalance(vaultContractId);
  const { refetch: refetchVaultData } = useVaultData(vaultContractId);
  const queryClient = useQueryClient();

  const refetchSupplyBalance = useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: ["vaultSupplyBalance"],
      }),
    [queryClient]
  );

  const showError = useCallback(
    (msg: string) =>
      addNotification("Something went wrong", "error", {
        ...TOAST_CONFIG.defaultOpts,
        description: msg,
      }),
    [addNotification]
  );
  const showSuccess = useCallback(
    (msg: string) =>
      addNotification("Success", "success", {
        ...TOAST_CONFIG.defaultOpts,
        description: msg,
      }),
    [addNotification]
  );

  const handleDeposit = useCallback(
    async (amount: string) => {
      if (!address || !amount || parseFloat(amount) <= 0) return;
      if (!vaultContractId) return;
      setIsLoading(true);

      try {
        if (!walletPassphrase) {
          throw new Error("Wallet passphrase not available");
        }
        const passphrase = walletPassphrase;

        // Client needs publicKey so simulation uses the real user account
        const client = new DefindexVaultClient({
          contractId: vaultContractId,
          rpcUrl,
          networkPassphrase,
          publicKey: address,
          ...(allowHttpForSoroban && { allowHttp: true }),
        });

        const amountBigInt = BigInt(toSmallestUnit(amount, 7));
        const minAmount =
          amountBigInt -
          (amountBigInt * BigInt(Math.floor(SLIPPAGE * 100))) / 100n;

        // Simulate — the resulting XDR already includes Soroban auth entries
        const depositTx = await client.deposit({
          amounts_desired: [amountBigInt],
          amounts_min: [minAmount],
          from: address,
          invest: false,
        });

        // Sign + submit the simulated XDR directly (Freighter handles auth entries)
        const sendResult = await signAndSubmit(
          depositTx.toXDR(),
          passphrase,
          signTransaction,
          address
        );

        console.log("[vault:deposit] sent:", sendResult.hash, sendResult);

        if (sendResult.status === "ERROR") {
          throw new Error(
            `Transaction rejected by network: ${
              sendResult.errorResult?.result().switch().name ?? "unknown"
            }`
          );
        }

        const finalResult = await waitForTx(sendResult.hash);
        console.log("[vault:deposit] final:", finalResult.status, finalResult);

        if (finalResult.status !== "SUCCESS") {
          throw new Error(
            `Transaction failed on-chain (status=${finalResult.status}). Hash: ${sendResult.hash}`
          );
        }

        auditService.log({
          wallet_address: address,
          action_type: "vaults_deposit",
          asset_in: symbol,
          amount_in: parseFloat(amount),
          pool_id: vaultContractId,
          tx_hash: sendResult.hash,
        });

        await Promise.all([
          refetchBalance(),
          refetchVaultData(),
          refetchSupplyBalance(),
        ]);
        showSuccess(`Successfully deposited ${amount} ${symbol}`);
      } catch (err) {
        const msg = extractContractErrorOrNull(err);
        showError(
          typeof msg === "string" ? msg : "An unexpected error occurred."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      address,
      walletPassphrase,
      signTransaction,
      refetchBalance,
      refetchVaultData,
      refetchSupplyBalance,
      showError,
      showSuccess,
      symbol,
      vaultContractId,
    ]
  );

  const handleWithdraw = useCallback(
    async (shares: string) => {
      if (!address || !shares || parseFloat(shares) <= 0) return;
      if (!vaultContractId) return;
      setIsLoading(true);

      try {
        if (!walletPassphrase) {
          throw new Error("Wallet passphrase not available");
        }
        const passphrase = walletPassphrase;

        const client = new DefindexVaultClient({
          contractId: vaultContractId,
          rpcUrl,
          networkPassphrase,
          publicKey: address,
          ...(allowHttpForSoroban && { allowHttp: true }),
        });

        const sharesBigInt = BigInt(toSmallestUnit(shares, 7));

        const withdrawTx = await client.withdraw({
          withdraw_shares: sharesBigInt,
          min_amounts_out: [0n],
          from: address,
        });

        const sendResult = await signAndSubmit(
          withdrawTx.toXDR(),
          passphrase,
          signTransaction,
          address
        );

        console.log("[vault:withdraw] sent:", sendResult.hash, sendResult);

        if (sendResult.status === "ERROR") {
          throw new Error(
            `Transaction rejected by network: ${
              sendResult.errorResult?.result().switch().name ?? "unknown"
            }`
          );
        }

        const finalResult = await waitForTx(sendResult.hash);
        console.log("[vault:withdraw] final:", finalResult.status, finalResult);

        if (finalResult.status !== "SUCCESS") {
          throw new Error(
            `Transaction failed on-chain (status=${finalResult.status}). Hash: ${sendResult.hash}`
          );
        }

        auditService.log({
          wallet_address: address,
          action_type: "vaults_withdraw",
          asset_out: symbol,
          amount_out: parseFloat(shares),
          pool_id: vaultContractId,
          tx_hash: sendResult.hash,
        });

        await Promise.all([
          refetchBalance(),
          refetchVaultData(),
          refetchSupplyBalance(),
        ]);
        showSuccess(`Successfully withdrew ${shares} ${symbol ?? "shares"}`);
      } catch (err) {
        const msg = extractContractErrorOrNull(err);
        showError(
          typeof msg === "string" ? msg : "An unexpected error occurred."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      address,
      walletPassphrase,
      signTransaction,
      refetchBalance,
      refetchVaultData,
      refetchSupplyBalance,
      showError,
      showSuccess,
      symbol,
      vaultContractId,
    ]
  );

  return {
    isLoading,
    hasWallet: !!address,
    handleDeposit,
    handleWithdraw,
  };
}
