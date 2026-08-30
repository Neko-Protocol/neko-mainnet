/**
 * The one scenario both targets run.
 *
 * Baseline and gateway import this file, so neither can drift into an easier
 * workload than the other — which is the only thing that makes a before/after
 * comparison worth reading.
 *
 * Load is expressed as an arrival rate rather than a number of virtual users.
 * With VUs, a slower target issues fewer requests, so each side ends up
 * measured under a different offered load and the comparison quietly stops
 * being one. A fixed rate holds the demand constant and lets latency move.
 */
import http from "k6/http";
import { check } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";
import { SharedArray } from "k6/data";

const fixtures = new SharedArray("fixtures", () =>
  JSON.parse(open("./fixtures.json")).simulate.length
    ? [JSON.parse(open("./fixtures.json"))]
    : []
)[0];

/** Requests one pass makes. Keep in step with runScenario below. */
export const CALLS_PER_ITERATION = 6;

/**
 * Offered load, in RPC requests per second.
 *
 * The default sits below two ceilings on purpose. The baseline target is a
 * free endpoint the whole Stellar ecosystem shares, and hammering it to
 * produce a number for ourselves is not a reasonable thing to do. The gateway
 * enforces a per-IP limit of 600 requests a minute, so a single-source run
 * above ten a second measures that throttle instead of the system behind it —
 * correct behaviour, but not what this comparison is for.
 *
 * The consequence is worth stating rather than hiding: this is a latency
 * comparison under light, steady load, not a saturation test. Finding the
 * ceiling needs either a raised limit or traffic from more than one address.
 * Override with `-e REQ_PER_SEC=40` when that is the goal.
 */
const REQ_PER_SEC = Number(__ENV.REQ_PER_SEC || 9);

// k6 wants an integer arrival target, and the useful rates here divide into
// fractions per second — so the rate is expressed per minute instead.
const ITERS_PER_MIN = Math.max(
  1,
  Math.round((REQ_PER_SEC * 60) / CALLS_PER_ITERATION)
);
const RAMP = __ENV.RAMP || "30s";
const HOLD = __ENV.HOLD || "60s";

export const options = {
  scenarios: {
    rpc: {
      executor: "ramping-arrival-rate",
      startRate: Math.max(1, Math.round(ITERS_PER_MIN / 10)),
      timeUnit: "1m",
      preAllocatedVUs: 20,
      maxVUs: 60,
      stages: [
        { target: ITERS_PER_MIN, duration: RAMP },
        { target: ITERS_PER_MIN, duration: HOLD },
        { target: 0, duration: "15s" },
      ],
    },
  },
  // p99 is not in k6's default set, and it is the number that shows whether a
  // slow tail exists at all.
  summaryTrendStats: ["min", "med", "p(95)", "p(99)", "max", "avg"],
  thresholds: {
    // Deliberately loose: this run is here to produce numbers, not to gate a
    // build. A hard failure would stop the comparison halfway.
    http_req_failed: ["rate<0.5"],
  },
};

const latency = {
  simulateTransaction: new Trend("rpc_simulate_ms", true),
  getLedgerEntries: new Trend("rpc_ledger_entries_ms", true),
  getTransaction: new Trend("rpc_get_transaction_ms", true),
  getLatestLedger: new Trend("rpc_latest_ledger_ms", true),
};
const rpcErrors = new Counter("rpc_error_responses");
const rpcOk = new Rate("rpc_success_rate");

const reported = {};

function pick(list, offset) {
  return list[(__ITER + offset) % list.length];
}

function call(target, method, params) {
  const payload = JSON.stringify({ jsonrpc: "2.0", id: 1, method, params });
  const res = http.post(target.url, payload, {
    headers: target.headers,
    tags: { method },
  });

  latency[method].add(res.timings.duration);

  // A JSON-RPC error arrives with HTTP 200, so counting status codes alone
  // would report a broken run as a clean one.
  let ok = res.status === 200;
  if (ok) {
    try {
      ok = !JSON.parse(res.body).error;
    } catch (_) {
      ok = false;
    }
  }
  if (!ok) {
    rpcErrors.add(1, { method });
    // `-e DEBUG=1` prints the first failure of each method. Without it a run
    // reports a failure rate and no way to find out what the failure was.
    if (__ENV.DEBUG && !reported[method]) {
      reported[method] = true;
      console.log(
        `${method} failed: status=${res.status} err=${res.error_code} ` +
          `body=${String(res.body).slice(0, 200)}`
      );
    }
  }
  rpcOk.add(ok, { method });

  check(res, { [`${method} answered`]: () => ok });
  return res;
}

/**
 * One pass models what a session does in a minute: mostly balance reads, which
 * the app performs by simulating a `balance()` call rather than reading a
 * ledger entry, plus shared state and a status poll.
 */
export function runScenario(target) {
  const shared = fixtures.simulate.filter((s) => s.shared);
  const wallet = fixtures.simulate.filter((s) => !s.shared);

  // Shared state: every visitor reads the same thing, so one cache entry
  // serves all of them. Two thirds of the simulate load, matching a dashboard
  // where vault cards outnumber the viewer's own holdings.
  call(target, "simulateTransaction", {
    transaction: pick(shared, 0).envelope,
  });
  call(target, "simulateTransaction", {
    transaction: pick(shared, 1).envelope,
  });

  // Per-wallet: distinct per user, and the part a cache cannot collapse.
  call(target, "simulateTransaction", {
    transaction: pick(wallet, 0).envelope,
  });

  call(target, "getLedgerEntries", { keys: [pick(fixtures.ledgerKeys, 0)] });
  call(target, "getTransaction", { hash: pick(fixtures.txHashes, 0) });
  call(target, "getLatestLedger", null);
}
