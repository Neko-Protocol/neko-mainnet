"use client";

import { useQueries } from "@tanstack/react-query";
import { useUserLendingPositions } from "@/features/lending/hooks/useUserLendingPositions";
import type { LendingPosition } from "@/features/lending/hooks/useUserLendingPositions";
import { useUserBorrowPositions } from "./useUserBorrowPositions";
import type { BorrowPosition } from "./useUserBorrowPositions";
import { useHealthFactor } from "./useHealthFactor";
import type { PoolHealthFactor } from "./useHealthFactor";
import { lendingService } from "@/lib/services/lending.service";
import { getAssetsConfig } from "@/lib/constants/assets.config";
import { stellarNetwork, STELLAR_DECIMALS } from "@/lib/constants/network";
import { getLendingContracts } from "@/lib/constants/lendingContracts";

export type { LendingPosition, BorrowPosition, PoolHealthFactor };

export interface CollateralPosition {
  tokenCode: string;
  contract: string;
  raw: bigint;
  formatted: string;
}

export interface BorrowLimitEntry {
  key: string;
  label: string;
  limitUsd: number | null;
}

export interface UserPositionData {
  deposits: LendingPosition[];
  debts: BorrowPosition[];
  healthFactors: PoolHealthFactor[];
  collateral: CollateralPosition[];
  borrowLimits: BorrowLimitEntry[];
  isLoading: boolean;
  hasWallet: boolean;
}

export function useUserPosition(
  borrowerAddress: string | undefined
): UserPositionData {
  const { pool1ContractId, pool2ContractId } = getLendingContracts();
  const poolsMeta = [
    { key: "pool1", contractId: pool1ContractId, label: "Pool 1" },
    { key: "pool2", contractId: pool2ContractId, label: "Pool 2" },
  ] as const;

  const { positions: deposits, isLoading: depositsLoading } =
    useUserLendingPositions();
  const {
    positions: debts,
    isLoading: debtsLoading,
    hasWallet,
  } = useUserBorrowPositions();
  const { pools: healthFactors, isLoading: hfLoading } =
    useHealthFactor(borrowerAddress);

  const rwaTokens = Object.values(getAssetsConfig());

  const collateralQueries = useQueries({
    queries: rwaTokens.map((token) => ({
      queryKey: ["userCollateral", token.code, borrowerAddress],
      queryFn: () =>
        lendingService.getCollateralRaw(
          token.contract,
          borrowerAddress!,
          pool1ContractId
        ),
      enabled: stellarNetwork !== "PUBLIC" && Boolean(borrowerAddress),
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
    })),
  });

  const borrowLimitQueries = useQueries({
    queries: poolsMeta.map((pool) => ({
      queryKey: ["borrowLimit", pool.key, borrowerAddress],
      queryFn: () =>
        lendingService.getBorrowLimitForPool(borrowerAddress!, pool.contractId),
      enabled: stellarNetwork !== "PUBLIC" && Boolean(borrowerAddress),
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
    })),
  });

  const isLoading =
    depositsLoading ||
    debtsLoading ||
    hfLoading ||
    (Boolean(borrowerAddress) && collateralQueries.some((q) => q.isLoading)) ||
    (Boolean(borrowerAddress) && borrowLimitQueries.some((q) => q.isLoading));

  const collateral: CollateralPosition[] = [];
  collateralQueries.forEach((q, i) => {
    const raw = q.data ?? 0n;
    if (raw === 0n) return;
    const token = rwaTokens[i];
    collateral.push({
      tokenCode: token.code,
      contract: token.contract,
      raw,
      formatted: (Number(raw) / 10 ** STELLAR_DECIMALS).toFixed(
        STELLAR_DECIMALS
      ),
    });
  });

  const borrowLimits: BorrowLimitEntry[] = poolsMeta.map((pool, i) => ({
    key: pool.key,
    label: pool.label,
    limitUsd: borrowLimitQueries[i].data ?? null,
  }));

  return {
    deposits,
    debts,
    healthFactors,
    collateral,
    borrowLimits,
    isLoading,
    hasWallet,
  };
}
