"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createMailingTemplate } from "@/lib/mailing";

export default function NewMailingTemplatePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createMailingTemplate({
        name,
        subject,
        body_html: bodyHtml,
      });
      router.push("/dashboard/mailing/templates");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <Link
          href="/dashboard/mailing/templates"
          className="text-sm text-[#229EDF] hover:underline"
        >
          ← Back to templates
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-white">New template</h1>
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
          and{" "}
          <code className="rounded bg-black/40 px-1 py-0.5 text-xs text-white/90">
            {`{{email}}`}
          </code>{" "}
          in your HTML to personalize. Images must be hosted externally. An
          unsubscribe footer link is appended automatically at send time — do
          not add your own.
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-white/70">
            Name
          </label>
          <input
            className="w-full rounded-lg border border-white/10 bg-[#121212] px-3 py-2 text-white outline-none placeholder:text-white/35 focus:border-[#229EDF]/60"
            placeholder="Welcome email"
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
            placeholder="Welcome to Neko"
            value={subject}
            onChange={(ev) => setSubject(ev.target.value)}
            required
          />
        </div>

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
            {submitting ? "Creating…" : "Create template"}
          </button>
          <Link
            href="/dashboard/mailing/templates"
            className="text-sm text-white/50 hover:text-white"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
