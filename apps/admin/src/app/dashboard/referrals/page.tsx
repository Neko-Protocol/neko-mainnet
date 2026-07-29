"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  getReferralLeaderboard,
  getReferredUsers,
  type ReferralLeaderboardRow as LeaderboardRow,
  type ReferredUser,
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

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
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

function ReferredUsersPanel({ wallet }: { wallet: string }) {
  const [users, setUsers] = useState<ReferredUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getReferredUsers(wallet);
        if (!cancelled) setUsers(data);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wallet]);

  const content = (() => {
    if (error) return <p className="text-xs text-admin-danger">{error}</p>;
    if (users === null)
      return <p className="text-xs text-admin-subtle">Loading…</p>;
    if (users.length === 0)
      return (
        <p className="text-xs text-admin-subtle">No referred users yet.</p>
      );
    return (
      <div className="grid grid-cols-3 gap-x-8">
        <div className="text-[10px] font-medium uppercase tracking-wide text-white/35 pb-2">
          Referred wallet
        </div>
        <div className="text-[10px] font-medium uppercase tracking-wide text-white/35 pb-2">
          Status
        </div>
        <div className="text-[10px] font-medium uppercase tracking-wide text-white/35 pb-2">
          Confirmed at
        </div>
        {users.map((u) => (
          <>
            <div
              key={`${u.referred_wallet}-w`}
              className="font-mono text-xs text-admin-text border-white/5"
            >
              {truncate(u.referred_wallet)}
            </div>
            <div key={`${u.referred_wallet}-s`} className="border-white/5">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  u.status === "confirmed"
                    ? "bg-neko-blue/15 text-neko-blue"
                    : "bg-admin-warning/15 text-admin-warning"
                }`}
              >
                {u.status}
              </span>
            </div>
            <div
              key={`${u.referred_wallet}-c`}
              className="text-xs text-admin-muted border-white/5"
            >
              {formatDate(u.confirmed_at)}
            </div>
          </>
        ))}
      </div>
    );
  })();

  return (
    <tr>
      <td
        colSpan={7}
        className="border-b border-white/5 bg-white/[0.015] pl-12 pr-4 py-4"
      >
        {content}
      </td>
    </tr>
  );
}

export default function ReferralsPage() {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("swap_volume");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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

  function toggleExpand(wallet: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(wallet)) next.delete(wallet);
      else next.add(wallet);
      return next;
    });
  }

  return (
    <div className="admin-page">
      <div className="mb-8">
        <h1 className="font-klein text-3xl text-admin-text text-balance">
          Referrals
        </h1>
        <p className="text-sm text-admin-muted">
          Confirmed referrals (email verified) and the volume each referrer
          brought: swap volume plus vault TVL.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-admin-subtle">
          Rank by
        </span>
        {SORT_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setSortKey(key)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
              sortKey === key
                ? "border-neko-blue/55 bg-neko-accent/15 text-neko-blue"
                : "border-admin-border text-admin-muted hover:border-admin-border-strong hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-lg border border-admin-danger/30 bg-admin-danger/10 px-3 py-2 text-sm text-admin-danger">
          {error}
        </div>
      ) : sortedRows === null ? (
        <p className="text-sm text-admin-muted">Loading…</p>
      ) : sortedRows.length === 0 ? (
        <div className="rounded-xl border border-admin-border bg-admin-surface p-8 text-center text-sm text-admin-muted">
          No confirmed referrals yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-admin-border bg-admin-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-admin-border text-xs uppercase tracking-wide text-admin-subtle">
              <tr>
                <th className="px-4 py-3 w-8"></th>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Referrer</th>
                <th className="px-4 py-3">Code</th>
                <th
                  className={`px-4 py-3 ${sortKey === "users" ? "text-neko-blue" : ""}`}
                >
                  Referred
                </th>
                <th
                  className={`px-4 py-3 ${sortKey === "swap_volume" ? "text-neko-blue" : ""}`}
                >
                  Swap volume
                </th>
                <th
                  className={`px-4 py-3 ${sortKey === "vault_tvl" ? "text-neko-blue" : ""}`}
                >
                  Vault TVL
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, index) => {
                const isExpanded = expanded.has(row.referrer_wallet);
                return (
                  <>
                    <tr
                      key={row.referrer_wallet}
                      className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] cursor-pointer"
                      onClick={() => toggleExpand(row.referrer_wallet)}
                    >
                      <td className="px-4 py-3 text-admin-subtle">
                        {isExpanded ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </td>
                      <td className="px-4 py-3 text-admin-subtle">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-white">
                        {truncate(row.referrer_wallet)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-admin-muted">
                        {row.code}
                      </td>
                      <td className="px-4 py-3 text-admin-muted">
                        {row.confirmed_count}
                      </td>
                      <td className="px-4 py-3 text-white">
                        {formatUsd(row.swap_volume_usd)}
                      </td>
                      <td className="px-4 py-3 text-white">
                        {formatUsd(row.vault_tvl_usd)}
                      </td>
                    </tr>
                    {isExpanded && (
                      <ReferredUsersPanel
                        key={`${row.referrer_wallet}-panel`}
                        wallet={row.referrer_wallet}
                      />
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
