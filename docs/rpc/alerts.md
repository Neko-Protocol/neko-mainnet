# RPC gateway alerts

Four rules. Each one exists because it maps to something a user would feel,
not because the metric was available.

Create them in Grafana under **Alerting → Alert rules**, against the same
Prometheus data source the dashboard uses.

## 1. Success rate below 98%

```promql
sum(rate(neko_rpc_requests_total{outcome=~"ok|cached"}[5m]))
  / clamp_min(sum(rate(neko_rpc_requests_total[5m])), 0.001)
  < 0.98
```

Pending period **5m**. Cached counts as a success — the caller got a correct
answer. `clamp_min` keeps the rule from firing on a division by zero during
quiet periods.

**Means:** calls are failing on every endpoint in the pool. Users are seeing
failed swaps.

## 2. p95 latency above 2s

```promql
histogram_quantile(
  0.95,
  sum by (le) (rate(neko_rpc_request_duration_seconds_bucket[5m]))
) > 2
```

Pending period **5m**.

**Means:** the app feels slow even where it is not erroring. Check the
per-endpoint latency panel — usually one provider is dragging the pool.

## 3. Whole pool down

```promql
sum(neko_rpc_endpoint_up) == 0
```

Pending period **1m** — this one is an outage, not a trend.

**Means:** nothing can reach the network. Every write is failing.

## 4. Ledger lag above 10

```promql
max(neko_rpc_endpoint_ledger_lag) > 10
```

Pending period **5m**.

**Means:** an endpoint is serving stale ledger state. The pool marks it
degraded past 5, so firing at 10 says the problem is persisting rather than a
momentary blip — or that several endpoints are behind at once, which would
point at the network rather than a provider.

## Scaling triggers, not alerts

These are not paging conditions, but they are what the metrics are for.
Review monthly.

| Query                                         | Threshold                              | Action                                                            |
| --------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------- |
| `sum(increase(neko_rpc_requests_total[30d]))` | projected >45M CU/mo                   | Validation Cloud moves to Scale (~$0.50/1M CU)                    |
| `sum(rate(neko_rpc_requests_total[1m]))`      | sustained peak >30 rps                 | Upgrade OnFinality to Growth ($49/mo, 200 rps)                    |
| `sum(rate(neko_rpc_failover_total[1h]))`      | consistently non-zero into the standby | The failover is absorbing real load — pay for it or change vendor |

The first paid upgrade is triggered by the **rps ceiling on the failover**,
not by monthly quota. Watch the second row.
