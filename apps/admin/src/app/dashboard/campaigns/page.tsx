import Link from "next/link";
import { Mail, FileText, Send, TrendingUp } from "lucide-react";
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

export default async function CampaignsPage() {
  const [campaigns, stats] = await Promise.all([
    listCampaigns(),
    getCampaignStats(),
  ]);

  return (
    <div className="admin-page">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-klein text-3xl text-admin-text text-balance">
            Campaigns
          </h1>
          <p className="text-sm text-admin-muted">
            Mass email via Resend to verified user segments
          </p>
        </div>
        <Link
          href="/dashboard/campaigns/new"
          className="inline-flex items-center justify-center rounded-lg bg-neko-accent px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-neko-navy-hover"
        >
          New campaign
        </Link>
      </header>

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Total campaigns"
          value={stats.total.toLocaleString()}
          accent="blue"
          icon={<FileText className="size-5" />}
        />
        <MetricCard
          title="Sent"
          value={stats.sent.toLocaleString()}
          accent="subtle"
          icon={<Send className="size-5" />}
        />
        <MetricCard
          title="Drafts"
          value={stats.draft.toLocaleString()}
          icon={<Mail className="size-5" />}
        />
        <MetricCard
          title="TVL moved"
          value={`$${stats.tvl_moved_total.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}
          accent="subtle"
          icon={<TrendingUp className="size-5" />}
        />
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-xl border border-admin-border bg-admin-surface px-6 py-16 text-center text-admin-muted">
          No campaigns yet. Create your first one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-admin-border bg-admin-surface">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-admin-border text-admin-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Segment</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Recipients</th>
                <th className="px-4 py-3 font-medium">TVL Moved</th>
                <th className="px-4 py-3 font-medium">Sent at</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {campaigns.map((c) => (
                <tr key={c.id} className="text-admin-text">
                  <td className="px-4 py-3 font-medium text-white">{c.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-admin-elevated px-2 py-0.5 text-xs text-admin-text ring-1 ring-white/10">
                      {segmentLabel(c.segment)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={statusBadge(c.status)}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3 text-admin-muted">
                    {c.recipient_count != null
                      ? c.recipient_count.toLocaleString()
                      : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-admin-muted">
                    {c.tvl_moved != null
                      ? new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        }).format(c.tvl_moved)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-admin-muted">
                    {c.sent_at ? new Date(c.sent_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/dashboard/campaigns/${c.id}`}
                        className="text-neko-blue hover:underline"
                      >
                        View
                      </Link>
                      {c.status === "draft" ? (
                        <Link
                          href={`/dashboard/campaigns/${c.id}/edit`}
                          className="text-admin-muted hover:text-white hover:underline"
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
