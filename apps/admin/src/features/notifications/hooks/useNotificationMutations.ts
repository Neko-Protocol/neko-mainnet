"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createNotificationMessage,
  deleteNotificationMessage,
  runNotificationEnrollment,
  sendAnnouncement,
  setNotificationMessageStatus,
  updateNotificationMessage,
  type NotificationMessageInput,
} from "../actions";
import { notificationKeys } from "../queryKeys";

/**
 * Every write here can change the coverage matrix and the stats, so they all
 * invalidate the whole `["notifications"]` subtree rather than trying to guess
 * which slices moved.
 */
function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  };
}

export function useCreateNotificationMessage() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (input: NotificationMessageInput) =>
      createNotificationMessage(input),
    onSuccess: invalidate,
  });
}

export function useUpdateNotificationMessage() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (vars: {
      id: string;
      input: Partial<NotificationMessageInput>;
    }) => updateNotificationMessage(vars.id, vars.input),
    onSuccess: invalidate,
  });
}

export function useDeleteNotificationMessage() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: string) => deleteNotificationMessage(id),
    onSuccess: invalidate,
  });
}

export function useSetNotificationMessageStatus() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (vars: {
      id: string;
      action: "activate" | "pause" | "archive" | "unarchive";
    }) => setNotificationMessageStatus(vars.id, vars.action),
    onSuccess: invalidate,
  });
}

export function useSendAnnouncement() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: string) => sendAnnouncement(id),
    onSuccess: invalidate,
  });
}

export function useRunNotificationEnrollment() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: runNotificationEnrollment,
    onSuccess: invalidate,
  });
}
