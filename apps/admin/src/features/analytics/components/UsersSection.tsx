"use client";

import { Mail, RefreshCw, Users, Wallet } from "lucide-react";
import { useUserStats } from "../hooks/useUserStats";
import { AnalyticsErrorState } from "./AnalyticsErrorState";
import { StatCard } from "./StatCard";

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}% of users`;
}

export function UsersSection() {
  const { data, isPending, isError } = useUserStats();

  if (isError) {
    return (
      <section>
        <h2 className="mb-3 text-xl font-bold text-white">Users</h2>
        <AnalyticsErrorState />
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-3 text-xl font-bold text-white">Users</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Total users"
          value={(data?.totalUsers ?? 0).toLocaleString()}
          isLoading={isPending}
          info="Row count in the `users` table for mainnet — one row per wallet that has ever connected to the app."
        />
        <StatCard
          icon={<Mail className="h-5 w-5" />}
          label="Email confirmed"
          value={(data?.emailConfirmed ?? 0).toLocaleString()}
          subValue={pct(data?.emailConfirmedPct ?? 0)}
          isLoading={isPending}
          info="Users with `email_verified_at` set — they completed the email magic-link verification flow."
        />
        <StatCard
          icon={<Wallet className="h-5 w-5" />}
          label="Invested (vaults)"
          value={(data?.investedCount ?? 0).toLocaleString()}
          subValue={pct(data?.investedPct ?? 0)}
          isLoading={isPending}
          info="Wallets with at least one 'vaults_deposit' entry in audit_logs. Vault deposits only — does not include swaps, Blend/Aqua pool activity, or on/off-ramp usage."
        />
        <StatCard
          icon={<RefreshCw className="h-5 w-5" />}
          label="Re-invested (vaults)"
          value={(data?.reinvestedCount ?? 0).toLocaleString()}
          subValue={pct(data?.reinvestedPct ?? 0)}
          isLoading={isPending}
          info="Wallets with 2 or more 'vaults_deposit' entries — came back and deposited into a vault again after their first time."
        />
      </div>
    </section>
  );
}
