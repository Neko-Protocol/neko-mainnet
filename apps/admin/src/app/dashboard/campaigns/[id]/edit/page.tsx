"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { CampaignDTO } from "@/types/campaign";
import { SEGMENTS, type SegmentId } from "@/lib/segments";
import { getSegmentCount } from "@/lib/segments-actions";
import { getCampaign, updateCampaign } from "@/lib/campaigns";

export default function EditCampaignPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";

  const [initial, setInitial] = useState<CampaignDTO | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [segment, setSegment] = useState<SegmentId>("all");
  const [bodyHtml, setBodyHtml] = useState("");
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
        let c: CampaignDTO;
        try {
          c = await getCampaign(id);
        } catch {
          setLoadError("Campaign not found");
          return;
        }
        if (c.status !== "draft") {
          setLoadError("Only draft campaigns can be edited");
          setInitial(null);
          return;
        }
        setInitial(c);
        setName(c.name);
        setSubject(c.subject);
        setSegment(
          SEGMENTS.some((s) => s.id === c.segment)
            ? (c.segment as SegmentId)
            : "all"
        );
        setBodyHtml(c.body_html);
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !initial) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateCampaign(id, {
        name,
        subject,
        body_html: bodyHtml,
        segment,
      });
      router.push(`/dashboard/campaigns/${id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (!id) {
    return <div className="p-6 text-admin-muted">Invalid campaign id.</div>;
  }

  if (loadError) {
    return (
      <div className="admin-page">
        <p className="text-admin-danger">{loadError}</p>
        <Link
          href={`/dashboard/campaigns/${id}`}
          className="mt-4 inline-block text-neko-blue"
        >
          Back to campaign
        </Link>
      </div>
    );
  }

  if (!initial) {
    return <div className="p-6 text-admin-muted">Loading…</div>;
  }

  const countLabel = countLoading ? (
    <span className="text-admin-subtle"> (loading…)</span>
  ) : count !== null ? (
    <span className="text-admin-subtle"> ({count.toLocaleString()})</span>
  ) : (
    <span className="text-admin-subtle"> (—)</span>
  );

  return (
    <div className="admin-page">
      <div className="mb-8">
        <Link
          href={`/dashboard/campaigns/${id}`}
          className="text-sm text-neko-blue hover:underline"
        >
          ← Back to campaign
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-white">
          Edit campaign
        </h1>
        <p className="text-sm text-admin-muted">
          Update draft content and segment.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="max-w-4xl space-y-6 rounded-xl border border-admin-border bg-admin-surface p-6"
      >
        {error ? (
          <div className="rounded-lg border border-admin-danger/30 bg-admin-danger/10 px-3 py-2 text-sm text-admin-danger">
            {error}
          </div>
        ) : null}

        <div className="rounded-xl border border-neko-blue/35 bg-admin-elevated/80 px-4 py-3 text-sm text-admin-muted">
          <span className="font-medium text-neko-blue">Tip:</span> Use{" "}
          <code className="rounded bg-black/40 px-1 py-0.5 text-xs text-admin-text">
            {`{{wallet_address}}`}
          </code>{" "}
          in your HTML to personalize. Images must be hosted externally.
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-admin-muted">
            Name
          </label>
          <input
            className="w-full rounded-lg border border-admin-border bg-admin-canvas px-3 py-2 text-white outline-none placeholder:text-white/35 focus:border-neko-blue/60"
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-admin-muted">
            Subject
          </label>
          <input
            className="w-full rounded-lg border border-admin-border bg-admin-canvas px-3 py-2 text-white outline-none placeholder:text-white/35 focus:border-neko-blue/60"
            value={subject}
            onChange={(ev) => setSubject(ev.target.value)}
            required
          />
        </div>

        <fieldset className="space-y-3">
          <legend className="mb-2 text-sm font-medium text-admin-muted">
            Segment {countLabel}
          </legend>
          <div className="flex flex-col gap-3">
            {SEGMENTS.map((s) => (
              <label
                key={s.id}
                className={`flex cursor-pointer gap-3 rounded-xl border px-4 py-3 transition ${
                  segment === s.id
                    ? "border-neko-blue/55 bg-admin-elevated"
                    : "border-admin-border bg-admin-canvas hover:border-white/20"
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
                  <span className="mt-1 block text-sm text-admin-muted">
                    {s.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label className="mb-1 block text-sm font-medium text-admin-muted">
            Email body (HTML)
          </label>
          <textarea
            className="w-full min-h-[200px] rounded-lg border border-admin-border bg-admin-canvas px-3 py-2 font-mono text-sm text-white outline-none placeholder:text-white/35 focus:border-neko-blue/60"
            value={bodyHtml}
            onChange={(ev) => setBodyHtml(ev.target.value)}
            required
          />
          <iframe
            title="Email preview"
            className="mt-4 h-64 w-full rounded-lg border border-admin-border bg-white"
            srcDoc={bodyHtml || "<p />"}
            sandbox="allow-same-origin"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-lg bg-neko-accent px-6 py-2 text-sm font-semibold text-white transition hover:bg-neko-navy-hover disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save changes"}
          </button>
          <Link
            href={`/dashboard/campaigns/${id}`}
            className="text-sm text-admin-muted hover:text-white"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
