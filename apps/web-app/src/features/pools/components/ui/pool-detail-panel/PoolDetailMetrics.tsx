"use client";

import Image from "next/image";
import { getPoolTokenIcon } from "../../../utils/poolTokenIcons";
import type { PoolDetailPanelPool } from "./types";
import { MetricValueText } from "./MetricValueText";

export function PoolDetailMetrics({ pool }: { pool: PoolDetailPanelPool }) {
  const resolvedIssuerIcon =
    pool.issuer.icon ??
    getPoolTokenIcon({ type: "contract", code: pool.issuer.name });

  return (
    <div className="flex flex-wrap justify-between gap-y-7">
      <div>
        <p className="text-white/40 text-xs font-medium mb-3 uppercase tracking-wider">
          Total Liquidity
        </p>
        <p className="pool-detail-metric-value">
          <MetricValueText value={pool.totalLiquidity} />
        </p>
        {pool.totalLiquidityRaw && (
          <p className="text-white/30 text-xs mt-2 tabular-nums">
            {pool.totalLiquidityRaw}
          </p>
        )}
      </div>

      {pool.totalBorrowed && (
        <div>
          <p className="text-white/40 text-xs font-medium mb-3 uppercase tracking-wider">
            Total Borrowed
          </p>
          <p className="pool-detail-metric-value">
            <MetricValueText value={pool.totalBorrowed} />
          </p>
          {pool.totalBorrowedRaw && (
            <p className="text-white/30 text-xs mt-2 tabular-nums">
              {pool.totalBorrowedRaw}
            </p>
          )}
        </div>
      )}

      <div>
        <p className="text-white/40 text-xs font-medium mb-3 uppercase tracking-wider">
          Supply APY
        </p>
        <p className="pool-detail-metric-value">
          <MetricValueText value={pool.supplyApy} />
        </p>
        {pool.supplyApySub && (
          <p className="text-white/30 text-xs mt-2 tabular-nums">
            {pool.supplyApySub}
          </p>
        )}
      </div>

      {pool.borrowApyLabel != null && (
        <div>
          <p className="text-white/40 text-xs font-medium mb-3 uppercase tracking-wider">
            Borrow APY
          </p>
          <p className="pool-detail-metric-value">
            <MetricValueText value={pool.borrowApyLabel} />
          </p>
        </div>
      )}

      {pool.poolType && (
        <div>
          <p className="text-white/40 text-xs font-medium mb-3 uppercase tracking-wider">
            Pool Type
          </p>
          <p className="pool-detail-metric-value">
            <MetricValueText value={pool.poolType} />
          </p>
          {pool.poolTypeDetail && (
            <p className="text-white/30 text-xs mt-2 tabular-nums">
              {pool.poolTypeDetail}
            </p>
          )}
        </div>
      )}

      <div>
        <p className="text-white/40 text-xs font-medium mb-3 uppercase tracking-wider">
          Issuer
        </p>
        <div className="flex items-center gap-2">
          {resolvedIssuerIcon && (
            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 overflow-hidden shrink-0">
              <Image
                src={resolvedIssuerIcon}
                alt={pool.issuer.name}
                width={32}
                height={32}
                unoptimized
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <span className="text-white text-lg font-bold truncate">
            {pool.issuer.name}
          </span>
        </div>
      </div>
    </div>
  );
}
