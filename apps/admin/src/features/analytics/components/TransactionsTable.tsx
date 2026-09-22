"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { AuditActionType, TransactionRow } from "@neko-protocol/api-contracts";
import { useTransactions } from "../hooks/useTransactions";
import { truncateAddress } from "@/lib/helpers/addressUtils";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { AssetIcon } from "./AssetIcon";
import { AnalyticsErrorState } from "./AnalyticsErrorState";

const ACTION_TYPE_OPTIONS: { value: AuditActionType | ""; label: string }[] = [
  { value: "", label: "All types" },
  { value: "swap", label: "Swap" },
  { value: "vaults_deposit", label: "Vault deposit" },
  { value: "vaults_withdraw", label: "Vault withdraw" },
  { value: "vaults_claim_earnings", label: "Vault claim earnings" },
];

const ACTION_TYPE_STYLES: Partial<Record<AuditActionType, string>> = {
  swap: "bg-[#229EDF]/10 text-[#229EDF]",
  vaults_deposit: "bg-emerald-500/10 text-emerald-400",
  vaults_withdraw: "bg-amber-500/10 text-amber-400",
  vaults_claim_earnings: "bg-purple-500/10 text-purple-400",
};
const DEFAULT_ACTION_TYPE_STYLE = "bg-white/10 text-white/80";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

function formatAmount(row: TransactionRow): string {
  const amount = row.amountOut ?? row.amountIn;
  if (amount == null) return "-";
  return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

// Vault share tokens are stored as e.g. "DeFindex-Vault-Neko USDC", so show just
// the trailing asset symbol to match the rest of the admin's asset labels.
function formatAsset(row: TransactionRow): string {
  const asset = row.assetOut ?? row.assetIn;
  if (!asset) return "-";
  const parts = asset.trim().split(/\s+/);
  return parts[parts.length - 1];
}

export function TransactionsTable() {
  const [actionType, setActionType] = useState<AuditActionType | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [offset, setOffset] = useState(0);
  const { copy, copiedKey } = useCopyToClipboard();

  const { data, isPending, isError } = useTransactions({
    actionType: actionType || undefined,
    from: from || undefined,
    to: to || undefined,
    limit: pageSize,
    offset,
  });
  const rows: TransactionRow[] = data?.rows ?? [];
  const total = data?.total ?? 0;

  function handleFilterChange(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setOffset(0);
      setter(e.target.value);
    };
  }

  const hasNextPage = offset + pageSize < total;

  return (
    <section className="overflow-hidden rounded-2xl border border-white/5 bg-[#1C1C1C]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
        <h2 className="text-xl font-bold text-white">Transactions</h2>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={actionType}
            onChange={(e) => {
              setOffset(0);
              setActionType(e.target.value as AuditActionType | "");
            }}
            className="rounded-lg border border-white/10 bg-[#141414] px-3 py-1.5 text-sm text-white outline-none focus:border-[#229EDF]/50"
          >
            {ACTION_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={from}
            onChange={handleFilterChange(setFrom)}
            className="rounded-lg border border-white/10 bg-[#141414] px-3 py-1.5 text-sm text-white outline-none focus:border-[#229EDF]/50"
          />
          <input
            type="date"
            value={to}
            onChange={handleFilterChange(setTo)}
            className="rounded-lg border border-white/10 bg-[#141414] px-3 py-1.5 text-sm text-white outline-none focus:border-[#229EDF]/50"
          />
          <select
            value={pageSize}
            onChange={(e) => {
              setOffset(0);
              setPageSize(Number(e.target.value));
            }}
            className="rounded-lg border border-white/10 bg-[#141414] px-3 py-1.5 text-sm text-white outline-none focus:border-[#229EDF]/50"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                Show {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/5 text-white/40">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Wallet</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Asset</th>
            </tr>
          </thead>
          <tbody>
            {isError ? (
              <tr>
                <td colSpan={6} className="px-4 py-6">
                  <AnalyticsErrorState />
                </td>
              </tr>
            ) : isPending ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-white/40">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-white/40">
                  No transactions found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-white/5 hover:bg-white/[0.04]"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-white/70">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs ${
                        ACTION_TYPE_STYLES[row.actionType as AuditActionType] ??
                        DEFAULT_ACTION_TYPE_STYLE
                      }`}
                    >
                      {row.actionType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {row.walletAddress ? (
                      <button
                        onClick={() =>
                          copy(String(row.id), row.walletAddress as string)
                        }
                        className="group flex items-center gap-1.5 text-white/70 transition-colors hover:text-white"
                      >
                        {truncateAddress(row.walletAddress)}
                        {copiedKey === String(row.id) ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3 text-white/40 group-hover:text-white/70" />
                        )}
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {row.email ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {formatAmount(row)}
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    <span className="flex items-center gap-2">
                      <AssetIcon symbol={formatAsset(row)} />
                      {formatAsset(row)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-white/5 px-4 py-3 text-sm text-white/40">
        <span>
          {total > 0
            ? `${offset + 1}–${Math.min(offset + pageSize, total)} of ${total}`
            : "0 results"}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setOffset((o) => Math.max(0, o - pageSize))}
            disabled={offset === 0}
            className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-30"
          >
            Prev
          </button>
          <button
            onClick={() => setOffset((o) => o + pageSize)}
            disabled={!hasNextPage}
            className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-30"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
