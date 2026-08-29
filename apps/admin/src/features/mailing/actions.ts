"use server";

import type {
  MailingAudience,
  MailingAudienceId,
  MailingAudiencePreview,
  MailingAutomation,
  MailingAutomationRun,
  MailingAutomationStats,
  MailingBroadcast,
  MailingTemplate,
  MailingTrigger,
} from "@neko/api-contracts";
import { fetchFromBackend, mutateBackend } from "@/lib/services/backend-client";

const BROADCASTS = "admin/mailing/broadcasts";
const TEMPLATES = "admin/mailing/templates";
const AUTOMATIONS = "admin/mailing/automations";

/* ---------------------------------- audiences --------------------------- */

export async function fetchAudiences(): Promise<MailingAudience[]> {
  return fetchFromBackend<MailingAudience[]>(`${BROADCASTS}/audiences`);
}

export async function fetchAudiencePreview(
  audience: MailingAudienceId
): Promise<MailingAudiencePreview> {
  return fetchFromBackend<MailingAudiencePreview>(
    `${BROADCASTS}/audiences/preview`,
    { audience }
  );
}

/* --------------------------------- broadcasts --------------------------- */

export async function fetchBroadcasts(): Promise<MailingBroadcast[]> {
  return fetchFromBackend<MailingBroadcast[]>(BROADCASTS);
}

export async function fetchBroadcast(id: string): Promise<MailingBroadcast> {
  return fetchFromBackend<MailingBroadcast>(`${BROADCASTS}/${id}`);
}

export async function createBroadcast(input: {
  name: string;
  subject: string;
  body_html: string;
  audience: MailingAudienceId;
}): Promise<MailingBroadcast> {
  return mutateBackend<MailingBroadcast>("POST", BROADCASTS, input);
}

export async function updateBroadcast(
  id: string,
  input: Partial<{
    name: string;
    subject: string;
    body_html: string;
    audience: MailingAudienceId;
  }>
): Promise<MailingBroadcast> {
  return mutateBackend<MailingBroadcast>("PATCH", `${BROADCASTS}/${id}`, input);
}

export async function deleteBroadcast(id: string): Promise<{ ok: boolean }> {
  return mutateBackend<{ ok: boolean }>("DELETE", `${BROADCASTS}/${id}`);
}

export async function sendBroadcast(id: string): Promise<MailingBroadcast> {
  return mutateBackend<MailingBroadcast>("POST", `${BROADCASTS}/${id}/send`);
}

export async function sendBroadcastTest(
  id: string,
  email: string
): Promise<{ ok: boolean }> {
  return mutateBackend<{ ok: boolean }>("POST", `${BROADCASTS}/${id}/test`, {
    email,
  });
}

/* --------------------------------- templates ---------------------------- */

export async function fetchTemplates(): Promise<MailingTemplate[]> {
  return fetchFromBackend<MailingTemplate[]>(TEMPLATES);
}

export async function createTemplate(input: {
  name: string;
  subject: string;
  body_html: string;
}): Promise<MailingTemplate> {
  return mutateBackend<MailingTemplate>("POST", TEMPLATES, input);
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

/* -------------------------------- automations --------------------------- */

export async function fetchTriggers(): Promise<MailingTrigger[]> {
  return fetchFromBackend<MailingTrigger[]>(`${AUTOMATIONS}/triggers`);
}

export async function fetchAutomations(): Promise<MailingAutomation[]> {
  return fetchFromBackend<MailingAutomation[]>(AUTOMATIONS);
}

export async function fetchAutomationRuns(
  id: string
): Promise<MailingAutomationRun[]> {
  return fetchFromBackend<MailingAutomationRun[]>(`${AUTOMATIONS}/${id}/runs`);
}

export async function fetchAutomationStats(
  id: string
): Promise<MailingAutomationStats> {
  return fetchFromBackend<MailingAutomationStats>(`${AUTOMATIONS}/${id}/stats`);
}

export async function fetchAutomationPreview(
  id: string
): Promise<{ count: number }> {
  return fetchFromBackend<{ count: number }>(`${AUTOMATIONS}/${id}/preview`);
}

export async function createAutomation(input: {
  name: string;
  trigger_type: string;
  trigger_params?: Record<string, unknown>;
  delay_value?: number;
  delay_unit?: string;
  segment?: string;
  template_id: string;
}): Promise<MailingAutomation> {
  return mutateBackend<MailingAutomation>("POST", AUTOMATIONS, input);
}

export async function updateAutomation(
  id: string,
  input: Record<string, unknown>
): Promise<MailingAutomation> {
  return mutateBackend<MailingAutomation>(
    "PATCH",
    `${AUTOMATIONS}/${id}`,
    input
  );
}

export async function deleteAutomation(id: string): Promise<{ ok: boolean }> {
  return mutateBackend<{ ok: boolean }>("DELETE", `${AUTOMATIONS}/${id}`);
}

export async function setAutomationStatus(
  id: string,
  action: "activate" | "pause" | "archive"
): Promise<MailingAutomation> {
  return mutateBackend<MailingAutomation>(
    "POST",
    `${AUTOMATIONS}/${id}/${action}`
  );
}

/* ----------------------------------- ops -------------------------------- */

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
