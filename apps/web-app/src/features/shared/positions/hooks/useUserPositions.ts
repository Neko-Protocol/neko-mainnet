"use client";

import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { POOLS_QUERY_KEY } from "@/lib/orchestrator/hooks/usePools";
import { orchestrator } from "@/lib/orchestrator/core/Orchestrator";
import { useWallet } from "@/hooks/useWallet";
import { batchCheckLpBalances } from "@/features/shared/positions/services/positionScanner";
import { BLEND_ASSET_CODES } from "@/lib/orchestrator/adapters/blend-config";
import { getContractToCodeMap } from "@/lib/constants/assets.config";
import type {
  PoolInfo,
  PoolPosition,
} from "@/lib/orchestrator/types/pool.types";

export interface UserPositionWithPool {
  pool: PoolInfo;
  position: PoolPosition;
}

const POSITION_STALE_TIME = 60_000;

const BLEND_SUPPORTED_ACTIONS: PoolInfo["supportedActions"] = [
  "deposit",
  "withdraw",
  "supplyCollateral",
  "withdrawCollateral",
  "borrow",
  "repay",
  "claimRewards",
];

function buildVaultPoolInfoStub(poolId: string): PoolInfo | null {
  const parts = poolId.split(":");
  if (parts.length < 3) return null;
  const [, poolContractId, assetAddress] = parts;
  if (!poolContractId || !assetAddress) return null;

  const contractToCode = getContractToCodeMap();
  const code =
    BLEND_ASSET_CODES[assetAddress] ??
    contractToCode[assetAddress] ??
    assetAddress.slice(0, 8);

  return {
    id: poolId,
    type: "blend",
    name: `${code} Blend Pool`,
    tokens: [{ address: assetAddress, code, name: code, decimals: 7 }],
    tvl: 0n,
    apy: 0,
    state: "active",
    supportedActions: BLEND_SUPPORTED_ACTIONS,
    metadata: { poolContractId, assetAddress, hasEmissions: false },
  };
}

export function useUserPositions() {
  const { address } = useWallet();
  const queryClient = useQueryClient();

  const blendListQuery = useQuery<PoolInfo[]>({
    queryKey: [...POOLS_QUERY_KEY, "blend"],
    queryFn: () => orchestrator.getPoolsByType("blend"),
    staleTime: 3 * 60_000,
    retry: 2,
    throwOnError: false,
  });

  const blendPools = blendListQuery.data ?? [];

  const cachedAqua =
    queryClient.getQueryData<PoolInfo[]>([...POOLS_QUERY_KEY, "aqua"]) ?? [];
  const nonBlendPools = cachedAqua;

  const vaultBlendPositionsQuery = useQuery<PoolPosition[]>({
    queryKey: ["orchestrator", "blend-vault-positions", address],
    queryFn: () => orchestrator.getAllBlendVaultUserPositions(address!),
    enabled: Boolean(address),
    staleTime: POSITION_STALE_TIME,
    retry: 3,
    retryDelay: (attempt) => attempt * 1000,
    refetchOnWindowFocus: false,
  });

  const directBlendPositionsQuery = useQuery<PoolPosition[]>({
    queryKey: ["orchestrator", "blend-direct-positions", address],
    queryFn: () => orchestrator.getAllBlendDirectUserPositions(address!),
    enabled: Boolean(address) && !blendListQuery.isLoading,
    staleTime: POSITION_STALE_TIME,
    retry: 2,
    retryDelay: (attempt) => attempt * 1000,
    refetchOnWindowFocus: false,
  });

  // ── LP balance pre-screen (Aqua) ──────────────────────────────────────────
  const lpScreenQuery = useQuery<Set<string>>({
    queryKey: [
      "orchestrator",
      "lp-screen",
      address,
      nonBlendPools.map((p) => p.id).join(","),
    ],
    queryFn: () => batchCheckLpBalances(nonBlendPools, address!),
    enabled: Boolean(address) && nonBlendPools.length > 0,
    staleTime: POSITION_STALE_TIME,
    retry: 2,
    retryDelay: (attempt) => attempt * 800,
  });

  const poolsWithBalance = lpScreenQuery.data ?? null;
  const filteredNonBlendPools =
    poolsWithBalance !== null
      ? nonBlendPools.filter((p) => poolsWithBalance.has(p.id))
      : [];

  const positionQueries = useQueries({
    queries: filteredNonBlendPools.map((pool, i) => ({
      queryKey: ["orchestrator", "position", pool.id, address],
      queryFn: async () => {
        if (i > 0) await new Promise((r) => setTimeout(r, i * 300));
        return orchestrator.getUserPosition(pool.id, address!);
      },
      enabled: Boolean(address),
      staleTime: POSITION_STALE_TIME,
      retry: 2,
      retryDelay: (attempt: number) => attempt * 1000,
    })),
  });

  // ── Assemble results ───────────────────────────────────────────────────────
  const positions: UserPositionWithPool[] = [];

  for (const pos of vaultBlendPositionsQuery.data ?? []) {
    if (pos.deposited === 0n) continue;
    const pool =
      blendPools.find((p) => p.id === pos.poolId) ??
      buildVaultPoolInfoStub(pos.poolId);
    if (pool) positions.push({ pool, position: pos });
  }

  for (const pos of directBlendPositionsQuery.data ?? []) {
    const hasDeposit = pos.deposited > 0n;
    const hasLiabilities =
      parseFloat(String(pos.metadata?.liabilities ?? "0")) > 0;
    if (!hasDeposit && !hasLiabilities) continue;
    const pool = blendPools.find((p) => p.id === pos.poolId);
    if (pool) positions.push({ pool, position: pos });
  }

  // Aqua positions (only pre-screened)
  positionQueries.forEach((q, i) => {
    const pos = q.data as PoolPosition | undefined;
    if (!pos) return;
    const hasDeposit = pos.deposited > 0n;
    const hasLiabilities =
      parseFloat(String(pos.metadata?.liabilities ?? "0")) > 0;
    if (hasDeposit || hasLiabilities) {
      positions.push({ pool: filteredNonBlendPools[i], position: pos });
    }
  });

  const isLoading =
    vaultBlendPositionsQuery.isLoading ||
    blendListQuery.isLoading ||
    directBlendPositionsQuery.isLoading ||
    (nonBlendPools.length > 0 && lpScreenQuery.isLoading);

  return { positions, isLoading, hasWallet: Boolean(address) };
}
