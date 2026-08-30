# RPC load testing

Measures the RPC gateway against the shared public endpoint the app used
before it, using one scenario both targets run so neither gets an easier
workload than the other.

## Running

```bash
brew install k6                      # once
node scripts/load/generate-fixtures.mjs   # once, or when the catalogue changes
k6 run scripts/load/rpc-baseline.js
k6 run scripts/load/rpc-gateway.js
```

Results land in `scripts/load/results/<target>-<rate>rps.json`.

The gateway target defaults to `http://localhost:3000/api/rpc` — the app's own
route, not the backend directly, because the hop the migration added is the
thing under question. Point it elsewhere with `-e GATEWAY_URL=...`.

## Knobs

| Variable        | Default                          | Meaning                                 |
| --------------- | -------------------------------- | --------------------------------------- |
| `REQ_PER_SEC`   | 9                                | Offered load in RPC requests per second |
| `RAMP` / `HOLD` | 30s / 60s                        | Ramp to the rate, then hold it          |
| `GATEWAY_URL`   | `http://localhost:3000/api/rpc`  | Gateway target                          |
| `BASELINE_URL`  | `https://mainnet.sorobanrpc.com` | Baseline target                         |
| `DEBUG`         | unset                            | Print the first failure of each method  |

Set `DEBUG=1` whenever a run reports failures. Without it you get a failure
rate and no way to find out what failed, which is how a rate-limited run gets
mistaken for a slow one.

## Two ceilings worth knowing before you raise the rate

**The baseline is a shared public endpoint.** It starts returning HTTP 429
(Cloudflare error 1015) somewhere between 5 and 9 requests per second from a
single address. That is a real finding about what the app used to depend on,
but it also means load beyond that measures Cloudflare, and the endpoint is a
free resource the whole ecosystem shares — there is no good reason to lean on
it harder than the measurement needs.

**The gateway rate-limits per IP**, 600 requests a minute. A single-source run
above ten a second measures that throttle rather than the system behind it.
Raising it needs either a temporary limit change or traffic from more than one
address.

The default of 9 sits just under both, which makes it a latency comparison
under steady load rather than a saturation test.

## Fixtures

`generate-fixtures.mjs` builds the request payloads, because k6 runs its own JS
VM and cannot construct Stellar XDR.

Balance reads are built the way the app builds them — a `balance()` call that
gets simulated, not a ledger-entry read (see
`packages/orchestrator/src/stellar/sorobanBalance.ts`). Benchmarking
`getLedgerEntries` for balances would measure a method the app barely uses.

Every envelope is simulated once at generation time and dropped unless it
returns a value. An address holding nothing fails on the missing trustline
before the contract does any real work, so keeping those would quietly measure
an error path and report it as a balance read.

Holders are the vault contracts, which hold the assets and are what the
dashboard reads on every load, plus funded accounts pulled from recent ledger
activity for the native asset.

## Chaos run

Show failover absorbing a dead provider by putting a killable process at
priority 1:

```bash
node /tmp/fake-primary.mjs &          # forwards to a real provider
echo $! > /tmp/proxy.pid
# start the backend with that URL at priority 1 in STELLAR_RPC_ENDPOINTS
k6 run scripts/load/rpc-gateway.js &
sleep 35 && kill -9 "$(cat /tmp/proxy.pid)"
```

Kill it **by the PID you saved**. `lsof -ti :9911` also lists the backend,
which holds a client socket on that port, so piping that into `kill` takes the
backend down with the proxy and the run measures nothing.
