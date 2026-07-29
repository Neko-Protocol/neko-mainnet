"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listActivations, type ActivationSummary } from "@/lib/activations";

type ActivationRow = ActivationSummary & { expired: boolean };

function formatDate(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function ActivationsPage() {
  const [activations, setActivations] = useState<ActivationRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listActivations();
        const now = Date.now();
        if (!cancelled) {
          setActivations(
            data.map((a) => ({
              ...a,
              expired: new Date(a.expires_at).getTime() < now,
            }))
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Something went wrong");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="admin-page">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-klein text-3xl text-admin-text text-balance">
            Activations
          </h1>
          <p className="text-sm text-admin-muted">
            XLM reward programs for verified participant emails.
          </p>
        </div>
        <Link
          href="/dashboard/activations/new"
          className="inline-flex items-center justify-center rounded-lg bg-neko-accent px-5 py-2 text-sm font-semibold text-white transition hover:bg-neko-navy-hover"
        >
          New activation
        </Link>
      </div>

      {error ? (
        <div className="rounded-lg border border-admin-danger/30 bg-admin-danger/10 px-3 py-2 text-sm text-admin-danger">
          {error}
        </div>
      ) : activations === null ? (
        <p className="text-sm text-admin-muted">Loading…</p>
      ) : activations.length === 0 ? (
        <div className="rounded-xl border border-admin-border bg-admin-surface p-8 text-center text-sm text-admin-muted">
          No activations yet. Create one to start tracking a program.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-admin-border bg-admin-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-admin-border text-xs uppercase tracking-wide text-admin-subtle">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Reward</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Completed</th>
                <th className="px-4 py-3">Payable</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {activations.map((a) => {
                const expired = a.expired;
                const completed = a.counts.payable + a.counts.paid;
                return (
                  <tr
                    key={a.id}
                    className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3 font-medium text-white">
                      {a.name}
                    </td>
                    <td className="px-4 py-3 text-admin-muted">
                      {a.reward_xlm} XLM
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                          expired
                            ? "bg-white/10 text-admin-muted"
                            : "bg-neko-blue/10 text-neko-blue"
                        }`}
                      >
                        {expired ? "Expired" : formatDate(a.expires_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-admin-muted">
                      {completed} / {a.counts.total}
                    </td>
                    <td className="px-4 py-3 text-admin-warning">
                      {a.counts.payable}
                    </td>
                    <td className="px-4 py-3 text-neko-blue">
                      {a.counts.paid}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/activations/${a.id}`}
                        className="text-sm text-neko-blue hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
