"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { formatCurrency } from "@/lib/helpers/currency";
import { truncateAddress } from "@/lib/helpers/addressUtils";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { AnalyticsErrorState } from "@/features/analytics/components/AnalyticsErrorState";
import { Card } from "@/components/ui/FormControls";
import {
  usePartnerLeaderboard,
  useUserLeaderboard,
} from "../hooks/useReferralLeaderboards";
import type {
  ReferralLeaderboardRow,
  ReferralPartnerLeaderboardRow,
} from "../actions";

interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface ReferralMetrics {
  confirmed_count: number;
  swap_volume_usd: number;
  vault_tvl_usd: number;
}

// Volumen / Compras-Swaps / TVL / Users, in that order. TVL only counts
// vault activity 7+ days old (see 0020_referral_tvl_maturity.sql), so
// Volumen (TVL + swaps) reflects that same maturity window.
function metricColumns<T extends ReferralMetrics>(): Column<T>[] {
  return [
    {
      header: "Volume",
      render: (row) => formatCurrency(row.swap_volume_usd + row.vault_tvl_usd),
    },
    {
      header: "Swaps/Purchases",
      render: (row) => formatCurrency(row.swap_volume_usd),
    },
    {
      header: "TVL",
      render: (row) => formatCurrency(row.vault_tvl_usd),
    },
    {
      header: "Users",
      render: (row) => row.confirmed_count,
    },
  ];
}

function LeaderboardCard<T>({
  title,
  rows,
  isPending,
  isError,
  columns,
  emptyMessage,
  rowKey,
  open,
  onToggle,
}: {
  title: string;
  rows: T[] | undefined;
  isPending: boolean;
  isError: boolean;
  columns: Column<T>[];
  emptyMessage: string;
  rowKey: (row: T) => string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Card title={title} collapsible open={open} onToggle={onToggle}>
      {isError ? (
        <AnalyticsErrorState />
      ) : (
        <div className="-mx-4 overflow-x-auto sm:-mx-5">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 text-white/40">
                {columns.map((col) => (
                  <th key={col.header} className="px-4 py-3 font-medium">
                    {col.header}
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
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={rowKey(row)}
                    className="border-b border-white/5 last:border-0 hover:bg-white/[0.04]"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.header}
                        className={`px-4 py-3 text-white/70 ${col.className ?? ""}`}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function ReferralLeaderboardsSection() {
  const users = useUserLeaderboard();
  const partners = usePartnerLeaderboard();
  const { copy, copiedKey } = useCopyToClipboard();
  const [usersOpen, setUsersOpen] = useState(true);
  const [companiesOpen, setCompaniesOpen] = useState(true);
  const [influencersOpen, setInfluencersOpen] = useState(true);

  const companies = partners.data?.filter((p) => p.type === "company");
  const influencers = partners.data?.filter((p) => p.type === "influencer");

  const partnerColumns: Column<ReferralPartnerLeaderboardRow>[] = [
    {
      header: "Name",
      render: (row) => <span className="text-white">{row.name}</span>,
    },
    {
      header: "Code",
      render: (row) => <span className="font-mono">{row.code}</span>,
    },
    ...metricColumns<ReferralPartnerLeaderboardRow>(),
  ];

  return (
    <div className="flex flex-col gap-6">
      <LeaderboardCard<ReferralLeaderboardRow>
        title="Top user referrers"
        rows={users.data}
        isPending={users.isPending}
        isError={users.isError}
        emptyMessage="No confirmed referrals yet."
        rowKey={(row) => row.referrer_wallet}
        open={usersOpen}
        onToggle={() => setUsersOpen((v) => !v)}
        columns={[
          {
            header: "Wallet",
            render: (row) => (
              <button
                onClick={() => copy(row.referrer_wallet, row.referrer_wallet)}
                className="group flex items-center gap-1.5 text-white/70 transition-colors hover:text-white"
              >
                {truncateAddress(row.referrer_wallet)}
                {copiedKey === row.referrer_wallet ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Copy className="h-3 w-3 text-white/40 group-hover:text-white/70" />
                )}
              </button>
            ),
          },
          {
            header: "Code",
            render: (row) => <span className="font-mono">{row.code}</span>,
          },
          {
            header: "Email",
            render: (row) => row.email ?? "-",
          },
          ...metricColumns<ReferralLeaderboardRow>(),
        ]}
      />

      <LeaderboardCard<ReferralPartnerLeaderboardRow>
        title="Top companies"
        rows={companies}
        isPending={partners.isPending}
        isError={partners.isError}
        emptyMessage="No company partners yet."
        rowKey={(row) => row.partner_id}
        open={companiesOpen}
        onToggle={() => setCompaniesOpen((v) => !v)}
        columns={partnerColumns}
      />

      <LeaderboardCard<ReferralPartnerLeaderboardRow>
        title="Top influencers"
        rows={influencers}
        isPending={partners.isPending}
        isError={partners.isError}
        emptyMessage="No influencer partners yet."
        rowKey={(row) => row.partner_id}
        open={influencersOpen}
        onToggle={() => setInfluencersOpen((v) => !v)}
        columns={partnerColumns}
      />
    </div>
  );
}
