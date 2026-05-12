"use client";

import React from "react";
import Image from "next/image";
import type { VaultView } from "@/features/shared/vault/types/vault";
import type { SupportedCurrency } from "@/stores/currency.store";
import { convertUsdDisplayToSelectedCurrency } from "@/lib/helpers/currency";

function MetricBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-white/40 text-xs font-medium mb-3 uppercase tracking-wider">
        {label}
      </p>
      {children}
    </div>
  );
}

const METRIC_STYLE: React.CSSProperties = {
  fontFamily: '"FK Grotesk", "Inter", sans-serif',
  fontSize: 38,
  fontWeight: 400,
  lineHeight: "120%",
  fontVariantNumeric: "tabular-nums",
};

function MetricValue({ value, green }: { value: string; green?: boolean }) {
  const isReal = value !== "-" && value !== "" && value !== "0.00%";
  return (
    <p
      className="pool-detail-metric-value"
      style={
        green && isReal ? { ...METRIC_STYLE, color: "#4ADE80" } : METRIC_STYLE
      }
    >
      {value}
    </p>
  );
}

export function VaultDetailMetrics({
  vault,
  liveApy,
  fxRate = 1,
  selectedCurrency = "USD",
}: {
  vault: VaultView;
  liveApy?: string;
  fxRate?: number;
  selectedCurrency?: SupportedCurrency;
}) {
  const apyDisplay = liveApy ?? vault.apy7d;
  const tvlDisplay = convertUsdDisplayToSelectedCurrency(
    vault.tvl,
    fxRate,
    selectedCurrency,
    2
  );

  return (
    <div className="flex flex-wrap justify-between gap-y-7 mb-10">
      <MetricBlock label="TVL">
        <MetricValue value={tvlDisplay} />
      </MetricBlock>

      <MetricBlock label="APY">
        <MetricValue value={apyDisplay} green />
      </MetricBlock>

      <MetricBlock label="Supply Asset">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 overflow-hidden shrink-0">
            <Image
              src={vault.supplyAsset.iconSrc}
              alt={vault.supplyAsset.symbol}
              width={32}
              height={32}
              unoptimized
              className="h-full w-full object-contain"
            />
          </div>
          <p className="pool-detail-metric-value" style={METRIC_STYLE}>
            {vault.supplyAsset.symbol}
          </p>
        </div>
      </MetricBlock>

      {vault.creatorIconSrc && (
        <MetricBlock label="Created by">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 overflow-hidden shrink-0">
              <Image
                src={vault.creatorIconSrc}
                alt={vault.createdBy}
                width={32}
                height={32}
                unoptimized
                className="h-full w-full object-cover"
              />
            </div>
            <p className="pool-detail-metric-value" style={METRIC_STYLE}>
              {vault.createdBy}
            </p>
          </div>
        </MetricBlock>
      )}
    </div>
  );
}
