"use client";

import Image from "next/image";
import { getTokenIconFitClass } from "@/lib/helpers/tokenUtils";
import { CopyAddress } from "@/features/shared/pools/components/ui/pool-detail-panel/CopyAddress";
import type { VaultView } from "../../types/vault";

interface VaultDetailHeroProps {
  vault: VaultView;
}

export function VaultDetailHero({ vault }: VaultDetailHeroProps) {
  const contractAddress = vault.detail?.contracts?.vault;

  return (
    <div className="mb-10 flex items-center gap-5">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5">
        <Image
          src={vault.supplyAsset.iconSrc}
          alt={vault.supplyAsset.symbol}
          width={56}
          height={56}
          unoptimized
          className={`h-12 w-12 ${getTokenIconFitClass(vault.supplyAsset.symbol)}`}
        />
      </div>

      <div className="min-w-0 flex-1">
        <h1 className="pool-detail-hero-title">{vault.name}</h1>
        <div className="mt-2.5 flex flex-wrap items-center gap-3">
          <span className="text-sm text-white/50">Stellar</span>
          {contractAddress && <CopyAddress address={contractAddress} />}
        </div>
      </div>
    </div>
  );
}
