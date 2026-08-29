"use client";

import { useState } from "react";
import { Archive, Pause, Play, Plus, Trash2 } from "lucide-react";
import {
  useAudiences,
  useAutomations,
  useTemplates,
  useTriggers,
} from "../hooks/useMailingQueries";
import {
  useCreateAutomation,
  useDeleteAutomation,
  useSetAutomationStatus,
} from "../hooks/useMailingMutations";
import { AutomationRuns } from "./AutomationRuns";
import {
  Button,
  Card,
  ErrorNote,
  Field,
  Select,
  StatusPill,
  TextInput,
} from "./MailingFormControls";

const DELAY_UNITS = ["minutes", "hours", "days"] as const;

export function AutomationsSection() {
  const automations = useAutomations();
  const triggers = useTriggers();
  const templates = useTemplates();
  const audiences = useAudiences();
  const create = useCreateAutomation();
  const setStatus = useSetAutomationStatus();
  const remove = useDeleteAutomation();

  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("signup");
  const [inactivityDays, setInactivityDays] = useState("14");
  const [delayValue, setDelayValue] = useState("0");
  const [delayUnit, setDelayUnit] = useState<string>("days");
  const [segment, setSegment] = useState("all");
  const [templateId, setTemplateId] = useState("");

  // Admin-list audiences have no wallet, so enrollment can never match them.
  const automationAudiences = (audiences.data ?? []).filter(
    (a) => a.automationCompatible
  );
  const templateOptions = templates.data ?? [];
  const canSubmit = name.trim() && templateId;

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
          onClick={() => setOpen((v) => !v)}
        >
          <Plus className="h-4 w-4" />
          {open ? "Close" : "New automation"}
        </Button>
      }
    >
      {open && (
        <div className="mb-5 grid gap-3 rounded-xl border border-white/5 bg-[#141414] p-4 sm:grid-cols-2">
          <Field label="Name">
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Welcome series — day 0"
            />
          </Field>

          <Field
            label="Trigger"
            hint={
              (triggers.data ?? []).find((t) => t.id === triggerType)
                ?.description
            }
          >
            <Select
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value)}
            >
              {(triggers.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>

          {triggerType === "inactivity" && (
            <Field
              label="Inactive for (days)"
              hint="How long with no activity before the trigger fires."
            >
              <TextInput
                type="number"
                min={1}
                value={inactivityDays}
                onChange={(e) => setInactivityDays(e.target.value)}
              />
            </Field>
          )}

          <Field
            label="Audience"
            hint="Narrows who the trigger applies to. Admins aren't selectable — they have no wallet to trigger on."
          >
            <Select
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
            >
              {automationAudiences.map((a) => (
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
                value={delayValue}
                onChange={(e) => setDelayValue(e.target.value)}
              />
              <Select
                value={delayUnit}
                onChange={(e) => setDelayUnit(e.target.value)}
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
              templateOptions.length
                ? undefined
                : "Create a template first — an automation must send one."
            }
          >
            <Select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              <option value="">Choose a template…</option>
              {templateOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="sm:col-span-2">
            <Button
              type="button"
              disabled={!canSubmit || create.isPending}
              onClick={() =>
                create.mutate(
                  {
                    name: name.trim(),
                    trigger_type: triggerType,
                    trigger_params:
                      triggerType === "inactivity"
                        ? { inactivity_days: Number(inactivityDays) || 14 }
                        : {},
                    delay_value: Number(delayValue) || 0,
                    delay_unit: delayUnit,
                    segment,
                    template_id: templateId,
                  },
                  {
                    onSuccess: () => {
                      setName("");
                      setTemplateId("");
                      setOpen(false);
                    },
                  }
                )
              }
            >
              {create.isPending ? "Creating…" : "Create as draft"}
            </Button>
            <div className="mt-3">
              <ErrorNote error={create.error} />
            </div>
          </div>
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
          {automations.data.map((a) => (
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
                    {triggerLabel(a.trigger_type)} · {labelFor(a.segment)} ·
                    after {a.delay_value} {a.delay_unit}
                  </div>
                </button>

                <div className="flex gap-2">
                  {(a.status === "draft" || a.status === "paused") && (
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

              {expanded === a.id && <AutomationRuns automationId={a.id} />}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 space-y-2">
        <ErrorNote error={setStatus.error} />
        <ErrorNote error={remove.error} />
      </div>
    </Card>
  );
}
