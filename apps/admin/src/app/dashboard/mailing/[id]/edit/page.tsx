"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SEGMENTS, type SegmentId } from "@/lib/segments";
import { getSegmentCount } from "@/lib/segments-actions";
import {
  getMailingAutomation,
  listMailingTemplates,
  listMailingTriggerTypes,
  updateMailingAutomation,
} from "@/lib/mailing";
import type {
  MailingAutomationDTO,
  MailingTemplateDTO,
  MailingTriggerType,
} from "@/types/mailing";

type DelayUnit = "minutes" | "hours" | "days";

export default function EditMailingAutomationPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";

  const [initial, setInitial] = useState<MailingAutomationDTO | null>(null);
  const [name, setName] = useState("");
  const [triggerTypes, setTriggerTypes] = useState<MailingTriggerType[]>([]);
  const [triggerType, setTriggerType] = useState("");
  const [inactivityDays, setInactivityDays] = useState(14);
  const [delayValue, setDelayValue] = useState(0);
  const [delayUnit, setDelayUnit] = useState<DelayUnit>("days");
  const [segment, setSegment] = useState<SegmentId>("all");
  const [templates, setTemplates] = useState<MailingTemplateDTO[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      async function load() {
        await Promise.resolve();
        if (!id) return;
        setLoadError(null);
        let a: MailingAutomationDTO;
        try {
          const [automation, triggers, tmpls] = await Promise.all([
            getMailingAutomation(id),
            listMailingTriggerTypes(),
            listMailingTemplates(),
          ]);
          a = automation;
          setTriggerTypes(triggers);
          setTemplates(tmpls);
        } catch {
          setLoadError("Automation not found");
          return;
        }
        if (a.status !== "draft" && a.status !== "paused") {
          setLoadError("Only draft or paused automations can be edited");
          setInitial(null);
          return;
        }
        setInitial(a);
        setName(a.name);
        setTriggerType(a.trigger_type);
        const days = a.trigger_params?.inactivity_days;
        if (typeof days === "number" && days >= 1) {
          setInactivityDays(days);
        }
        setDelayValue(a.delay_value);
        setDelayUnit(a.delay_unit);
        setSegment(
          SEGMENTS.some((s) => s.id === a.segment)
            ? (a.segment as SegmentId)
            : "all"
        );
        setTemplateId(a.template_id ?? "");
      }
      void load();
    }, 0);
    return () => clearTimeout(handle);
  }, [id]);

  const refreshCount = useCallback(async (seg: SegmentId) => {
    await Promise.resolve();
    setCountLoading(true);
    setCount(null);
    try {
      setCount(await getSegmentCount(seg));
    } catch {
      setCount(null);
    } finally {
      setCountLoading(false);
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void refreshCount(segment);
    }, 0);
    return () => clearTimeout(handle);
  }, [segment, refreshCount]);

  const selectedTemplate = templates.find((t) => t.id === templateId) ?? null;
  const canSubmit = templates.length > 0 && Boolean(templateId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !initial || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateMailingAutomation(id, {
        name,
        trigger_type: triggerType,
        trigger_params:
          triggerType === "inactivity"
            ? { inactivity_days: inactivityDays }
            : {},
        delay_value: delayValue,
        delay_unit: delayUnit,
        segment,
        template_id: templateId,
      });
      router.push(`/dashboard/mailing/${id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (!id) {
    return <div className="p-6 text-white/60">Invalid automation id.</div>;
  }

  if (loadError) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-red-300">{loadError}</p>
        <Link
          href={`/dashboard/mailing/${id}`}
          className="mt-4 inline-block text-[#229EDF]"
        >
          Back to automation
        </Link>
      </div>
    );
  }

  if (!initial) {
    return <div className="p-6 text-white/60">Loading…</div>;
  }

  const countLabel = countLoading ? (
    <span className="text-white/45"> (loading…)</span>
  ) : count !== null ? (
    <span className="text-white/45"> ({count.toLocaleString()})</span>
  ) : (
    <span className="text-white/45"> (—)</span>
  );

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <Link
          href={`/dashboard/mailing/${id}`}
          className="text-sm text-[#229EDF] hover:underline"
        >
          ← Back to automation
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-white">
          Edit automation
        </h1>
        <p className="text-sm text-white/50">
          Update trigger, delay, segment, and template.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="max-w-4xl space-y-6 rounded-2xl border border-white/8 bg-[#1C1C1C] p-6"
      >
        {error ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        <div className="rounded-xl border border-[#229EDF]/35 bg-[#242424]/80 px-4 py-3 text-sm text-white/70">
          <span className="font-medium text-[#229EDF]">Tip:</span> Templates
          support{" "}
          <code className="rounded bg-black/40 px-1 py-0.5 text-xs text-white/90">
            {`{{wallet_address}}`}
          </code>{" "}
          and{" "}
          <code className="rounded bg-black/40 px-1 py-0.5 text-xs text-white/90">
            {`{{email}}`}
          </code>{" "}
          placeholders. An unsubscribe link is appended automatically.
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-white/70">
            Name
          </label>
          <input
            className="w-full rounded-lg border border-white/10 bg-[#121212] px-3 py-2 text-white outline-none placeholder:text-white/35 focus:border-[#229EDF]/60"
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            required
          />
        </div>

        <fieldset className="space-y-3">
          <legend className="mb-2 text-sm font-medium text-white/70">
            Trigger type
          </legend>
          <div className="flex flex-col gap-3">
            {triggerTypes.map((t) => (
              <label
                key={t.id}
                className={`flex cursor-pointer gap-3 rounded-xl border px-4 py-3 transition ${
                  triggerType === t.id
                    ? "border-[#229EDF]/55 bg-[#242424]"
                    : "border-white/10 bg-[#121212] hover:border-white/20"
                }`}
              >
                <input
                  type="radio"
                  name="trigger_type"
                  checked={triggerType === t.id}
                  onChange={() => setTriggerType(t.id)}
                  className="mt-1"
                />
                <span>
                  <span className="block font-medium text-white">
                    {t.label}
                  </span>
                  <span className="mt-1 block text-sm text-white/50">
                    {t.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {triggerType === "inactivity" ? (
          <div>
            <label className="mb-1 block text-sm font-medium text-white/70">
              Inactivity days
            </label>
            <input
              type="number"
              min={1}
              className="w-full rounded-lg border border-white/10 bg-[#121212] px-3 py-2 text-white outline-none placeholder:text-white/35 focus:border-[#229EDF]/60"
              value={inactivityDays}
              onChange={(ev) => setInactivityDays(Number(ev.target.value))}
              required
            />
            <p className="mt-1 text-sm text-white/45">
              Days of no activity before this fires.
            </p>
          </div>
        ) : null}

        <div>
          <label className="mb-1 block text-sm font-medium text-white/70">
            Delay
          </label>
          <div className="flex gap-3">
            <input
              type="number"
              min={0}
              className="w-full rounded-lg border border-white/10 bg-[#121212] px-3 py-2 text-white outline-none placeholder:text-white/35 focus:border-[#229EDF]/60"
              value={delayValue}
              onChange={(ev) => setDelayValue(Number(ev.target.value))}
              required
            />
            <select
              className="rounded-lg border border-white/10 bg-[#121212] px-3 py-2 text-white outline-none focus:border-[#229EDF]/60"
              value={delayUnit}
              onChange={(ev) => setDelayUnit(ev.target.value as DelayUnit)}
            >
              <option value="minutes">minutes</option>
              <option value="hours">hours</option>
              <option value="days">days</option>
            </select>
          </div>
          <p className="mt-1 text-sm text-white/45">
            Send this many {delayUnit} after the trigger.
          </p>
        </div>

        <fieldset className="space-y-3">
          <legend className="mb-2 text-sm font-medium text-white/70">
            Segment {countLabel}
          </legend>
          <div className="flex flex-col gap-3">
            {SEGMENTS.map((s) => (
              <label
                key={s.id}
                className={`flex cursor-pointer gap-3 rounded-xl border px-4 py-3 transition ${
                  segment === s.id
                    ? "border-[#229EDF]/55 bg-[#242424]"
                    : "border-white/10 bg-[#121212] hover:border-white/20"
                }`}
              >
                <input
                  type="radio"
                  name="segment"
                  checked={segment === s.id}
                  onChange={() => setSegment(s.id)}
                  className="mt-1"
                />
                <span>
                  <span className="block font-medium text-white">
                    {s.label}
                    {segment === s.id ? countLabel : null}
                  </span>
                  <span className="mt-1 block text-sm text-white/50">
                    {s.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label className="mb-1 block text-sm font-medium text-white/70">
            Template
          </label>
          {templates.length === 0 ? (
            <p className="text-sm text-white/50">
              No templates yet —{" "}
              <Link
                href="/dashboard/mailing/templates/new"
                className="text-[#229EDF] hover:underline"
              >
                create one
              </Link>{" "}
              first
            </p>
          ) : (
            <select
              className="w-full rounded-lg border border-white/10 bg-[#121212] px-3 py-2 text-white outline-none focus:border-[#229EDF]/60"
              value={templateId}
              onChange={(ev) => setTemplateId(ev.target.value)}
              required
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          {selectedTemplate ? (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-white/70">
                Subject:{" "}
                <span className="text-white">{selectedTemplate.subject}</span>
              </p>
              <iframe
                title="Email preview"
                className="h-64 w-full rounded-lg border border-white/10 bg-white"
                srcDoc={selectedTemplate.body_html || "<p />"}
                sandbox="allow-same-origin"
              />
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting || !canSubmit}
            className="inline-flex items-center justify-center rounded-full bg-[#229EDF] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#1a8bc7] disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save changes"}
          </button>
          <Link
            href={`/dashboard/mailing/${id}`}
            className="text-sm text-white/50 hover:text-white"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
