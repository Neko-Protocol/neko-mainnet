import "server-only";

import {
  jobFor,
  toSeries,
  type Environment,
  type RawResult,
  type Series,
} from "./promql";

/**
 * Reads history from Grafana Cloud's Prometheus query API.
 *
 * The dashboard's data without the dashboard: the panels are ours, the series
 * come from the same store Grafana charts, and nothing has to be made publicly
 * readable for the admin to show it.
 *
 * Basic auth, username is the metrics instance id — server-only, the token
 * must never reach the browser.
 */

export type { Environment, Point, Series } from "./promql";

export class GrafanaNotConfiguredError extends Error {
  constructor() {
    super("Grafana query credentials are not configured.");
    this.name = "GrafanaNotConfiguredError";
  }
}

function credentials() {
  const url = process.env.GRAFANA_PROM_URL;
  const user = process.env.GRAFANA_PROM_USER;
  const token = process.env.GRAFANA_PROM_TOKEN;
  if (!url || !user || !token) throw new GrafanaNotConfiguredError();
  return { url: url.replace(/\/+$/, ""), user, token };
}

/**
 * Runs a PromQL range query and returns one series per result.
 *
 * `NaN` becomes null rather than 0. Prometheus returns it for an empty
 * division — no traffic in the window — and plotting that as zero would draw a
 * success-rate collapse where there was simply nothing happening.
 */
export async function queryRange(
  expr: string,
  { minutes, step, label }: { minutes: number; step: number; label?: string }
): Promise<Series[]> {
  const { url, user, token } = credentials();
  const end = Math.floor(Date.now() / 1000);
  const params = new URLSearchParams({
    query: expr,
    start: String(end - minutes * 60),
    end: String(end),
    step: String(step),
  });

  const res = await fetch(`${url}/api/v1/query_range?${params}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${user}:${token}`).toString("base64")}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Grafana query failed with ${res.status}`);
  }

  const body = (await res.json()) as { data?: { result?: RawResult[] } };
  return toSeries(body.data?.result, label);
}

export function selector(environment: Environment): string {
  const { user } = credentials();
  return `job="${jobFor(environment, user)}"`;
}

export function isConfigured(): boolean {
  return Boolean(
    process.env.GRAFANA_PROM_URL &&
    process.env.GRAFANA_PROM_USER &&
    process.env.GRAFANA_PROM_TOKEN
  );
}
