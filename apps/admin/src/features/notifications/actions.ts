"use server";

import type {
  NotificationMessage,
  NotificationStats,
  NotificationTriggerCoverage,
} from "@neko-protocol/api-contracts";
import { fetchFromBackend, mutateBackend } from "@/lib/services/backend-client";
import { getActingAdminEmail } from "@/features/mailing/actingAdmin";

const BASE = "admin/notifications";
const MESSAGES = `${BASE}/messages`;

/* ------------------------------- catalogs ------------------------------- */

/** Per-trigger coverage across both channels: in-app and email. */
export async function fetchTriggerCoverage(): Promise<
  NotificationTriggerCoverage[]
> {
  return fetchFromBackend<NotificationTriggerCoverage[]>(`${BASE}/triggers`);
}

export async function fetchNotificationStats(): Promise<NotificationStats> {
  return fetchFromBackend<NotificationStats>(`${BASE}/stats`);
}

export async function fetchNotificationAudiencePreview(
  audience: string
): Promise<{ audience: string; count: number }> {
  return fetchFromBackend<{ audience: string; count: number }>(
    `${BASE}/audience-preview`,
    { audience }
  );
}

/* ------------------------------- messages ------------------------------- */

export async function fetchNotificationMessages(
  kind?: "trigger" | "announcement"
): Promise<NotificationMessage[]> {
  return fetchFromBackend<NotificationMessage[]>(
    MESSAGES,
    kind ? { kind } : undefined
  );
}

export interface NotificationMessageInput {
  kind: "trigger" | "announcement";
  name: string;
  title: string;
  body: string;
  url?: string | null;
  category?: string;
  audience?: string;
  trigger_type?: string | null;
  trigger_params?: Record<string, unknown>;
}

export async function createNotificationMessage(
  input: NotificationMessageInput
): Promise<NotificationMessage> {
  // created_by comes from the session, never from the browser.
  return mutateBackend<NotificationMessage>("POST", MESSAGES, {
    ...input,
    created_by: await getActingAdminEmail(),
  });
}

export async function updateNotificationMessage(
  id: string,
  input: Partial<NotificationMessageInput>
): Promise<NotificationMessage> {
  return mutateBackend<NotificationMessage>(
    "PATCH",
    `${MESSAGES}/${id}`,
    input
  );
}

export async function deleteNotificationMessage(
  id: string
): Promise<{ ok: true }> {
  return mutateBackend<{ ok: true }>("DELETE", `${MESSAGES}/${id}`);
}

export async function setNotificationMessageStatus(
  id: string,
  action: "activate" | "pause" | "archive" | "unarchive"
): Promise<NotificationMessage> {
  return mutateBackend<NotificationMessage>(
    "POST",
    `${MESSAGES}/${id}/${action}`
  );
}

export async function sendAnnouncement(id: string): Promise<{ sent: number }> {
  return mutateBackend<{ sent: number }>("POST", `${MESSAGES}/${id}/send`);
}

/* --------------------------------- ops ---------------------------------- */

/** Runs the polled triggers (inactivity, low balance) on demand. */
export async function runNotificationEnrollment(): Promise<{
  emitted: number;
}> {
  return mutateBackend<{ emitted: number }>("POST", `${BASE}/run-enrollment`);
}
