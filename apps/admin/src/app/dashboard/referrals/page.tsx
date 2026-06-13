"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getReferralLeaderboard,
  type ReferralLeaderboardRow as LeaderboardRow,
} from "@/lib/referrals";

function truncate(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

type SortKey = "users" | "vault_tvl" | "swap_volume";

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "swap_volume", label: "Most Swap Volume" },
  { key: "vault_tvl", label: "Most Vault TVL" },
  { key: "users", label: "Most Users" },
];

function sortValue(row: LeaderboardRow, key: SortKey): number {
  if (key === "users") return row.confirmed_count;
  if (key === "vault_tvl") return row.vault_tvl_usd;
  return row.swap_volume_usd;
}

export default function ReferralsPage() {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("swap_volume");

  const sortedRows = useMemo(() => {
    if (!rows) return null;
    return [...rows].sort(
      (a, b) =>
        sortValue(b, sortKey) - sortValue(a, sortKey) ||
        b.confirmed_count - a.confirmed_count
    );
  }, [rows, sortKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getReferralLeaderboard();
        if (!cancelled) setRows(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Something went wrong");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Referrals</h1>
        <p className="text-sm text-white/50">
          Confirmed referrals (email verified) and the volume each referrer
          brought: swap volume plus vault TVL.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-white/45">
          Rank by
        </span>
        {SORT_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setSortKey(key)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
              sortKey === key
                ? "border-[#229EDF]/55 bg-[#229EDF]/15 text-[#229EDF]"
                : "border-white/10 text-white/60 hover:border-white/25 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      ) : sortedRows === null ? (
        <p className="text-sm text-white/50">Loading…</p>
      ) : sortedRows.length === 0 ? (
        <div className="rounded-2xl border border-white/8 bg-[#1C1C1C] p-8 text-center text-sm text-white/50">
          No confirmed referrals yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#1C1C1C]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/8 text-xs uppercase tracking-wide text-white/45">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Referrer</th>
                <th className="px-4 py-3">Code</th>
                <th
                  className={`px-4 py-3 ${sortKey === "users" ? "text-[#229EDF]" : ""}`}
                >
                  Referred
                </th>
                <th
                  className={`px-4 py-3 ${sortKey === "swap_volume" ? "text-[#229EDF]" : ""}`}
                >
                  Swap volume
                </th>
                <th
                  className={`px-4 py-3 ${sortKey === "vault_tvl" ? "text-[#229EDF]" : ""}`}
                >
                  Vault TVL
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, index) => (
                <tr
                  key={row.referrer_wallet}
                  className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3 text-white/45">{index + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs text-white">
                    {truncate(row.referrer_wallet)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-white/70">
                    {row.code}
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {row.confirmed_count}
                  </td>
                  <td className="px-4 py-3 text-white">
                    {formatUsd(row.swap_volume_usd)}
                  </td>
                  <td className="px-4 py-3 text-white">
                    {formatUsd(row.vault_tvl_usd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
