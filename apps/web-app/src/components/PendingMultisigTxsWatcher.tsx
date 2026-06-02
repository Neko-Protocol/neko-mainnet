"use client";

import { usePendingMultisigTxsPolling } from "@/hooks/usePendingMultisigTxsPolling";

/**
 * Renderless component that mounts the multisig pending-tx poller globally.
 * Polls Horizon every 30s for the status of transactions queued in Lobstr
 * Vault. When a tx confirms (success or fail), it shows a toast, logs to audit,
 * invalidates vault-related queries, and removes the entry from persistent
 * storage.
 *
 * Mount once near the top of the app tree.
 */
export function PendingMultisigTxsWatcher() {
  usePendingMultisigTxsPolling();
  return null;
}
