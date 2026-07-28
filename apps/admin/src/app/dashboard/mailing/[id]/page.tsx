"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type {
  MailingAutomationDTO,
  MailingAutomationRunDTO,
  MailingAutomationStats,
} from "@/types/mailing";
import { SEGMENTS } from "@/lib/segments";
import {
  activateMailingAutomation,
  archiveMailingAutomation,
  deleteMailingAutomation,
  getMailingAutomation,
  getMailingAutomationRuns,
  getMailingAutomationStats,
  pauseMailingAutomation,
  previewMailingAutomation,
} from "@/lib/mailing";

function segmentTitle(segmentId: string): string {
  return SEGMENTS.find((s) => s.id === segmentId)?.label ?? segmentId;
}

function triggerLabel(triggerType: string): string {
  return triggerType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function statusBadgeClass(status: MailingAutomationDTO["status"]): string {
  const base =
    "inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold uppercase tracking-wide";
  switch (status) {
    case "draft":
      return `${base} bg-white/10 text-white/65`;
    case "active":
      return `${base} bg-[#4ADE80]/20 text-[#4ADE80]`;
    case "paused":
      return `${base} bg-amber-500/20 text-amber-200`;
    case "archived":
      return `${base} bg-white/5 text-white/40`;
    default:
      return `${base} bg-white/10 text-white/65`;
  }
}

function runStatusBadgeClass(status: string): string {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";
  switch (status) {
    case "pending":
      return `${base} bg-white/10 text-white/70`;
    case "sent":
      return `${base} bg-[#4ADE80]/20 text-[#4ADE80]`;
    case "skipped":
      return `${base} bg-amber-500/20 text-amber-200`;
    case "failed":
      return `${base} bg-red-500/20 text-red-300`;
    default:
      return `${base} bg-white/10 text-white/70`;
  }
}

function truncateWallet(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function MailingAutomationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";

  const [automation, setAutomation] = useState<MailingAutomationDTO | null>(
    null
  );
  const [stats, setStats] = useState<MailingAutomationStats | null>(null);
  const [runs, setRuns] = useState<MailingAutomationRunDTO[]>([]);
  const [preview, setPreview] = useState<{ count: number } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const reload = useCallback(async () => {
    await Promise.resolve();
    if (!id) return;
    setLoadError(null);
    try {
      const [automationData, statsData, runsData] = await Promise.all([
        getMailingAutomation(id),
        getMailingAutomationStats(id),
        getMailingAutomationRuns(id),
      ]);
      setAutomation(automationData);
      setStats(statsData);
      setRuns(runsData);

      try {
        setPreview(await previewMailingAutomation(id));
      } catch {
        setPreview(null);
      }
    } catch (e) {
      setLoadError(
        e instanceof Error ? e.message : "Failed to load automation"
      );
      setAutomation(null);
    }
  }, [id]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void reload();
    }, 0);
    return () => clearTimeout(handle);
  }, [reload]);

  async function activateConfirmed() {
    if (!automation || acting) return;
    setActing(true);
    setActionMsg(null);
    try {
      await activateMailingAutomation(automation.id);
      await reload();
      router.refresh();
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Activate failed");
    } finally {
      setActing(false);
    }
  }

  async function pauseConfirmed() {
    if (!automation || acting) return;
    setActing(true);
    setActionMsg(null);
    try {
      await pauseMailingAutomation(automation.id);
      await reload();
      router.refresh();
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Pause failed");
    } finally {
      setActing(false);
    }
  }

  async function archiveConfirmed() {
    if (!automation || acting) return;
    const ok = window.confirm(
      "Archive this automation? This cannot be undone."
    );
    if (!ok) return;

    setActing(true);
    setActionMsg(null);
    try {
      await archiveMailingAutomation(automation.id);
      await reload();
      router.refresh();
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Archive failed");
    } finally {
      setActing(false);
    }
  }

  async function deleteConfirmed() {
    if (!automation || acting) return;
    const ok = window.confirm(
      "Delete this draft automation? This cannot be undone."
    );
    if (!ok) return;

    setActing(true);
    setActionMsg(null);
    try {
      await deleteMailingAutomation(automation.id);
      router.push("/dashboard/mailing");
      router.refresh();
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Delete failed");
      setActing(false);
    }
  }

  if (!id) {
    return <div className="p-6 text-white/60">Invalid automation id.</div>;
  }

  if (loadError && !automation) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-red-300">{loadError}</p>
        <Link
          href="/dashboard/mailing"
          className="mt-4 inline-block text-[#229EDF]"
        >
          Back to mailing automations
        </Link>
      </div>
    );
  }

  if (!automation) {
    return <div className="p-6 text-white/60">Loading…</div>;
  }

  const canEdit =
    automation.status === "draft" || automation.status === "paused";

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/dashboard/mailing"
            className="text-sm text-[#229EDF] hover:underline"
          >
            ← Back to mailing automations
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-white">
              {automation.name}
            </h1>
            <span className={statusBadgeClass(automation.status)}>
              {automation.status}
            </span>
          </div>
        </div>
        {canEdit ? (
          <Link
            href={`/dashboard/mailing/${automation.id}/edit`}
            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-[#242424] px-4 py-2 text-sm font-medium text-white hover:border-white/25"
          >
            Edit
          </Link>
        ) : null}
      </div>

      {actionMsg ? (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {actionMsg}
        </div>
      ) : null}

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <Info
          label="Trigger type"
          value={triggerLabel(automation.trigger_type)}
        />
        <Info
          label="Delay"
          value={`${automation.delay_value} ${automation.delay_unit}`}
        />
        <Info label="Segment" value={segmentTitle(automation.segment)} />
        <Info label="Status" value={automation.status} />
        <Info
          label="Created at"
          value={new Date(automation.created_at).toLocaleString()}
        />
      </div>

      <section className="mb-8 rounded-2xl border border-white/8 bg-[#1C1C1C] p-5">
        <h2 className="text-lg font-semibold text-white">
          Live audience preview
        </h2>
        <p className="mt-2 text-sm text-white/70">
          This automation currently matches{" "}
          <span className="font-semibold text-white">
            {preview ? preview.count.toLocaleString() : "—"}
          </span>{" "}
          wallets
        </p>
      </section>

      {stats ? (
        <section className="mb-8 rounded-2xl border border-white/8 bg-[#1C1C1C] p-5">
          <h2 className="text-lg font-semibold text-white">Stats</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
            <Stat label="Enrolled" value={stats.enrolled} />
            <Stat label="Pending" value={stats.pending} />
            <Stat label="Sent" value={stats.sent} />
            <Stat label="Skipped" value={stats.skipped} />
            <Stat label="Failed" value={stats.failed} />
          </div>
        </section>
      ) : null}

      <section className="mb-8 overflow-x-auto rounded-2xl border border-white/8 bg-[#1C1C1C]">
        <div className="border-b border-white/8 px-5 py-4">
          <h2 className="text-lg font-semibold text-white">Recent runs</h2>
        </div>
        {runs.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-white/60">
            No runs yet.
          </div>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/8 text-white/50">
              <tr>
                <th className="px-4 py-3 font-medium">Wallet</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Scheduled</th>
                <th className="px-4 py-3 font-medium">Sent at</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {runs.map((run) => (
                <tr key={run.id} className="text-white/85">
                  <td className="px-4 py-3 font-mono text-xs text-white/70">
                    {truncateWallet(run.wallet_address)}
                  </td>
                  <td className="px-4 py-3 text-white/70">{run.email}</td>
                  <td className="px-4 py-3">
                    <span className={runStatusBadgeClass(run.status)}>
                      {run.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/60">
                    {new Date(run.scheduled_send_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-white/60">
                    {run.sent_at ? new Date(run.sent_at).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {automation.status !== "archived" ? (
        <section className="space-y-3 rounded-2xl border border-white/8 bg-[#242424] p-6">
          <h2 className="text-lg font-semibold text-white">Actions</h2>
          {automation.status === "draft" ? (
            <>
              <p className="text-sm text-amber-200/90">
                Activate to start enrolling wallets, or delete this draft.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => void activateConfirmed()}
                  className="inline-flex items-center justify-center rounded-full bg-[#229EDF] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1a8bc7] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {acting ? "Working…" : "Activate"}
                </button>
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => void deleteConfirmed()}
                  className="inline-flex items-center justify-center rounded-full border border-red-500/40 bg-red-500/10 px-6 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </>
          ) : null}

          {automation.status === "active" ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={acting}
                onClick={() => void pauseConfirmed()}
                className="inline-flex items-center justify-center rounded-full bg-amber-500/20 px-6 py-3 text-sm font-semibold text-amber-100 ring-1 ring-amber-400/40 transition hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {acting ? "Working…" : "Pause"}
              </button>
              <button
                type="button"
                disabled={acting}
                onClick={() => void archiveConfirmed()}
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-[#1C1C1C] px-6 py-3 text-sm font-semibold text-white/80 transition hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Archive
              </button>
            </div>
          ) : null}

          {automation.status === "paused" ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={acting}
                onClick={() => void activateConfirmed()}
                className="inline-flex items-center justify-center rounded-full bg-[#229EDF] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1a8bc7] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {acting ? "Working…" : "Activate"}
              </button>
              <button
                type="button"
                disabled={acting}
                onClick={() => void archiveConfirmed()}
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-[#1C1C1C] px-6 py-3 text-sm font-semibold text-white/80 transition hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Archive
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function Info(props: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#1C1C1C] px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-white/45">
        {props.label}
      </p>
      <p className="mt-1 text-sm font-medium text-white">{props.value}</p>
    </div>
  );
}

function Stat(props: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#242424] px-3 py-3 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-white/45">
        {props.label}
      </p>
      <p className="mt-1 text-xl font-bold text-white">
        {props.value.toLocaleString()}
      </p>
    </div>
  );
}
