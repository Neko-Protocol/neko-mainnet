"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import type { UserPositionWithPool } from "@/features/expert/dashboard/hooks/useUserPositions";
import { getTokenIconFitClass } from "@/lib/helpers/tokenUtils";
import { getPoolTokenIcon } from "@/features/shared/pools/utils/poolTokenIcons";
import type { PoolInfo } from "@/lib/orchestrator/types/pool.types";
import { formatAmount, safeParseFloat } from "@/lib/helpers/formatUtils";

const DEFAULT_MAX_ROWS = 4;

function PoolPositionIcons({ pool }: { pool: PoolInfo }) {
  const t1 = pool.tokens[0]?.code ?? "";
  const t2 = pool.tokens[1]?.code;
  const icon1 = t1 ? getPoolTokenIcon({ type: "contract", code: t1 }) : null;
  const icon2 = t2 ? getPoolTokenIcon({ type: "contract", code: t2 }) : null;

  if (!t2) {
    return (
      <div className="relative h-9 w-9 shrink-0 rounded-full border-2 border-[#1C1C1C] bg-neko-teal flex items-center justify-center overflow-hidden">
        {icon1 ? (
          <Image
            src={icon1}
            alt={t1}
            width={36}
            height={36}
            unoptimized
            className={getTokenIconFitClass(t1)}
          />
        ) : (
          <span className="text-white text-xs font-bold">{t1[0] ?? "?"}</span>
        )}
      </div>
    );
  }

  return (
    <div className="relative h-9 w-[52px] shrink-0">
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-neko-teal border-2 border-[#1C1C1C] flex items-center justify-center overflow-hidden">
        {icon1 ? (
          <Image
            src={icon1}
            alt={t1}
            width={32}
            height={32}
            unoptimized
            className={getTokenIconFitClass(t1)}
          />
        ) : (
          <span className="text-white text-[10px] font-bold">{t1[0]}</span>
        )}
      </div>
      <div className="absolute left-[22px] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-neko-teal-light border-2 border-[#1C1C1C] flex items-center justify-center overflow-hidden">
        {icon2 ? (
          <Image
            src={icon2}
            alt={t2}
            width={32}
            height={32}
            unoptimized
            className={getTokenIconFitClass(t2)}
          />
        ) : (
          <span className="text-neko-navy text-[10px] font-bold">{t2[0]}</span>
        )}
      </div>
    </div>
  );
}

export interface YourPositionsTableProps {
  positions: UserPositionWithPool[];
  maxRows?: number;
}

export function YourPositionsTable({
  positions,
  maxRows = DEFAULT_MAX_ROWS,
}: YourPositionsTableProps) {
  const router = useRouter();
  const tableRows = positions.slice(0, maxRows);
  const hiddenCount = positions.length - tableRows.length;

  const openPool = (poolId: string) => {
    router.push(`/pools/${encodeURIComponent(poolId)}`);
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-[#1C1C1C] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
        <span className="text-white/30 text-xs font-semibold uppercase tracking-wide">
          Pools
        </span>
        <Link
          href="/pools"
          className="flex items-center gap-1 text-xs text-white/30 hover:text-white transition-colors"
        >
          Manage
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-4 py-3 text-left text-xs font-medium text-white/30 uppercase tracking-wide w-16">
                Asset
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/30 uppercase tracking-wide">
                Position
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-white/30 uppercase tracking-wide">
                Deposited
              </th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map(({ pool, position }) => (
              <tr
                key={pool.id}
                onClick={() => openPool(pool.id)}
                className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                <td className="px-4 py-3.5 align-middle w-16">
                  <PoolPositionIcons pool={pool} />
                </td>
                <td className="px-4 py-3.5 align-middle min-w-0">
                  <p className="text-white font-semibold text-sm truncate">
                    {pool.name}
                  </p>
                  <p className="text-white/40 text-xs mt-0.5 truncate">
                    {pool.tokens.map((t) => t.code).join(" / ")}
                    {pool.apy > 0 && (
                      <span className="ml-1.5 text-[#76C464]">
                        {pool.apy.toFixed(2)}% APY
                      </span>
                    )}
                  </p>
                </td>
                <td className="px-4 py-3.5 align-middle text-right">
                  <p className="text-white font-semibold text-sm tabular-nums">
                    {formatAmount(
                      safeParseFloat(position.depositedFormatted),
                      2
                    )}{" "}
                    <span className="text-white/50 font-normal">
                      {pool.tokens[0]?.code ?? ""}
                    </span>
                  </p>
                  {position.rewards > 0n && (
                    <p className="text-[#76C464] text-xs font-semibold mt-0.5">
                      +
                      {formatAmount(
                        safeParseFloat(position.rewardsFormatted),
                        2
                      )}{" "}
                      rewards
                    </p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hiddenCount > 0 && (
        <div className="px-4 py-3 border-t border-white/5 text-center">
          <Link
            href="/lending"
            className="text-xs text-white/40 hover:text-white transition-colors"
          >
            +{hiddenCount} more on Lending
          </Link>
        </div>
      )}
    </div>
  );
}
