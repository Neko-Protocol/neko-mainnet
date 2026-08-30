"use client";

import { Activity, Database, Server, Shuffle } from "lucide-react";
import { StatCard } from "@/features/analytics/components/StatCard";
import { AnalyticsErrorState } from "@/features/analytics/components/AnalyticsErrorState";
import { useInfrastructure } from "../hooks/useInfrastructure";
import { EndpointPoolTable } from "./EndpointPoolTable";
import { UsageTable } from "./UsageTable";

/**
 * A missing rate is not zero. No traffic in the window means we cannot say
 * anything about success, and printing "0%" would read as an outage — the same
 * mistake that once made the Grafana alert fire on an idle backend.
 */
function percent(value: number | null | undefined): string {
  return value === null || value === undefined
    ? "—"
    : `${(value * 100).toFixed(1)}%`;
}

function count(n: number): string {
  return n.toLocaleString("en-US");
}

export function InfrastructureSection() {
  const { data, isLoading, error } = useInfrastructure();

  if (error) {
    return (
      <AnalyticsErrorState message="Could not load infrastructure metrics." />
    );
  }

  const totals = data?.totals;
  const cacheTotals = (data?.cache ?? []).reduce(
    (acc, c) => ({ hit: acc.hit + c.hit, miss: acc.miss + c.miss }),
    { hit: 0, miss: 0 }
  );
  const cacheRate =
    cacheTotals.hit + cacheTotals.miss > 0
      ? cacheTotals.hit / (cacheTotals.hit + cacheTotals.miss)
      : null;
  const failoverTotal = (data?.failovers ?? []).reduce(
    (n, f) => n + f.count,
    0
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Server className="h-4 w-4" />}
          label="Endpoints usable"
          value={data ? `${data.usableCount} / ${data.endpoints.length}` : "—"}
          subValue="Anything not down can serve traffic"
          isLoading={isLoading}
          info="A degraded endpoint still answers — its ledger just trails the pool, so it is only used once every healthy one is exhausted."
        />
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label="RPC success rate"
          value={percent(totals?.successRate)}
          subValue={
            totals
              ? `${count(totals.ok)} ok · ${count(totals.error)} error`
              : undefined
          }
          isLoading={isLoading}
          info="Counted since the backend last restarted, across every method and endpoint."
        />
        <StatCard
          icon={<Database className="h-4 w-4" />}
          label="Cache hit rate"
          value={percent(cacheRate)}
          subValue={`${count(cacheTotals.hit)} hits · ${count(cacheTotals.miss)} misses`}
          isLoading={isLoading}
          info="Only cacheable methods count. getLedgerEntries and getTransaction are never cached — the SDK's parser for those responses is not exported, and caching what we cannot faithfully rebuild corrupts data."
        />
        <StatCard
          icon={<Shuffle className="h-4 w-4" />}
          label="Failovers"
          value={count(failoverTotal)}
          subValue="Times the pool rerouted a call"
          isLoading={isLoading}
          info="A failover is the pool working, not an incident. It only matters as a trend."
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white/70">Endpoint pool</h2>
        <EndpointPoolTable
          endpoints={data?.endpoints ?? []}
          isLoading={isLoading}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white/70">By method</h2>
          <UsageTable
            headers={["Method", "OK", "Error", "Success"]}
            rows={(data?.byMethod ?? []).map((m) => ({
              key: m.method,
              primary: m.method,
              columns: [count(m.ok), count(m.error), percent(m.successRate)],
            }))}
            empty="No RPC calls recorded yet."
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white/70">
            Cache by method
          </h2>
          <UsageTable
            headers={["Method", "Hits", "Misses", "Hit rate"]}
            rows={(data?.cache ?? []).map((c) => ({
              key: c.method,
              primary: c.method,
              columns: [count(c.hit), count(c.miss), percent(c.hitRate)],
            }))}
            empty="Nothing cached yet."
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white/70">By endpoint</h2>
          <UsageTable
            headers={["Endpoint", "OK", "Error"]}
            rows={(data?.byEndpoint ?? []).map((e) => ({
              key: e.endpoint,
              primary: e.endpoint,
              columns: [count(e.ok), count(e.error)],
            }))}
            empty="No traffic recorded yet."
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white/70">Failovers</h2>
          <UsageTable
            headers={["From → to", "Reason", "Count"]}
            rows={(data?.failovers ?? []).map((f, i) => ({
              key: `${f.from}-${f.to}-${f.reason}-${i}`,
              primary: `${f.from} → ${f.to}`,
              columns: [f.reason, count(f.count)],
            }))}
            empty="No failovers — the primary has served every call."
          />
        </section>
      </div>

      {data && (
        <p className="text-xs text-white/30">
          Counters reset when the backend restarts. For history and alerting,
          see the Grafana dashboard.
        </p>
      )}
    </div>
  );
}
