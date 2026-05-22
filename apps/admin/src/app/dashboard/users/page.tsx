import { MailCheck, PiggyBank, UsersRound } from "lucide-react";
import {
  getDailyNewUsers,
  getCurrencyDistribution,
  getEmailVerificationStats,
  getNetworkBreakdown,
  getOverviewStats,
  getWalletProviderBreakdown,
} from "@/lib/queries";
import { MetricCard } from "@/components/MetricCard";
import { SimpleLineChart } from "@/components/charts/SimpleLineChart";
import { SimpleDonutChart } from "@/components/charts/SimpleDonutChart";

export default async function DashboardUsersPage() {
  const [overview, dailyUsers, providers, networks, currencies, emailStats] =
    await Promise.all([
      getOverviewStats(),
      getDailyNewUsers(30),
      getWalletProviderBreakdown(),
      getNetworkBreakdown(),
      getCurrencyDistribution(),
      getEmailVerificationStats(),
    ]);

  const userGrowthData = dailyUsers.map((d) => ({
    date: d.date,
    value: d.count,
  }));

  const emailPct =
    emailStats.totalCount > 0
      ? Math.round((emailStats.verifiedCount / emailStats.totalCount) * 1000) /
        10
      : 0;

  const topProv = providers[0];
  const providerLabel =
    topProv?.provider?.length && topProv.provider !== "unknown"
      ? topProv.provider
      : "No data";
  const providerSub = topProv
    ? `${topProv.count.toLocaleString()} wallets`
    : undefined;

  return (
    <div className="p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Users</h1>
        <p className="text-sm text-white/50">Acquisition and preferences</p>
      </header>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Total users"
          value={overview.totalUsers.toLocaleString()}
          accent="blue"
          icon={<UsersRound className="size-5" />}
        />
        <MetricCard
          title="Email verified"
          value={`${emailPct}%`}
          subtitle={`${emailStats.verifiedCount.toLocaleString()} of ${emailStats.totalCount.toLocaleString()}`}
          accent="green"
          icon={<MailCheck className="size-5" />}
        />
        <MetricCard
          title="Most popular wallet"
          value={providerLabel}
          subtitle={providerSub}
          icon={<PiggyBank className="size-5" />}
        />
      </div>

      <section className="mb-8 rounded-2xl border border-white/8 bg-[#1C1C1C] p-5">
        <h2 className="mb-1 text-lg font-semibold text-white">
          User growth (30d)
        </h2>
        <p className="mb-4 text-xs text-white/45">
          Users who joined per day from Supabase signup timestamps
        </p>
        <SimpleLineChart data={userGrowthData} height={240} />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-white/8 bg-[#1C1C1C] p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Wallet providers
          </h2>
          <SimpleDonutChart
            height={220}
            data={providers.map((r) => ({
              label: r.provider,
              value: r.count,
            }))}
          />
        </section>
        <section className="rounded-2xl border border-white/8 bg-[#1C1C1C] p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Networks</h2>
          <SimpleDonutChart
            height={220}
            data={networks.map((r) => ({
              label: r.network,
              value: r.count,
            }))}
          />
        </section>
        <section className="rounded-2xl border border-white/8 bg-[#1C1C1C] p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Currency preference
          </h2>
          <SimpleDonutChart
            height={220}
            data={currencies.map((r) => ({
              label: r.currency,
              value: r.count,
            }))}
          />
        </section>
      </div>
    </div>
  );
}
