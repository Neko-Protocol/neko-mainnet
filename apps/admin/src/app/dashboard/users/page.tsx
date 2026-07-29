import { MailCheck, PiggyBank, UsersRound } from "lucide-react";
import {
  getDailyNewUsers,
  getCurrencyDistribution,
  getEmailVerificationStats,
  getOverviewStats,
  getWalletProviderBreakdown,
} from "@/lib/queries";
import { MetricCard } from "@/components/MetricCard";
import { SimpleLineChart } from "@/components/charts/SimpleLineChart";
import { SimpleDonutChart } from "@/components/charts/SimpleDonutChart";

export default async function DashboardUsersPage() {
  const [overview, dailyUsers, providers, currencies, emailStats] =
    await Promise.all([
      getOverviewStats(),
      getDailyNewUsers(30),
      getWalletProviderBreakdown(),
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
    <div className="admin-page">
      <header className="mb-8">
        <h1 className="font-klein text-3xl text-admin-text text-balance">
          Users
        </h1>
        <p className="text-sm text-admin-muted">Acquisition and preferences</p>
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
          accent="subtle"
          icon={<MailCheck className="size-5" />}
        />
        <MetricCard
          title="Most popular wallet"
          value={providerLabel}
          subtitle={providerSub}
          icon={<PiggyBank className="size-5" />}
        />
      </div>

      <section className="mb-8 rounded-xl border border-admin-border bg-admin-surface p-5">
        <h2 className="mb-1 text-lg font-semibold text-white">
          User growth (30d)
        </h2>
        <p className="mb-4 text-xs text-admin-subtle">
          Users who joined per day from Supabase signup timestamps
        </p>
        <SimpleLineChart data={userGrowthData} height={240} />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-admin-border bg-admin-surface p-5">
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
        <section className="rounded-xl border border-admin-border bg-admin-surface p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Email verification
          </h2>
          <SimpleDonutChart
            height={220}
            data={[
              { label: "Verified", value: emailStats.verifiedCount },
              {
                label: "Unverified",
                value: emailStats.totalCount - emailStats.verifiedCount,
              },
            ]}
          />
        </section>
        <section className="rounded-xl border border-admin-border bg-admin-surface p-5">
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
