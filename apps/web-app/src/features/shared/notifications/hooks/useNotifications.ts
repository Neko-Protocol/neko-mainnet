"use client";

import { useQuery } from "@tanstack/react-query";
import { notificationsService } from "@/features/shared/notifications/services/notifications.service";
import { useStellarWalletStore } from "@/stores/stellarWalletStore";
import { notificationKeys } from "./notificationKeys";

/** The feed itself. Only fetched while the panel is open. */
export function useNotifications(enabled = true) {
  const address = useStellarWalletStore((s) => s.address);

  return useQuery({
    queryKey: notificationKeys.list(address ?? null),
    queryFn: () => notificationsService.list(address!),
    enabled: Boolean(address) && enabled,
    staleTime: 30_000,
  });
}
