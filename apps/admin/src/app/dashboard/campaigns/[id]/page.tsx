"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { CampaignDTO } from "@/types/campaign";
import { SEGMENTS } from "@/lib/segments";
import {
  getCampaign,
  previewCampaign,
  sendCampaign,
  updateCampaignTvl,
} from "@/lib/campaigns";

function segmentTitle(segmentId: string): string {
  return SEGMENTS.find((s) => s.id === segmentId)?.label ?? segmentId;
}

function statusBadgeClass(status: CampaignDTO["status"]): string {
  const base =
    "inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold uppercase tracking-wide";
  switch (status) {
    case "draft":
      return `${base} bg-white/10 text-admin-muted`;
    case "sending":
      return `${base} bg-admin-warning/20 text-admin-warning`;
    case "sent":
      return `${base} bg-neko-blue/20 text-neko-blue`;
    case "failed":
      return `${base} bg-admin-danger/20 text-admin-danger`;
    default:
      return `${base} bg-white/10 text-admin-muted`;
  }
}

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";

  const [campaign, setCampaign] = useState<CampaignDTO | null>(null);
  const [preview, setPreview] = useState<{
    count: number;
    sample: string[];
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<string | null>(null);
  const [tvlInput, setTvlInput] = useState("");
  const [tvlSaving, setTvlSaving] = useState(false);
  const [tvlMsg, setTvlMsg] = useState<string | null>(null);

  const reload = useCallback(async () => {
    await Promise.resolve();
    if (!id) return;
    setLoadError(null);
    try {
      const cJson = await getCampaign(id);
      setCampaign(cJson);
      setTvlInput(cJson.tvl_moved != null ? String(cJson.tvl_moved) : "");

      try {
        setPreview(await previewCampaign(id));
      } catch {
        setPreview(null);
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load campaign");
      setCampaign(null);
    }
  }, [id]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void reload();
    }, 0);
    return () => clearTimeout(handle);
  }, [reload]);

  async function sendConfirmed() {
    if (!campaign || sending) return;
    const n = preview?.count ?? campaign.recipient_count ?? 0;
    const ok = window.confirm(
      `Send to ${n.toLocaleString()} recipient${n === 1 ? "" : "s"}?`
    );
    if (!ok) return;

    setSending(true);
    setSendMsg(null);
    try {
      await sendCampaign(campaign.id);
      await reload();
      router.refresh();
    } catch (e) {
      setSendMsg(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  async function saveTvl() {
    if (!campaign || tvlSaving) return;
    const raw = tvlInput.trim();
    const value = raw === "" ? null : Number(raw);
    if (value !== null && !Number.isFinite(value)) {
      setTvlMsg("Enter a valid number.");
      return;
    }
    setTvlSaving(true);
    setTvlMsg(null);
    try {
      await updateCampaignTvl(campaign.id, value);
      await reload();
      setTvlMsg("Saved");
    } catch {
      setTvlMsg("Could not save.");
    } finally {
      setTvlSaving(false);
    }
  }

  if (!id) {
    return <div className="p-6 text-admin-muted">Invalid campaign id.</div>;
  }

  if (loadError && !campaign) {
    return (
      <div className="admin-page">
        <p className="text-admin-danger">{loadError}</p>
        <Link
          href="/dashboard/campaigns"
          className="mt-4 inline-block text-neko-blue"
        >
          Back to campaigns
        </Link>
      </div>
    );
  }

  if (!campaign) {
    return <div className="p-6 text-admin-muted">Loading…</div>;
  }

  return (
    <div className="admin-page">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/dashboard/campaigns"
            className="text-sm text-neko-blue hover:underline"
          >
            ← Back to campaigns
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="font-klein text-3xl text-admin-text text-balance">
              {campaign.name}
            </h1>
            <span className={statusBadgeClass(campaign.status)}>
              {campaign.status}
            </span>
          </div>
        </div>
        {campaign.status === "draft" ? (
          <Link
            href={`/dashboard/campaigns/${campaign.id}/edit`}
            className="inline-flex items-center justify-center rounded-full border border-admin-border-strong bg-admin-elevated px-4 py-2 text-sm font-medium text-white hover:border-admin-border-strong"
          >
            Edit
          </Link>
        ) : null}
      </div>

      {campaign.status === "sent" ? (
        <div className="mb-6 rounded-xl border border-neko-blue/30 bg-neko-blue/10 px-4 py-3 text-sm text-neko-blue">
          Sent on{" "}
          {campaign.sent_at ? new Date(campaign.sent_at).toLocaleString() : "—"}{" "}
          to{" "}
          <span className="font-semibold">
            {(campaign.recipient_count ?? preview?.count ?? 0).toLocaleString()}
          </span>{" "}
          recipients.
        </div>
      ) : null}

      {campaign.status === "failed" ? (
        <div className="mb-6 space-y-3 rounded-xl border border-admin-danger/35 bg-admin-danger/10 px-4 py-3 text-sm text-admin-danger">
          <p>Campaign failed to send. You can retry below.</p>
          <button
            type="button"
            disabled={sending}
            onClick={() => void sendConfirmed()}
            className="inline-flex rounded-full bg-admin-danger/20 px-4 py-2 text-sm font-semibold text-admin-danger ring-1 ring-admin-danger/40 hover:bg-admin-danger/30 disabled:opacity-60"
          >
            {sending ? "Retrying…" : "Retry send"}
          </button>
        </div>
      ) : null}

      {sendMsg ? (
        <div className="mb-6 rounded-lg border border-admin-danger/30 bg-admin-danger/10 px-3 py-2 text-sm text-admin-danger">
          {sendMsg}
        </div>
      ) : null}

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <Info label="Subject" value={campaign.subject} />
        <Info label="Segment" value={segmentTitle(campaign.segment)} />
        <Info label="Status" value={campaign.status} />
        <Info
          label="Created at"
          value={new Date(campaign.created_at).toLocaleString()}
        />
        <Info
          label="Sent at"
          value={
            campaign.sent_at ? new Date(campaign.sent_at).toLocaleString() : "—"
          }
        />
        <Info
          label="Recipients"
          value={
            campaign.recipient_count != null
              ? campaign.recipient_count.toLocaleString()
              : preview
                ? preview.count.toLocaleString()
                : "—"
          }
        />
      </div>

      <section className="mb-8 rounded-xl border border-admin-border bg-admin-surface p-5">
        <h2 className="text-lg font-semibold text-white">TVL Moved (USD)</h2>
        <p className="mt-1 text-sm text-admin-muted">
          Record how much total value this campaign generated.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="number"
            inputMode="decimal"
            value={tvlInput}
            onChange={(e) => setTvlInput(e.target.value)}
            placeholder="0.00"
            className="w-48 rounded-xl border border-admin-border bg-admin-canvas px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent placeholder:text-white/35 focus:border-neko-blue/50 focus:ring-neko-blue/25"
          />
          <button
            type="button"
            disabled={tvlSaving}
            onClick={() => void saveTvl()}
            className="inline-flex items-center rounded-lg bg-neko-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-neko-navy-hover disabled:opacity-50"
          >
            {tvlSaving ? "Saving…" : "Save"}
          </button>
          {tvlMsg ? (
            <span
              className={`text-sm ${tvlMsg === "Saved" ? "text-neko-blue" : "text-admin-danger"}`}
            >
              {tvlMsg}
            </span>
          ) : null}
        </div>
        {campaign.tvl_moved != null ? (
          <p className="mt-3 text-2xl font-bold text-neko-blue">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            }).format(campaign.tvl_moved)}
          </p>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-admin-border bg-admin-surface p-5">
          <h2 className="text-lg font-semibold text-white">
            Recipients preview
          </h2>
          <p className="mt-1 text-sm text-admin-muted">
            {preview
              ? `${preview.count.toLocaleString()} users will receive this email`
              : "Loading preview…"}
          </p>
          {preview && preview.sample.length > 0 ? (
            <ul className="mt-4 space-y-1 text-sm text-admin-muted">
              {preview.sample.map((s) => (
                <li key={s} className="font-mono text-xs">
                  {s}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="rounded-xl border border-admin-border bg-admin-surface p-5">
          <h2 className="text-lg font-semibold text-white">Email preview</h2>
          <iframe
            title="Email body preview"
            className="mt-4 h-72 w-full rounded-lg border border-admin-border bg-white"
            srcDoc={campaign.body_html || "<p />"}
            sandbox="allow-same-origin"
          />
        </section>
      </div>

      {campaign.status === "draft" ? (
        <section className="mt-8 space-y-3 rounded-xl border border-admin-border bg-admin-elevated p-6">
          <h2 className="text-lg font-semibold text-white">Actions</h2>
          <p className="text-sm text-admin-warning/90">
            This action cannot be undone.
          </p>
          <button
            type="button"
            disabled={sending || (preview?.count ?? 0) === 0}
            onClick={() => void sendConfirmed()}
            className="inline-flex w-full items-center justify-center rounded-lg bg-neko-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-neko-navy-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {sending ? "Sending…" : "Send campaign"}
          </button>
        </section>
      ) : null}
    </div>
  );
}

function Info(props: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-admin-border bg-admin-surface px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-admin-subtle">
        {props.label}
      </p>
      <p className="mt-1 text-sm font-medium text-white">{props.value}</p>
    </div>
  );
}
