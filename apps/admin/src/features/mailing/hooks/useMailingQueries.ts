import { useQuery } from "@tanstack/react-query";
import type { MailingAudienceId } from "@neko/api-contracts";
import {
  fetchAudiencePreview,
  fetchAudiences,
  fetchAutomationRuns,
  fetchAutomations,
  fetchAutomationStats,
  fetchBroadcasts,
  fetchTemplates,
  fetchTriggers,
} from "../actions";
import { mailingKeys } from "../queryKeys";

/** The catalog is static per deploy, so it never needs refetching. */
export function useAudiences() {
  return useQuery({
    queryKey: mailingKeys.audiences,
    queryFn: fetchAudiences,
    staleTime: Infinity,
  });
}

/**
 * Recipient count for the selected audience. Resolving an audience scans
 * users + audit logs, so this is debounced by only running on an explicit
 * selection rather than on every keystroke in the composer.
 */
export function useAudiencePreview(audience: MailingAudienceId | null) {
  return useQuery({
    queryKey: mailingKeys.audiencePreview(audience ?? "all"),
    queryFn: () => fetchAudiencePreview(audience!),
    enabled: audience !== null,
    staleTime: 60_000,
  });
}

export function useBroadcasts() {
  return useQuery({
    queryKey: mailingKeys.broadcasts,
    queryFn: fetchBroadcasts,
  });
}

export function useTemplates() {
  return useQuery({
    queryKey: mailingKeys.templates,
    queryFn: fetchTemplates,
  });
}

export function useTriggers() {
  return useQuery({
    queryKey: mailingKeys.triggers,
    queryFn: fetchTriggers,
    staleTime: Infinity,
  });
}

export function useAutomations() {
  return useQuery({
    queryKey: mailingKeys.automations,
    queryFn: fetchAutomations,
  });
}

export function useAutomationRuns(id: string | null) {
  return useQuery({
    queryKey: mailingKeys.automationRuns(id ?? ""),
    queryFn: () => fetchAutomationRuns(id!),
    enabled: id !== null,
  });
}

export function useAutomationStats(id: string | null) {
  return useQuery({
    queryKey: mailingKeys.automationStats(id ?? ""),
    queryFn: () => fetchAutomationStats(id!),
    enabled: id !== null,
  });
}
