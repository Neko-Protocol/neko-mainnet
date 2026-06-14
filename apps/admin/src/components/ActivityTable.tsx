"use client";

import type { AuditLog } from "@/types/audit";

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return "—";
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function truncateWallet(addr: string): string {
  if (!addr || addr.length < 12) return addr || "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatTokenAmount(n: number): string {
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(6);
}

function badgeClass(actionType: string): string {
  if (actionType === "swap") {
    return "bg-[#229EDF]/18 text-[#229EDF] border-[#229EDF]/35";
  }
  if (actionType.endsWith("_deposit") || actionType === "on_ramp") {
    return "bg-[#4ADE80]/14 text-[#4ADE80] border-[#4ADE80]/30";
  }
  if (actionType.endsWith("_withdraw") || actionType === "off_ramp") {
    return "bg-red-400/14 text-red-300 border-red-400/35";
  }
  return "bg-white/8 text-white/70 border-white/15";
}

function isPositiveNumber(n: number | null): n is number {
  return n != null && Number.isFinite(n) && n > 0;
}

function AmountCell({ log }: { log: AuditLog }) {
  if (isPositiveNumber(log.amount_in)) {
    return (
      <td className="whitespace-nowrap px-3 py-2 font-medium text-[#4ADE80]">
        ${log.amount_in.toFixed(2)}
      </td>
    );
  }
  if (isPositiveNumber(log.token_amount_in)) {
    return (
      <td className="whitespace-nowrap px-3 py-2 text-white/70">
        {formatTokenAmount(log.token_amount_in)} {log.asset_in ?? ""}
      </td>
    );
  }
  if (isPositiveNumber(log.amount_out)) {
    return (
      <td className="whitespace-nowrap px-3 py-2 text-white/70">
        {formatTokenAmount(log.amount_out)} {log.asset_out ?? ""}
      </td>
    );
  }
  return <td className="whitespace-nowrap px-3 py-2 text-white/45">—</td>;
}

export function ActivityTable({ logs }: { logs: AuditLog[] }) {
  return (
    <div className="overflow-auto rounded-xl border border-white/8 bg-[#1C1C1C]">
      <table className="w-full min-w-[760px] border-collapse text-xs">
        <thead className="sticky top-0 z-10 bg-[#242424] text-left text-[11px] font-semibold uppercase tracking-wide text-white/45 shadow-[0_1px_0_rgba(255,255,255,0.08)]">
          <tr>
            <th className="px-3 py-2 font-medium">Time</th>
            <th className="px-3 py-2 font-medium">Wallet</th>
            <th className="px-3 py-2 font-medium">Action</th>
            <th className="px-3 py-2 font-medium">Asset in</th>
            <th className="px-3 py-2 font-medium">Asset out</th>
            <th className="px-3 py-2 font-medium">Amount (USD equiv.)</th>
            <th className="px-3 py-2 font-medium">Network</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-3 py-8 text-center text-white/45">
                No activity yet.
              </td>
            </tr>
          ) : (
            logs.map((log) => (
              <tr
                key={log.id}
                className="border-t border-white/8 hover:bg-white/[0.03]"
              >
                <td className="whitespace-nowrap px-3 py-2 text-white/60">
                  {formatRelative(log.created_at)}
                </td>
                <td className="px-3 py-2 font-mono text-white/85">
                  {truncateWallet(log.wallet_address)}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-block rounded-full border px-2 py-0.5 capitalize ${badgeClass(log.action_type)}`}
                  >
                    {log.action_type.replaceAll("_", " ")}
                  </span>
                </td>
                <td className="max-w-[120px] truncate px-3 py-2 text-white/60">
                  {log.asset_in ?? "—"}
                </td>
                <td className="max-w-[120px] truncate px-3 py-2 text-white/60">
                  {log.asset_out ?? "—"}
                </td>
                <AmountCell log={log} />
                <td className="px-3 py-2 text-white/60">{log.network}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
