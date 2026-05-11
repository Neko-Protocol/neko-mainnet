"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { getTokenIconFitClass } from "@/lib/helpers/tokenUtils";
import { X, Copy, Check, Droplets, FileText, Coins } from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import type { VaultView } from "../../types/vault";

interface VaultDetailModalProps {
  vault: VaultView;
  onClose: () => void;
  onDeposit?: () => void;
}

function CopyableAddress({
  label,
  address,
}: {
  label: string;
  address: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const short = `${address.slice(0, 6)}...${address.slice(-6)}`;

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
          aria-label={`Copy ${label} address`}
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

export function VaultDetailModal({
  vault,
  onClose,
  onDeposit,
}: VaultDetailModalProps) {
  const detail = vault.detail;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 220);
  };

  return (
    <ModalPortal>
      {/* backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 transition-opacity duration-200"
        style={{
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)",
          opacity: visible ? 1 : 0,
        }}
        onClick={handleClose}
      >
        {/* panel */}
        <div
          className="relative w-full sm:max-w-xl max-h-[90dvh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden transition-all duration-200"
          style={{
            background: "#141414",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
            opacity: visible ? 1 : 0,
            transform: visible
              ? "translateY(0) scale(1)"
              : "translateY(12px) scale(0.97)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            aria-label="Close modal"
            onClick={handleClose}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* ── HEADER ── */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 shrink-0 pr-10">
            <div className="w-9 h-9 rounded-full bg-[#222] flex items-center justify-center overflow-hidden shrink-0">
              <Image
                src={vault.supplyAsset.iconSrc}
                alt={vault.supplyAsset.symbol}
                width={36}
                height={36}
                unoptimized
                className={getTokenIconFitClass(vault.supplyAsset.symbol)}
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-white font-bold text-base leading-tight truncate">
                {vault.name}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-white/40 text-xs">{vault.apy7d} APY</span>
                <span className="text-white/20 text-xs">·</span>
                <span className="text-white/40 text-xs">TVL {vault.tvl}</span>
              </div>
            </div>
          </div>

          {/* ── SCROLLABLE BODY ── */}
          <div className="vault-scroll overflow-y-auto flex-1 px-5 py-5 space-y-6">
            {/* Description */}
            {detail?.description && (
              <p className="text-white/60 text-sm leading-relaxed">
                {detail.description}
              </p>
            )}

            {/* Liquidity */}
            {detail?.liquidity && (
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <Droplets className="h-3.5 w-3.5 text-[#229EDF]" />
                  <h3 className="text-white text-sm font-semibold">
                    Liquidity
                  </h3>
                </div>
                <p className="text-white/50 text-xs leading-relaxed">
                  {detail.liquidity}
                </p>
              </section>
            )}

            {detail?.strategyAllocations &&
              detail.strategyAllocations.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-2">
                    <Coins className="h-3.5 w-3.5 text-[#229EDF]" />
                    <h3 className="text-white text-sm font-semibold">
                      Strategy allocations
                    </h3>
                  </div>
                  <p className="text-white/35 text-[11px] leading-relaxed mb-3">
                    Amounts deployed per strategy contract (from total managed
                    funds). The API does not list separate AMM pool addresses —
                    liquidity is routed through these strategies.
                  </p>
                  <div className="rounded-xl bg-white/3 border border-white/5 overflow-hidden divide-y divide-white/5">
                    {detail.strategyAllocations.map((row) => (
                      <div
                        key={`${row.strategyAddress}-${row.assetSymbol}-${row.amountLabel}`}
                        className="px-4 py-3 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-white/80 text-xs font-semibold truncate">
                              {row.strategyName}
                              {row.paused && (
                                <span className="ml-2 text-amber-400/90 text-[10px] font-medium">
                                  Paused
                                </span>
                              )}
                            </p>
                            <p className="text-white/35 text-[10px] mt-0.5">
                              Asset {row.assetSymbol}
                            </p>
                          </div>
                          <span className="text-white text-xs font-mono tabular-nums shrink-0">
                            {row.amountLabel}
                          </span>
                        </div>
                        <CopyableAddress
                          label="strategy"
                          address={row.strategyAddress}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

            {/* Contracts */}
            {detail?.contracts && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-3.5 w-3.5 text-[#229EDF]" />
                  <h3 className="text-white text-sm font-semibold">
                    Contracts
                  </h3>
                </div>
                <div className="rounded-xl bg-white/3 border border-white/5 px-4 py-1 mb-2">
                  <p className="text-white/20 text-[10px] font-medium uppercase tracking-wide pt-2 pb-1">
                    Vault
                  </p>
                  <CopyableAddress
                    label="vault"
                    address={detail.contracts.vault}
                  />
                </div>
                {Object.keys(detail.contracts.pools).length > 0 && (
                  <div className="rounded-xl bg-white/3 border border-white/5 px-4 py-1 mb-2">
                    <p className="text-white/20 text-[10px] font-medium uppercase tracking-wide pt-2 pb-1">
                      Pools
                    </p>
                    {Object.entries(detail.contracts.pools).map(
                      ([name, addr]) => (
                        <CopyableAddress
                          key={name}
                          label={name}
                          address={addr}
                        />
                      )
                    )}
                  </div>
                )}
                <div className="rounded-xl bg-white/3 border border-white/5 px-4 py-1">
                  <p className="text-white/20 text-[10px] font-medium uppercase tracking-wide pt-2 pb-1">
                    Strategies
                  </p>
                  {Object.entries(detail.contracts.strategies).map(
                    ([name, addr]) => (
                      <CopyableAddress key={name} label={name} address={addr} />
                    )
                  )}
                </div>
              </section>
            )}
          </div>

          {/* ── FOOTER ── */}
          <div className="px-5 py-4 border-t border-white/5 shrink-0">
            <button
              aria-label={`Deposit into ${vault.name}`}
              onClick={onDeposit}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-colors duration-200 bg-[#229EDF] hover:bg-[#1a8bc7]"
            >
              Deposit
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
