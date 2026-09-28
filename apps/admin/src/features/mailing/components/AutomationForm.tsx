"use client";

import type {
  MailingAudience,
  MailingAudienceId,
  MailingTrigger,
} from "@neko-protocol/api-contracts";
import {
  Button,
  ErrorNote,
  Field,
  Select,
  TextInput,
} from "./MailingFormControls";

const DELAY_UNITS = ["minutes", "hours", "days"] as const;

export type AutomationDraft = {
  name: string;
  trigger_type: string;
  inactivity_days: string;
  threshold_xlm: string;
  delay_value: string;
  delay_unit: string;
  audience: MailingAudienceId;
  template_id: string;
};

export const EMPTY_AUTOMATION: AutomationDraft = {
  name: "",
  trigger_type: "signup",
  inactivity_days: "14",
  threshold_xlm: "50",
  delay_value: "0",
  delay_unit: "days",
  audience: "all",
  template_id: "",
};

/** Only the parameters the selected trigger actually reads are persisted. */
function triggerParamsFor(draft: AutomationDraft): Record<string, unknown> {
  switch (draft.trigger_type) {
    case "inactivity":
      return { inactivity_days: Number(draft.inactivity_days) || 14 };
    case "admin_wallet_low_balance":
      return { threshold_xlm: Number(draft.threshold_xlm) || 50 };
    default:
      return {};
  }
}

/** Shapes a draft into the payload both create and update accept. */
export function toAutomationPayload(draft: AutomationDraft) {
  return {
    name: draft.name.trim(),
    trigger_type: draft.trigger_type,
    trigger_params: triggerParamsFor(draft),
    delay_value: Number(draft.delay_value) || 0,
    delay_unit: draft.delay_unit,
    audience: draft.audience,
    template_id: draft.template_id,
  };
}

export function AutomationForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  pending,
  error,
  triggers,
  audiences,
  templates,
}: {
  value: AutomationDraft;
  onChange: (next: AutomationDraft) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
  pending: boolean;
  error: unknown;
  triggers: MailingTrigger[];
  audiences: MailingAudience[];
  templates: { id: string; name: string }[];
}) {
  const set = <K extends keyof AutomationDraft>(
    key: K,
    v: AutomationDraft[K]
  ) => onChange({ ...value, [key]: v });

  const canSubmit = value.name.trim() && value.template_id;
  const triggerDescription = triggers.find(
    (t) => t.id === value.trigger_type
  )?.description;

  return (
    <div className="grid gap-3 rounded-xl border border-white/5 bg-[#141414] p-4 sm:grid-cols-2">
      <Field label="Name">
        <TextInput
          value={value.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Welcome series, day 0"
        />
      </Field>

      <Field label="Trigger" hint={triggerDescription}>
        <Select
          value={value.trigger_type}
          onChange={(e) => set("trigger_type", e.target.value)}
        >
          {triggers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </Select>
      </Field>

      {value.trigger_type === "admin_wallet_low_balance" && (
        <Field
          label="Alert below (XLM)"
          hint="Admins are emailed while the wallet is under this, at most once each per day. Add a second automation at a lower number for an escalating alert."
        >
          <TextInput
            type="number"
            min={1}
            value={value.threshold_xlm}
            onChange={(e) => set("threshold_xlm", e.target.value)}
          />
        </Field>
      )}

      {value.trigger_type === "inactivity" && (
        <Field
          label="Inactive for (days)"
          hint="How long with no activity before the trigger fires."
        >
          <TextInput
            type="number"
            min={1}
            value={value.inactivity_days}
            onChange={(e) => set("inactivity_days", e.target.value)}
          />
        </Field>
      )}

      <Field
        label="Audience"
        hint="Narrows who the trigger applies to. Admins are matched by email rather than wallet."
      >
        <Select
          value={value.audience}
          onChange={(e) => set("audience", e.target.value as MailingAudienceId)}
        >
          {audiences.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Delay after trigger">
        <div className="flex gap-2">
          <TextInput
            type="number"
            min={0}
            value={value.delay_value}
            onChange={(e) => set("delay_value", e.target.value)}
          />
          <Select
            value={value.delay_unit}
            onChange={(e) => set("delay_unit", e.target.value)}
          >
            {DELAY_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </div>
      </Field>

      <Field
        label="Template"
        hint={
          templates.length
            ? undefined
            : "Create a template first. An automation must send one."
        }
      >
        <Select
          value={value.template_id}
          onChange={(e) => set("template_id", e.target.value)}
        >
          <option value="">Choose a template…</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </Field>

      <div className="sm:col-span-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            disabled={!canSubmit || pending}
            onClick={onSubmit}
          >
            {pending ? "Saving…" : submitLabel}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
        <div className="mt-3">
          <ErrorNote error={error} />
        </div>
      </div>
    </div>
  );
}
