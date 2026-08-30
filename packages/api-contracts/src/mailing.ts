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
  "admin_wallet_low_balance",
] as const;

export type MailingTriggerId = (typeof MAILING_TRIGGER_IDS)[number];

export interface MailingTrigger {
  id: MailingTriggerId;
  label: string;
  description: string;
}

export type MailingMessageKind = "broadcast" | "automation";

/**
 * Anything sendable. A broadcast is a message with no trigger, sent once; an
 * automation has a trigger and fires as people qualify.
 */
export type MailingMessageStatus =
  | "draft"
  | "active"
  | "paused"
  | "archived"
  | "sending"
  | "sent"
  | "failed";

export type MailingDelayUnit = "minutes" | "hours" | "days";

export interface MailingMessage {
  id: string;
  kind: MailingMessageKind;
  name: string;
  /** Content comes from this template, or from the inline fields below. */
  template_id: string | null;
  subject: string | null;
  body_html: string | null;
  audience: MailingAudienceId;
  trigger_type: string | null;
  trigger_params: Record<string, unknown>;
  delay_value: number;
  delay_unit: MailingDelayUnit;
  status: MailingMessageStatus;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  created_by: string | null;
  error: string | null;
}

/** One row per recipient per message, for both kinds. */
export interface MailingSend {
  id: string;
  wallet_address: string | null;
  email: string;
  trigger_at: string | null;
  scheduled_send_at: string;
  status: string;
  sent_at: string | null;
  error: string | null;
}

export interface MailingSendStats {
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

/** Body content rendered inside the branded shell, as it will actually send. */
export interface MailingEmailPreview {
  html: string;
}

/** Delivery counts for one message kind. */
export interface MailingKindStats {
  /** Messages of this kind that have gone out at least once. */
  messages: number;
  /** Individual emails delivered. */
  sent: number;
  failed: number;
  skipped: number;
  pending: number;
}

export interface MailingStats {
  broadcasts: MailingKindStats;
  automations: MailingKindStats;
  totalSent: number;
  optOuts: number;
  templates: number;
  activeAutomations: number;
}
