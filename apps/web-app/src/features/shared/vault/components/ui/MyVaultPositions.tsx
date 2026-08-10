"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { fromSmallestUnit } from "@neko/orchestrator";
import { getTokenIconFitClass } from "@/lib/helpers/tokenDisplay";
import { Wallet, Coins, Info } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useVaultData } from "../../hooks/useVaultData";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { useFxRate } from "@/hooks/useFxRate";
import { useCurrencyStore } from "@/stores/currency.store";
import { convertUsdToSelected, formatCurrency } from "@/lib/helpers/currency";
import { useLocaleFormatter } from "@/lib/helpers/useLocaleFormatter";
import { useVaultEarningsCard } from "../../hooks/useVaultEarningsCard";
import { ClaimEarningsButton } from "./ClaimEarningsButton";
import type { VaultView } from "../../types/vault";

const ONE_SHARE = 1_000_000_000_000n;

function ColTooltip({ label, tip }: { label: string; tip: string }) {
  const [anchor, setAnchor] = React.useState<{ x: number; y: number } | null>(
    null
  );

  return (
    <div className="inline-flex items-center gap-1.5 justify-center">
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

function useVaultPosition(
  vaultId: string,
  userShares: bigint,
  assetSymbol: string
): {
  deposited: string;
  usdValue: string;
  formatTokensAsCurrency: (n: number) => string | null;
} {
  const { data } = useVaultData(vaultId);
  const { price } = useTokenPrice(assetSymbol);
  const selectedCurrency = useCurrencyStore((s) => s.selectedCurrency);
  const { rate: fxRate } = useFxRate({ currency: selectedCurrency });

  const formatTokensAsCurrency = (n: number) =>
    price > 0
      ? formatCurrency(
          convertUsdToSelected(n * price, fxRate),
          selectedCurrency,
          2
        )
      : null;

  if (!data?.pricePerShare || userShares === 0n)
    return { deposited: "", usdValue: "", formatTokensAsCurrency };

  const underlyingStroops = (userShares * data.pricePerShare) / ONE_SHARE;
  const underlyingAmount = parseFloat(
    fromSmallestUnit(underlyingStroops.toString(), 7)
  );
  const deposited = `${underlyingAmount.toFixed(2)} ${assetSymbol}`;
  const usdValue = formatTokensAsCurrency(underlyingAmount) ?? "";
  return { deposited, usdValue, formatTokensAsCurrency };
}

interface VaultPositionRowProps {
  vault: VaultView;
  rawBalance: bigint;
  netDepositedTokens: number | null;
  earningsTokens: number | null;
  onOpen: (vault: VaultView) => void;
}

function VaultPositionRow({
  vault,
  rawBalance,
  netDepositedTokens,
  earningsTokens,
  onOpen,
}: VaultPositionRowProps) {
  const { formatNumber } = useLocaleFormatter();
  const { deposited, usdValue, formatTokensAsCurrency } = useVaultPosition(
    vault.id,
    rawBalance,
    vault.supplyAsset.symbol
  );

  const sym = vault.supplyAsset.symbol;

  const depositedDisplay =
    netDepositedTokens !== null
      ? `${formatNumber(netDepositedTokens, 2)} ${sym}`
      : null;

  return (
    <tr
      role="link"
      tabIndex={0}
      onClick={() => onOpen(vault)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(vault);
        }
      }}
      className="border-b border-white/5 last:border-0 hover:bg-white/4 transition-colors cursor-pointer focus-visible:outline-none focus-visible:bg-white/4"
    >
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
        <span className="text-white/60 text-sm">{sym}</span>
      </td>

      {/* Deposited = principal only (from audit logs) */}
      <td className="px-4 py-4 text-center">
        <span className="text-white font-bold text-sm tabular-nums">
          {depositedDisplay ?? deposited ?? "—"}
        </span>
      </td>

      {/* Earnings = difference in selected currency, always ≥ 0 */}
      <td className="px-4 py-4 text-center">
        {earningsTokens !== null ? (
          <span className="text-sm font-bold tabular-nums text-green-400">
            +
            {formatTokensAsCurrency(Math.max(0, earningsTokens)) ??
              Math.max(0, earningsTokens).toFixed(2)}
          </span>
        ) : (
          <span className="text-white/20 text-xs">—</span>
        )}
      </td>

      {/* Current Value = principal + earnings */}
      <td className="px-4 py-4 text-center">
        <span className="text-sm tabular-nums font-bold">
          <span className="text-green-400">
            {deposited ? deposited.split(" ")[0] : "—"}
          </span>
          {deposited && (
            <span className="text-white/50 font-normal"> {sym}</span>
          )}
        </span>
        {usdValue && (
          <p className="text-white/35 text-xs tabular-nums mt-0.5">
            {usdValue}
          </p>
        )}
      </td>

      <td className="px-4 py-4 text-center">
        {vault.apy7d && vault.apy7d !== "" ? (
          <span className="text-sm font-bold text-green-400">
            {vault.apy7d}
          </span>
        ) : (
          <span className="text-white/20 text-xs"></span>
        )}
      </td>

      <td className="px-4 py-4 text-center">
        {earningsTokens !== null &&
        netDepositedTokens !== null &&
        Math.max(0, earningsTokens) > 0.001 ? (
          <ClaimEarningsButton
            vaultContractId={vault.id}
            earningsTokens={Math.max(0, earningsTokens)}
            netDepositedTokens={netDepositedTokens}
            supplyAssetSymbol={sym}
          />
        ) : (
          <span className="text-white/20 text-xs">—</span>
        )}
      </td>
    </tr>
  );
}

interface MyVaultPositionsProps {
  vaults: VaultView[];
  userBalances: Record<string, bigint>;
}

const MyVaultPositions: React.FC<MyVaultPositionsProps> = ({
  vaults,
  userBalances,
}) => {
  const t = useTranslations("sharedVault.positions");
  const router = useRouter();
  const { address } = useWallet();
  const openVault = (vault: VaultView) => {
    router.push(`/vaults/${encodeURIComponent(vault.id)}`);
  };

  const positionVaults = vaults.filter((v) => (userBalances[v.id] ?? 0n) > 0n);
  const earningsData = useVaultEarningsCard(positionVaults, userBalances);

  if (!address) {
    return (
      <div className="w-full rounded-2xl bg-[#1C1C1C] border border-white/5 p-12 text-center">
        <Wallet className="h-8 w-8 text-white/20 mx-auto mb-3" />
        <p className="text-white/40 text-sm">{t("connectWallet")}</p>
      </div>
    );
  }

  if (positionVaults.length === 0) {
    return (
      <div className="w-full rounded-2xl bg-[#1C1C1C] border border-white/5 p-12 text-center">
        <Coins className="h-8 w-8 text-white/20 mx-auto mb-3" />
        <p className="text-white/40 text-sm">{t("noPositions")}</p>
      </div>
    );
  }

  const earningsByVaultId = Object.fromEntries(
    earningsData.perVault.map((v) => [
      v.vaultId,
      v.hasAuditData ? v.earningsTokens : null,
    ])
  );

  const netDepositedByVaultId = Object.fromEntries(
    earningsData.perVault.map((v) => [
      v.vaultId,
      v.hasAuditData ? v.netDepositedTokens : null,
    ])
  );

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-white/5 bg-[#1C1C1C]">
      <div className="flex items-center px-4 py-3 border-b border-white/5">
        <span className="text-white/40 text-xs font-semibold uppercase tracking-wide">
          {t("title")}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-4 py-3 text-left">
                <span className="text-white/40 text-sm font-semibold">
                  {t("vault")}
                </span>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="text-white/40 text-sm font-semibold">
                  {t("asset")}
                </span>
              </th>
              <th className="px-4 py-3 text-center">
                <span className="text-white/40 text-sm font-semibold">
                  <ColTooltip
                    label={t("deposited")}
                    tip={t("depositedTooltip")}
                  />
                </span>
              </th>
              <th className="px-4 py-3 text-center">
                <span className="text-white/40 text-sm font-semibold">
                  <ColTooltip
                    label={t("earnings")}
                    tip={t("earningsTooltip")}
                  />
                </span>
              </th>
              <th className="px-4 py-3 text-center">
                <span className="text-white/40 text-sm font-semibold">
                  <ColTooltip
                    label={t("currentValue")}
                    tip={t("currentValueTooltip")}
                  />
                </span>
              </th>
              <th className="px-4 py-3 text-center">
                <span className="text-white/40 text-sm font-semibold">
                  <ColTooltip label={t("apy")} tip={t("apyTooltip")} />
                </span>
              </th>
              <th className="px-4 py-3 text-center">
                <span className="text-white/40 text-sm font-semibold">
                  {t("claimEarnings")}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {positionVaults.map((vault) => (
              <VaultPositionRow
                key={vault.id}
                vault={vault}
                rawBalance={userBalances[vault.id] ?? 0n}
                netDepositedTokens={netDepositedByVaultId[vault.id] ?? null}
                earningsTokens={earningsByVaultId[vault.id] ?? null}
                onOpen={openVault}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MyVaultPositions;
