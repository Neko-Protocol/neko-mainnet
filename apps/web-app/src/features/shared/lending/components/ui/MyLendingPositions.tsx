"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Wallet,
  Coins,
  Layers,
  TrendingUp,
  ChevronDown,
  Shield,
  ArrowUpFromLine,
  Zap,
  Sparkles,
} from "lucide-react";
import { useUserLendingPositions } from "../../hooks/useUserLendingPositions";
import { useUserPositions } from "@/features/expert/dashboard/hooks/useUserPositions";
import { usePoolAction } from "@/lib/orchestrator";
import { ColHeader } from "./ColHeader";
import MyBorrowPositions from "@/features/shared/borrowing/components/ui/MyBorrowPositions";
import { getPoolTokenIcon } from "@/features/shared/pools/utils/poolTokenIcons";
import { getTokenIconFitClass } from "@/lib/helpers/tokenUtils";
import { getAssetsConfig } from "@/lib/constants/assets.config";
import { safeParseFloat } from "@/lib/helpers/formatUtils";
import { atomicToDecimal } from "@/lib/helpers/amount";

const PROTOCOL_ICONS: Record<string, string> = {
  neko: "/neko-logo.png",
  soroswap: "/assets/vault-creators/soroswap.jpg",
  aqua: "https://coin-images.coingecko.com/coins/images/20026/small/aqua-logo.png?1696519446",
  blend: "/assets/vault-creators/blend.png",
};

interface UnifiedPosition {
  key: string;
  protocolId: string;
  assetCode: string;
  poolName: string;
  depositedFormatted: string;
  /** Raw atomic withdrawable supply amount for the MAX button */
  depositedRaw: string;
  collateralRaw?: string;
  decimals: number;
  withdrawUnit?: "underlying" | "lp_shares";
  secondaryDepositedAmount?: string;
  secondaryAssetCode?: string;
  apy: string;
  /** orchestratorId for aggregated pools, undefined for Neko */
  orchestratorId?: string;
  hasEmissions?: boolean;
}

interface MyPositionsProps {
  defaultTab?: "lend" | "borrow";
  onWithdraw?: (
    assetCode: string,
    protocolId: string,
    depositedRaw: string,
    orchestratorId?: string,
    action?: "withdraw" | "withdrawCollateral",
    decimals?: number,
    withdrawUnit?: "underlying" | "lp_shares",
    secondaryDepositedAmount?: string,
    secondaryAssetCode?: string
  ) => void;
}

function PoolIcon({ assetCode }: { assetCode: string }) {
  const icon = getPoolTokenIcon({ type: "contract", code: assetCode });
  return (
    <div className="w-6 h-6 rounded-full bg-[#1a2a4a] border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
      {icon ? (
        <Image
          src={icon}
          alt={assetCode}
          width={24}
          height={24}
          unoptimized
          className={getTokenIconFitClass(assetCode)}
        />
      ) : (
        <span className="text-white text-[9px] font-bold">{assetCode[0]}</span>
      )}
    </div>
  );
}

function PoolCell({
  assetCode,
  secondaryAssetCode,
}: {
  assetCode: string;
  secondaryAssetCode?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      {secondaryAssetCode ? (
        <div className="relative h-6 w-10 shrink-0">
          <div className="absolute left-0 top-0">
            <PoolIcon assetCode={assetCode} />
          </div>
          <div className="absolute left-4 top-0">
            <PoolIcon assetCode={secondaryAssetCode} />
          </div>
        </div>
      ) : (
        <PoolIcon assetCode={assetCode} />
      )}
      <span className="text-white font-medium text-sm">
        {assetCode}
        {secondaryAssetCode ? (
          <span className="text-white/50"> / {secondaryAssetCode}</span>
        ) : null}
      </span>
    </div>
  );
}

function formatPositionAmount(amount: string, assetCode: string): string {
  return `${safeParseFloat(amount).toFixed(2)} ${assetCode}`;
}

function PositionTypeFilter({
  value,
  onChange,
}: {
  value: "lend" | "borrow";
  onChange: (v: "lend" | "borrow") => void;
}) {
  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as "lend" | "borrow")}
        className="appearance-none rounded-lg border border-white/10 bg-[#1C1C1C] py-1.5 pl-3 pr-7 text-xs text-white/90 outline-none cursor-pointer"
      >
        <option value="lend">Lending</option>
        <option value="borrow">Borrowing</option>
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/45"
        aria-hidden
      />
    </div>
  );
}

const MyPositions: React.FC<MyPositionsProps> = ({
  defaultTab = "lend",
  onWithdraw,
}) => {
  const [activeTab, setActiveTab] = useState<"lend" | "borrow">(defaultTab);
  const { mutate: executePoolAction, isPending: isClaimPending } =
    usePoolAction();
  const [claimingPoolId, setClaimingPoolId] = useState<string | null>(null);

  const {
    positions: nekoPositions,
    isLoading: isLoadingNeko,
    hasWallet,
  } = useUserLendingPositions();
  const { positions: allPositions, isLoading: isLoadingAggregated } =
    useUserPositions();

  const aggregatedPositions = allPositions.filter(
    (p) => p.pool.type !== "neko" && p.position.deposited > 0n
  );

  const isLoading = isLoadingNeko || isLoadingAggregated;

  const unified: UnifiedPosition[] = [
    ...nekoPositions.map((pos) => ({
      key: `neko-${pos.assetCode}`,
      protocolId: "neko",
      assetCode: pos.assetCode,
      poolName: `${pos.assetCode} Pool`,
      depositedFormatted: formatPositionAmount(
        pos.depositedFormatted,
        pos.assetCode
      ),
      depositedRaw: pos.depositedRaw.toString(),
      decimals: 7,
      apy: `${pos.interestRate.toFixed(2)}%`,
      orchestratorId: `neko:${pos.assetCode}`,
    })),
    ...aggregatedPositions.map((pos) => {
      const decimals = pos.pool.tokens[0]?.decimals ?? 7;
      const suppliedRaw = String(
        pos.position.metadata?.supplied ?? pos.position.deposited.toString()
      );
      const collateralRaw = String(pos.position.metadata?.collateral ?? "0");
      const withdrawRaw =
        pos.pool.type === "blend"
          ? suppliedRaw
          : pos.position.deposited.toString();
      const withdrawUnit =
        pos.pool.type === "aqua" || pos.pool.type === "soroswap"
          ? (pos.position.metadata?.withdrawUnit as
              | "underlying"
              | "lp_shares"
              | undefined)
          : undefined;
      const underlyingAmountsRaw = pos.position.metadata
        ?.underlyingAmountsRaw as string[] | undefined;
      const secondaryRaw =
        (pos.pool.type === "aqua" || pos.pool.type === "soroswap") &&
        withdrawUnit === "underlying"
          ? underlyingAmountsRaw?.[1]
          : undefined;
      const secondaryDecimals = pos.pool.tokens[1]?.decimals ?? 7;
      const secondaryDepositedAmount =
        secondaryRaw != null
          ? atomicToDecimal(BigInt(secondaryRaw), secondaryDecimals)
          : undefined;
      const secondaryAssetCode =
        secondaryDepositedAmount != null ? pos.pool.tokens[1]?.code : undefined;
      return {
        key: `agg-${pos.pool.id}`,
        protocolId: pos.pool.type,
        assetCode: pos.pool.tokens[0]?.code ?? "?",
        poolName: pos.pool.name,
        depositedFormatted: formatPositionAmount(
          pos.position.depositedFormatted,
          pos.pool.tokens[0]?.code ?? ""
        ),
        depositedRaw: withdrawRaw,
        collateralRaw,
        decimals,
        withdrawUnit,
        secondaryDepositedAmount,
        secondaryAssetCode,
        apy: `${pos.pool.apy.toFixed(2)}%`,
        orchestratorId: pos.pool.id,
        hasEmissions: !!pos.pool.metadata?.hasEmissions,
      };
    }),
  ];

  const colSpan = 5;

  if (!hasWallet) {
    return (
      <div className="w-full rounded-2xl bg-[#1C1C1C] border border-white/5 p-12 text-center">
        <Wallet className="h-8 w-8 text-white/20 mx-auto mb-3" />
        <p className="text-white/40 text-sm">
          Connect your wallet to see your positions
        </p>
      </div>
    );
  }

  if (activeTab === "borrow") {
    return (
      <MyBorrowPositions
        headerAction={
          <PositionTypeFilter value={activeTab} onChange={setActiveTab} />
        }
      />
    );
  }

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-white/5 bg-[#1C1C1C]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <span className="text-white/40 text-xs font-semibold uppercase tracking-wide">
          Your Lending Positions
        </span>
        <PositionTypeFilter value={activeTab} onChange={setActiveTab} />
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b border-white/5">
            <ColHeader icon={Shield} label="Protocol" centered />
            <ColHeader icon={Layers} label="Pool" />
            <ColHeader
              icon={Coins}
              label="Deposited"
              tooltip="Amount currently deposited"
              centered
            />
            <ColHeader
              icon={TrendingUp}
              label="APY"
              tooltip="Annual yield on your deposit"
              centered
            />
            <ColHeader icon={Zap} label="Actions" centered />
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td
                colSpan={colSpan}
                className="px-4 py-12 text-center text-white/40 text-sm"
              >
                Loading your positions...
              </td>
            </tr>
          ) : unified.length === 0 ? (
            <tr>
              <td
                colSpan={colSpan}
                className="px-4 py-12 text-center text-white/40 text-sm"
              >
                You don&apos;t have any active lending positions yet.
              </td>
            </tr>
          ) : (
            unified.map((pos) => {
              const logoSrc = PROTOCOL_ICONS[pos.protocolId];
              return (
                <tr
                  key={pos.key}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-4 text-center">
                    {logoSrc ? (
                      <Image
                        src={logoSrc}
                        alt={pos.protocolId}
                        width={24}
                        height={24}
                        unoptimized
                        className="rounded-full object-cover w-6 h-6 mx-auto"
                      />
                    ) : (
                      <span className="inline-flex w-6 h-6 rounded-full bg-white/10 items-center justify-center text-[9px] font-bold text-white mx-auto">
                        {pos.protocolId.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <PoolCell
                      assetCode={pos.assetCode}
                      secondaryAssetCode={pos.secondaryAssetCode}
                    />
                  </td>
                  <td className="px-4 py-4 text-center text-sm tabular-nums">
                    <div className="font-bold text-white">
                      {pos.depositedFormatted}
                    </div>
                    {pos.secondaryDepositedAmount && pos.secondaryAssetCode && (
                      <div className="mt-1 font-semibold text-white/65">
                        {formatPositionAmount(
                          pos.secondaryDepositedAmount,
                          pos.secondaryAssetCode
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center text-white text-sm">
                    {pos.apy}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="inline-flex items-center gap-2">
                      {onWithdraw && BigInt(pos.depositedRaw || "0") > 0n && (
                        <button
                          onClick={() =>
                            onWithdraw(
                              pos.assetCode,
                              pos.protocolId,
                              pos.depositedRaw,
                              pos.orchestratorId,
                              "withdraw",
                              pos.decimals,
                              pos.withdrawUnit,
                              pos.secondaryDepositedAmount,
                              pos.secondaryAssetCode
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#229EDF] hover:bg-[#1a8bc7] text-white text-xs font-semibold transition-colors"
                        >
                          <ArrowUpFromLine className="h-3.5 w-3.5" />
                          Withdraw
                        </button>
                      )}
                      {onWithdraw &&
                        pos.protocolId === "blend" &&
                        pos.orchestratorId &&
                        BigInt(pos.collateralRaw || "0") > 0n && (
                          <button
                            onClick={() =>
                              onWithdraw(
                                pos.assetCode,
                                pos.protocolId,
                                pos.collateralRaw!,
                                pos.orchestratorId,
                                "withdrawCollateral",
                                pos.decimals
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
                          >
                            <ArrowUpFromLine className="h-3.5 w-3.5" />
                            Remove Collateral
                          </button>
                        )}
                      {pos.hasEmissions && pos.orchestratorId && (
                        <button
                          disabled={
                            claimingPoolId === pos.orchestratorId &&
                            isClaimPending
                          }
                          onClick={() => {
                            setClaimingPoolId(pos.orchestratorId!);
                            const cfg = getAssetsConfig()[pos.assetCode];
                            const auditToken = cfg
                              ? {
                                  address: cfg.contract,
                                  code: cfg.code,
                                  name: cfg.name,
                                  decimals: cfg.decimals,
                                }
                              : {
                                  address: "",
                                  code: pos.assetCode,
                                  name: pos.assetCode,
                                  decimals: 7,
                                };
                            executePoolAction(
                              {
                                poolId: pos.orchestratorId!,
                                action: "claimRewards",
                                amount: 0n,
                                audit: {
                                  tokens: [auditToken],
                                  poolType: pos.protocolId as
                                    | "blend"
                                    | "aqua"
                                    | "soroswap"
                                    | "neko",
                                  metadata: {},
                                },
                              },
                              { onSettled: () => setClaimingPoolId(null) }
                            );
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          {claimingPoolId === pos.orchestratorId &&
                          isClaimPending
                            ? "Claiming…"
                            : "Claim"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default MyPositions;
