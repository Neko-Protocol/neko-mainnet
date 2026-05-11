"use client";

import { useState, useCallback } from "react";
import { TransactionBuilder } from "@stellar/stellar-sdk";
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
import { toSmallestUnit, fromSmallestUnit } from "@/lib/helpers/tokenUtils";
import { resolveDecimalsForAuditAssetKey } from "@/lib/helpers/auditAssetAmounts";
import { auditService } from "@/lib/services/audit.service";

const SLIPPAGE = 0.01;

const VAULT_SHARE_DECIMALS = 7;

function unwrapAssembledContractResult<T>(result: unknown): T | undefined {
  if (result === null || result === undefined) return undefined;
  if (typeof (result as { unwrap?: () => T }).unwrap === "function") {
    try {
      return (result as { unwrap: () => T }).unwrap();
    } catch {
      return undefined;
    }
  }
  if ((result as { tag?: string }).tag === "ok") {
    return (result as { value: T }).value;
  }
  return result as T;
}

function vaultDepositMintedShares(
  depositTxResult: unknown
): bigint | undefined {
  const row =
    unwrapAssembledContractResult<readonly unknown[]>(depositTxResult);
  if (!Array.isArray(row) || row.length < 2) return undefined;
  try {
    return BigInt(String(row[1]));
  } catch {
    return undefined;
  }
}

function vaultWithdrawUnderlyingOut(
  withdrawTxResult: unknown
): bigint | undefined {
  const amounts = unwrapAssembledContractResult<unknown[]>(withdrawTxResult);
  if (!Array.isArray(amounts) || amounts[0] == null) return undefined;
  try {
    return BigInt(String(amounts[0]));
  } catch {
    return undefined;
  }
}

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
  supplyAssetSymbol = "tokens",
  vaultShareSymbol?: string
) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    address,
    signTransaction,
    networkPassphrase: walletPassphrase,
  } = useWallet();
  const { addNotification } = useToast();
  const queryClient = useQueryClient();

  const invalidateAfterTx = useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["vaultBalance"] }),
        queryClient.invalidateQueries({ queryKey: ["vaultSupplyBalance"] }),
        queryClient.invalidateQueries({ queryKey: ["vaultData"] }),
      ]),
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

        // Simulate  the resulting XDR already includes Soroban auth entries
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

        const minted = vaultDepositMintedShares(depositTx.result);
        const mintedSharesHuman =
          minted != null
            ? parseFloat(
                fromSmallestUnit(minted.toString(), VAULT_SHARE_DECIMALS)
              )
            : undefined;

        auditService.log({
          wallet_address: address,
          action_type: "vaults_deposit",
          asset_in: supplyAssetSymbol,
          amount_in: parseFloat(amount),
          asset_out: vaultShareSymbol ?? "vault_shares",
          ...(mintedSharesHuman != null && Number.isFinite(mintedSharesHuman)
            ? { amount_out: mintedSharesHuman }
            : {}),
          pool_id: vaultContractId,
          tx_hash: sendResult.hash,
        });

        setIsLoading(false);
        showSuccess(`Successfully deposited ${amount} ${supplyAssetSymbol}`);

        void waitForTx(sendResult.hash)
          .then((finalResult) => {
            console.log(
              "[vault:deposit] final:",
              finalResult.status,
              finalResult
            );
            if (finalResult.status !== "SUCCESS") {
              addNotification(
                "Transaction failed on-chain. Please refresh your balance.",
                "error"
              );
            }
            void invalidateAfterTx();
          })
          .catch(() => {
            addNotification(
              "Could not confirm transaction. Please refresh.",
              "error"
            );
            void invalidateAfterTx();
          });
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
      invalidateAfterTx,
      addNotification,
      showError,
      showSuccess,
      supplyAssetSymbol,
      vaultContractId,
      vaultShareSymbol,
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

        const underlyingBi = vaultWithdrawUnderlyingOut(withdrawTx.result);
        const undDec =
          resolveDecimalsForAuditAssetKey(supplyAssetSymbol) ??
          VAULT_SHARE_DECIMALS;
        const underlyingHuman =
          underlyingBi != null
            ? parseFloat(fromSmallestUnit(underlyingBi.toString(), undDec))
            : undefined;

        auditService.log({
          wallet_address: address,
          action_type: "vaults_withdraw",
          asset_in: vaultShareSymbol ?? "vault_shares",
          amount_in: parseFloat(shares),
          asset_out: supplyAssetSymbol,
          ...(underlyingHuman != null && Number.isFinite(underlyingHuman)
            ? { amount_out: underlyingHuman }
            : {}),
          pool_id: vaultContractId,
          tx_hash: sendResult.hash,
        });

        setIsLoading(false);
        showSuccess(
          `Successfully withdrew ${shares} ${vaultShareSymbol ?? "shares"}`
        );

        void waitForTx(sendResult.hash)
          .then((finalResult) => {
            console.log(
              "[vault:withdraw] final:",
              finalResult.status,
              finalResult
            );
            if (finalResult.status !== "SUCCESS") {
              addNotification(
                "Transaction failed on-chain. Please refresh your balance.",
                "error"
              );
            }
            void invalidateAfterTx();
          })
          .catch(() => {
            addNotification(
              "Could not confirm transaction. Please refresh.",
              "error"
            );
            void invalidateAfterTx();
          });
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
      invalidateAfterTx,
      addNotification,
      showError,
      showSuccess,
      supplyAssetSymbol,
      vaultContractId,
      vaultShareSymbol,
    ]
  );

  return {
    isLoading,
    hasWallet: !!address,
    handleDeposit,
    handleWithdraw,
  };
}
