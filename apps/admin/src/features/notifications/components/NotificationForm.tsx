"use client";

import { useState } from "react";
import {
  NOTIFICATION_CATEGORIES,
  type NotificationMessage,
} from "@neko-protocol/api-contracts";
import {
  Button,
  ErrorNote,
  Field,
  Select,
  TextArea,
  TextInput,
} from "@/components/ui/FormControls";
import { useTriggerCoverage } from "../hooks/useNotificationQueries";
import type { NotificationMessageInput } from "../actions";
import { NotificationPreview } from "./NotificationPreview";

export interface NotificationDraft {
  name: string;
  title: string;
  body: string;
  url: string;
  category: string;
  trigger_type: string;
  /** Only read by triggers that declare it; see TRIGGER_PARAM_FIELDS. */
  inactivity_days: string;
}

export const EMPTY_DRAFT: NotificationDraft = {
  name: "",
  title: "",
  body: "",
  url: "",
  category: "activity",
  trigger_type: "",
  inactivity_days: "14",
};

export function toDraft(message: NotificationMessage): NotificationDraft {
  const days = message.trigger_params?.inactivity_days;
  return {
    name: message.name,
    title: message.title,
    body: message.body,
    url: message.url ?? "",
    category: message.category,
    trigger_type: message.trigger_type ?? "",
    inactivity_days: days == null ? "14" : String(days),
  };
}

export function toPayload(draft: NotificationDraft): NotificationMessageInput {
  // Only persist the params the selected trigger actually reads, so an
  // inactivity_days left over from switching triggers does not linger on a
  // message that ignores it.
  const trigger_params: Record<string, unknown> = {};
  if (draft.trigger_type === "inactivity") {
    const days = Number(draft.inactivity_days);
    trigger_params.inactivity_days =
      Number.isFinite(days) && days > 0 ? days : 14;
  }

  return {
    kind: "trigger",
    name: draft.name.trim(),
    title: draft.title.trim(),
    body: draft.body.trim(),
    url: draft.url.trim() || null,
    category: draft.category,
    trigger_type: draft.trigger_type,
    trigger_params,
  };
}

interface NotificationFormProps {
  initial?: NotificationDraft;
  submitLabel: string;
  isPending: boolean;
  error: unknown;
  onSubmit: (draft: NotificationDraft) => void;
  onCancel: () => void;
}

export function NotificationForm({
  initial,
  submitLabel,
  isPending,
  error,
  onSubmit,
  onCancel,
}: NotificationFormProps) {
  const [draft, setDraft] = useState<NotificationDraft>(initial ?? EMPTY_DRAFT);
  const coverage = useTriggerCoverage();
  const selected = (coverage.data ?? []).find(
    (t) => t.id === draft.trigger_type
  );
  const placeholders = selected?.placeholders ?? [];

  const set = <K extends keyof NotificationDraft>(
    key: K,
    value: NotificationDraft[K]
  ) => setDraft((d) => ({ ...d, [key]: value }));

  const canSubmit =
    draft.name.trim() &&
    draft.title.trim() &&
    draft.body.trim() &&
    draft.trigger_type;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit(draft);
      }}
      className="space-y-4 rounded-xl border border-white/5 bg-[#141414] p-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Internal name" hint="Only shown here, never to the user.">
          <TextInput
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Swap confirmation"
          />
        </Field>

        <Field label="Trigger">
          <Select
            value={draft.trigger_type}
            onChange={(e) => set("trigger_type", e.target.value)}
          >
            <option value="">Select a trigger</option>
            {(coverage.data ?? [])
              .filter((t) => t.inAppSupported)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                  {t.hasNotification ? " (already covered)" : ""}
                </option>
              ))}
          </Select>
        </Field>

        <Field
          label="Title"
          hint={
            placeholders.length
              ? `Available: ${placeholders.map((p) => `{{${p}}}`).join(" ")}`
              : "One line. This trigger has no placeholders."
          }
        >
          <TextInput
            value={draft.title}
            onChange={(e) => set("title", e.target.value)}
            maxLength={120}
            placeholder="Swap complete"
          />
        </Field>

        {draft.trigger_type === "inactivity" && (
          <Field
            label="Days of inactivity"
            hint="How long a wallet must be quiet before this fires."
          >
            <TextInput
              type="number"
              min={1}
              value={draft.inactivity_days}
              onChange={(e) => set("inactivity_days", e.target.value)}
            />
          </Field>
        )}

        <Field label="Category" hint="Sets the icon and colour in the app.">
          <Select
            value={draft.category}
            onChange={(e) => set("category", e.target.value)}
          >
            {NOTIFICATION_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label="Body"
        hint={
          placeholders.length
            ? `A sentence or two. Available: ${placeholders
                .map((p) => `{{${p}}}`)
                .join(" ")}`
            : "Keep it to a sentence or two."
        }
      >
        <TextArea
          rows={3}
          value={draft.body}
          onChange={(e) => set("body", e.target.value)}
          maxLength={500}
          placeholder="You swapped {{amount_in}} {{asset_in}} to {{amount_out}} {{asset_out}}."
        />
      </Field>

      <Field
        label="Link (optional)"
        hint="In-app path, for example /dashboard. Leave blank for a non-clickable item."
      >
        <TextInput
          value={draft.url}
          onChange={(e) => set("url", e.target.value)}
          placeholder="/dashboard"
        />
      </Field>

      <NotificationPreview
        title={draft.title}
        body={draft.body}
        category={draft.category}
      />

      <ErrorNote error={error} />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={!canSubmit || isPending}>
          {isPending ? "Saving…" : submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
