"use client";

import Image from "next/image";
import { CopyAddress } from "./CopyAddress";
import { OverlappingTokens } from "./OverlappingTokens";
import type { PoolDetailPanelPool } from "./types";

export function PoolDetailHero({ pool }: { pool: PoolDetailPanelPool }) {
  return (
    <div className="flex items-center gap-5 mb-10">
      <OverlappingTokens
        token1={pool.token1}
        token2={pool.token2}
        size="lg"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-white font-bold text-3xl sm:text-4xl leading-none">
            {pool.name || `${pool.token1.symbol} / ${pool.token2.symbol}`}
          </h1>
        </div>
        <div className="flex items-center gap-4 mt-2.5 flex-wrap">
          <CopyAddress address={pool.contractAddress} />
          <div className="flex items-center gap-1.5">
            <Image
              src="/assets/xlm-negro-logo.png"
              alt="Stellar"
              width={12}
              height={12}
              unoptimized
              className="w-3 h-3 rounded-sm invert"
            />
            <span className="text-white/50 text-sm">{pool.network}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
