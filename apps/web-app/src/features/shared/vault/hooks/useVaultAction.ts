"use client";

import { useState, useCallback } from "react";
import { TransactionBuilder, rpc, Operation } from "@stellar/stellar-sdk";
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

type SignFn = (
  xdr: string,
  opts: { networkPassphrase: string; address?: string }
) => Promise<{ signedTxXdr: string }>;

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
  signFn: SignFn,
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

/**
 * If the simulation indicates that archived ledger entries need to be restored
 * (TTL expired), submits a restoreFootprint transaction and waits for it to
 * land. Returns true if a restore was performed (caller should re-simulate),
 * false if no restore was needed.
 */
async function restoreIfNeeded(
  simulation: rpc.Api.SimulateTransactionResponse,
  passphrase: string,
  signFn: SignFn,
  address: string
): Promise<boolean> {
  if (!rpc.Api.isSimulationRestore(simulation)) return false;

  const { restorePreamble } = simulation;
  const server = new rpc.Server(configRpcUrl, {
    allowHttp: stellarNetwork === "LOCAL",
  });
  const account = await server.getAccount(address);

  const restoreTx = new TransactionBuilder(account, {
    fee: restorePreamble.minResourceFee,
    networkPassphrase: passphrase,
  })
    .setSorobanData(restorePreamble.transactionData.build())
    .addOperation(Operation.restoreFootprint({}))
    .setTimeout(30)
    .build();

  const restoreSim = await server.simulateTransaction(restoreTx);
  if (rpc.Api.isSimulationError(restoreSim)) {
    throw new Error("Failed to simulate contract state restoration");
  }

  const preparedRestoreTx = rpc
    .assembleTransaction(restoreTx, restoreSim)
    .build();
  const restoreSend = await signAndSubmit(
    preparedRestoreTx.toXDR(),
    passphrase,
    signFn,
    address
  );

  if (restoreSend.status === "ERROR") {
    throw new Error(
      `Restore transaction rejected: ${
        restoreSend.errorResult?.result().switch().name ?? "unknown"
      }`
    );
  }
  if (restoreSend.status === "TRY_AGAIN_LATER") {
    throw new Error(
      "Network congested during state restoration. Please try again."
    );
  }

  const restoreResult = await waitForTx(restoreSend.hash);
  if (restoreResult.status !== "SUCCESS") {
    throw new Error("Contract state restoration failed. Please try again.");
  }

  return true;
}

export function useVaultAction(
  vaultContractId: string | null | undefined,
  supplyAssetSymbol = "tokens",
  vaultShareSymbol?: string
) {
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

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
    async (amount: string): Promise<boolean> => {
      if (!address || !amount || parseFloat(amount) <= 0) return false;
      if (!vaultContractId) return false;
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

        const amountBigInt = BigInt(toSmallestUnit(amount, 7));

        let depositTx = await client.deposit({
          amounts_desired: [amountBigInt],
          amounts_min: [0n],
          from: address,
          invest: false,
        });

        // If vault ledger entries have expired TTLs, restore them first then re-simulate
        if (
          depositTx.simulation &&
          (await restoreIfNeeded(
            depositTx.simulation,
            passphrase,
            signTransaction,
            address
          ))
        ) {
          depositTx = await client.deposit({
            amounts_desired: [amountBigInt],
            amounts_min: [0n],
            from: address,
            invest: false,
          });
        }

        const sendResult = await signAndSubmit(
          depositTx.toXDR(),
          passphrase,
          signTransaction,
          address
        );

        if (sendResult.status === "ERROR") {
          throw new Error(
            `Transaction rejected by network: ${
              sendResult.errorResult?.result().switch().name ?? "unknown"
            }`
          );
        }

        if (sendResult.status === "TRY_AGAIN_LATER") {
          throw new Error(
            "Network is congested. Please try again in a moment."
          );
        }

        setIsConfirming(true);
        const finalResult = await waitForTx(sendResult.hash);

        if (finalResult.status !== "SUCCESS") {
          throw new Error("Transaction failed on-chain. Please try again.");
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

        showSuccess(`Successfully deposited ${amount} ${supplyAssetSymbol}`);
        void invalidateAfterTx();
        return true;
      } catch (err) {
        if (err instanceof Error && err.message === "USER_REJECTED")
          return false;
        const contractMsg = extractContractErrorOrNull(err);
        showError(
          typeof contractMsg === "string"
            ? contractMsg
            : err instanceof Error
              ? err.message
              : "An unexpected error occurred."
        );
        return false;
      } finally {
        setIsLoading(false);
        setIsConfirming(false);
      }
    },
    [
      address,
      walletPassphrase,
      signTransaction,
      invalidateAfterTx,
      showError,
      showSuccess,
      supplyAssetSymbol,
      vaultContractId,
      vaultShareSymbol,
    ]
  );

  const handleWithdraw = useCallback(
    async (shares: string): Promise<boolean> => {
      if (!address || !shares || parseFloat(shares) <= 0) return false;
      if (!vaultContractId) return false;
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

        let withdrawTx = await client.withdraw({
          withdraw_shares: sharesBigInt,
          min_amounts_out: [0n],
          from: address,
        });

        // If vault ledger entries have expired TTLs, restore them first then re-simulate
        if (
          withdrawTx.simulation &&
          (await restoreIfNeeded(
            withdrawTx.simulation,
            passphrase,
            signTransaction,
            address
          ))
        ) {
          withdrawTx = await client.withdraw({
            withdraw_shares: sharesBigInt,
            min_amounts_out: [0n],
            from: address,
          });
        }

        const sendResult = await signAndSubmit(
          withdrawTx.toXDR(),
          passphrase,
          signTransaction,
          address
        );

        if (sendResult.status === "ERROR") {
          throw new Error(
            `Transaction rejected by network: ${
              sendResult.errorResult?.result().switch().name ?? "unknown"
            }`
          );
        }

        if (sendResult.status === "TRY_AGAIN_LATER") {
          throw new Error(
            "Network is congested. Please try again in a moment."
          );
        }

        setIsConfirming(true);
        const finalResult = await waitForTx(sendResult.hash);

        if (finalResult.status !== "SUCCESS") {
          throw new Error("Transaction failed on-chain. Please try again.");
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

        showSuccess(
          `Successfully withdrew ${shares} ${vaultShareSymbol ?? "shares"}`
        );
        void invalidateAfterTx();
        return true;
      } catch (err) {
        if (err instanceof Error && err.message === "USER_REJECTED")
          return false;
        const contractMsg = extractContractErrorOrNull(err);
        showError(
          typeof contractMsg === "string"
            ? contractMsg
            : err instanceof Error
              ? err.message
              : "An unexpected error occurred."
        );
        return false;
      } finally {
        setIsLoading(false);
        setIsConfirming(false);
      }
    },
    [
      address,
      walletPassphrase,
      signTransaction,
      invalidateAfterTx,
      showError,
      showSuccess,
      supplyAssetSymbol,
      vaultContractId,
      vaultShareSymbol,
    ]
  );

  return {
    isLoading,
    isConfirming,
    hasWallet: !!address,
    handleDeposit,
    handleWithdraw,
  };
}
