"use client";

import { useState } from "react";
import { useMetricsHistory } from "../hooks/useMetricsHistory";
import type { RangeKey } from "../history-actions";
import type { Environment } from "../grafana";
import { MetricChart } from "./MetricChart";

const RANGES: RangeKey[] = ["1h", "6h", "24h", "7d"];
const ENVIRONMENTS: Environment[] = ["production", "staging"];

function Toggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-white/10 bg-[#1C1C1C] p-0.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            o === value
              ? "bg-white/10 text-white"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function MetricsHistory() {
  const [environment, setEnvironment] = useState<Environment>("production");
  const [range, setRange] = useState<RangeKey>("24h");
  const { data, isLoading, error } = useMetricsHistory(environment, range);

  if (data && !data.configured) {
    return (
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white/70">History</h2>
        <div className="rounded-2xl border border-white/5 bg-[#1C1C1C] p-5 text-sm text-white/40">
          Set <code className="text-white/70">GRAFANA_PROM_URL</code>,{" "}
          <code className="text-white/70">GRAFANA_PROM_USER</code> and{" "}
          <code className="text-white/70">GRAFANA_PROM_TOKEN</code> to chart
          history here. The live counters above do not need them.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-white/70">History</h2>
        <div className="flex flex-wrap gap-2">
          <Toggle
            options={ENVIRONMENTS}
            value={environment}
            onChange={setEnvironment}
          />
          <Toggle options={RANGES} value={range} onChange={setRange} />
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-400">
          Could not reach Grafana for history. The live counters above are
          unaffected.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <MetricChart
            title="RPC requests per second"
            series={data?.requestRate ?? []}
            format="rate"
            isLoading={isLoading}
          />
          <MetricChart
            title="Success rate"
            series={data?.successRate ?? []}
            format="percent"
            isLoading={isLoading}
            domain={[0, 1]}
          />
          <MetricChart
            title="Latency p95"
            series={data?.latencyP95 ?? []}
            format="seconds"
            isLoading={isLoading}
          />
          <MetricChart
            title="Cache hit rate"
            series={data?.cacheHitRate ?? []}
            format="percent"
            isLoading={isLoading}
            domain={[0, 1]}
          />
          <MetricChart
            title="Endpoints up"
            series={data?.endpointsUp ?? []}
            format="count"
            isLoading={isLoading}
          />
        </div>
      )}
    </section>
  );
}
