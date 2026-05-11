"use client";

import { useState } from "react";
import { usePoolActivity } from "../../../hooks/usePoolActivity";
import { ExternalLinkIcon } from "./ExternalLinkIcon";
import { EVENT_TYPE_COLORS, PAGE_SIZE, formatTs } from "./utils";

export function ActivityFeed({ poolId }: { poolId: string }) {
  const { data: events, isLoading, isError } = usePoolActivity(poolId);
  const [page, setPage] = useState(1);

  const total = events?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageEvents =
    events?.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE) ?? [];

  if (isLoading) {
    const grid =
      "grid grid-cols-[1.4fr_0.8fr_1fr_2rem] gap-4 items-center px-5 py-3.5 border-b border-white/5 last:border-0";
    return (
      <div
        className="rounded-xl border border-white/7 overflow-hidden"
        aria-busy
        aria-label="Loading activity"
      >
        <div className="grid grid-cols-[1.4fr_0.8fr_1fr_2rem] gap-4 px-5 py-3 border-b border-white/7 bg-white/[0.02]">
          {["Date", "Type", "User"].map((h) => (
            <span
              key={h}
              className="text-white/30 text-xs font-medium uppercase tracking-wider"
            >
              {h}
            </span>
          ))}
          <span />
        </div>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={grid}>
            <div className="h-3.5 rounded bg-white/[0.08] w-[min(100%,11rem)]" />
            <div className="h-4 rounded bg-white/[0.08] w-14" />
            <div className="h-3.5 rounded bg-white/[0.08] w-24 font-mono" />
            <div className="h-3 w-3 rounded bg-white/[0.06] justify-self-end" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-white/30 text-sm text-center py-12">
        Could not load activity
      </p>
    );
  }

  if (!events || events.length === 0) {
    return (
      <p className="text-white/30 text-sm text-center py-12">
        No recent activity
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-white/7 overflow-hidden">
      <div className="grid grid-cols-[1.4fr_0.8fr_1fr_2rem] gap-4 px-5 py-3 border-b border-white/7 bg-white/[0.02]">
        <span className="text-white/30 text-xs font-medium uppercase tracking-wider">
          Date
        </span>
        <span className="text-white/30 text-xs font-medium uppercase tracking-wider">
          Type
        </span>
        <span className="text-white/30 text-xs font-medium uppercase tracking-wider">
          User
        </span>
        <span />
      </div>

      {pageEvents.map((event) => {
        const typeColor =
          EVENT_TYPE_COLORS[event.type.toLowerCase()] ?? "text-white/60";
        const userShort = event.user
          ? `${event.user.slice(0, 4)}...${event.user.slice(-4)}`
          : "";
        const explorerUrl = event.user
          ? `https://stellar.expert/explorer/public/account/${event.user}`
          : null;

        return (
          <div
            key={event.id}
            className="grid grid-cols-[1.4fr_0.8fr_1fr_2rem] gap-4 items-center px-5 py-3.5 border-b border-white/5 last:border-0 hover:bg-white/[0.025] transition-colors"
          >
            <span className="text-white/50 text-xs font-mono tabular-nums">
              {formatTs(event.ts)}
            </span>

            <span className={`text-sm font-medium ${typeColor}`}>
              {event.type}
            </span>

            <span className="text-white/50 text-xs font-mono">{userShort}</span>

            {explorerUrl ? (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/25 hover:text-white/70 transition-colors justify-self-end"
                title="View on Stellar Expert"
              >
                <ExternalLinkIcon />
              </a>
            ) : (
              <span />
            )}
          </div>
        );
      })}

      {totalPages > 1 && (
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
            {safePage} of {totalPages}
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
  );
}
