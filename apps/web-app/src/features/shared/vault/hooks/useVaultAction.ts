"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { TransactionBuilder, rpc } from "@stellar/stellar-sdk";
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
import { useMultisigDetection } from "@/features/shared/vault/hooks/useMultisigDetection";
import { lobstrVaultService } from "@/features/shared/vault/services/lobstr-vault.service";
import { usePendingMultisigTxsStore } from "@/features/shared/wallet/stores/pendingMultisigTxs.store";
import { useApiErrorMessage } from "@/lib/helpers/useApiErrorMessage";
import {
  extractContractErrorOrNull,
  getGenericErrorCode,
} from "@neko/orchestrator";
import { toSmallestUnit, fromSmallestUnit } from "@neko/orchestrator";
import {
  applySlippageBps,
  decimalToAtomic,
  extractSignedTxXdr,
  mulDivCeil,
  mulDivFloor,
} from "@neko/orchestrator";
import { resolveDecimalsForAuditAssetKey } from "@/lib/helpers/auditAssetAmounts";
import { auditService } from "@/lib/services/audit.service";

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

type SignAndSubmitResult =
  | {
      kind: "submitted";
      hash: string;
      sendResult: Awaited<ReturnType<rpc.Server["sendTransaction"]>>;
    }
  | { kind: "multisig_pending"; hash: string };

async function signAndSubmit(
  xdr: string,
  passphrase: string,
  signFn: (
    xdr: string,
    opts: { networkPassphrase: string; address?: string }
  ) => Promise<string | { signedTxXdr?: string }>,
  address: string,
  isMultisig: boolean,
  lobstrRejectedMessage: (error: string) => string
): Promise<SignAndSubmitResult> {
  const server = new rpc.Server(rpcUrl, {
    allowHttp: allowHttpForSoroban,
  });
  const signed = await signFn(xdr, { networkPassphrase: passphrase, address });
  const signedTxXdr = extractSignedTxXdr(signed);
  const tx = TransactionBuilder.fromXDR(signedTxXdr, passphrase);
  const hash = tx.hash().toString("hex");

  if (isMultisig) {
    const result = await lobstrVaultService.submitForCosigning(signedTxXdr);
    if (!result.ok) {
      throw new Error(lobstrRejectedMessage(result.error));
    }
    return { kind: "multisig_pending", hash };
  }

  const sendResult = await server.sendTransaction(tx);
  return { kind: "submitted", hash, sendResult };
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

/**
 * Polls getTransaction(hash) until the tx is included in a ledger (SUCCESS / FAILED)
 * or we time out.
 */
async function waitForTx(
  hash: string,
  {
    timeoutMs = 30_000,
    intervalMs = 1_000,
  }: { timeoutMs?: number; intervalMs?: number } = {}
) {
  const server = new rpc.Server(rpcUrl, {
    allowHttp: allowHttpForSoroban,
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
  const t = useTranslations("sharedVault.errors");
  const tToasts = useTranslations("sharedVault.toasts");
  const getErrorMessage = useApiErrorMessage();
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const {
    address,
    signTransaction,
    networkPassphrase: walletPassphrase,
  } = useWallet();
  const { addNotification } = useToast();
  const queryClient = useQueryClient();
  const { data: multisigInfo } = useMultisigDetection();
  const addPendingMultisig = usePendingMultisigTxsStore((s) => s.add);

  const invalidateAfterTx = useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["vaultBalance"] }),
        queryClient.invalidateQueries({ queryKey: ["vaultSupplyBalance"] }),
        queryClient.invalidateQueries({ queryKey: ["vaultData"] }),
        queryClient.invalidateQueries({ queryKey: ["bearingYieldBalance"] }),
        queryClient.invalidateQueries({ queryKey: ["defindex-vaults"] }),
        queryClient.invalidateQueries({ queryKey: ["vaultAuditActivity"] }),
      ]),
    [queryClient]
  );

  const showError = useCallback(
    (msg: string) =>
      addNotification(t("genericErrorTitle"), "error", {
        ...TOAST_CONFIG.defaultOpts,
        description: msg,
      }),
    [addNotification, t]
  );
  const showSuccess = useCallback(
    (msg: string) =>
      addNotification(t("successTitle"), "success", {
        ...TOAST_CONFIG.defaultOpts,
        description: msg,
      }),
    [addNotification, t]
  );

  const handleDeposit = useCallback(
    async (
      amount: string
    ): Promise<{
      success: boolean;
      isFirstVaultDeposit: boolean;
      multisigPending?: { hash: string };
    }> => {
      if (!address || !amount || parseFloat(amount) <= 0)
        return { success: false, isFirstVaultDeposit: false };
      if (!vaultContractId)
        return { success: false, isFirstVaultDeposit: false };
      setIsLoading(true);

      try {
        if (!walletPassphrase) {
          throw new Error(t("walletPassphraseUnavailable"));
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

        const depositTx = await client.deposit(
          {
            amounts_desired: [amountBigInt],
            amounts_min: [0n],
            from: address,
            invest: false,
          },
          { timeoutInSeconds: 7200 }
        );

        console.log("[VaultAction] unsigned XDR:", depositTx.toXDR());

        const result = await signAndSubmit(
          depositTx.toXDR(),
          passphrase,
          signTransaction,
          address,
          multisigInfo?.isMultisig ?? false,
          (error) => t("lobstrRejected", { error })
        );

        if (result.kind === "multisig_pending") {
          const { hash } = result;
          addPendingMultisig({
            hash,
            walletAddress: address,
            vaultContractId,
            vaultLabel: vaultShareSymbol ?? supplyAssetSymbol,
            amount,
            assetSymbol: supplyAssetSymbol,
            action: "deposit",
            submittedAt: Date.now(),
          });
          return {
            success: false,
            isFirstVaultDeposit: false,
            multisigPending: { hash },
          };
        }

        const { sendResult } = result;

        if (sendResult.status === "ERROR") {
          throw new Error(
            t("transactionRejectedByNetwork", {
              reason:
                sendResult.errorResult?.result().switch().name ?? "unknown",
            })
          );
        }

        if (sendResult.status === "TRY_AGAIN_LATER") {
          throw new Error(t("networkCongested"));
        }

        setIsConfirming(true);
        const finalResult = await waitForTx(sendResult.hash);

        if (finalResult.status !== "SUCCESS") {
          throw new Error(t("transactionFailedOnChain"));
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
          tx_hash: sendResult.hash,
        });

        void invalidateAfterTx();
        return {
          success: true,
          isFirstVaultDeposit: isFirstVaultDeposit ?? false,
        };
      } catch (err) {
        if (err instanceof Error && err.message === "USER_REJECTED")
          return { success: false, isFirstVaultDeposit: false };
        const errorCode = getGenericErrorCode(err);
        showError(
          errorCode
            ? getErrorMessage(errorCode)
            : (extractContractErrorOrNull(err) ?? t("unexpectedError"))
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
      multisigInfo,
      addPendingMultisig,
      getErrorMessage,
      t,
    ]
  );

  const handleWithdraw = useCallback(
    async (
      amount: string,
      options?: { withdrawAll?: boolean; isEarningsClaim?: boolean }
    ): Promise<{ success: boolean; multisigPending?: { hash: string } }> => {
      if (!address || !amount || parseFloat(amount) <= 0)
        return { success: false };
      if (!vaultContractId) return { success: false };
      setIsLoading(true);

      try {
        if (!walletPassphrase) {
          throw new Error(t("walletPassphraseUnavailable"));
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
          throw new Error(t("noBalanceToWithdraw"));
        }

        let sharesBigInt = options?.withdrawAll
          ? userShares
          : options?.isEarningsClaim
            ? mulDivFloor(amountUnderlying, totalSupply, totalManaged)
            : mulDivCeil(amountUnderlying, totalSupply, totalManaged);
        if (sharesBigInt <= 0n) {
          throw new Error(t("withdrawalTooSmall"));
        }
        if (sharesBigInt > userShares) {
          if (options?.withdrawAll) {
            sharesBigInt = userShares;
          } else {
            throw new Error(t("withdrawalExceedsBalance"));
          }
        }
        const expectedUnderlying = mulDivFloor(
          sharesBigInt,
          totalManaged,
          totalSupply
        );

        const withdrawTx = await client.withdraw(
          {
            withdraw_shares: sharesBigInt,
            min_amounts_out: [
              applySlippageBps(expectedUnderlying, WITHDRAW_SLIPPAGE_BPS),
            ],
            from: address,
          },
          { timeoutInSeconds: 7200 }
        );

        const result = await signAndSubmit(
          withdrawTx.toXDR(),
          passphrase,
          signTransaction,
          address,
          multisigInfo?.isMultisig ?? false,
          (error) => t("lobstrRejected", { error })
        );

        if (result.kind === "multisig_pending") {
          const { hash } = result;
          addPendingMultisig({
            hash,
            walletAddress: address,
            vaultContractId,
            vaultLabel: vaultShareSymbol ?? supplyAssetSymbol,
            amount,
            assetSymbol: supplyAssetSymbol,
            action: "withdraw",
            submittedAt: Date.now(),
          });
          return { success: false, multisigPending: { hash } };
        }

        const { sendResult } = result;

        if (sendResult.status === "ERROR") {
          throw new Error(
            t("transactionRejectedByNetwork", {
              reason:
                sendResult.errorResult?.result().switch().name ?? "unknown",
            })
          );
        }

        if (sendResult.status === "TRY_AGAIN_LATER") {
          throw new Error(t("networkCongested"));
        }

        setIsConfirming(true);
        const finalResult = await waitForTx(sendResult.hash);

        if (finalResult.status !== "SUCCESS") {
          throw new Error(t("transactionFailedOnChain"));
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

        await auditService.log({
          wallet_address: address,
          action_type: options?.isEarningsClaim
            ? "vaults_claim_earnings"
            : "vaults_withdraw",
          asset_in: vaultShareSymbol ?? "vault_shares",
          token_amount_in: sharesHuman,
          asset_out: supplyAssetSymbol,
          amount_out: underlyingHuman,
          pool_id: vaultContractId,
          tx_hash: sendResult.hash,
        });

        showSuccess(
          tToasts("withdrawSuccess", {
            amount: displayAmount,
            symbol: supplyAssetSymbol,
          })
        );
        void invalidateAfterTx();
        return { success: true };
      } catch (err) {
        if (err instanceof Error && err.message === "USER_REJECTED")
          return { success: false };
        const errorCode = getGenericErrorCode(err);
        showError(
          errorCode
            ? getErrorMessage(errorCode)
            : (extractContractErrorOrNull(err) ?? t("unexpectedError"))
        );
        return { success: false };
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
      multisigInfo,
      addPendingMultisig,
      getErrorMessage,
      t,
      tToasts,
    ]
  );

  const handleClaimEarnings = useCallback(
    async (
      netDepositedTokens: number
    ): Promise<{ success: boolean; multisigPending?: { hash: string } }> => {
      if (!address || !vaultContractId || netDepositedTokens <= 0)
        return { success: false };
      setIsLoading(true);

      try {
        if (!walletPassphrase)
          throw new Error(t("walletPassphraseUnavailable"));
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

        const [balanceTx, totalSupplyTx, fundsTx] = await Promise.all([
          client.balance({ id: address }, { simulate: true }),
          client.total_supply({ simulate: true }),
          client.fetch_total_managed_funds({ simulate: true }),
        ]);
        const userShares = readBigintResult(balanceTx.result);
        const totalSupply = readBigintResult(totalSupplyTx.result);
        const totalManaged = readSingleAssetTotalManaged(fundsTx.result);

        if (userShares <= 0n || totalSupply <= 0n || totalManaged <= 0n) {
          throw new Error(t("noBalanceToWithdraw"));
        }

        // Round UP principal shares so the remaining balance is always >= deposit
        const principalAtomic = decimalToAtomic(
          netDepositedTokens.toFixed(decimals),
          decimals
        );
        const principalShares = mulDivCeil(
          principalAtomic,
          totalSupply,
          totalManaged
        );
        const claimShares = userShares - principalShares;

        if (claimShares <= 0n) {
          throw new Error(t("noEarningsToClaim"));
        }

        const expectedUnderlying = mulDivFloor(
          claimShares,
          totalManaged,
          totalSupply
        );

        const withdrawTx = await client.withdraw(
          {
            withdraw_shares: claimShares,
            min_amounts_out: [
              applySlippageBps(expectedUnderlying, WITHDRAW_SLIPPAGE_BPS),
            ],
            from: address,
          },
          { timeoutInSeconds: 7200 }
        );

        const result = await signAndSubmit(
          withdrawTx.toXDR(),
          passphrase,
          signTransaction,
          address,
          multisigInfo?.isMultisig ?? false,
          (error) => t("lobstrRejected", { error })
        );

        if (result.kind === "multisig_pending") {
          const { hash } = result;
          addPendingMultisig({
            hash,
            walletAddress: address,
            vaultContractId,
            vaultLabel: vaultShareSymbol ?? supplyAssetSymbol,
            amount: expectedUnderlying.toString(),
            assetSymbol: supplyAssetSymbol,
            action: "withdraw",
            submittedAt: Date.now(),
          });
          return { success: false, multisigPending: { hash } };
        }

        const { sendResult } = result;

        if (sendResult.status === "ERROR") {
          throw new Error(
            t("transactionRejectedByNetwork", {
              reason:
                sendResult.errorResult?.result().switch().name ?? "unknown",
            })
          );
        }
        if (sendResult.status === "TRY_AGAIN_LATER") {
          throw new Error(t("networkCongested"));
        }

        setIsConfirming(true);
        const finalResult = await waitForTx(sendResult.hash);
        if (finalResult.status !== "SUCCESS") {
          throw new Error(t("transactionFailedOnChain"));
        }

        const underlyingBi = vaultWithdrawUnderlyingOut(withdrawTx.result);
        const underlyingHuman =
          underlyingBi != null
            ? parseFloat(fromSmallestUnit(underlyingBi.toString(), decimals))
            : parseFloat(
                fromSmallestUnit(expectedUnderlying.toString(), decimals)
              );
        const sharesHuman = parseFloat(
          fromSmallestUnit(claimShares.toString(), VAULT_SHARE_DECIMALS)
        );
        const displayAmount =
          underlyingBi != null
            ? fromSmallestUnit(underlyingBi.toString(), decimals)
            : fromSmallestUnit(expectedUnderlying.toString(), decimals);

        await auditService.log({
          wallet_address: address,
          action_type: "vaults_claim_earnings",
          asset_in: vaultShareSymbol ?? "vault_shares",
          token_amount_in: sharesHuman,
          asset_out: supplyAssetSymbol,
          amount_out: underlyingHuman,
          pool_id: vaultContractId,
          tx_hash: sendResult.hash,
        });

        showSuccess(
          tToasts("claimSuccess", {
            amount: displayAmount,
            symbol: supplyAssetSymbol,
          })
        );
        void invalidateAfterTx();
        return { success: true };
      } catch (err) {
        if (err instanceof Error && err.message === "USER_REJECTED")
          return { success: false };
        const errorCode = getGenericErrorCode(err);
        showError(
          errorCode
            ? getErrorMessage(errorCode)
            : (extractContractErrorOrNull(err) ?? t("unexpectedError"))
        );
        return { success: false };
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
      multisigInfo,
      addPendingMultisig,
      getErrorMessage,
      t,
      tToasts,
    ]
  );

  return {
    isLoading,
    isConfirming,
    hasWallet: !!address,
    handleDeposit,
    handleWithdraw,
    handleClaimEarnings,
    showSuccess,
  };
}
