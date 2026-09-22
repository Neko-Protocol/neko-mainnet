import { useQuery } from "@tanstack/react-query";
import type {
  MailingAudienceId,
  MailingMessageKind,
} from "@neko-protocol/api-contracts";
import {
  fetchAudiencePreview,
  fetchAudiences,
  fetchMessageSends,
  fetchMessageStats,
  fetchMailingStats,
  fetchMessages,
  fetchTemplates,
  fetchTriggers,
} from "../actions";
import { mailingKeys } from "../queryKeys";

/** Catalogs are static per deploy, so they never need refetching. */
export function useAudiences() {
  return useQuery({
    queryKey: mailingKeys.audiences,
    queryFn: fetchAudiences,
    staleTime: Infinity,
  });
}

export function useTriggers() {
  return useQuery({
    queryKey: mailingKeys.triggers,
    queryFn: fetchTriggers,
    staleTime: Infinity,
  });
}

/**
 * Recipient count for an audience. Resolving one scans users + audit logs, so
 * this is cached rather than recomputed on every render.
 */
export function useAudiencePreview(audience: MailingAudienceId | null) {
  return useQuery({
    queryKey: mailingKeys.audiencePreview(audience ?? "all"),
    queryFn: () => fetchAudiencePreview(audience!),
    enabled: audience !== null,
    staleTime: 60_000,
  });
}

export function useMessages(kind?: MailingMessageKind) {
  return useQuery({
    queryKey: mailingKeys.messages(kind),
    queryFn: () => fetchMessages(kind),
  });
}

export function useMessageSends(id: string | null) {
  return useQuery({
    queryKey: mailingKeys.messageSends(id ?? ""),
    queryFn: () => fetchMessageSends(id!),
    enabled: id !== null,
  });
}

export function useMessageStats(id: string | null) {
  return useQuery({
    queryKey: mailingKeys.messageStats(id ?? ""),
    queryFn: () => fetchMessageStats(id!),
    enabled: id !== null,
  });
}

export function useMailingStats() {
  return useQuery({
    queryKey: mailingKeys.stats,
    queryFn: fetchMailingStats,
  });
}

export function useTemplates() {
  return useQuery({
    queryKey: mailingKeys.templates,
    queryFn: fetchTemplates,
  });
}
