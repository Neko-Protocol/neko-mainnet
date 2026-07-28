"use client";

import { useEffect, useRef } from "react";
import { Horizon } from "@stellar/stellar-sdk";
import { useQueryClient } from "@tanstack/react-query";
import { useStellarWalletStore } from "@/stores/stellarWalletStore";
import {
  usePendingMultisigTxsStore,
  type PendingMultisigTx,
} from "@/features/shared/wallet/stores/pendingMultisigTxs.store";
import { useToast } from "@/hooks/useToast";
import { TOAST_CONFIG } from "@/lib/constants/toast.config";
import { horizonUrl } from "@/lib/constants/network";
import { auditService } from "@/lib/services/audit.service";

const POLL_INTERVAL_MS = 30_000;
const MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours — matches our timeoutInSeconds: 7200

type HorizonOutcome = "success" | "failed" | "pending" | "expired";

async function checkTxOnHorizon(
  hash: string,
  submittedAt: number
): Promise<HorizonOutcome> {
  if (Date.now() - submittedAt > MAX_AGE_MS) {
    return "expired";
  }
  try {
    const server = new Horizon.Server(horizonUrl);
    const tx = await server.transactions().transaction(hash).call();
    if (tx.successful) return "success";
    return "failed";
  } catch (err) {
    // 404 = not yet found — still pending
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes("404") ||
      message.toLowerCase().includes("not found")
    ) {
      return "pending";
    }
    // Other errors (network etc) treat as pending so we retry next tick
    return "pending";
  }
}

export function usePendingMultisigTxsPolling() {
  const { address } = useStellarWalletStore();
  const txs = usePendingMultisigTxsStore((s) => s.txs);
  const removeTx = usePendingMultisigTxsStore((s) => s.remove);
  const queryClient = useQueryClient();
  const { addNotification } = useToast();
  const inFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!address) return;
    const mine = txs.filter((t) => t.walletAddress === address);
    if (mine.length === 0) return;

    let cancelled = false;

    const runOnce = async () => {
      for (const tx of mine) {
        if (cancelled) return;
        if (inFlightRef.current.has(tx.hash)) continue;
        inFlightRef.current.add(tx.hash);
        try {
          const outcome = await checkTxOnHorizon(tx.hash, tx.submittedAt);
          if (cancelled) return;
          if (outcome === "success") {
            await handleSuccess(tx);
          } else if (outcome === "failed") {
            handleFailure(tx);
          } else if (outcome === "expired") {
            handleExpired(tx);
          }
        } finally {
          inFlightRef.current.delete(tx.hash);
        }
      }
    };

    const handleSuccess = async (tx: PendingMultisigTx) => {
      try {
        await auditService.log({
          wallet_address: tx.walletAddress,
          action_type:
            tx.action === "deposit" ? "vaults_deposit" : "vaults_withdraw",
          asset_in: tx.action === "deposit" ? tx.assetSymbol : "vault_shares",
          token_amount_in: parseFloat(tx.amount),
          asset_out: tx.action === "deposit" ? "vault_shares" : tx.assetSymbol,
          pool_id: tx.vaultContractId,
          tx_hash: tx.hash,
        });
      } catch {
        // best-effort
      }
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["vaultBalance"] }),
        queryClient.invalidateQueries({ queryKey: ["vaultSupplyBalance"] }),
        queryClient.invalidateQueries({ queryKey: ["vaultData"] }),
        queryClient.invalidateQueries({ queryKey: ["bearingYieldBalance"] }),
        queryClient.invalidateQueries({ queryKey: ["defindex-vaults"] }),
      ]);
      addNotification("Multisig transaction confirmed", "success", {
        ...TOAST_CONFIG.defaultOpts,
        description: `${tx.action === "deposit" ? "Deposit" : "Withdraw"} of ${tx.amount} ${tx.assetSymbol} confirmed on-chain.`,
      });
      removeTx(tx.hash);
    };

    const handleFailure = (tx: PendingMultisigTx) => {
      addNotification("Multisig transaction failed", "error", {
        ...TOAST_CONFIG.defaultOpts,
        description: `Your ${tx.action} of ${tx.amount} ${tx.assetSymbol} failed on-chain. Please check Lobstr Vault for details.`,
      });
      removeTx(tx.hash);
    };

    const handleExpired = (tx: PendingMultisigTx) => {
      addNotification("Multisig transaction expired", "error", {
        ...TOAST_CONFIG.defaultOpts,
        description: `Your ${tx.action} of ${tx.amount} ${tx.assetSymbol} was not signed in time. Please retry.`,
      });
      removeTx(tx.hash);
    };

    // Run immediately on mount, then every POLL_INTERVAL_MS
    void runOnce();
    const id = setInterval(() => {
      void runOnce();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [address, txs, removeTx, queryClient, addNotification]);
}
