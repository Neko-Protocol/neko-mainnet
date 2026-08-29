/** Shared contracts for the admin mailing console (broadcasts + automations). */

export const MAILING_AUDIENCE_IDS = [
  "all",
  "vault_depositors",
  "admins",
  "depositors",
  "non_depositors",
  "swappers_only",
  "inactive",
] as const;

export type MailingAudienceId = (typeof MAILING_AUDIENCE_IDS)[number];

export interface MailingAudience {
  id: MailingAudienceId;
  label: string;
  description: string;
  /** False for wallet-less audiences (admins), which can't drive automations. */
  automationCompatible: boolean;
}

export type MailingBroadcastStatus = "draft" | "sending" | "sent" | "failed";

export interface MailingBroadcast {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  audience: MailingAudienceId;
  status: MailingBroadcastStatus;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  created_by: string | null;
  error: string | null;
}

export interface MailingTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export const MAILING_TRIGGER_IDS = [
  "signup",
  "first_deposit",
  "swap_completed",
  "inactivity",
  "referral_confirmed",
  "activation_paid",
] as const;

export type MailingTriggerId = (typeof MAILING_TRIGGER_IDS)[number];

export interface MailingTrigger {
  id: MailingTriggerId;
  label: string;
  description: string;
}

export type MailingAutomationStatus =
  | "draft"
  | "active"
  | "paused"
  | "archived";

export type MailingDelayUnit = "minutes" | "hours" | "days";

export interface MailingAutomation {
  id: string;
  name: string;
  trigger_type: string;
  trigger_params: Record<string, unknown>;
  delay_value: number;
  delay_unit: MailingDelayUnit;
  /** Audience id; the column is still named `segment` in Postgres. */
  segment: string;
  template_id: string | null;
  status: MailingAutomationStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface MailingAutomationRun {
  id: string;
  wallet_address: string;
  email: string;
  trigger_at: string;
  scheduled_send_at: string;
  status: string;
  sent_at: string | null;
  error: string | null;
}

export interface MailingAutomationStats {
  enrolled: number;
  pending: number;
  sent: number;
  skipped: number;
  failed: number;
}

export interface MailingAudiencePreview {
  audience: MailingAudienceId;
  count: number;
}
