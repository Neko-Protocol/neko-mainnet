"use client";

import {
  useAutomationRuns,
  useAutomationStats,
} from "../hooks/useMailingQueries";
import { StatusPill } from "./MailingFormControls";

const STAT_LABELS: { key: keyof Stats; label: string }[] = [
  { key: "enrolled", label: "Enrolled" },
  { key: "pending", label: "Pending" },
  { key: "sent", label: "Sent" },
  { key: "skipped", label: "Skipped" },
  { key: "failed", label: "Failed" },
];

type Stats = {
  enrolled: number;
  pending: number;
  sent: number;
  skipped: number;
  failed: number;
};

export function AutomationRuns({ automationId }: { automationId: string }) {
  const stats = useAutomationStats(automationId);
  const runs = useAutomationRuns(automationId);

  return (
    <div className="mt-3 border-t border-white/5 pt-3">
      <div className="mb-3 flex flex-wrap gap-4">
        {STAT_LABELS.map(({ key, label }) => (
          <div key={key}>
            <div className="text-xs text-white/35">{label}</div>
            <div className="text-sm font-medium text-white">
              {stats.isPending
                ? "—"
                : (stats.data?.[key] ?? 0).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {runs.isPending ? (
        <div className="h-10 animate-pulse rounded bg-white/5" />
      ) : !runs.data?.length ? (
        <p className="text-xs text-white/35">
          No enrollments yet. Run enrollment to scan for matching wallets.
        </p>
      ) : (
        <div className="max-h-64 overflow-auto">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead>
              <tr className="text-white/35">
                <th className="pb-1.5 font-medium">Email</th>
                <th className="pb-1.5 font-medium">Scheduled</th>
                <th className="pb-1.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {runs.data.slice(0, 50).map((r) => (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="py-1.5 pr-3 text-white/70">{r.email}</td>
                  <td className="py-1.5 pr-3 text-white/40">
                    {new Date(r.scheduled_send_at).toLocaleString()}
                  </td>
                  <td className="py-1.5">
                    <StatusPill status={r.status} />
                    {r.error && (
                      <span className="ml-2 text-red-400">{r.error}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
