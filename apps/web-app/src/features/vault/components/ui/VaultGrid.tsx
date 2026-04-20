"use client";

import React from "react";
import { Vault } from "lucide-react";
import type { VaultView } from "../../types/vault";
import { VaultCard } from "./VaultCard";

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
  if (vaults.length === 0) {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl bg-[#1C1C1C] border border-white/5 gap-4">
          <div className="h-5 w-36 rounded bg-white/10 animate-pulse" />
          <p className="text-white/40 text-sm">Loading vaults…</p>
        </div>
      );
    }
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
