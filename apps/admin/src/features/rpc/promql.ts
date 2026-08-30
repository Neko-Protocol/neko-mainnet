/**
 * Shaping for Prometheus range responses.
 *
 * Deliberately free of credentials and of `server-only`, so it can be unit
 * tested — the module that holds the token cannot be imported outside a server
 * component, which is correct and also makes it untestable.
 */

export type Environment = "production" | "staging";

export interface Point {
  t: number;
  /** null where Prometheus returned NaN — no traffic, not zero. */
  v: number | null;
}

export interface Series {
  key: string;
  points: Point[];
}

export interface RawResult {
  metric: Record<string, string>;
  values: [number, string][];
}

/**
 * `NaN` becomes null rather than 0.
 *
 * Prometheus returns it for an empty division — no traffic in the window — and
 * plotting that as zero draws a success-rate collapse where nothing was
 * happening. `+Inf` gets the same treatment: a quantile over an empty
 * histogram is unknown, not enormous.
 */
export function toSeries(
  result: RawResult[] | undefined,
  label?: string
): Series[] {
  return (result ?? []).map((r, i) => ({
    key: label ?? firstLabelValue(r.metric) ?? `series-${i}`,
    points: r.values.map(([t, v]) => ({
      t: t * 1000,
      v: v === "NaN" || v === "+Inf" || v === "-Inf" ? null : Number(v),
    })),
  }));
}

function firstLabelValue(metric: Record<string, string>): string | undefined {
  for (const [k, v] of Object.entries(metric)) {
    if (k !== "__name__") return v;
  }
  return undefined;
}

/** Scrape jobs are named by the Grafana Cloud integration, one per deployment. */
export function jobFor(environment: string, instanceId: string): string {
  return `integrations/metrics_endpoint/${instanceId}-metrics-endpoint-neko-backend-${environment}`;
}
