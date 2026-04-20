"use client";

import React from "react";
import Image from "next/image";
import { Wallet, Coins } from "lucide-react";
import { fromSmallestUnit } from "@/lib/helpers/tokenUtils";
import { useWallet } from "@/hooks/useWallet";
import type { VaultView } from "../../types/vault";

interface MyVaultPositionsProps {
  vaults: VaultView[];
  userBalances: Record<string, bigint>;
  onDeposit?: (vault: VaultView) => void;
  onWithdraw?: (vault: VaultView) => void;
}

const MyVaultPositions: React.FC<MyVaultPositionsProps> = ({
  vaults,
  userBalances,
  onDeposit,
  onWithdraw,
}) => {
  const { address } = useWallet();

  if (!address) {
    return (
      <div className="w-full rounded-2xl bg-[#1C1C1C] border border-white/5 p-12 text-center">
        <Wallet className="h-8 w-8 text-white/20 mx-auto mb-3" />
        <p className="text-white/40 text-sm">
          Connect your wallet to see your vault positions
        </p>
      </div>
    );
  }

  const positionVaults = vaults.filter(
    (v) => (userBalances[v.id] ?? 0n) > 0n
  );

  if (positionVaults.length === 0) {
    return (
      <div className="w-full rounded-2xl bg-[#1C1C1C] border border-white/5 p-12 text-center">
        <Coins className="h-8 w-8 text-white/20 mx-auto mb-3" />
        <p className="text-white/40 text-sm">
          You don&apos;t have any vault positions yet.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-white/5 bg-[#1C1C1C]">
      <div className="flex items-center px-4 py-3 border-b border-white/5">
        <span className="text-white/40 text-xs font-semibold uppercase tracking-wide">
          Your Vault Positions
        </span>
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b border-white/5">
            <th className="px-4 py-3 text-left">
              <span className="text-white/30 text-xs font-medium">Vault</span>
            </th>
            <th className="px-4 py-3 text-left">
              <span className="text-white/30 text-xs font-medium">Asset</span>
            </th>
            <th className="px-4 py-3 text-center">
              <span className="text-white/30 text-xs font-medium">Shares</span>
            </th>
            <th className="px-4 py-3 text-center">
              <span className="text-white/30 text-xs font-medium">APY 7d</span>
            </th>
            <th className="px-4 py-3 text-center">
              <span className="text-white/30 text-xs font-medium">Status</span>
            </th>
            <th className="px-4 py-3 text-right">
              <span className="text-white/30 text-xs font-medium">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {positionVaults.map((vault) => {
            const rawBalance = userBalances[vault.id] ?? 0n;
            const sharesFormatted = fromSmallestUnit(rawBalance.toString(), 7);

            return (
              <tr
                key={vault.id}
                className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                {/* Vault name */}
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#222] flex items-center justify-center overflow-hidden shrink-0">
                      <Image
                        src={vault.supplyAsset.iconSrc}
                        alt={vault.supplyAsset.symbol}
                        width={20}
                        height={20}
                        unoptimized
                      />
                    </div>
                    <span className="text-white font-medium text-sm">
                      {vault.name}
                    </span>
                  </div>
                </td>

                {/* Asset */}
                <td className="px-4 py-4">
                  <span className="text-white/60 text-sm">
                    {vault.supplyAsset.symbol}
                  </span>
                </td>

                {/* Shares */}
                <td className="px-4 py-4 text-center">
                  <span className="text-white font-bold text-sm tabular-nums">
                    {parseFloat(sharesFormatted).toLocaleString("en-US", {
                      maximumFractionDigits: 4,
                    })}
                  </span>
                  <p className="text-white/30 text-xs mt-0.5">shares</p>
                </td>

                {/* APY */}
                <td className="px-4 py-4 text-center">
                  {vault.apy7d && vault.apy7d !== "—" ? (
                    <span className="text-sm font-bold text-green-400">
                      {vault.apy7d}
                    </span>
                  ) : (
                    <span className="text-white/20 text-xs">—</span>
                  )}
                </td>

                {/* Status */}
                <td className="px-4 py-4 text-center">
                  {vault.status === "active" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-medium text-green-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                      Active
                    </span>
                  ) : vault.status === "paused" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2.5 py-1 text-xs font-medium text-yellow-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                      Paused
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/40">
                      <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
                      {vault.status}
                    </span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-4 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onDeposit?.(vault)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#229EDF] hover:bg-[#1a8bc7] text-white transition-colors"
                    >
                      Deposit
                    </button>
                    <button
                      onClick={() => onWithdraw?.(vault)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                    >
                      Withdraw
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default MyVaultPositions;
