"use client";

import React, { useState } from "react";
import { Copy, Check, Droplets, FileText, Coins } from "lucide-react";
import { useTranslations } from "next-intl";
import type { VaultView } from "@/features/shared/vault/types/vault";

function CopyableRow({ label, address }: { label: string; address: string }) {
  const t = useTranslations("sharedVault.info");
  const [copied, setCopied] = useState(false);
  const short = `${address.slice(0, 6)}…${address.slice(-6)}`;

  const handleCopy = () => {
    void navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-white/40 text-xs font-medium capitalize w-24 shrink-0">
        {label}
      </span>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-white/60 text-xs font-mono truncate">
          {short}
        </span>
        <button
          aria-label={t("copyAddress", { label })}
          onClick={handleCopy}
          className="shrink-0 p-1 rounded-md hover:bg-white/10 transition-colors text-white/30 hover:text-white/70"
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

function SectionHeading({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-3.5 w-3.5 text-[#229EDF]" />
      <h3 className="text-white text-sm font-semibold">{title}</h3>
    </div>
  );
}

export function VaultDetailInfo({ vault }: { vault: VaultView }) {
  const t = useTranslations("sharedVault.info");
  const detail = vault.detail;
  if (!detail) return null;

  return (
    <div className="space-y-8 pt-6">
      {detail.description && (
        <p className="text-white/55 text-sm leading-relaxed">
          {detail.description}
        </p>
      )}

      {detail.liquidity && (
        <section>
          <SectionHeading icon={Droplets} title={t("liquidity")} />
          <p className="text-white/50 text-xs leading-relaxed">
            {detail.liquidity}
          </p>
        </section>
      )}

      {detail.strategyAllocations && detail.strategyAllocations.length > 0 && (
        <section>
          <SectionHeading icon={Coins} title={t("strategyAllocations")} />
          <p className="text-white/35 text-[11px] leading-relaxed mb-3">
            {t("strategyAllocationsDescription")}
          </p>
          <div className="rounded-xl bg-white/3 border border-white/5 overflow-hidden divide-y divide-white/5">
            {detail.strategyAllocations.map((row) => (
              <div
                key={`${row.strategyAddress}-${row.assetSymbol}`}
                className="px-4 py-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-white/80 text-xs font-semibold truncate">
                      {row.strategyName}
                      {row.paused && (
                        <span className="ml-2 text-amber-400/90 text-[10px] font-medium">
                          {t("paused")}
                        </span>
                      )}
                    </p>
                    <p className="text-white/35 text-[10px] mt-0.5">
                      {t("assetPrefix", { symbol: row.assetSymbol })}
                    </p>
                  </div>
                  <span className="text-white text-xs font-mono tabular-nums shrink-0">
                    {row.amountLabel}
                  </span>
                </div>
                <CopyableRow
                  label={t("strategies")}
                  address={row.strategyAddress}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {detail.contracts && (
        <section>
          <SectionHeading icon={FileText} title={t("contracts")} />
          <div className="space-y-2">
            <div className="rounded-xl bg-white/3 border border-white/5 px-4 py-1">
              <p className="text-white/20 text-[10px] font-medium uppercase tracking-wide pt-2 pb-1">
                {t("vault")}
              </p>
              <CopyableRow
                label={t("vault")}
                address={detail.contracts.vault}
              />
            </div>

            {Object.keys(detail.contracts.pools).length > 0 && (
              <div className="rounded-xl bg-white/3 border border-white/5 px-4 py-1">
                <p className="text-white/20 text-[10px] font-medium uppercase tracking-wide pt-2 pb-1">
                  {t("pools")}
                </p>
                {Object.entries(detail.contracts.pools).map(([name, addr]) => (
                  <CopyableRow key={name} label={name} address={addr} />
                ))}
              </div>
            )}

            {Object.keys(detail.contracts.strategies).length > 0 && (
              <div className="rounded-xl bg-white/3 border border-white/5 px-4 py-1">
                <p className="text-white/20 text-[10px] font-medium uppercase tracking-wide pt-2 pb-1">
                  {t("strategies")}
                </p>
                {Object.entries(detail.contracts.strategies).map(
                  ([name, addr]) => (
                    <CopyableRow key={name} label={name} address={addr} />
                  )
                )}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
