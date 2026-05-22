"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SEGMENTS, type SegmentId } from "@/lib/segments";

export default function NewCampaignPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [segment, setSegment] = useState<SegmentId>("all");
  const [bodyHtml, setBodyHtml] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshCount = useCallback(async (seg: SegmentId) => {
    await Promise.resolve();
    setCountLoading(true);
    setCount(null);
    try {
      const res = await fetch(`/api/segments/${seg}/count`);
      if (!res.ok) throw new Error("Failed to load segment size");
      const data = (await res.json()) as { count?: number };
      setCount(typeof data.count === "number" ? data.count : 0);
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
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          subject,
          body_html: bodyHtml,
          segment,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        id?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(payload.error ?? "Failed to create campaign");
      }
      if (!payload.id) throw new Error("Missing campaign id");
      router.push(`/dashboard/campaigns/${payload.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
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
          href="/dashboard/campaigns"
          className="text-sm text-[#229EDF] hover:underline"
        >
          ← Back to campaigns
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-white">New campaign</h1>
        <p className="text-sm text-white/50">
          Compose a segment email in HTML; sends through Resend.
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
          <span className="font-medium text-[#229EDF]">Tip:</span> Use{" "}
          <code className="rounded bg-black/40 px-1 py-0.5 text-xs text-white/90">
            {`{{wallet_address}}`}
          </code>{" "}
          in your HTML to personalize. Images must be hosted externally.
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-white/70">
            Name
          </label>
          <input
            className="w-full rounded-lg border border-white/10 bg-[#121212] px-3 py-2 text-white outline-none placeholder:text-white/35 focus:border-[#229EDF]/60"
            placeholder="May re-engagement"
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-white/70">
            Subject
          </label>
          <input
            className="w-full rounded-lg border border-white/10 bg-[#121212] px-3 py-2 text-white outline-none placeholder:text-white/35 focus:border-[#229EDF]/60"
            placeholder="We miss you — here is what is new"
            value={subject}
            onChange={(ev) => setSubject(ev.target.value)}
            required
          />
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
            Email body (HTML)
          </label>
          <textarea
            className="w-full min-h-[200px] rounded-lg border border-white/10 bg-[#121212] px-3 py-2 font-mono text-sm text-white outline-none placeholder:text-white/35 focus:border-[#229EDF]/60"
            placeholder="<p>Hi there...</p>"
            value={bodyHtml}
            onChange={(ev) => setBodyHtml(ev.target.value)}
            required
          />
          <iframe
            title="Email preview"
            className="mt-4 h-64 w-full rounded-lg border border-white/10 bg-white"
            srcDoc={bodyHtml || "<p />"}
            sandbox="allow-same-origin"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-full bg-[#229EDF] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#1a8bc7] disabled:opacity-60"
          >
            {submitting ? "Creating…" : "Create campaign"}
          </button>
          <Link
            href="/dashboard/campaigns"
            className="text-sm text-white/50 hover:text-white"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
