"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsService } from "@/features/shared/notifications/services/notifications.service";
import { useStellarWalletStore } from "@/stores/stellarWalletStore";
import { notificationKeys } from "./notificationKeys";

/**
 * Clearing is separate from marking read: read is what the tray does on its
 * own when you look at it, cleared is what you choose to get rid of.
 */
export function useClearNotifications() {
  const address = useStellarWalletStore((s) => s.address);
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  };

  const clear = useMutation({
    mutationFn: (ids: string[]) => notificationsService.clear(address!, ids),
    onSuccess: invalidate,
  });

  const clearAll = useMutation({
    mutationFn: () => notificationsService.clearAll(address!),
    onSuccess: invalidate,
  });

  return { clear, clearAll };
}
