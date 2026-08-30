/**
 * Gateway: the path a browser actually takes now.
 *
 * Targets the app's own `/api/rpc` rather than the backend directly, because
 * the hop the migration added is the thing under question. Measuring the
 * backend alone would quietly drop the Next route from the comparison and
 * flatter the result.
 *
 *   k6 run scripts/load/rpc-gateway.js
 *   k6 run -e GATEWAY_URL=https://staging.example/api/rpc scripts/load/rpc-gateway.js
 */
import { runScenario, options } from "./scenario.js";

export { options };

const URL = __ENV.GATEWAY_URL || "http://localhost:3000/api/rpc";

/**
 * The route only accepts requests from the app's own origin. k6 is not a
 * browser, so it states one explicitly, derived from the target.
 */
function originOf(u) {
  const m = /^(https?:\/\/[^/]+)/.exec(u);
  return m ? m[1] : "http://localhost:3000";
}
const ORIGIN = __ENV.ORIGIN || originOf(URL);

export default function () {
  runScenario({
    url: URL,
    headers: { "Content-Type": "application/json", Origin: ORIGIN },
  });
}

export function handleSummary(data) {
  return {
    [`scripts/load/results/gateway-${__ENV.REQ_PER_SEC || 9}rps.json`]:
      JSON.stringify(data, null, 2),
    stdout: `\ngateway: ${URL}\n`,
  };
}
