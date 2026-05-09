"use client";

import Image from "next/image";
import { MetricValueText } from "@/features/shared/pools/components/ui/pool-detail-panel/MetricValueText";
import type { VaultView } from "../../types/vault";

interface VaultDetailMetricsProps {
  vault: VaultView;
  apy: string;
}

export function VaultDetailMetrics({ vault, apy }: VaultDetailMetricsProps) {
  return (
    <div className="flex flex-wrap justify-between gap-y-7">
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
          TVL
        </p>
        <p className="pool-detail-metric-value">
          <MetricValueText value={vault.tvl} />
        </p>
      </div>

      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
          APY
        </p>
        <p className="pool-detail-metric-value">
          <MetricValueText value={apy} />
        </p>
      </div>

      {vault.creatorIconSrc && (
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
            Issuer
          </p>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5">
              <Image
                src={vault.creatorIconSrc}
                alt={vault.createdBy}
                width={32}
                height={32}
                unoptimized
                className="h-full w-full object-cover"
              />
            </div>
            <span className="text-lg font-bold text-white">
              {vault.createdBy}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
