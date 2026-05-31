"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { useVaultAction } from "@/features/shared/vault/hooks/useVaultAction";

const MIN_CLAIMABLE = 0.001;

interface ClaimEarningsButtonProps {
  vaultContractId: string;
  earningsTokens: number;
  netDepositedTokens: number;
  supplyAssetSymbol: string;
}

export function ClaimEarningsButton({
  vaultContractId,
  earningsTokens,
  netDepositedTokens,
  supplyAssetSymbol,
}: ClaimEarningsButtonProps) {
  const { isLoading, hasWallet, handleClaimEarnings } = useVaultAction(
    vaultContractId,
    supplyAssetSymbol
  );

  if (!hasWallet || earningsTokens < MIN_CLAIMABLE) return null;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await handleClaimEarnings(netDepositedTokens);
  };

  return (
    <button
      type="button"
      onClick={(e) => void handleClick(e)}
      disabled={isLoading}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#229EDF] hover:bg-[#1a8bc7] text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Claiming…
        </>
      ) : (
        "Claim"
      )}
    </button>
  );
}
