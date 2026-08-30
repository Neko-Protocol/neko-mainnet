import type { EndpointSnapshot, EndpointState } from "../types";

const STATE_STYLES: Record<EndpointState, { dot: string; label: string }> = {
  up: { dot: "bg-emerald-400", label: "text-emerald-400" },
  degraded: { dot: "bg-amber-400", label: "text-amber-400" },
  down: { dot: "bg-red-400", label: "text-red-400" },
};

/**
 * `degraded` is not a lesser kind of `down`: the endpoint answers, its ledger
 * just trails the pool, so it is used only after every healthy one. Worth
 * showing distinctly — reading it as an outage sends people looking for the
 * wrong problem.
 */
function StateBadge({ state }: { state: EndpointState }) {
  const s = STATE_STYLES[state];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      <span className={`text-xs font-medium ${s.label}`}>{state}</span>
    </span>
  );
}

export function EndpointPoolTable({
  endpoints,
  isLoading,
}: {
  endpoints: EndpointSnapshot[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/5 bg-[#1C1C1C] p-5">
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#1C1C1C]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/5 text-xs text-white/40">
              <th className="px-5 py-3 font-medium">Endpoint</th>
              <th className="px-5 py-3 font-medium">Priority</th>
              <th className="px-5 py-3 font-medium">State</th>
              <th className="px-5 py-3 font-medium">Ledger lag</th>
              <th className="px-5 py-3 font-medium">Failures</th>
            </tr>
          </thead>
          <tbody>
            {endpoints.map((e) => (
              <tr
                key={e.label}
                className="border-b border-white/5 last:border-0"
              >
                <td className="px-5 py-3">
                  <div className="font-medium text-white">{e.label}</div>
                  <div className="text-xs text-white/35">{e.host}</div>
                  {e.lastError && (
                    <div
                      className="mt-1 max-w-xs truncate text-xs text-red-400/70"
                      title={e.lastError}
                    >
                      {e.lastError}
                    </div>
                  )}
                </td>
                <td className="px-5 py-3 text-white/50">p{e.priority}</td>
                <td className="px-5 py-3">
                  <StateBadge state={e.state} />
                </td>
                <td className="px-5 py-3 text-white/70">
                  {e.ledgerLag === null ? "—" : e.ledgerLag}
                </td>
                <td className="px-5 py-3 text-white/70">
                  {e.consecutiveFailures || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
