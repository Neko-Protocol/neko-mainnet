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
    <div className="flex items-center gap-5 mb-10">
      <div className="shrink-0">
        <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center overflow-hidden ring-2 ring-white/10">
          <Image
            src={vault.supplyAsset.iconSrc}
            alt={vault.supplyAsset.symbol}
            width={56}
            height={56}
            unoptimized
            className={getTokenIconFitClass(vault.supplyAsset.symbol)}
          />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <h1 className="pool-detail-hero-title">
          {vault.name}
        </h1>

        <div className="flex items-center gap-4 mt-2.5 flex-wrap">
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
