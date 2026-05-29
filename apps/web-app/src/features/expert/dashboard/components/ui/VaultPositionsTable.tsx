"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  getTokenIconFitClass,
  fromSmallestUnit,
} from "@/lib/helpers/tokenUtils";
import { Info } from "lucide-react";
import { useVaultData } from "@/features/shared/vault/hooks/useVaultData";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { useFxRate } from "@/hooks/useFxRate";
import { useCurrencyStore } from "@/stores/currency.store";
import { convertUsdToSelected, formatCurrency } from "@/lib/helpers/currency";
import { useVaultEarningsCard } from "@/features/shared/vault/hooks/useVaultEarningsCard";
import type { VaultPositionEntry } from "@/features/expert/dashboard/hooks/useDashboardVaultPositions";

function ColTooltip({ label, tip }: { label: string; tip: string }) {
  const [anchor, setAnchor] = React.useState<{ x: number; y: number } | null>(
    null
  );

  return (
    <div className="inline-flex items-center gap-1.5 justify-end">
      <span>{label}</span>
      <div
        className="relative"
        onMouseEnter={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setAnchor({ x: r.left + r.width / 2, y: r.bottom + 6 });
        }}
        onMouseLeave={() => setAnchor(null)}
      >
        <Info className="h-3.5 w-3.5 text-white/35 cursor-help" />
        {anchor && (
          <div
            style={{
              position: "fixed",
              left: anchor.x,
              top: anchor.y,
              transform: "translateX(-50%)",
              zIndex: 9999,
            }}
            className="w-56 rounded-xl bg-[#2A2A2A] border border-white/10 px-3 py-2 text-xs leading-relaxed text-white/70 shadow-xl text-center pointer-events-none"
          >
            {tip}
          </div>
        )}
      </div>
    </div>
  );
}

const DEFAULT_MAX_ROWS = 4;
const ONE_SHARE = 1_000_000_000_000n;

function VaultAmountAndValue({
  vaultId,
  userShares,
  assetSymbol,
  netDepositedTokens,
  earningsTokens,
}: {
  vaultId: string;
  userShares: bigint;
  assetSymbol: string;
  netDepositedTokens: number | null;
  earningsTokens: number | null;
}) {
  const { data } = useVaultData(vaultId);
  const { price } = useTokenPrice(assetSymbol);
  const selectedCurrency = useCurrencyStore((s) => s.selectedCurrency);
  const { rate: fxRate } = useFxRate({ currency: selectedCurrency });

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
        <td className="px-4 py-3.5 align-middle text-right">
          <span className="text-white/20 text-sm">—</span>
        </td>
      </>
    );
  }

  const underlyingStroops = (userShares * data.pricePerShare) / ONE_SHARE;
  const underlyingAmount = parseFloat(
    fromSmallestUnit(underlyingStroops.toString(), 7)
  );

  const depositedDisplay =
    netDepositedTokens !== null
      ? `${netDepositedTokens.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${assetSymbol}`
      : `${underlyingAmount.toFixed(2)} ${assetSymbol}`;

  return (
    <>
      {/* Deposited = principal only */}
      <td className="px-4 py-3.5 align-middle text-right">
        <p className="text-white font-semibold text-sm tabular-nums">
          {depositedDisplay}
        </p>
      </td>
      {/* Earnings = difference */}
      <td className="px-4 py-3.5 align-middle text-right">
        {earningsTokens !== null ? (
          <span className="text-sm font-semibold tabular-nums text-green-400">
            +
            {price > 0
              ? formatCurrency(
                  convertUsdToSelected(
                    Math.max(0, earningsTokens) * price,
                    fxRate
                  ),
                  selectedCurrency,
                  2
                )
              : Math.max(0, earningsTokens).toFixed(2)}
          </span>
        ) : (
          <span className="text-white/20 text-sm">—</span>
        )}
      </td>
      {/* Current Value = principal + earnings */}
      <td className="px-4 py-3.5 align-middle text-right">
        <p className="text-sm tabular-nums font-semibold">
          <span className="text-green-400">{underlyingAmount.toFixed(2)}</span>
          <span className="text-white/50 font-normal"> {assetSymbol}</span>
        </p>
        {price > 0 && (
          <p className="text-white/35 text-xs tabular-nums mt-0.5">
            {formatCurrency(
              convertUsdToSelected(underlyingAmount * price, fxRate),
              selectedCurrency,
              2
            )}
          </p>
        )}
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

  const positionVaults = useMemo(
    () => tableRows.map((p) => p.vault),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tableRows.map((p) => p.vault.id).join(",")]
  );

  const userBalances = useMemo(() => {
    const map: Record<string, bigint> = {};
    for (const { vault, userShares } of tableRows) {
      map[vault.id] = userShares;
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableRows.map((p) => `${p.vault.id}:${p.userShares}`).join(",")]);

  const earningsData = useVaultEarningsCard(positionVaults, userBalances);

  const earningsByVaultId = useMemo(
    () =>
      Object.fromEntries(
        earningsData.perVault.map((v) => [
          v.vaultId,
          v.hasAuditData ? v.earningsTokens : null,
        ])
      ),
    [earningsData.perVault]
  );

  const netDepositedByVaultId = useMemo(
    () =>
      Object.fromEntries(
        earningsData.perVault.map((v) => [
          v.vaultId,
          v.hasAuditData ? v.netDepositedTokens : null,
        ])
      ),
    [earningsData.perVault]
  );

  return (
    <div className="rounded-2xl border border-white/5 bg-[#1C1C1C] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-4 py-3 text-left text-sm font-semibold text-white/40 w-16">
                Asset
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-white/40">
                Vault
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-white/40">
                <ColTooltip
                  label="Deposited"
                  tip="The total amount you have deposited, not including earnings."
                />
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-white/40">
                <ColTooltip
                  label="Earnings"
                  tip="The profit you have earned since your first deposit."
                />
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-white/40">
                <ColTooltip
                  label="Current Value"
                  tip="Your current balance including all earnings generated so far."
                />
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-white/40">
                <ColTooltip
                  label="APY"
                  tip="Annual Percentage Yield — the estimated yearly return based on the last 7 days of vault activity."
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map(({ vault, userShares }) => (
              <tr
                key={vault.id}
                onClick={() => router.push(`/vaults/${vault.id}`)}
                className="border-b border-white/5 last:border-b-0 hover:bg-white/4 transition-colors cursor-pointer"
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
                  </p>
                </td>
                <VaultAmountAndValue
                  vaultId={vault.id}
                  userShares={userShares}
                  assetSymbol={vault.supplyAsset.symbol}
                  netDepositedTokens={netDepositedByVaultId[vault.id] ?? null}
                  earningsTokens={earningsByVaultId[vault.id] ?? null}
                />
                <td className="px-4 py-3.5 align-middle text-right">
                  {vault.apy7d && vault.apy7d !== "—" ? (
                    <span className="text-sm font-bold text-green-400">
                      {vault.apy7d}
                    </span>
                  ) : (
                    <span className="text-white/20 text-xs">—</span>
                  )}
                </td>
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
            +{hiddenCount} more
          </Link>
        </div>
      )}
    </div>
  );
}
