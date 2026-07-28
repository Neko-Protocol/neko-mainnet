"use server";

import { backendGet, backendSend } from "./backend";
import type {
  MailingAutomationDTO,
  MailingAutomationRunDTO,
  MailingAutomationStats,
  MailingTemplateDTO,
  MailingTriggerType,
} from "@/types/mailing";

const TEMPLATES_BASE = "v1/admin/mailing/templates";
const AUTOMATIONS_BASE = "v1/admin/mailing/automations";

export async function listMailingTemplates(): Promise<MailingTemplateDTO[]> {
  return backendGet(TEMPLATES_BASE);
}

export async function getMailingTemplate(
  id: string
): Promise<MailingTemplateDTO> {
  return backendGet(`${TEMPLATES_BASE}/${encodeURIComponent(id)}`);
}

export async function createMailingTemplate(input: {
  name: string;
  subject: string;
  body_html: string;
}): Promise<MailingTemplateDTO> {
  return backendSend(TEMPLATES_BASE, "POST", input);
}

export async function updateMailingTemplate(
  id: string,
  patch: Partial<Pick<MailingTemplateDTO, "name" | "subject" | "body_html">>
): Promise<MailingTemplateDTO> {
  return backendSend(
    `${TEMPLATES_BASE}/${encodeURIComponent(id)}`,
    "PATCH",
    patch
  );
}

export async function deleteMailingTemplate(id: string): Promise<{ ok: true }> {
  return backendSend(`${TEMPLATES_BASE}/${encodeURIComponent(id)}`, "DELETE");
}

export async function listMailingAutomations(): Promise<
  MailingAutomationDTO[]
> {
  return backendGet(AUTOMATIONS_BASE);
}

export async function listMailingTriggerTypes(): Promise<MailingTriggerType[]> {
  return backendGet(`${AUTOMATIONS_BASE}/triggers`);
}

export async function getMailingAutomation(
  id: string
): Promise<MailingAutomationDTO> {
  return backendGet(`${AUTOMATIONS_BASE}/${encodeURIComponent(id)}`);
}

export async function createMailingAutomation(input: {
  name: string;
  trigger_type: string;
  trigger_params?: Record<string, unknown>;
  delay_value?: number;
  delay_unit?: string;
  segment?: string;
  template_id: string;
}): Promise<MailingAutomationDTO> {
  return backendSend(AUTOMATIONS_BASE, "POST", input);
}

export async function updateMailingAutomation(
  id: string,
  patch: Partial<{
    name: string;
    trigger_type: string;
    trigger_params: Record<string, unknown>;
    delay_value: number;
    delay_unit: string;
    segment: string;
    template_id: string;
  }>
): Promise<MailingAutomationDTO> {
  return backendSend(
    `${AUTOMATIONS_BASE}/${encodeURIComponent(id)}`,
    "PATCH",
    patch
  );
}

export async function deleteMailingAutomation(
  id: string
): Promise<{ ok: true }> {
  return backendSend(`${AUTOMATIONS_BASE}/${encodeURIComponent(id)}`, "DELETE");
}

export async function activateMailingAutomation(
  id: string
): Promise<MailingAutomationDTO> {
  return backendSend(
    `${AUTOMATIONS_BASE}/${encodeURIComponent(id)}/activate`,
    "POST"
  );
}

export async function pauseMailingAutomation(
  id: string
): Promise<MailingAutomationDTO> {
  return backendSend(
    `${AUTOMATIONS_BASE}/${encodeURIComponent(id)}/pause`,
    "POST"
  );
}

export async function archiveMailingAutomation(
  id: string
): Promise<MailingAutomationDTO> {
  return backendSend(
    `${AUTOMATIONS_BASE}/${encodeURIComponent(id)}/archive`,
    "POST"
  );
}

export async function getMailingAutomationRuns(
  id: string
): Promise<MailingAutomationRunDTO[]> {
  return backendGet(`${AUTOMATIONS_BASE}/${encodeURIComponent(id)}/runs`);
}

export async function getMailingAutomationStats(
  id: string
): Promise<MailingAutomationStats> {
  return backendGet(`${AUTOMATIONS_BASE}/${encodeURIComponent(id)}/stats`);
}

export async function previewMailingAutomation(
  id: string
): Promise<{ count: number }> {
  return backendGet(`${AUTOMATIONS_BASE}/${encodeURIComponent(id)}/preview`);
}
