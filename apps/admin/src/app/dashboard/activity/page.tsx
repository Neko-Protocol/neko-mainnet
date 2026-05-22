import { ArrowRightLeft, BarChart3, Layers } from "lucide-react";
import {
  getDailyTransactions,
  getOverviewStats,
  getRecentActivity,
  getTopAssetsByVolume,
  getTransactionsByType,
} from "@/lib/queries";
import { MetricCard } from "@/components/MetricCard";
import { SimpleBarChart } from "@/components/charts/SimpleBarChart";
import { SimpleLineChart } from "@/components/charts/SimpleLineChart";
import { ActivityTable } from "@/components/ActivityTable";

export default async function DashboardActivityPage() {
  const [overview, txByType, dailyTx, topAssets, logs] = await Promise.all([
    getOverviewStats(),
    getTransactionsByType(),
    getDailyTransactions(30),
    getTopAssetsByVolume(8),
    getRecentActivity(50),
  ]);

  const topAction = txByType[0];
  const txBarData = txByType.map((r) => ({
    label: r.action_type.replaceAll("_", " "),
    value: r.count,
  }));

  const lineData = dailyTx.map((d) => ({ date: d.date, value: d.count }));

  const assetBarData = topAssets.map((a) => ({
    label: a.asset_key,
    value: a.total_volume,
  }));

  const mostUsedDisplay = topAction?.action_type.replaceAll("_", " ") ?? "—";
  const mostUsedSub = topAction
    ? `${topAction.count.toLocaleString()} events logged`
    : undefined;

  return (
    <div className="p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Activity</h1>
        <p className="text-sm text-white/50">Transaction mix and liquidity</p>
      </header>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Total transactions"
          value={overview.totalTransactions.toLocaleString()}
          icon={<ArrowRightLeft className="size-5" />}
        />
        <MetricCard
          title="Total volume (USD)"
          value={`$${overview.totalVolumeUsd.toLocaleString(undefined, {
            maximumFractionDigits: 0,
          })}`}
          accent="blue"
          icon={<Layers className="size-5" />}
        />
        <MetricCard
          title="Most used action"
          value={mostUsedDisplay}
          subtitle={mostUsedSub}
          accent="green"
          icon={<BarChart3 className="size-5" />}
        />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/8 bg-[#1C1C1C] p-5">
          <h2 className="mb-1 text-lg font-semibold text-white">
            Transactions by type
          </h2>
          <p className="mb-2 text-xs text-white/45">Horizontal bars</p>
          <SimpleBarChart data={txBarData} height={280} />
        </section>
        <section className="rounded-2xl border border-white/8 bg-[#1C1C1C] p-5">
          <h2 className="mb-1 text-lg font-semibold text-white">
            Daily transactions (30d)
          </h2>
          <p className="mb-4 text-xs text-white/45">Volume of events</p>
          <SimpleLineChart data={lineData} height={280} />
        </section>
      </div>

      <section className="mb-8 rounded-2xl border border-white/8 bg-[#1C1C1C] p-5">
        <h2 className="mb-1 text-lg font-semibold text-white">
          Top assets by volume
        </h2>
        <p className="mb-2 text-xs text-white/45">
          From aggregated asset_volume_stats
        </p>
        <SimpleBarChart data={assetBarData} height={260} />
      </section>

      <section className="rounded-2xl border border-white/8 bg-[#1C1C1C] p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Recent activity
        </h2>
        <ActivityTable logs={logs} />
      </section>
    </div>
  );
}
