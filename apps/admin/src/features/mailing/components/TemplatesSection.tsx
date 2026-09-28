"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import type { MailingTemplate } from "@neko-protocol/api-contracts";
import { useTemplates } from "../hooks/useMailingQueries";
import {
  useCreateTemplate,
  useDeleteTemplate,
  useUpdateTemplate,
} from "../hooks/useMailingMutations";
import { EmailPreview } from "./EmailPreview";
import {
  Button,
  Card,
  ErrorNote,
  Field,
  TextArea,
  TextInput,
} from "./MailingFormControls";

type Draft = { name: string; subject: string; body_html: string };

const EMPTY: Draft = { name: "", subject: "", body_html: "" };

function TemplateForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  pending,
  error,
}: {
  value: Draft;
  onChange: (next: Draft) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
  pending: boolean;
  error: unknown;
}) {
  const canSubmit =
    value.name.trim() && value.subject.trim() && value.body_html.trim();

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/5 bg-[#141414] p-4">
      <Field label="Name">
        <TextInput
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="Welcome email"
        />
      </Field>
      <Field label="Subject">
        <TextInput
          value={value.subject}
          onChange={(e) => onChange({ ...value, subject: e.target.value })}
          placeholder="Welcome to Neko"
        />
      </Field>
      <Field
        label="Body (HTML)"
        hint="The full HTML email. Supports {{email}}, {{wallet_address}}, and {{unsubscribe_url}}. If you omit the last one, an unsubscribe button is appended for you."
      >
        <TextArea
          value={value.body_html}
          onChange={(e) => onChange({ ...value, body_html: e.target.value })}
          rows={8}
        />
      </Field>

      <EmailPreview bodyHtml={value.body_html} label="Preview template" />
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
      <ErrorNote error={error} />
    </div>
  );
}

export function TemplatesSection() {
  const { data, isPending, isError } = useTemplates();
  const create = useCreateTemplate();
  const update = useUpdateTemplate();
  const remove = useDeleteTemplate();

  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY);

  const startEdit = (t: MailingTemplate) => {
    setEditingId(t.id);
    setEditDraft({
      name: t.name,
      subject: t.subject,
      body_html: t.body_html,
    });
  };

  return (
    <Card
      title="Templates"
      description="Reusable subject + body pairs. Automations send a template; the composer can start from one."
      actions={
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setCreating((v) => !v);
            setDraft(EMPTY);
          }}
        >
          {creating ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {creating ? "Close" : "New template"}
        </Button>
      }
    >
      {creating && (
        <div className="mb-5">
          <TemplateForm
            value={draft}
            onChange={setDraft}
            submitLabel="Save template"
            pending={create.isPending}
            error={create.error}
            onCancel={() => {
              setCreating(false);
              setDraft(EMPTY);
            }}
            onSubmit={() =>
              create.mutate(
                {
                  name: draft.name.trim(),
                  subject: draft.subject.trim(),
                  body_html: draft.body_html,
                },
                {
                  onSuccess: () => {
                    setDraft(EMPTY);
                    setCreating(false);
                  },
                }
              )
            }
          />
        </div>
      )}

      {isError ? (
        <ErrorNote error={new Error("Couldn't load templates.")} />
      ) : isPending ? (
        <div className="h-16 animate-pulse rounded-lg bg-white/5" />
      ) : !data.length ? (
        <p className="text-sm text-white/40">No templates yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {data.map((t) =>
            editingId === t.id ? (
              <li key={t.id}>
                <TemplateForm
                  value={editDraft}
                  onChange={setEditDraft}
                  submitLabel="Save changes"
                  pending={update.isPending}
                  error={update.error}
                  onCancel={() => setEditingId(null)}
                  onSubmit={() =>
                    update.mutate(
                      {
                        id: t.id,
                        name: editDraft.name.trim(),
                        subject: editDraft.subject.trim(),
                        body_html: editDraft.body_html,
                      },
                      { onSuccess: () => setEditingId(null) }
                    )
                  }
                />
              </li>
            ) : (
              <li
                key={t.id}
                className="rounded-lg border border-white/5 bg-[#141414] px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-white">
                      {t.name}
                    </div>
                    <div className="truncate text-xs text-white/40">
                      {t.subject}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-white/30">
                      {t.created_by ? (
                        <>
                          Created by{" "}
                          <a
                            href={`mailto:${t.created_by}`}
                            className="text-white/50 underline underline-offset-2 hover:text-white/80"
                          >
                            {t.created_by}
                          </a>
                        </>
                      ) : (
                        "Created by an unknown admin"
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => startEdit(t)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(t.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
                <div className="mt-3">
                  <EmailPreview bodyHtml={t.body_html} label="Preview" />
                </div>
              </li>
            )
          )}
        </ul>
      )}
      <div className="mt-3">
        <ErrorNote error={remove.error} />
      </div>
    </Card>
  );
}
