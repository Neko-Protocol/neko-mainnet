"use client";

import { formatCurrency } from "@/lib/helpers/currency";
import { truncateAddress } from "@/lib/helpers/addressUtils";
import { AnalyticsErrorState } from "@/features/analytics/components/AnalyticsErrorState";
import type { ReferredBreakdownRow } from "../actions";

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
}

export interface ReferredBreakdownTableProps {
  rows: ReferredBreakdownRow[] | undefined;
  isPending: boolean;
  isError: boolean;
}

/** Wallet-by-wallet volume for a single referrer, ranked highest first.
 * The rewards program this feeds needs to know exactly who generated what,
 * not just a referrer's aggregate totals. */
export function ReferredBreakdownTable({
  rows,
  isPending,
  isError,
}: ReferredBreakdownTableProps) {
  if (isError) return <AnalyticsErrorState />;

  const columns = ["Wallet", "Email", "Volume", "Swaps", "TVL", "Referred"];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/5 text-white/40">
            {columns.map((header) => (
              <th key={header} className="px-4 py-3 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isPending ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-6 text-center text-white/40"
              >
                Loading…
              </td>
            </tr>
          ) : !rows?.length ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-6 text-center text-white/40"
              >
                No one referred yet.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.referred_wallet}
                className="border-b border-white/5 last:border-0 hover:bg-white/[0.04]"
              >
                <td className="px-4 py-3 font-mono text-white/70">
                  {truncateAddress(row.referred_wallet)}
                </td>
                <td className="px-4 py-3 text-white/70">{row.email ?? "-"}</td>
                <td className="px-4 py-3 text-white">
                  {formatCurrency(row.swap_volume_usd + row.vault_tvl_usd)}
                </td>
                <td className="px-4 py-3 text-white/70">
                  {formatCurrency(row.swap_volume_usd)}
                </td>
                <td className="px-4 py-3 text-white/70">
                  {formatCurrency(row.vault_tvl_usd)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-white/70">
                  {formatDate(row.referred_at)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
