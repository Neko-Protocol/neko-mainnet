"use client";

import React from "react";
import Image from "next/image";
import { formatAmount } from "@/lib/helpers/formatUtils";
import {
  getTokenIconFitClass,
  fromSmallestUnit,
} from "@/lib/helpers/tokenUtils";
import { Wallet, Coins } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useVaultData } from "../../hooks/useVaultData";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import type { VaultView } from "../../types/vault";

const ONE_SHARE = 1_000_000_000_000n;

function useVaultUsdValue(
  vaultId: string,
  userShares: bigint,
  assetSymbol: string
): string {
  const { data } = useVaultData(vaultId);
  const { price } = useTokenPrice(assetSymbol);

  if (!data?.pricePerShare || !price || userShares === 0n) return "—";

  const underlyingStroops = (userShares * data.pricePerShare) / ONE_SHARE;
  const underlyingAmount = parseFloat(
    fromSmallestUnit(underlyingStroops.toString(), 7)
  );
  const usd = underlyingAmount * price;
  return `$${usd.toFixed(2)}`;
}

interface VaultPositionRowProps {
  vault: VaultView;
  rawBalance: bigint;
  onDeposit?: (vault: VaultView) => void;
  onWithdraw?: (vault: VaultView) => void;
}

function VaultPositionRow({
  vault,
  rawBalance,
  onDeposit,
  onWithdraw,
}: VaultPositionRowProps) {
  const usdValue = useVaultUsdValue(
    vault.id,
    rawBalance,
    vault.supplyAsset.symbol
  );

  return (
    <tr className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#222] flex items-center justify-center overflow-hidden shrink-0">
            <Image
              src={vault.supplyAsset.iconSrc}
              alt={vault.supplyAsset.symbol}
              width={20}
              height={20}
              unoptimized
              className={getTokenIconFitClass(vault.supplyAsset.symbol)}
            />
          </div>
          <span className="text-white font-medium text-sm">{vault.name}</span>
        </div>
      </td>

      <td className="px-4 py-4">
        <span className="text-white/60 text-sm">
          {vault.supplyAsset.symbol}
        </span>
      </td>

      <td className="px-4 py-4 text-center">
        <span className="text-white font-bold text-sm tabular-nums">
          {usdValue}
        </span>
      </td>

      <td className="px-4 py-4 text-center">
        {vault.apy7d && vault.apy7d !== "—" ? (
          <span className="text-sm font-bold text-green-400">
            {vault.apy7d}
          </span>
        ) : (
          <span className="text-white/20 text-xs">—</span>
        )}
      </td>

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

      <td className="px-4 py-4">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onDeposit?.(vault)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#229EDF] hover:bg-[#1a8bc7] text-white transition-colors"
          >
            Deposit
          </button>
          <button
            type="button"
            onClick={() => onWithdraw?.(vault)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            Withdraw
          </button>
        </div>
      </td>
    </tr>
  );
}

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

  const positionVaults = vaults.filter((v) => (userBalances[v.id] ?? 0n) > 0n);

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
              <span className="text-white/30 text-xs font-medium">Value</span>
            </th>
            <th className="px-4 py-3 text-center">
              <span className="text-white/30 text-xs font-medium">APY 7d</span>
            </th>
            <th className="px-4 py-3 text-center">
              <span className="text-white/30 text-xs font-medium">Status</span>
            </th>
            <th className="px-4 py-3 pr-24 text-right">
              <span className="text-white/30 text-xs font-medium">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {positionVaults.map((vault) => (
            <VaultPositionRow
              key={vault.id}
              vault={vault}
              rawBalance={userBalances[vault.id] ?? 0n}
              onDeposit={onDeposit}
              onWithdraw={onWithdraw}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MyVaultPositions;
