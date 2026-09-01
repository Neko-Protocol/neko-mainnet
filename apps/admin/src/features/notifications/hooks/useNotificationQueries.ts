"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchNotificationAudiencePreview,
  fetchNotificationMessages,
  fetchNotificationStats,
  fetchTriggerCoverage,
} from "../actions";
import { notificationKeys } from "../queryKeys";

export function useTriggerCoverage() {
  return useQuery({
    queryKey: notificationKeys.triggers,
    queryFn: fetchTriggerCoverage,
  });
}

export function useNotificationMessages(kind?: "trigger" | "announcement") {
  return useQuery({
    queryKey: notificationKeys.messages(kind),
    queryFn: () => fetchNotificationMessages(kind),
  });
}

export function useNotificationStats() {
  return useQuery({
    queryKey: notificationKeys.stats,
    queryFn: fetchNotificationStats,
  });
}

export function useNotificationAudiencePreview(audience: string) {
  return useQuery({
    queryKey: notificationKeys.audiencePreview(audience),
    queryFn: () => fetchNotificationAudiencePreview(audience),
    enabled: Boolean(audience),
    staleTime: 60_000,
  });
}
