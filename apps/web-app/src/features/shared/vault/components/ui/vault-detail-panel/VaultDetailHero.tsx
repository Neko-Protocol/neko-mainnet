"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Copy, Check } from "lucide-react";
import { getTokenIconFitClass } from "@/lib/helpers/tokenUtils";
import type { VaultView } from "@/features/shared/vault/types/vault";

function CopyableAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const short = `${address.slice(0, 6)}…${address.slice(-6)}`;

  const handleCopy = () => {
    void navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      aria-label="Copy contract address"
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors"
    >
      <span className="font-mono text-sm">{short}</span>
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
      ) : (
        <Copy className="h-3.5 w-3.5 shrink-0" />
      )}
    </button>
  );
}

export function VaultDetailHero({ vault }: { vault: VaultView }) {
  return (
    <div className="flex flex-col items-center gap-4 mb-10 sm:flex-row sm:items-center sm:gap-5">
      {/* Token icon — centered on mobile, inline on desktop */}
      <div className="shrink-0">
        <div className="w-16 h-16 sm:w-14 sm:h-14 rounded-full bg-white/5 flex items-center justify-center overflow-hidden ring-2 ring-white/10">
          <Image
            src={vault.supplyAsset.iconSrc}
            alt={vault.supplyAsset.symbol}
            width={64}
            height={64}
            unoptimized
            className={getTokenIconFitClass(vault.supplyAsset.symbol)}
          />
        </div>
      </div>

      {/* Name + meta — centered on mobile, left on desktop */}
      <div className="min-w-0 flex-1 flex flex-col items-center sm:items-start">
        <h1 className="pool-detail-hero-title text-center sm:text-left">
          {vault.name}
        </h1>

        <div className="flex items-center gap-4 mt-2.5 flex-wrap justify-center sm:justify-start">
          {vault.detail?.contracts?.vault && (
            <CopyableAddress address={vault.detail.contracts.vault} />
          )}
          {vault.creatorIconSrc && (
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full overflow-hidden">
                <Image
                  src={vault.creatorIconSrc}
                  alt={vault.createdBy}
                  width={16}
                  height={16}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="text-white/50 text-sm">{vault.createdBy}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
