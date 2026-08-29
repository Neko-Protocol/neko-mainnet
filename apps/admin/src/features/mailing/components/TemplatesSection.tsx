"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTemplates } from "../hooks/useMailingQueries";
import {
  useCreateTemplate,
  useDeleteTemplate,
} from "../hooks/useMailingMutations";
import {
  Button,
  Card,
  ErrorNote,
  Field,
  TextArea,
  TextInput,
} from "./MailingFormControls";

export function TemplatesSection() {
  const { data, isPending, isError } = useTemplates();
  const create = useCreateTemplate();
  const remove = useDeleteTemplate();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const canSubmit = name.trim() && subject.trim() && body.trim();

  return (
    <Card
      title="Templates"
      description="Reusable subject + body pairs. Automations send a template; the composer can start from one."
      actions={
        <Button
          type="button"
          variant="secondary"
          onClick={() => setOpen((v) => !v)}
        >
          <Plus className="h-4 w-4" />
          {open ? "Close" : "New template"}
        </Button>
      }
    >
      {open && (
        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-white/5 bg-[#141414] p-4">
          <Field label="Name">
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Welcome email"
            />
          </Field>
          <Field label="Subject">
            <TextInput
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Welcome to Neko"
            />
          </Field>
          <Field
            label="Body (HTML)"
            hint="Supports {{email}} and {{wallet_address}}."
          >
            <TextArea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
            />
          </Field>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              disabled={!canSubmit || create.isPending}
              onClick={() =>
                create.mutate(
                  {
                    name: name.trim(),
                    subject: subject.trim(),
                    body_html: body,
                  },
                  {
                    onSuccess: () => {
                      setName("");
                      setSubject("");
                      setBody("");
                      setOpen(false);
                    },
                  }
                )
              }
            >
              {create.isPending ? "Saving…" : "Save template"}
            </Button>
          </div>
          <ErrorNote error={create.error} />
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
          {data.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-[#141414] px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-white">
                  {t.name}
                </div>
                <div className="truncate text-xs text-white/40">
                  {t.subject}
                </div>
              </div>
              <Button
                type="button"
                variant="danger"
                disabled={remove.isPending}
                onClick={() => remove.mutate(t.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3">
        <ErrorNote error={remove.error} />
      </div>
    </Card>
  );
}
