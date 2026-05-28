"use client";

import { useState, useCallback } from "react";
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
import { extractContractErrorOrNull } from "@/lib/helpers/stellar/contractErrors";
import { toSmallestUnit, fromSmallestUnit } from "@/lib/helpers/tokenUtils";
import {
  applySlippageBps,
  decimalToAtomic,
  mulDivCeil,
  mulDivFloor,
} from "@/lib/helpers/amount";
import { extractSignedTxXdr } from "@/lib/helpers/stellar/transaction";
import { resolveDecimalsForAuditAssetKey } from "@/lib/helpers/auditAssetAmounts";
import { auditService } from "@/lib/services/audit.service";
import { pollTransactionStatus, txApi } from "@/lib/services/transaction.api";
import type { TransactionStatusResponse } from "@/lib/services/transaction.api";

const VAULT_SHARE_DECIMALS = 7;
const WITHDRAW_SLIPPAGE_BPS = 100;

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

async function signAndSubmit(
  xdr: string,
  passphrase: string,
  signFn: (
    xdr: string,
    opts: { networkPassphrase: string; address?: string }
  ) => Promise<string | { signedTxXdr?: string }>,
  address: string
): Promise<TransactionStatusResponse> {
  await txApi.prepare({ unsignedXdr: xdr });
  const signed = await signFn(xdr, { networkPassphrase: passphrase, address });
  const signedTxXdr = extractSignedTxXdr(signed);
  return txApi.submit({ signedXdr: signedTxXdr });
}

function readBigintResult(result: unknown): bigint {
  const value = unwrapAssembledContractResult<unknown>(result);
  return BigInt((value as { toString(): string }).toString());
}

function readSingleAssetTotalManaged(result: unknown): bigint {
  const funds =
    unwrapAssembledContractResult<Array<{ total_amount: unknown }>>(result);
  if (!Array.isArray(funds) || funds.length !== 1) {
    throw new Error("Only single-asset vault withdrawals are supported");
  }
  return BigInt(String(funds[0].total_amount));
}

async function finalizeSubmit(
  submitResult: TransactionStatusResponse
): Promise<TransactionStatusResponse> {
  if (submitResult.status === "PENDING") {
    return pollTransactionStatus(submitResult.hash);
  }
  return submitResult;
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
        queryClient.invalidateQueries({ queryKey: ["bearingYieldBalance"] }),
        queryClient.invalidateQueries({ queryKey: ["defindex-vaults"] }),
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
    async (
      amount: string
    ): Promise<{ success: boolean; isFirstVaultDeposit: boolean }> => {
      if (!address || !amount || parseFloat(amount) <= 0)
        return { success: false, isFirstVaultDeposit: false };
      if (!vaultContractId)
        return { success: false, isFirstVaultDeposit: false };
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

        // Simulate  the resulting XDR already includes Soroban auth entries
        const depositTx = await client.deposit({
          amounts_desired: [amountBigInt],
          amounts_min: [0n],
          from: address,
          invest: false,
        });

        const submitResult = await signAndSubmit(
          depositTx.toXDR(),
          passphrase,
          signTransaction,
          address
        );

        setIsConfirming(true);
        const finalResult = await finalizeSubmit(submitResult);

        if (finalResult.status !== "SUCCESS") {
          const reason =
            finalResult.error?.message ??
            finalResult.error?.code ??
            finalResult.status;
          throw new Error(`Vault deposit failed (${reason})`);
        }

        const minted = vaultDepositMintedShares(depositTx.result);
        const mintedSharesHuman =
          minted != null
            ? parseFloat(
                fromSmallestUnit(minted.toString(), VAULT_SHARE_DECIMALS)
              )
            : undefined;

        const { isFirstVaultDeposit } = await auditService.log({
          wallet_address: address,
          action_type: "vaults_deposit",
          asset_in: supplyAssetSymbol,
          token_amount_in: parseFloat(amount),
          asset_out: vaultShareSymbol ?? "vault_shares",
          ...(mintedSharesHuman != null && Number.isFinite(mintedSharesHuman)
            ? { amount_out: mintedSharesHuman }
            : {}),
          pool_id: vaultContractId,
          tx_hash: finalResult.hash,
        });

        void invalidateAfterTx();
        return {
          success: true,
          isFirstVaultDeposit: isFirstVaultDeposit ?? false,
        };
      } catch (err) {
        if (err instanceof Error && err.message === "USER_REJECTED")
          return { success: false, isFirstVaultDeposit: false };
        const contractMsg = extractContractErrorOrNull(err);
        showError(
          typeof contractMsg === "string"
            ? contractMsg
            : err instanceof Error
              ? err.message
              : "An unexpected error occurred."
        );
        return { success: false, isFirstVaultDeposit: false };
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
      supplyAssetSymbol,
      vaultContractId,
      vaultShareSymbol,
    ]
  );

  const handleWithdraw = useCallback(
    async (
      amount: string,
      options?: { withdrawAll?: boolean }
    ): Promise<boolean> => {
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

        const decimals =
          resolveDecimalsForAuditAssetKey(supplyAssetSymbol) ??
          VAULT_SHARE_DECIMALS;
        const amountUnderlying = decimalToAtomic(amount, decimals);

        const [balanceTx, totalSupplyTx, fundsTx] = await Promise.all([
          client.balance({ id: address }, { simulate: true }),
          client.total_supply({ simulate: true }),
          client.fetch_total_managed_funds({ simulate: true }),
        ]);
        const userShares = readBigintResult(balanceTx.result);
        const totalSupply = readBigintResult(totalSupplyTx.result);
        const totalManaged = readSingleAssetTotalManaged(fundsTx.result);

        if (userShares <= 0n || totalSupply <= 0n || totalManaged <= 0n) {
          throw new Error("No vault balance available to withdraw");
        }

        let sharesBigInt = options?.withdrawAll
          ? userShares
          : mulDivCeil(amountUnderlying, totalSupply, totalManaged);
        if (sharesBigInt <= 0n) {
          throw new Error("Withdrawal amount is too small");
        }
        if (sharesBigInt > userShares) {
          if (options?.withdrawAll) {
            sharesBigInt = userShares;
          } else {
            throw new Error("Withdrawal amount exceeds vault balance");
          }
        }
        const expectedUnderlying = mulDivFloor(
          sharesBigInt,
          totalManaged,
          totalSupply
        );

        const withdrawTx = await client.withdraw({
          withdraw_shares: sharesBigInt,
          min_amounts_out: [
            applySlippageBps(expectedUnderlying, WITHDRAW_SLIPPAGE_BPS),
          ],
          from: address,
        });

        const submitResult = await signAndSubmit(
          withdrawTx.toXDR(),
          passphrase,
          signTransaction,
          address
        );

        setIsConfirming(true);
        const finalResult = await finalizeSubmit(submitResult);

        if (finalResult.status !== "SUCCESS") {
          const reason =
            finalResult.error?.message ??
            finalResult.error?.code ??
            finalResult.status;
          throw new Error(`Vault withdraw failed (${reason})`);
        }

        const underlyingBi = vaultWithdrawUnderlyingOut(withdrawTx.result);
        const underlyingHuman =
          underlyingBi != null
            ? parseFloat(fromSmallestUnit(underlyingBi.toString(), decimals))
            : parseFloat(
                fromSmallestUnit(expectedUnderlying.toString(), decimals)
              );
        const sharesHuman = parseFloat(
          fromSmallestUnit(sharesBigInt.toString(), VAULT_SHARE_DECIMALS)
        );
        const displayAmount =
          underlyingBi != null
            ? fromSmallestUnit(underlyingBi.toString(), decimals)
            : fromSmallestUnit(expectedUnderlying.toString(), decimals);

        auditService.log({
          wallet_address: address,
          action_type: "vaults_withdraw",
          asset_in: vaultShareSymbol ?? "vault_shares",
          token_amount_in: sharesHuman,
          asset_out: supplyAssetSymbol,
          amount_out: underlyingHuman,
          pool_id: vaultContractId,
          tx_hash: finalResult.hash,
        });

        showSuccess(
          `Successfully withdrew ${displayAmount} ${supplyAssetSymbol}`
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
    showSuccess,
  };
}
