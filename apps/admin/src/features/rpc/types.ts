export type EndpointState = "up" | "degraded" | "down";

export interface EndpointSnapshot {
  label: string;
  host: string;
  priority: number;
  state: EndpointState;
  latestLedger: number | null;
  ledgerLag: number | null;
  consecutiveFailures: number;
  lastCheckedAt: string | null;
  lastError: string | null;
}

export interface MethodUsage {
  method: string;
  ok: number;
  error: number;
  successRate: number | null;
}

export interface EndpointUsage {
  endpoint: string;
  ok: number;
  error: number;
}

export interface CacheUsage {
  method: string;
  hit: number;
  miss: number;
  hitRate: number | null;
}

export interface FailoverEvent {
  from: string;
  to: string;
  reason: string;
  count: number;
}

export interface RpcOverview {
  endpoints: EndpointSnapshot[];
  usableCount: number;
  byMethod: MethodUsage[];
  byEndpoint: EndpointUsage[];
  cache: CacheUsage[];
  failovers: FailoverEvent[];
  totals: { ok: number; error: number; successRate: number | null };
  collectedAt: string;
}
