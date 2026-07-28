export type MailingTemplateDTO = {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type MailingAutomationStatus =
  | "draft"
  | "active"
  | "paused"
  | "archived";

export type MailingAutomationDTO = {
  id: string;
  name: string;
  trigger_type: string;
  trigger_params: Record<string, unknown>;
  delay_value: number;
  delay_unit: "minutes" | "hours" | "days";
  segment: string;
  template_id: string | null;
  status: MailingAutomationStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type MailingTriggerType = {
  id: string;
  label: string;
  description: string;
};

export type MailingAutomationRunDTO = {
  id: string;
  wallet_address: string;
  email: string;
  trigger_at: string;
  scheduled_send_at: string;
  status: string;
  sent_at: string | null;
  error: string | null;
};

export type MailingAutomationStats = {
  enrolled: number;
  pending: number;
  sent: number;
  skipped: number;
  failed: number;
};
