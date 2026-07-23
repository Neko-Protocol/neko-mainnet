"use client";

import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocaleFormatter } from "@/lib/helpers/useLocaleFormatter";
import type { AuditLog } from "@/lib/types/audit.types";

const PAGE_SIZE = 8;

const ACTION_LABEL_KEYS: Record<string, { key: string; color: string }> = {
  vaults_deposit: { key: "actionDeposit", color: "text-emerald-400" },
  vaults_withdraw: { key: "actionWithdraw", color: "text-amber-400" },
  vaults_claim_earnings: { key: "actionClaim", color: "text-sky-400" },
};

function getAmount(log: AuditLog): number | undefined {
  if (log.action_type === "vaults_deposit") {
    return log.token_amount_in ?? log.amount_in;
  }
  return log.amount_out;
}

export function YourActivityFeed({
  logs,
  vaultId,
  assetSymbol,
}: {
  logs: AuditLog[] | undefined;
  vaultId: string;
  assetSymbol: string;
}) {
  const t = useTranslations("sharedVault.activity");
  const { formatDate } = useLocaleFormatter();
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return (logs ?? [])
      .filter(
        (l) =>
          l.pool_id === vaultId &&
          (l.action_type === "vaults_deposit" ||
            l.action_type === "vaults_withdraw" ||
            l.action_type === "vaults_claim_earnings")
      )
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [logs, vaultId]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageEvents = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  return (
    <div>
      <h3 className="text-white/70 text-sm font-medium mb-4">{t("title")}</h3>

      {total === 0 ? (
        <p className="text-white/30 text-sm text-center py-12">{t("empty")}</p>
      ) : (
        <div className="rounded-xl border border-white/7 overflow-hidden">
          <div className="grid grid-cols-[1.6fr_0.8fr_1fr_2rem] gap-4 px-5 py-3 border-b border-white/7 bg-white/[0.02]">
            <span className="text-white/30 text-xs font-medium uppercase tracking-wider">
              {t("date")}
            </span>
            <span className="text-white/30 text-xs font-medium uppercase tracking-wider">
              {t("type")}
            </span>
            <span className="text-white/30 text-xs font-medium uppercase tracking-wider">
              {t("amount")}
            </span>
            <span />
          </div>

          {pageEvents.map((log) => {
            const meta = ACTION_LABEL_KEYS[log.action_type];

            const amount = getAmount(log);

            return (
              <div
                key={log.id}
                className="grid grid-cols-[1.6fr_0.8fr_1fr_2rem] gap-4 items-center px-5 py-3.5 border-b border-white/5 last:border-0 hover:bg-white/[0.025] transition-colors"
              >
                <span className="font-mono tabular-nums text-white/50 text-xs">
                  {formatDate(new Date(log.created_at))}
                </span>

                <span
                  className={`text-sm font-medium ${meta?.color ?? "text-white/60"}`}
                >
                  {meta ? t(meta.key) : log.action_type}
                </span>

                <span className="text-white/70 text-xs tabular-nums">
                  {amount != null ? `${amount.toFixed(2)} ${assetSymbol}` : "—"}
                </span>

                {log.tx_hash ? (
                  <a
                    href={`https://stellar.expert/explorer/public/tx/${log.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/25 hover:text-white/70 transition-colors justify-self-end"
                    title={t("viewTransaction")}
                  >
                    <ExternalLink size={13} />
                  </a>
                ) : (
                  <span />
                )}
              </div>
            );
          })}

          {total > PAGE_SIZE && (
            <div className="flex items-center justify-center gap-3 py-4 border-t border-white/7">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/7 text-white/60 hover:bg-white/12 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span className="text-white/40 text-xs tabular-nums px-3 py-1.5 rounded-full bg-white/5">
                {t("pageOf", { page: safePage, total: totalPages })}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/7 text-white/60 hover:bg-white/12 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
