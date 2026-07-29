"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createActivation } from "@/lib/activations";
import {
  AlertTriangle,
  CalendarClock,
  Coins,
  Mail,
  Users,
  Zap,
} from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseEmails(raw: string): { valid: string[]; invalid: string[] } {
  const entries = raw
    .split(/[\n,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const entry of new Set(entries)) {
    (EMAIL_RE.test(entry) ? valid : invalid).push(entry);
  }
  return { valid, invalid };
}

const inputStyles =
  "w-full rounded-lg border border-admin-border bg-admin-canvas px-3 py-2.5 text-white outline-none placeholder:text-white/35 transition focus:border-neko-blue/60 focus:ring-2 focus:ring-neko-blue/15";

export default function NewActivationPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [rewardXlm, setRewardXlm] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [emailsRaw, setEmailsRaw] = useState("");
  const [sendInvites, setSendInvites] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { valid, invalid } = useMemo(() => parseEmails(emailsRaw), [emailsRaw]);

  const reward = Number(rewardXlm);
  const rewardValid = Number.isFinite(reward) && reward > 0;
  const totalXlm = rewardValid ? reward * valid.length : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!rewardValid) {
      setError("Reward must be a positive XLM amount.");
      return;
    }
    if (!valid.length) {
      setError("Add at least one valid email.");
      return;
    }
    if (invalid.length) {
      setError(`Fix invalid entries first: ${invalid.slice(0, 5).join(", ")}`);
      return;
    }

    setSubmitting(true);
    try {
      const { id } = await createActivation({
        name,
        reward_xlm: reward,
        expires_at: new Date(expiresAt).toISOString(),
        emails: valid,
        send_invites: sendInvites,
      });
      router.push(`/dashboard/activations/${id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-page">
      <div className="mb-8">
        <Link
          href="/dashboard/activations"
          className="text-sm text-neko-blue hover:underline"
        >
          ← Back to activations
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <div>
            <h1 className="font-klein text-3xl text-admin-text text-balance">
              New activation
            </h1>
            <p className="text-sm text-admin-muted">
              Participants become payable once they verify a listed email before
              the expiry date.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="grid max-w-6xl gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {error ? (
            <div className="flex items-start gap-2 rounded-lg border border-admin-danger/30 bg-admin-danger/10 px-3 py-2.5 text-sm text-admin-danger">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {error}
            </div>
          ) : null}

          <section className="rounded-xl border border-admin-border bg-admin-surface p-6">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-admin-muted">
              Program
            </h2>
            <p className="mb-5 text-xs text-admin-subtle">
              What the activation is and what each graduate receives.
            </p>

            <div className="space-y-5">
              <div>
                <label
                  htmlFor="activation-name"
                  className="mb-1.5 block text-sm font-medium text-admin-muted"
                >
                  Name
                </label>
                <input
                  id="activation-name"
                  className={inputStyles}
                  value={name}
                  onChange={(ev) => setName(ev.target.value)}
                  required
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="activation-reward"
                    className="mb-1.5 block text-sm font-medium text-admin-muted"
                  >
                    Reward per participant
                  </label>
                  <div className="relative">
                    <Coins
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35"
                      aria-hidden
                    />
                    <input
                      id="activation-reward"
                      type="number"
                      min="0"
                      step="any"
                      className={`${inputStyles} pl-9 pr-14`}
                      placeholder="10"
                      value={rewardXlm}
                      onChange={(ev) => setRewardXlm(ev.target.value)}
                      required
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-admin-subtle">
                      XLM
                    </span>
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="activation-expiry"
                    className="mb-1.5 block text-sm font-medium text-admin-muted"
                  >
                    Expires at
                  </label>
                  <div className="relative">
                    <CalendarClock
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35"
                      aria-hidden
                    />
                    <input
                      id="activation-expiry"
                      type="datetime-local"
                      className={`${inputStyles} pl-9 [color-scheme:dark]`}
                      value={expiresAt}
                      onChange={(ev) => setExpiresAt(ev.target.value)}
                      required
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-admin-subtle">
                    Emails verified after this date no longer qualify.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-admin-border bg-admin-surface p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-admin-muted">
                  Participants
                </h2>
                <p className="text-xs text-admin-subtle">
                  One email per line, commas and semicolons work too. Duplicates
                  are removed automatically.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-neko-blue/10 px-2.5 py-1 text-xs font-medium text-neko-blue">
                  <Mail className="size-3.5" aria-hidden />
                  {valid.length} valid
                </span>
                {invalid.length > 0 && (
                  <span className="inline-flex items-center rounded-full bg-admin-danger/10 px-2.5 py-1 text-xs font-medium text-admin-danger">
                    {invalid.length} invalid
                  </span>
                )}
              </div>
            </div>

            <textarea
              aria-label="Participant emails"
              className={`${inputStyles} min-h-[220px] font-mono text-sm`}
              placeholder={
                "fabian@oppialabs.com\nsantiago@oppialabs.com\nmatias@oppialabs.com\nkevin@oppialabs.com"
              }
              value={emailsRaw}
              onChange={(ev) => setEmailsRaw(ev.target.value)}
              required
            />
            {invalid.length > 0 && (
              <p className="mt-2 text-xs text-admin-danger">
                Invalid: {invalid.slice(0, 10).join(", ")}
                {invalid.length > 10 ? "…" : ""}
              </p>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-8 h-fit rounded-xl border border-admin-border bg-admin-surface p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-admin-muted">
            Summary
          </h2>

          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-2 text-admin-muted">
                <Users className="size-4" aria-hidden />
                Participants
              </dt>
              <dd className="font-medium text-white">{valid.length}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-2 text-admin-muted">
                <Coins className="size-4" aria-hidden />
                Reward each
              </dt>
              <dd className="font-medium text-white">
                {rewardValid ? `${reward} XLM` : "-"}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-2 text-admin-muted">
                <CalendarClock className="size-4" aria-hidden />
                Expires
              </dt>
              <dd className="font-medium text-white">
                {expiresAt
                  ? new Date(expiresAt).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : "-"}
              </dd>
            </div>
          </dl>

          <div className="mt-5 rounded-xl border border-neko-blue/25 bg-neko-accent/8 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-admin-subtle">
              Max budget if everyone completes
            </p>
            <p className="mt-1 text-xl font-semibold text-neko-blue">
              {totalXlm > 0
                ? `${totalXlm.toLocaleString("en-US", { maximumFractionDigits: 7 })} XLM`
                : "-"}
            </p>
          </div>

          <label className="mt-5 flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={sendInvites}
              onChange={(ev) => setSendInvites(ev.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-neko-accent"
            />
            <span>
              <span className="block text-sm text-admin-text">
                Email an invitation to each participant now
              </span>
              <span className="mt-0.5 block text-xs text-admin-subtle">
                Recipients without a Neko account just connect a wallet and
                verify this email.
              </span>
            </span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 w-full rounded-lg bg-neko-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-neko-navy-hover disabled:opacity-60"
          >
            {submitting ? "Creating…" : "Create activation"}
          </button>
          <Link
            href="/dashboard/activations"
            className="mt-3 block text-center text-sm text-admin-muted hover:text-white"
          >
            Cancel
          </Link>
        </aside>
      </form>
    </div>
  );
}
