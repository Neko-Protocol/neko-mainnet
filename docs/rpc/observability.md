# RPC gateway observability

## What the backend exposes

`GET /metrics` returns Prometheus text. It sits outside the internal-key
guard, because Grafana scrapes it directly rather than through the web-app
proxy, and carries its own bearer token instead:

```bash
curl -H "Authorization: Bearer $METRICS_SCRAPE_TOKEN" \
  https://<backend-host>/metrics
```

With `METRICS_SCRAPE_TOKEN` unset the endpoint refuses everything. It fails
closed on purpose: the exposition leaks traffic shape, method mix and
upstream endpoint names, so forgetting to configure it must not publish it.

## Metrics

| Metric                              | Type      | Labels                          |
| ----------------------------------- | --------- | ------------------------------- |
| `neko_rpc_request_duration_seconds` | histogram | `method`, `endpoint`, `outcome` |
| `neko_rpc_requests_total`           | counter   | `method`, `endpoint`, `outcome` |
| `neko_rpc_failover_total`           | counter   | `from`, `to`, `reason`          |
| `neko_rpc_cache_total`              | counter   | `method`, `result`              |
| `neko_rpc_endpoint_up`              | gauge     | `endpoint`, `state`             |
| `neko_rpc_endpoint_ledger_lag`      | gauge     | `endpoint`                      |
| `neko_tx_submissions_total`         | counter   | `outcome`                       |

Two label conventions worth knowing:

**`outcome="cached"` is separate from `"ok"`.** Folding them together would
make the cache look like it improved upstream latency when it actually
avoided the call. Any panel measuring real provider latency filters to
`outcome="ok"`.

**`neko_rpc_endpoint_up` is 1 for a degraded endpoint.** Degraded means stale
but still serving, last in line — not out of rotation. The `state` label
carries the distinction the gauge alone cannot.

Cardinality is roughly 7 metrics × ~10 methods × 4 endpoints × 3 outcomes,
i.e. a few hundred series — far inside Grafana Cloud's 10k free-tier limit.

## Setting up Grafana Cloud

1. Create a free Grafana Cloud stack.
2. **Connections → Add new connection → Hosted Prometheus metrics →
   Scrape a target.** The Railway URL is publicly reachable, so no agent or
   sidecar is needed.
3. Target `https://<backend-host>/metrics`, auth **Bearer**, token
   `METRICS_SCRAPE_TOKEN`. Scrape interval 30s or 60s.
4. **Dashboards → Import** and upload `grafana-dashboard.json` from this
   directory, selecting the Prometheus data source when prompted.
5. Create the four rules in `alerts.md`.

## Generating the token

```bash
openssl rand -hex 32
```

Set the same value on the backend (`METRICS_SCRAPE_TOKEN`) and in the Grafana
scrape job.

## No lock-in

`/metrics` is the Prometheus exposition format — an open standard, not a
Grafana format. The same endpoint is readable by self-hosted Grafana, by any
other Prometheus-compatible backend, or by a custom page in `apps/admin`.
Nothing here commits us to a vendor.
