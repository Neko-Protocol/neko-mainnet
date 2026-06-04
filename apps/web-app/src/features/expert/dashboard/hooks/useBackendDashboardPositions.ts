"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useWallet } from "@/hooks/useWallet";
import type {
  PoolInfo,
  PoolPosition,
} from "@/lib/orchestrator/types/pool.types";

export const USE_BACKEND_DASHBOARD =
  process.env.NEXT_PUBLIC_USE_BACKEND_DASHBOARD === "true";

interface WirePoolInfo extends Omit<PoolInfo, "tvl"> {
  tvl: string;
}

interface WirePoolPosition extends Omit<PoolPosition, "deposited" | "rewards"> {
  deposited: string;
  rewards: string;
}

export interface BackendDashboardPositionsPayload {
  poolPositions: Array<{ pool: PoolInfo; position: PoolPosition }>;
  vaultPositions: Array<{
    vaultId: string;
    userShares: bigint;
    pricePerShare: bigint;
  }>;
  fetchedAt: number;
}

interface WirePayload {
  poolPositions: Array<{ pool: WirePoolInfo; position: WirePoolPosition }>;
  vaultPositions: Array<{
    vaultId: string;
    userShares: string;
    pricePerShare: string;
  }>;
  fetchedAt: number;
}

function deserialize(payload: WirePayload): BackendDashboardPositionsPayload {
  return {
    fetchedAt: payload.fetchedAt,
    poolPositions: payload.poolPositions.map(({ pool, position }) => ({
      pool: { ...pool, tvl: BigInt(pool.tvl || "0") } as PoolInfo,
      position: {
        ...position,
        deposited: BigInt(position.deposited || "0"),
        rewards: BigInt(position.rewards || "0"),
      } as PoolPosition,
    })),
    vaultPositions: payload.vaultPositions.map((v) => ({
      vaultId: v.vaultId,
      userShares: BigInt(v.userShares || "0"),
      pricePerShare: BigInt(v.pricePerShare || "0"),
    })),
  };
}

/**
 * Fetches USD prices for the given symbols via the backend cache.
 * Returns a symbol→price map. Only active when USE_BACKEND_DASHBOARD is on.
 */
export function useBackendPrices(symbols: string[]): Record<string, number> {
  const sorted = [...symbols].sort();
  const { data } = useQuery<Record<string, number>>({
    queryKey: ["backend-prices", sorted.join(",")],
    enabled: USE_BACKEND_DASHBOARD && sorted.length > 0,
    staleTime: 60_000,
    refetchInterval: 120_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await fetch(
        `/api/backend-proxy/dashboard/prices?symbols=${sorted.join(",")}`
      );
      if (!res.ok) throw new Error(`dashboard-prices failed: ${res.status}`);
      const json = (await res.json()) as {
        prices: Record<string, { price: number }>;
      };
      const map: Record<string, number> = {};
      for (const [sym, entry] of Object.entries(json.prices)) {
        map[sym] = entry.price;
      }
      return map;
    },
  });
  return data ?? {};
}

/**
 * Single query that powers both `useDashboardPositions` and
 * `useDashboardVaultPositions` when the backend-dashboard flag is on. Cached
 * 30s by the backend; the client keeps a 30s stale window so both consumers
 * dedup automatically through the shared React Query cache.
 */
export function useBackendDashboardPositions(): UseQueryResult<BackendDashboardPositionsPayload> {
  const { address } = useWallet();
  return useQuery({
    queryKey: ["backend-dashboard-positions", address],
    enabled: Boolean(address) && USE_BACKEND_DASHBOARD,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async () => {
      const res = await fetch(
        `/api/backend-proxy/dashboard/positions/${address}`
      );
      if (!res.ok) {
        throw new Error(`dashboard-positions failed: ${res.status}`);
      }
      const json = (await res.json()) as WirePayload;
      return deserialize(json);
    },
  });
}
