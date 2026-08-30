/**
 * Baseline: the shared public endpoint the app used before the gateway.
 *
 * This is the "before" half of the comparison. It is a free resource the whole
 * Stellar ecosystem shares, so the default offered load in scenario.js is kept
 * modest on purpose — enough for stable percentiles, not enough to be a burden
 * on anyone else.
 *
 *   k6 run scripts/load/rpc-baseline.js
 */
import { runScenario, options } from "./scenario.js";

export { options };

const URL = __ENV.BASELINE_URL || "https://mainnet.sorobanrpc.com";

export default function () {
  runScenario({
    url: URL,
    headers: { "Content-Type": "application/json" },
  });
}

export function handleSummary(data) {
  return {
    [`scripts/load/results/baseline-${__ENV.REQ_PER_SEC || 9}rps.json`]:
      JSON.stringify(data, null, 2),
    stdout: `\nbaseline: ${URL}\n`,
  };
}
