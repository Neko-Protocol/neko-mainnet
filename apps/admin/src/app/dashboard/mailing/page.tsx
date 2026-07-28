import Link from "next/link";
import { FileText, Mail, PauseCircle, PlayCircle } from "lucide-react";
import { listMailingAutomations } from "@/lib/mailing";
import type { MailingAutomationDTO } from "@/types/mailing";
import { SEGMENTS } from "@/lib/segments";
import { MetricCard } from "@/components/MetricCard";

function segmentLabel(segmentId: string): string {
  const s = SEGMENTS.find((x) => x.id === segmentId);
  return s?.label ?? segmentId;
}

function triggerLabel(triggerType: string): string {
  return triggerType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function statusBadge(status: MailingAutomationDTO["status"]) {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";
  switch (status) {
    case "draft":
      return `${base} bg-white/10 text-white/70`;
    case "active":
      return `${base} bg-[#4ADE80]/20 text-[#4ADE80]`;
    case "paused":
      return `${base} bg-amber-500/20 text-amber-200`;
    case "archived":
      return `${base} bg-white/5 text-white/40`;
    default:
      return `${base} bg-white/10 text-white/70`;
  }
}

export default async function MailingAutomationsPage() {
  const [automations] = await Promise.all([listMailingAutomations()]);

  const total = automations.length;
  const active = automations.filter((a) => a.status === "active").length;
  const draft = automations.filter((a) => a.status === "draft").length;
  const paused = automations.filter((a) => a.status === "paused").length;

  return (
    <div className="p-6 lg:p-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Mailing Automations
          </h1>
          <p className="text-sm text-white/50">
            Event-triggered lifecycle emails via Resend
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/mailing/templates"
            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-[#242424] px-4 py-2 text-sm font-medium text-white hover:border-white/25"
          >
            Manage templates
          </Link>
          <Link
            href="/dashboard/mailing/new"
            className="inline-flex items-center justify-center rounded-full bg-[#229EDF] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1a8bc7]"
          >
            New automation
          </Link>
        </div>
      </header>

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Total automations"
          value={total.toLocaleString()}
          accent="blue"
          icon={<Mail className="size-5" />}
        />
        <MetricCard
          title="Active"
          value={active.toLocaleString()}
          accent="green"
          icon={<PlayCircle className="size-5" />}
        />
        <MetricCard
          title="Drafts"
          value={draft.toLocaleString()}
          icon={<FileText className="size-5" />}
        />
        <MetricCard
          title="Paused"
          value={paused.toLocaleString()}
          icon={<PauseCircle className="size-5" />}
        />
      </div>

      {automations.length === 0 ? (
        <div className="rounded-2xl border border-white/8 bg-[#1C1C1C] px-6 py-16 text-center text-white/60">
          No automations yet. Create your first one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/8 bg-[#1C1C1C]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/8 text-white/50">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Trigger</th>
                <th className="px-4 py-3 font-medium">Delay</th>
                <th className="px-4 py-3 font-medium">Segment</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {automations.map((a) => (
                <tr key={a.id} className="text-white/85">
                  <td className="px-4 py-3 font-medium text-white">{a.name}</td>
                  <td className="px-4 py-3 text-white/70">
                    {triggerLabel(a.trigger_type)}
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {a.delay_value} {a.delay_unit}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-[#242424] px-2 py-0.5 text-xs text-white/80 ring-1 ring-white/10">
                      {segmentLabel(a.segment)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={statusBadge(a.status)}>{a.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/dashboard/mailing/${a.id}`}
                        className="text-[#229EDF] hover:underline"
                      >
                        View
                      </Link>
                      {a.status === "draft" ? (
                        <Link
                          href={`/dashboard/mailing/${a.id}/edit`}
                          className="text-white/70 hover:text-white hover:underline"
                        >
                          Edit
                        </Link>
                      ) : null}
                    </div>
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
