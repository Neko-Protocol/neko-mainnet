"use client";

import { useQuery } from "@tanstack/react-query";
import { notificationsService } from "@/features/shared/notifications/services/notifications.service";
import { useStellarWalletStore } from "@/stores/stellarWalletStore";
import { notificationKeys } from "./notificationKeys";

const POLL_INTERVAL_MS = 30_000;

/**
 * The badge count.
 *
 * Polled rather than pushed: notifications are written in-band by the backend,
 * but the browser has no channel to hear about it: the `notifications` table
 * has RLS on with no public policies, so the anon client cannot subscribe to
 * realtime changes. Follows the polling precedent in
 * `features/shared/wallet/hooks/usePendingMultisigTxsPolling.ts`.
 *
 * Anything the user does in this tab does not wait for the poll -
 * `useNotificationLiveRefresh` invalidates this the moment an audit write
 * lands, which is the same request that emits the notification.
 */
export function useUnreadCount() {
  const address = useStellarWalletStore((s) => s.address);

  return useQuery({
    queryKey: notificationKeys.unread(address ?? null),
    queryFn: () => notificationsService.unreadCount(address!),
    enabled: Boolean(address),
    staleTime: 15_000,
    refetchInterval: POLL_INTERVAL_MS,
    // Coming back to the tab is the other moment a stale badge is obvious.
    refetchOnWindowFocus: true,
  });
}
