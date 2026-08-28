"use client";

import { DollarSign, Repeat, TrendingUp } from "lucide-react";
import { formatCompactCurrency } from "@/lib/helpers/currency";
import { useOverview } from "../hooks/useOverview";
import { AnalyticsErrorState } from "./AnalyticsErrorState";
import { StatCard } from "./StatCard";

export function OverviewSection() {
  const { data, isPending, isError } = useOverview();

  if (isError) {
    return (
      <section>
        <h2 className="mb-3 text-xl font-bold text-white">Overview</h2>
        <AnalyticsErrorState />
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-3 text-xl font-bold text-white">Overview</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="TVL"
          value={formatCompactCurrency(data?.tvlUsd ?? 0)}
          isLoading={isPending}
          info="Live on-chain balance across Neko's 5 DeFindex vaults (EURC, USDC, CETES, USTRY, TESOURO), converted to USD at current prices. Does not include Blend/Aqua pool TVL."
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Volume"
          value={formatCompactCurrency(data?.volumeUsd ?? 0)}
          isLoading={isPending}
          info="Sum of amount_in (falling back to amount_out) for vault deposits + swaps only in audit_logs. Does not include withdrawals, claims, lending, or on/off-ramp activity. All-time, mainnet only."
        />
        <StatCard
          icon={<Repeat className="h-5 w-5" />}
          label="Swaps"
          value={formatCompactCurrency(data?.swapsVolumeUsd ?? 0)}
          subValue={`${(data?.swapsCount ?? 0).toLocaleString()} swaps`}
          isLoading={isPending}
          info="Volume: sum of amount_in (falling back to amount_out) for audit_logs rows with action_type = 'swap'. Count below is the number of swap rows."
        />
      </div>
    </section>
  );
}
