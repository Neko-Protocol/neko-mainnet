"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import {
  getTokenIconFitClass,
  fromSmallestUnit,
} from "@/lib/helpers/tokenUtils";
import { useVaultData } from "@/features/shared/vault/hooks/useVaultData";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import type { VaultPositionEntry } from "@/features/expert/dashboard/hooks/useDashboardVaultPositions";

const DEFAULT_MAX_ROWS = 4;
const ONE_SHARE = 1_000_000_000_000n;

function VaultAmountAndValue({
  vaultId,
  userShares,
  assetSymbol,
}: {
  vaultId: string;
  userShares: bigint;
  assetSymbol: string;
}) {
  const { data } = useVaultData(vaultId);
  const { price } = useTokenPrice(assetSymbol);

  if (!data?.pricePerShare || userShares === 0n) {
    return (
      <>
        <td className="px-4 py-3.5 align-middle text-right">
          <span className="text-white font-semibold text-sm tabular-nums">
            —
          </span>
        </td>
        <td className="px-4 py-3.5 align-middle text-right">
          <span className="text-white font-semibold text-sm tabular-nums">
            —
          </span>
        </td>
      </>
    );
  }

  const underlyingStroops = (userShares * data.pricePerShare) / ONE_SHARE;
  const underlyingAmount = parseFloat(
    fromSmallestUnit(underlyingStroops.toString(), 7)
  );

  return (
    <>
      <td className="px-4 py-3.5 align-middle text-right">
        <p className="text-white font-semibold text-sm tabular-nums">
          {underlyingAmount.toFixed(2)}{" "}
          <span className="text-white/50 font-normal">{assetSymbol}</span>
        </p>
      </td>
      <td className="px-4 py-3.5 align-middle text-right">
        <p className="text-white font-semibold text-sm tabular-nums">
          {price ? `$${(underlyingAmount * price).toFixed(2)}` : "—"}
        </p>
      </td>
    </>
  );
}

export interface VaultPositionsTableProps {
  positions: VaultPositionEntry[];
  maxRows?: number;
}

export function VaultPositionsTable({
  positions,
  maxRows = DEFAULT_MAX_ROWS,
}: VaultPositionsTableProps) {
  const router = useRouter();
  const tableRows = positions.slice(0, maxRows);
  const hiddenCount = positions.length - tableRows.length;

  return (
    <div className="rounded-2xl border border-white/5 bg-[#1C1C1C] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
        <span className="text-white/30 text-xs font-semibold uppercase tracking-wide">
          Vaults
        </span>
        <Link
          href="/vaults"
          className="flex items-center gap-1 text-xs text-white/30 hover:text-white transition-colors"
        >
          Manage
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-4 py-3 text-left text-xs font-medium text-white/30 uppercase tracking-wide w-16">
                Asset
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/30 uppercase tracking-wide">
                Vault
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-white/30 uppercase tracking-wide">
                Deposited
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-white/30 uppercase tracking-wide">
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map(({ vault, userShares }) => (
              <tr
                key={vault.id}
                onClick={() => router.push("/vaults")}
                className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                <td className="px-4 py-3.5 align-middle w-16">
                  <div className="relative h-9 w-9 shrink-0 rounded-full border-2 border-[#1C1C1C] bg-[#222] flex items-center justify-center overflow-hidden">
                    <Image
                      src={vault.supplyAsset.iconSrc}
                      alt={vault.supplyAsset.symbol}
                      width={36}
                      height={36}
                      unoptimized
                      className={getTokenIconFitClass(vault.supplyAsset.symbol)}
                    />
                  </div>
                </td>
                <td className="px-4 py-3.5 align-middle min-w-0">
                  <p className="text-white font-semibold text-sm truncate">
                    {vault.name}
                  </p>
                  <p className="text-white/40 text-xs mt-0.5 truncate">
                    {vault.supplyAsset.symbol}
                    {vault.apy7d && vault.apy7d !== "—" && (
                      <span className="ml-1.5 text-[#76C464]">
                        {vault.apy7d} APY
                      </span>
                    )}
                  </p>
                </td>
                <VaultAmountAndValue
                  vaultId={vault.id}
                  userShares={userShares}
                  assetSymbol={vault.supplyAsset.symbol}
                />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hiddenCount > 0 && (
        <div className="px-4 py-3 border-t border-white/5 text-center">
          <Link
            href="/vaults"
            className="text-xs text-white/40 hover:text-white transition-colors"
          >
            +{hiddenCount} more in Vaults
          </Link>
        </div>
      )}
    </div>
  );
}
