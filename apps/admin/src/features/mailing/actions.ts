"use server";

import type {
  MailingAudience,
  MailingAudienceId,
  MailingAudiencePreview,
  MailingEmailPreview,
  MailingMessage,
  MailingMessageKind,
  MailingSend,
  MailingSendStats,
  MailingStats,
  MailingTemplate,
  MailingTrigger,
} from "@neko-protocol/api-contracts";
import { fetchFromBackend, mutateBackend } from "@/lib/services/backend-client";
import { getActingAdminEmail } from "./actingAdmin";

const MESSAGES = "admin/mailing/messages";
const TEMPLATES = "admin/mailing/templates";

/* ------------------------------ catalogs -------------------------------- */

export async function fetchAudiences(): Promise<MailingAudience[]> {
  return fetchFromBackend<MailingAudience[]>(`${MESSAGES}/audiences`);
}

export async function fetchTriggers(): Promise<MailingTrigger[]> {
  return fetchFromBackend<MailingTrigger[]>(`${MESSAGES}/triggers`);
}

export async function fetchAudiencePreview(
  audience: MailingAudienceId
): Promise<MailingAudiencePreview> {
  return fetchFromBackend<MailingAudiencePreview>(
    "admin/mailing/audience-preview",
    { audience }
  );
}

/** Renders body content through the same branded shell the send path uses. */
export async function previewEmail(input: {
  body_html: string;
  email?: string;
}): Promise<MailingEmailPreview> {
  return mutateBackend<MailingEmailPreview>(
    "POST",
    "admin/mailing/preview",
    input
  );
}

export async function fetchMailingStats(): Promise<MailingStats> {
  return fetchFromBackend<MailingStats>("admin/mailing/stats");
}

/* ------------------------------- messages ------------------------------- */

export async function fetchMessages(
  kind?: MailingMessageKind
): Promise<MailingMessage[]> {
  return fetchFromBackend<MailingMessage[]>(
    MESSAGES,
    kind ? { kind } : undefined
  );
}

export interface MessageInput {
  kind: MailingMessageKind;
  name: string;
  template_id?: string;
  subject?: string;
  body_html?: string;
  audience: MailingAudienceId;
  trigger_type?: string;
  trigger_params?: Record<string, unknown>;
  delay_value?: number;
  delay_unit?: string;
}

export async function createMessage(
  input: MessageInput
): Promise<MailingMessage> {
  const created_by = await getActingAdminEmail();
  return mutateBackend<MailingMessage>("POST", MESSAGES, {
    ...input,
    ...(created_by ? { created_by } : {}),
  });
}

export async function updateMessage(
  id: string,
  patch: Record<string, unknown>
): Promise<MailingMessage> {
  return mutateBackend<MailingMessage>("PATCH", `${MESSAGES}/${id}`, patch);
}

export async function deleteMessage(id: string): Promise<{ ok: boolean }> {
  return mutateBackend<{ ok: boolean }>("DELETE", `${MESSAGES}/${id}`);
}

export async function sendMessage(id: string): Promise<MailingMessage> {
  return mutateBackend<MailingMessage>("POST", `${MESSAGES}/${id}/send`);
}

export async function setMessageStatus(
  id: string,
  action: "activate" | "pause" | "archive" | "unarchive"
): Promise<MailingMessage> {
  return mutateBackend<MailingMessage>("POST", `${MESSAGES}/${id}/${action}`);
}

export async function fetchMessageSends(id: string): Promise<MailingSend[]> {
  return fetchFromBackend<MailingSend[]>(`${MESSAGES}/${id}/sends`);
}

export async function fetchMessageStats(id: string): Promise<MailingSendStats> {
  return fetchFromBackend<MailingSendStats>(`${MESSAGES}/${id}/stats`);
}

/** Test-sends unsaved copy; deliberately creates no message row. */
export async function sendAdHocTest(input: {
  email: string;
  subject: string;
  body_html: string;
}): Promise<{ ok: boolean }> {
  return mutateBackend<{ ok: boolean }>("POST", `${MESSAGES}/test`, input);
}

/* ------------------------------- templates ------------------------------ */

export async function fetchTemplates(): Promise<MailingTemplate[]> {
  return fetchFromBackend<MailingTemplate[]>(TEMPLATES);
}

export async function createTemplate(input: {
  name: string;
  subject: string;
  body_html: string;
}): Promise<MailingTemplate> {
  const created_by = await getActingAdminEmail();
  return mutateBackend<MailingTemplate>("POST", TEMPLATES, {
    ...input,
    ...(created_by ? { created_by } : {}),
  });
}

export async function updateTemplate(
  id: string,
  input: Partial<{ name: string; subject: string; body_html: string }>
): Promise<MailingTemplate> {
  return mutateBackend<MailingTemplate>("PATCH", `${TEMPLATES}/${id}`, input);
}

export async function deleteTemplate(id: string): Promise<{ ok: boolean }> {
  return mutateBackend<{ ok: boolean }>("DELETE", `${TEMPLATES}/${id}`);
}

/* ---------------------------------- ops --------------------------------- */

export async function runEnrollment(): Promise<{
  automationsProcessed: number;
  enrolled: number;
}> {
  return mutateBackend("POST", "admin/mailing/run-enrollment");
}

export async function runDispatch(): Promise<{
  sent: number;
  skipped: number;
  failed: number;
}> {
  return mutateBackend("POST", "admin/mailing/run-dispatch");
}
