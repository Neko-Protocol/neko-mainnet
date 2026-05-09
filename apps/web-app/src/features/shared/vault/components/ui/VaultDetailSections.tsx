"use client";

import { useState } from "react";
import { Copy, Check, Coins, Droplets } from "lucide-react";
import type { VaultStrategyAllocation, VaultView } from "../../types/vault";

// ─── copyable field ───────────────────────────────────────────────────────────

function CopyableField({ label, address }: { label: string; address: string }) {
  const [copied, setCopied] = useState(false);
  const short = `${address.slice(0, 8)}…${address.slice(-6)}`;
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-2 last:border-0">
      <span className="w-24 shrink-0 capitalize text-xs text-white/40">
        {label}
      </span>
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate font-mono text-xs text-white/50">
          {short}
        </span>
        <button
          onClick={() => {
            void navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="shrink-0 rounded p-1 text-white/30 transition-colors hover:bg-white/10 hover:text-white/60"
        >
          {copied ? (
            <Check className="h-3 w-3 text-emerald-400" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </button>
      </div>
    </div>
  );
}

// ─── strategies section ───────────────────────────────────────────────────────

interface StrategiesSectionProps {
  strategies: NonNullable<VaultView["detail"]>["strategies"];
}

export function StrategiesSection({ strategies }: StrategiesSectionProps) {
  if (!strategies || strategies.length === 0) return null;
  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center gap-2">
        <Droplets className="h-3.5 w-3.5 text-[#229EDF]" />
        <h2 className="text-sm font-semibold text-white">Strategies</h2>
      </div>
      <div className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/5 bg-white/3">
        {strategies.map((s, i) => (
          <div key={i} className="px-4 py-3">
            <p className="text-xs font-semibold text-white/80">{s.protocol}</p>
            <p className="mt-0.5 text-xs text-white/40">{s.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── strategy allocations section ─────────────────────────────────────────────

interface StrategyAllocationsSectionProps {
  allocations: VaultStrategyAllocation[];
}

export function StrategyAllocationsSection({
  allocations,
}: StrategyAllocationsSectionProps) {
  if (!allocations || allocations.length === 0) return null;
  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center gap-2">
        <Coins className="h-3.5 w-3.5 text-[#229EDF]" />
        <h2 className="text-sm font-semibold text-white">
          Strategy Allocations
        </h2>
      </div>
      <div className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/5 bg-white/3">
        {allocations.map((row) => (
          <div
            key={`${row.strategyAddress}-${row.assetSymbol}`}
            className="space-y-2 px-4 py-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white/80">
                  {row.strategyName}
                  {row.paused && (
                    <span className="ml-2 text-[10px] text-amber-400/90">
                      Paused
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-[10px] text-white/35">
                  Asset {row.assetSymbol}
                </p>
              </div>
              <span className="shrink-0 font-mono text-xs tabular-nums text-white">
                {row.amountLabel}
              </span>
            </div>
            <CopyableField label="strategy" address={row.strategyAddress} />
          </div>
        ))}
      </div>
    </section>
  );
}
