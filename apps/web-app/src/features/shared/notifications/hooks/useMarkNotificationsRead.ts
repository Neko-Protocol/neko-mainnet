"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsService } from "@/features/shared/notifications/services/notifications.service";
import { useStellarWalletStore } from "@/stores/stellarWalletStore";
import { notificationKeys } from "./notificationKeys";

export function useMarkNotificationsRead() {
  const address = useStellarWalletStore((s) => s.address);
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  };

  const markRead = useMutation({
    mutationFn: (ids: string[]) => notificationsService.markRead(address!, ids),
    onSuccess: invalidate,
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsService.markAllRead(address!),
    onSuccess: invalidate,
  });

  return { markRead, markAllRead };
}
