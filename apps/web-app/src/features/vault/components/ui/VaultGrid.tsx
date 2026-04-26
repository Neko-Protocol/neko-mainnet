"use client";

import React from "react";
import { Vault } from "lucide-react";
import type { VaultView } from "../../types/vault";
import { VaultCard } from "./VaultCard";

const VaultCardSkeleton = () => (
  <div className="isolate flex flex-col rounded-2xl overflow-hidden border border-white/5">
    <div className="relative overflow-hidden bg-[#242424] min-h-[124px] px-5 py-4">
      <div className="flex items-center gap-3 pr-[46%]">
        <div className="h-12 w-12 rounded-full bg-white/10" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-4 w-32 rounded bg-white/10" />
          <div className="h-5 w-16 rounded-full bg-white/10" />
        </div>
      </div>
    </div>
    <div className="flex items-stretch px-5 py-3 bg-[#181818]">
      <div className="flex-1 space-y-2">
        <div className="h-3 w-40 rounded bg-white/10" />
        <div className="h-3 w-32 rounded bg-white/10" />
      </div>
      <div className="w-px bg-white/8 mx-4 shrink-0" />
      <div className="space-y-2">
        <div className="h-2 w-10 rounded bg-white/10" />
        <div className="h-5 w-16 rounded bg-white/10" />
      </div>
      <div className="w-px bg-white/8 mx-4 shrink-0" />
      <div className="space-y-2">
        <div className="h-2 w-12 rounded bg-white/10" />
        <div className="h-5 w-14 rounded bg-white/10" />
      </div>
    </div>
    <div className="flex gap-2 px-4 py-3 bg-[#181818]">
      <div className="h-8 flex-1 rounded-xl bg-white/10" />
      <div className="h-8 flex-1 rounded-xl bg-white/10" />
    </div>
  </div>
);

interface VaultGridProps {
  vaults: VaultView[];
  isLoading?: boolean;
  userBalances?: Record<string, bigint>;
  onDetailsClick?: (vault: VaultView) => void;
  onDepositClick?: (vault: VaultView) => void;
  onWithdrawClick?: (vault: VaultView) => void;
  emptySubtitle?: string;
}

export const VaultGrid: React.FC<VaultGridProps> = ({
  vaults,
  isLoading,
  userBalances,
  onDetailsClick,
  onDepositClick,
  onWithdrawClick,
  emptySubtitle = "Try adjusting your filters",
}) => {
  if (isLoading && vaults.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <VaultCardSkeleton key={`vault-card-skeleton-${index}`} />
        ))}
      </div>
    );
  }

  if (vaults.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 rounded-2xl bg-[#1C1C1C] border border-white/5 gap-4">
        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
          <Vault className="h-7 w-7 text-white/20" />
        </div>
        <div className="text-center">
          <p className="text-white/50 font-medium mb-1">No vaults found</p>
          <p className="text-white/25 text-sm">{emptySubtitle}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {vaults.map((vault) => (
        <VaultCard
          key={vault.id}
          vault={vault}
          isLoading={isLoading}
          userBalance={userBalances?.[vault.id]}
          onDetailsClick={onDetailsClick}
          onDepositClick={onDepositClick}
          onWithdrawClick={onWithdrawClick}
        />
      ))}
    </div>
  );
};
