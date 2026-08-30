"use server";

import {
  GrafanaNotConfiguredError,
  isConfigured,
  queryRange,
  selector,
  type Environment,
  type Series,
} from "./grafana";

export type RangeKey = "1h" | "6h" | "24h" | "7d";

/**
 * Step is chosen so a range yields roughly 100-300 points: enough to see shape,
 * few enough to keep the payload small and the chart readable.
 */
const RANGES: Record<RangeKey, { minutes: number; step: number }> = {
  "1h": { minutes: 60, step: 30 },
  "6h": { minutes: 360, step: 120 },
  "24h": { minutes: 1_440, step: 300 },
  "7d": { minutes: 10_080, step: 1_800 },
};

export interface MetricsHistory {
  configured: boolean;
  requestRate: Series[];
  successRate: Series[];
  latencyP95: Series[];
  cacheHitRate: Series[];
  endpointsUp: Series[];
}

const EMPTY: MetricsHistory = {
  configured: false,
  requestRate: [],
  successRate: [],
  latencyP95: [],
  cacheHitRate: [],
  endpointsUp: [],
};

export async function fetchMetricsHistory(
  environment: Environment,
  range: RangeKey
): Promise<MetricsHistory> {
  if (!isConfigured()) return EMPTY;

  const { minutes, step } = RANGES[range];
  const sel = selector(environment);
  // The rate window has to cover several scrape intervals or every point is
  // empty; 5m is comfortable against a 60s scrape.
  const w = "5m";
  const run = (expr: string, label: string) =>
    queryRange(expr, { minutes, step, label });

  try {
    const [requestRate, successRate, latencyP95, cacheHitRate, endpointsUp] =
      await Promise.all([
        queryRange(
          `sum by (outcome) (rate(neko_rpc_requests_total{${sel}}[${w}]))`,
          { minutes, step }
        ),
        // `or on() vector(0)` keeps the numerator defined when no successes
        // were recorded, so the result is 0% rather than absent. The
        // denominator is left alone on purpose: with no traffic at all the
        // division is empty and the point is genuinely unknown.
        run(
          `(sum(rate(neko_rpc_requests_total{${sel},outcome="ok"}[${w}])) or on() vector(0)) / sum(rate(neko_rpc_requests_total{${sel}}[${w}]))`,
          "success"
        ),
        run(
          `histogram_quantile(0.95, sum by (le) (rate(neko_rpc_request_duration_seconds_bucket{${sel}}[${w}])))`,
          "p95"
        ),
        run(
          `(sum(rate(neko_rpc_cache_total{${sel},result="hit"}[${w}])) or on() vector(0)) / sum(rate(neko_rpc_cache_total{${sel}}[${w}]))`,
          "hit rate"
        ),
        run(`sum(neko_rpc_endpoint_up{${sel},state="up"})`, "up"),
      ]);

    return {
      configured: true,
      requestRate,
      successRate,
      latencyP95,
      cacheHitRate,
      endpointsUp,
    };
  } catch (err) {
    if (err instanceof GrafanaNotConfiguredError) return EMPTY;
    throw err;
  }
}
