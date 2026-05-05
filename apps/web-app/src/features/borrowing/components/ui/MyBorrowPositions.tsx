"use client";

import React, { useState, useCallback, useMemo } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet,
  Coins,
  Shield,
  TrendingUp,
  Layers,
  Zap,
  ArrowDownToLine,
} from "lucide-react";

const PROTOCOL_ICONS: Record<string, string> = {
  neko: "/neko-logo.png",
  soroswap: "/assets/vault-creators/soroswap.jpg",
  aqua: "https://coin-images.coingecko.com/coins/images/20026/small/aqua-logo.png?1696519446",
  blend: "/assets/vault-creators/blend.png",
};

function ProtocolLogo({ protocolId }: { protocolId: string }) {
  const src = PROTOCOL_ICONS[protocolId];
  if (src) {
    return (
      <Image
        src={src}
        alt={protocolId}
        width={24}
        height={24}
        unoptimized
        className="rounded-full object-cover w-6 h-6 mx-auto"
      />
    );
  }
  return (
    <span className="inline-flex w-6 h-6 rounded-full bg-white/10 items-center justify-center text-[9px] font-bold text-white mx-auto">
      {protocolId.charAt(0).toUpperCase()}
    </span>
  );
}
import { useWallet } from "@/hooks/useWallet";
import { useUserBorrowPositions } from "../../hooks/useUserBorrowPositions";
import type { BorrowPosition } from "../../hooks/useUserBorrowPositions";
import { useHealthFactor } from "../../hooks/useHealthFactor";
import { useUserPositions } from "@/features/dashboard/hooks/useUserPositions";
import { useRepay } from "../../hooks/useRepay";
import { useRemoveCollateral } from "../../hooks/useRemoveCollateral";
import { HealthFactorBadge } from "./HealthFactorBadge";
import { BorrowQuickActions } from "./BorrowQuickActions";
import { RemoveCollateralModal } from "./RemoveCollateralModal";
import { TokenAvatar } from "./TokenAvatar";
import { ColHeader } from "./ColHeader";
import { RepayModal } from "./RepayModal";
import { RepayPositionModal } from "./RepayPositionModal";
import { getAvailableTokens } from "@/lib/helpers/stellar/soroswap";
import { getTokenBalance } from "@/lib/helpers/stellar/lending";
import { usePoolAction } from "@/lib/orchestrator";
import { formatAmount } from "@/lib/helpers/formatUtils";
import { fromSmallestUnit } from "@/lib/helpers/tokenUtils";
import type { UserPositionWithPool } from "@/features/dashboard/hooks/useUserPositions";
import { STELLAR_DECIMALS } from "@/lib/constants/network";

interface MyBorrowPositionsProps {
  headerAction?: React.ReactNode;
}

const MyBorrowPositions: React.FC<MyBorrowPositionsProps> = ({
  headerAction,
}) => {
  const { address } = useWallet();
  const { positions, isLoading, hasWallet } = useUserBorrowPositions();
  const { pools: hfPools, isLoading: isLoadingHF } = useHealthFactor(
    address ?? undefined
  );
  const { positions: allPositions, isLoading: isLoadingAggregated } =
    useUserPositions();
  const { handleRepay, isLoading: isRepaying, isWalletConnected } = useRepay();
  const {
    handleRemoveCollateral,
    isLoading: isRemoving,
    isWalletConnected: isRemoveWalletConnected,
  } = useRemoveCollateral();

  const { mutateAsync: executePoolAction, isPending: isPoolActionPending } =
    usePoolAction();

  const [repayPosition, setRepayPosition] = useState<BorrowPosition | null>(
    null
  );
  const [removePosition, setRemovePosition] = useState<BorrowPosition | null>(
    null
  );
  const [selectedPosition, setSelectedPosition] =
    useState<BorrowPosition | null>(null);

  // Aggregated repay state
  const [aggregatedRepayPos, setAggregatedRepayPos] =
    useState<UserPositionWithPool | null>(null);

  // Wallet balance for the aggregated repay token
  const aggregatedRepayTokenCode =
    aggregatedRepayPos?.pool.tokens[0]?.code ?? "";
  const aggregatedRepayAssetContract = useMemo(
    () => getAvailableTokens()[aggregatedRepayTokenCode]?.contract ?? "",
    [aggregatedRepayTokenCode]
  );
  const {
    data: aggregatedRepayWalletBalance = 0n,
    isLoading: isAggregatedBalanceLoading,
  } = useQuery({
    queryKey: [
      "aggregatedRepayWalletBalance",
      aggregatedRepayAssetContract,
      address,
    ],
    queryFn: () => getTokenBalance(aggregatedRepayAssetContract, address!),
    enabled: Boolean(
      aggregatedRepayPos && aggregatedRepayAssetContract && address
    ),
    staleTime: 10_000,
  });

  // Resolve the underlying token contract address for the position being repaid
  const repayAssetContract = useMemo(() => {
    if (!repayPosition) return "";
    return getAvailableTokens()[repayPosition.assetCode]?.contract ?? "";
  }, [repayPosition]);

  // Fetch wallet balance of the underlying asset when the repay modal is open
  const { data: repayWalletBalance = 0n, isLoading: isBalanceLoading } =
    useQuery({
      queryKey: ["repayWalletBalance", repayAssetContract, address],
      queryFn: () => getTokenBalance(repayAssetContract, address!),
      enabled: Boolean(repayPosition && repayAssetContract && address),
      staleTime: 15_000,
    });

  function getHealthFactor(contractId: string): number | null {
    return (
      hfPools.find((p) => p.contractId === contractId)?.healthFactor ?? null
    );
  }

  const handleRepaySubmit = useCallback(
    async (dTokens: bigint) => {
      if (!repayPosition) return;
      const result = await handleRepay({
        assetCode: repayPosition.assetCode,
        dTokens,
        contractId: repayPosition.contractId,
      });
      if (result?.success) setRepayPosition(null);
    },
    [repayPosition, handleRepay]
  );

  const handleRemoveSubmit = useCallback(
    async (amount: string) => {
      if (!removePosition) return;
      const result = await handleRemoveCollateral({
        rwaTokenAddress: removePosition.collateralToken,
        amount,
        collateralTokenCode: removePosition.collateralTokenCode,
        contractId: removePosition.contractId,
      });
      if (result?.success) setRemovePosition(null);
    },
    [removePosition, handleRemoveCollateral]
  );

  const aggregatedBorrowPositions = allPositions.filter((p) => {
    if (p.pool.type === "neko") return false;
    const liabilities = p.position.metadata?.liabilities;
    if (typeof liabilities === "bigint") return liabilities > 0n;
    if (typeof liabilities === "number") return liabilities > 0;
    if (typeof liabilities === "string") return parseFloat(liabilities) > 0;
    return false;
  });

  if (!hasWallet) {
    return (
      <div className="w-full rounded-2xl bg-[#1C1C1C] border border-white/5 p-12 text-center">
        <Wallet className="h-8 w-8 text-white/20 mx-auto mb-3" />
        <p className="text-white/40 text-sm">
          Connect your wallet to see your borrow positions
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full rounded-2xl border border-white/5 bg-[#1C1C1C]">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <span className="text-white/40 text-xs font-semibold uppercase tracking-wide">
            Your Borrow Positions
          </span>
          {headerAction}
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <ColHeader icon={Shield} label="Protocol" centered />
              <ColHeader icon={Coins} label="Asset" />
              <ColHeader
                icon={Layers}
                label="Amount Owed"
                tooltip="Outstanding debt in this pool"
                centered
              />
              <ColHeader
                icon={TrendingUp}
                label="Borrow APR"
                tooltip="Annual interest rate on your debt"
                centered
              />
              <ColHeader icon={Zap} label="Action" centered />
            </tr>
          </thead>
          <tbody>
            {isLoadingAggregated ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-white/40 text-sm"
                >
                  Loading your positions...
                </td>
              </tr>
            ) : aggregatedBorrowPositions.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-white/40 text-sm"
                >
                  You don&apos;t have any active borrow positions yet.
                </td>
              </tr>
            ) : (
              aggregatedBorrowPositions.map((pos) => {
                const tokenCode = pos.pool.tokens[0]?.code ?? "?";
                const decimals =
                  pos.pool.tokens[0]?.decimals ?? STELLAR_DECIMALS;
                const liabilities = pos.position.metadata?.liabilities;
                let liabilitiesFormatted = "0";
                if (typeof liabilities === "bigint") {
                  liabilitiesFormatted = fromSmallestUnit(
                    liabilities.toString(),
                    decimals
                  );
                } else if (
                  typeof liabilities === "number" ||
                  typeof liabilities === "string"
                ) {
                  liabilitiesFormatted = fromSmallestUnit(
                    String(liabilities),
                    decimals
                  );
                }
                const borrowApy =
                  typeof pos.pool.metadata.borrowApy === "number"
                    ? pos.pool.metadata.borrowApy
                    : pos.pool.apy;
                const isRepaying =
                  aggregatedRepayPos?.pool.id === pos.pool.id &&
                  isPoolActionPending;

                return (
                  <tr
                    key={pos.pool.id}
                    className="border-b border-white/5 hover:bg-white/2 transition-colors"
                  >
                    <td className="px-4 py-4 text-center">
                      <div className="flex justify-center">
                        <ProtocolLogo protocolId={pos.pool.type} />
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <TokenAvatar code={tokenCode} />
                        <span className="text-white font-medium text-sm">
                          {tokenCode}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center text-white font-bold text-sm tabular-nums">
                      {formatAmount(liabilitiesFormatted)}{" "}
                      <span className="text-white/40 font-normal">
                        {tokenCode}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center text-white text-sm">
                      {borrowApy.toFixed(2)}%
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => setAggregatedRepayPos(pos)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#229EDF] hover:bg-[#1a8bc7] text-white text-xs font-semibold transition-colors"
                      >
                        <ArrowDownToLine className="h-3.5 w-3.5" />
                        Repay
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {repayPosition && (
        <RepayModal
          position={repayPosition}
          walletBalance={repayWalletBalance}
          isBalanceLoading={isBalanceLoading}
          isProcessing={isRepaying}
          isWalletConnected={isWalletConnected}
          onClose={() => setRepayPosition(null)}
          onSubmit={handleRepaySubmit}
        />
      )}

      {removePosition && (
        <RemoveCollateralModal
          position={removePosition}
          isProcessing={isRemoving}
          isWalletConnected={isRemoveWalletConnected}
          onClose={() => setRemovePosition(null)}
          onSubmit={handleRemoveSubmit}
        />
      )}

      {aggregatedRepayPos &&
        (() => {
          const tokenCode = aggregatedRepayPos.pool.tokens[0]?.code ?? "?";
          const decimals =
            aggregatedRepayPos.pool.tokens[0]?.decimals ?? STELLAR_DECIMALS;
          const liabilities = aggregatedRepayPos.position.metadata?.liabilities;
          let debtFormatted = "0";
          if (typeof liabilities === "bigint") {
            debtFormatted = fromSmallestUnit(liabilities.toString(), decimals);
          } else if (
            typeof liabilities === "number" ||
            typeof liabilities === "string"
          ) {
            debtFormatted = fromSmallestUnit(String(liabilities), decimals);
          }
          return (
            <RepayPositionModal
              tokenCode={tokenCode}
              debtFormatted={debtFormatted}
              decimals={decimals}
              walletBalance={aggregatedRepayWalletBalance}
              isBalanceLoading={isAggregatedBalanceLoading}
              isProcessing={isPoolActionPending}
              onClose={() => setAggregatedRepayPos(null)}
              onConfirm={async (amount) => {
                await executePoolAction({
                  poolId: aggregatedRepayPos.pool.id,
                  action: "repay",
                  amount,
                  audit: {
                    tokens: aggregatedRepayPos.pool.tokens,
                    poolType: aggregatedRepayPos.pool.type,
                    metadata: aggregatedRepayPos.pool.metadata,
                  },
                });
                setAggregatedRepayPos(null);
              }}
            />
          );
        })()}
    </>
  );
};

function MobileStat({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-[#242424] px-2 py-2.5">
      <span className="text-white/40 text-[10px] font-semibold uppercase tracking-wide">
        {label}
      </span>
      <span
        className={`text-white text-xs font-medium ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

export default MyBorrowPositions;
