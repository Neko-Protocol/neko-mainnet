"use client";

import { useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { MailingMessage } from "@neko-protocol/api-contracts";
import {
  useAudiences,
  useMessages,
  useTemplates,
  useTriggers,
} from "../hooks/useMailingQueries";
import {
  useCreateMessage,
  useDeleteMessage,
  useSetMessageStatus,
  useUpdateMessage,
} from "../hooks/useMailingMutations";
import {
  AutomationDraft,
  AutomationForm,
  EMPTY_AUTOMATION,
  toAutomationPayload,
} from "./AutomationForm";
import { MessageSends } from "./MessageSends";
import { Button, Card, ErrorNote, StatusPill } from "./MailingFormControls";

/** Only draft and paused automations are editable, matching the backend rule. */
function isEditable(status: string): boolean {
  return status === "draft" || status === "paused";
}

function toDraft(a: MailingMessage): AutomationDraft {
  const days = a.trigger_params?.inactivity_days;
  const threshold = a.trigger_params?.threshold_xlm;
  return {
    name: a.name,
    trigger_type: a.trigger_type ?? "signup",
    inactivity_days: String(typeof days === "number" ? days : 14),
    threshold_xlm: String(typeof threshold === "number" ? threshold : 50),
    delay_value: String(a.delay_value),
    delay_unit: a.delay_unit,
    audience: a.audience,
    template_id: a.template_id ?? "",
  };
}

export function AutomationsSection() {
  const automations = useMessages("automation");
  const triggers = useTriggers();
  const templates = useTemplates();
  const audiences = useAudiences();
  const create = useCreateMessage();
  const update = useUpdateMessage();
  const setStatus = useSetMessageStatus();
  const remove = useDeleteMessage();

  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<AutomationDraft>(EMPTY_AUTOMATION);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<AutomationDraft>(EMPTY_AUTOMATION);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Every audience is selectable: wallet-less ones (admins) are matched on
  // email during enrollment instead of wallet.
  const automationAudiences = audiences.data ?? [];
  const templateOptions = templates.data ?? [];

  const labelFor = (id: string) =>
    (audiences.data ?? []).find((a) => a.id === id)?.label ?? id;
  const triggerLabel = (id: string) =>
    (triggers.data ?? []).find((t) => t.id === id)?.label ?? id;

  return (
    <Card
      title="Automations"
      description="Triggered emails. Enrollment scans for matching wallets every 15 minutes; dispatch sends what's due every 5."
      actions={
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setCreating((v) => !v);
            setDraft(EMPTY_AUTOMATION);
          }}
        >
          {creating ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {creating ? "Close" : "New automation"}
        </Button>
      }
    >
      {creating && (
        <div className="mb-5">
          <AutomationForm
            value={draft}
            onChange={setDraft}
            submitLabel="Create as draft"
            pending={create.isPending}
            error={create.error}
            triggers={triggers.data ?? []}
            audiences={automationAudiences}
            templates={templateOptions}
            onCancel={() => {
              setCreating(false);
              setDraft(EMPTY_AUTOMATION);
            }}
            onSubmit={() =>
              create.mutate(
                { ...toAutomationPayload(draft), kind: "automation" },
                {
                  onSuccess: () => {
                    setDraft(EMPTY_AUTOMATION);
                    setCreating(false);
                  },
                }
              )
            }
          />
        </div>
      )}

      {automations.isError ? (
        <ErrorNote error={new Error("Couldn't load automations.")} />
      ) : automations.isPending ? (
        <div className="h-16 animate-pulse rounded-lg bg-white/5" />
      ) : !automations.data.length ? (
        <p className="text-sm text-white/40">No automations yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {automations.data.map((a) =>
            editingId === a.id ? (
              <li key={a.id}>
                <AutomationForm
                  value={editDraft}
                  onChange={setEditDraft}
                  submitLabel="Save changes"
                  pending={update.isPending}
                  error={update.error}
                  triggers={triggers.data ?? []}
                  audiences={automationAudiences}
                  templates={templateOptions}
                  onCancel={() => setEditingId(null)}
                  onSubmit={() =>
                    update.mutate(
                      { id: a.id, patch: toAutomationPayload(editDraft) },
                      { onSuccess: () => setEditingId(null) }
                    )
                  }
                />
              </li>
            ) : (
              <li
                key={a.id}
                className="rounded-lg border border-white/5 bg-[#141414] px-3 py-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() =>
                      setExpanded((cur) => (cur === a.id ? null : a.id))
                    }
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-white">
                        {a.name}
                      </span>
                      <StatusPill status={a.status} />
                    </div>
                    <div className="mt-0.5 text-xs text-white/40">
                      {triggerLabel(a.trigger_type ?? "")} ·{" "}
                      {labelFor(a.audience)} · after {a.delay_value}{" "}
                      {a.delay_unit}
                    </div>
                  </button>

                  <div className="flex flex-wrap gap-2">
                    {isEditable(a.status) && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setEditingId(a.id);
                          setEditDraft(toDraft(a));
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    )}
                    {isEditable(a.status) && (
                      <Button
                        type="button"
                        disabled={setStatus.isPending}
                        onClick={() =>
                          setStatus.mutate({ id: a.id, action: "activate" })
                        }
                      >
                        <Play className="h-3.5 w-3.5" />
                        Activate
                      </Button>
                    )}
                    {a.status === "active" && (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={setStatus.isPending}
                        onClick={() =>
                          setStatus.mutate({ id: a.id, action: "pause" })
                        }
                      >
                        <Pause className="h-3.5 w-3.5" />
                        Pause
                      </Button>
                    )}
                    {a.status !== "archived" && (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={setStatus.isPending}
                        onClick={() =>
                          setStatus.mutate({ id: a.id, action: "archive" })
                        }
                      >
                        <Archive className="h-3.5 w-3.5" />
                        Archive
                      </Button>
                    )}
                    {a.status === "archived" && (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={setStatus.isPending}
                        onClick={() =>
                          setStatus.mutate({ id: a.id, action: "unarchive" })
                        }
                      >
                        <ArchiveRestore className="h-3.5 w-3.5" />
                        Unarchive
                      </Button>
                    )}
                    {a.status === "draft" && (
                      <Button
                        type="button"
                        variant="danger"
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(a.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>

                {expanded === a.id && <MessageSends messageId={a.id} />}
              </li>
            )
          )}
        </ul>
      )}

      <div className="mt-3 space-y-2">
        <ErrorNote error={setStatus.error} />
        <ErrorNote error={remove.error} />
      </div>
    </Card>
  );
}
