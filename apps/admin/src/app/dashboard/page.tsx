import { ArrowRightLeft, TrendingUp, UsersRound, Wallet } from "lucide-react";
import {
  getDailyNewUsers,
  getDailyTransactions,
  getOverviewStats,
  getRecentActivity,
} from "@/lib/queries";
import { MetricCard } from "@/components/MetricCard";
import { SimpleLineChart } from "@/components/charts/SimpleLineChart";
import { ActivityTable } from "@/components/ActivityTable";

export default async function DashboardOverviewPage() {
  const [stats, dailyUsers, dailyTx, activity] = await Promise.all([
    getOverviewStats(),
    getDailyNewUsers(30),
    getDailyTransactions(30),
    getRecentActivity(20),
  ]);

  const now = new Date().toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const userGrowthData = dailyUsers.map((d) => ({
    date: d.date,
    value: d.count,
  }));
  const txData = dailyTx.map((d) => ({ date: d.date, value: d.count }));

  return (
    <div className="p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Overview</h1>
        <p className="text-sm text-white/50">Last updated: {now}</p>
      </header>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Total users"
          value={stats.totalUsers.toLocaleString()}
          accent="blue"
          icon={<UsersRound className="size-5" />}
        />
        <MetricCard
          title="New this week"
          value={stats.newUsersThisWeek.toLocaleString()}
          subtitle="Signup velocity"
          accent="green"
          icon={<TrendingUp className="size-5" />}
        />
        <MetricCard
          title="Total transactions"
          value={stats.totalTransactions.toLocaleString()}
          icon={<ArrowRightLeft className="size-5" />}
        />
        <MetricCard
          title="Total volume (USD)"
          value={stats.totalVolumeUsd.toLocaleString(undefined, {
            maximumFractionDigits: 0,
          })}
          icon={<TrendingUp className="size-5" />}
        />
        <MetricCard
          title="Active wallets (7d)"
          value={stats.activeWalletsThisWeek.toLocaleString()}
          subtitle="Unique wallets"
          accent="green"
          icon={<Wallet className="size-5" />}
        />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/8 bg-[#1C1C1C] p-5">
          <h2 className="mb-1 text-lg font-semibold text-white">User growth</h2>
          <p className="mb-4 text-xs text-white/45">Daily new users (30d)</p>
          <SimpleLineChart data={userGrowthData} color="#229EDF" height={220} />
        </section>
        <section className="rounded-2xl border border-white/8 bg-[#1C1C1C] p-5">
          <h2 className="mb-1 text-lg font-semibold text-white">
            Daily transactions
          </h2>
          <p className="mb-4 text-xs text-white/45">Count per day (30d)</p>
          <SimpleLineChart data={txData} color="#4ADE80" height={220} />
        </section>
      </div>

      <section className="rounded-2xl border border-white/8 bg-[#1C1C1C] p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Recent activity
        </h2>
        <ActivityTable logs={activity} />
      </section>
    </div>
  );
}
