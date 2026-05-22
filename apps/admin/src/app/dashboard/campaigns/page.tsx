import Link from "next/link";
import { Mail, FileText, Send } from "lucide-react";
import {
  getCampaignStats,
  listCampaigns,
  type Campaign,
} from "@/lib/campaigns";
import { SEGMENTS } from "@/lib/segments";
import { MetricCard } from "@/components/MetricCard";

function segmentLabel(segmentId: string): string {
  const s = SEGMENTS.find((x) => x.id === segmentId);
  return s?.label ?? segmentId;
}

function statusBadge(status: Campaign["status"]) {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";
  switch (status) {
    case "draft":
      return `${base} bg-white/10 text-white/70`;
    case "sending":
      return `${base} bg-amber-500/20 text-amber-200`;
    case "sent":
      return `${base} bg-[#4ADE80]/20 text-[#4ADE80]`;
    case "failed":
      return `${base} bg-red-500/20 text-red-300`;
    default:
      return `${base} bg-white/10 text-white/70`;
  }
}

export default async function CampaignsPage() {
  const [campaigns, stats] = await Promise.all([
    listCampaigns(),
    getCampaignStats(),
  ]);

  return (
    <div className="p-6 lg:p-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Campaigns</h1>
          <p className="text-sm text-white/50">
            Mass email via Resend to verified user segments
          </p>
        </div>
        <Link
          href="/dashboard/campaigns/new"
          className="inline-flex items-center justify-center rounded-full bg-[#229EDF] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1a8bc7]"
        >
          New campaign
        </Link>
      </header>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Total campaigns"
          value={stats.total.toLocaleString()}
          accent="blue"
          icon={<FileText className="size-5" />}
        />
        <MetricCard
          title="Sent"
          value={stats.sent.toLocaleString()}
          accent="green"
          icon={<Send className="size-5" />}
        />
        <MetricCard
          title="Drafts"
          value={stats.draft.toLocaleString()}
          icon={<Mail className="size-5" />}
        />
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-2xl border border-white/8 bg-[#1C1C1C] px-6 py-16 text-center text-white/60">
          No campaigns yet. Create your first one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/8 bg-[#1C1C1C]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/8 text-white/50">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Segment</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Recipients</th>
                <th className="px-4 py-3 font-medium">Sent at</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {campaigns.map((c) => (
                <tr key={c.id} className="text-white/85">
                  <td className="px-4 py-3 font-medium text-white">{c.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-[#242424] px-2 py-0.5 text-xs text-white/80 ring-1 ring-white/10">
                      {segmentLabel(c.segment)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={statusBadge(c.status)}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {c.recipient_count != null
                      ? c.recipient_count.toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-white/60">
                    {c.sent_at ? new Date(c.sent_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/dashboard/campaigns/${c.id}`}
                        className="text-[#229EDF] hover:underline"
                      >
                        View
                      </Link>
                      {c.status === "draft" ? (
                        <Link
                          href={`/dashboard/campaigns/${c.id}/edit`}
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
