"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface ActivationSummary {
  id: string;
  name: string;
  reward_xlm: number;
  expires_at: string;
  created_at: string;
  counts: { total: number; pending: number; payable: number; paid: number };
}

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
        const res = await fetch("/api/backend/v1/activations");
        if (!res.ok) throw new Error("Failed to load activations");
        const data = (await res.json()) as ActivationSummary[];
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
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Activations</h1>
          <p className="text-sm text-white/50">
            XLM reward programs for verified participant emails.
          </p>
        </div>
        <Link
          href="/dashboard/activations/new"
          className="inline-flex items-center justify-center rounded-full bg-[#229EDF] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#1a8bc7]"
        >
          New activation
        </Link>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      ) : activations === null ? (
        <p className="text-sm text-white/50">Loading…</p>
      ) : activations.length === 0 ? (
        <div className="rounded-2xl border border-white/8 bg-[#1C1C1C] p-8 text-center text-sm text-white/50">
          No activations yet. Create one to start tracking a program.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#1C1C1C]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/8 text-xs uppercase tracking-wide text-white/45">
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
                    <td className="px-4 py-3 text-white/70">
                      {a.reward_xlm} XLM
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                          expired
                            ? "bg-white/10 text-white/50"
                            : "bg-emerald-400/10 text-emerald-300"
                        }`}
                      >
                        {expired ? "Expired" : formatDate(a.expires_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      {completed} / {a.counts.total}
                    </td>
                    <td className="px-4 py-3 text-amber-300">
                      {a.counts.payable}
                    </td>
                    <td className="px-4 py-3 text-emerald-300">
                      {a.counts.paid}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/activations/${a.id}`}
                        className="text-sm text-[#229EDF] hover:underline"
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
