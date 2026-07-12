"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { useVaultData } from "@/features/shared/vault/hooks/useVaultData";
import { getTokenIconFitClass } from "@/lib/helpers/tokenUtils";
import { fromSmallestUnit } from "@/lib/helpers/tokenUtils";
import type { BearingYieldPosition } from "../../hooks/useBearingYieldPositions";
import type { VaultPositionEntry } from "../../hooks/useDashboardVaultPositions";

const ONE_SHARE = 1_000_000_000_000n;

function WalletValueCell({ code, balance }: { code: string; balance: string }) {
  const { price } = useTokenPrice(code);
  const value = price > 0 ? price * parseFloat(balance) : null;
  return (
    <td className="px-4 py-3.5 align-middle text-right">
      <p className="text-white font-semibold text-sm tabular-nums">
        {value != null ? `$${value.toFixed(2)}` : "—"}
      </p>
    </td>
  );
}

function VaultBalanceAndValue({
  vaultEntry,
  assetSymbol,
  decimals,
}: {
  vaultEntry: VaultPositionEntry;
  assetSymbol: string;
  decimals: number;
}) {
  const { data } = useVaultData(vaultEntry.vault.id);
  const { price } = useTokenPrice(assetSymbol);

  if (!data?.pricePerShare || vaultEntry.userShares === 0n) {
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

  const underlyingStroops =
    (vaultEntry.userShares * data.pricePerShare) / ONE_SHARE;
  const amount = parseFloat(
    fromSmallestUnit(underlyingStroops.toString(), decimals)
  );
  const value = price > 0 ? price * amount : null;

  return (
    <>
      <td className="px-4 py-3.5 align-middle text-right">
        <p className="text-white font-semibold text-sm tabular-nums">
          {amount.toFixed(2)}{" "}
          <span className="text-white/50 font-normal">{assetSymbol}</span>
        </p>
      </td>
      <td className="px-4 py-3.5 align-middle text-right">
        <p className="text-white font-semibold text-sm tabular-nums">
          {value != null ? `$${value.toFixed(2)}` : "—"}
        </p>
      </td>
    </>
  );
}

export function BearingYieldTable({
  positions,
  yieldsMap,
}: {
  positions: BearingYieldPosition[];
  yieldsMap: Record<string, number>;
}) {
  const router = useRouter();

  return (
    <div className="rounded-2xl border border-white/5 bg-[#1C1C1C] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-4 py-3 text-left text-xs font-medium text-white/30 uppercase tracking-wide w-16">
                Asset
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/30 uppercase tracking-wide">
                Yield-Bearing Asset
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-white/30 uppercase tracking-wide">
                Balance
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-white/30 uppercase tracking-wide">
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            {positions.map((pos) => {
              const apy = yieldsMap[pos.asset.code.toUpperCase()];
              const isVault = pos.source === "vault";
              const rowKey = isVault
                ? `vault-${pos.vaultEntry.vault.id}`
                : `wallet-${pos.asset.code}`;

              return (
                <tr
                  key={rowKey}
                  onClick={() =>
                    isVault
                      ? router.push(`/vaults/${pos.vaultEntry.vault.id}`)
                      : router.push(`/discover/${pos.asset.code}`)
                  }
                  className="border-b border-white/5 last:border-b-0 hover:bg-white/4 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3.5 align-middle w-16">
                    <div className="relative h-9 w-9 shrink-0 rounded-full border-2 border-[#1C1C1C] bg-[#222] flex items-center justify-center overflow-hidden">
                      <Image
                        src={pos.asset.icon}
                        alt={pos.asset.code}
                        width={36}
                        height={36}
                        unoptimized
                        className={getTokenIconFitClass(pos.asset.code)}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3.5 align-middle min-w-0">
                    <p className="text-white font-semibold text-sm truncate">
                      {pos.asset.name}
                    </p>
                    <p className="text-white/40 text-xs mt-0.5">
                      {pos.asset.code}
                      {apy != null && (
                        <span className="ml-1.5 text-[#76C464]">
                          ~{apy.toFixed(2)}% APY
                        </span>
                      )}
                      {isVault && (
                        <span className="ml-1.5 text-white/25 truncate">
                          · deposited in {pos.vaultEntry.vault.name}
                        </span>
                      )}
                    </p>
                  </td>
                  {isVault ? (
                    <VaultBalanceAndValue
                      vaultEntry={pos.vaultEntry}
                      assetSymbol={pos.asset.code}
                      decimals={pos.asset.decimals}
                    />
                  ) : (
                    <>
                      <td className="px-4 py-3.5 align-middle text-right">
                        <p className="text-white font-semibold text-sm tabular-nums">
                          {parseFloat(pos.balance).toFixed(2)}{" "}
                          <span className="text-white/50 font-normal">
                            {pos.asset.code}
                          </span>
                        </p>
                      </td>
                      <WalletValueCell
                        code={pos.asset.code}
                        balance={pos.balance}
                      />
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
