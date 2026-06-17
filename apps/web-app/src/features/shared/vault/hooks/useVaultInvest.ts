"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { backendClient, BackendError } from "@/lib/services/backend-client";
import { useVaultData } from "./useVaultData";

interface StrategyAllocation {
  strategy: string;
  amount: number;
  amountStroops?: string;
}

interface TargetAllocation {
  strategy: string;
  strategyName: string;
  targetBps: number;
  currentAmount: string;
  targetAmount: string;
  deltaAmount: string;
  currentAmountHuman: number;
  targetAmountHuman: number;
  deltaAmountHuman: number;
}

interface InvestStatus {
  idle: number;
  idleStroops?: string;
  total: number;
  totalStroops?: string;
  canInvest: boolean;
  canRebalance?: boolean;
  cooldownRemaining: number;
  allocations: StrategyAllocation[];
  targetAllocations?: TargetAllocation[];
  instructions?: unknown[];
  reason?: string;
  warnings?: string[];
}

interface KeeperVaultResult {
  label: string;
  rebalance: {
    attempted: boolean;
    reason?: string;
    status?: string;
    instructions?: unknown[];
  };
}

interface InvestResponse {
  error?: string;
  invested?: boolean;
  message?: string;
  results?: { status: string }[];
  vaults?: KeeperVaultResult[];
}

// The backend exposes the keeper trigger (`POST /v1/vault-invest/run-now`) but
// no read-only "invest status" endpoint, so the live status panel stays empty
// until that data is exposed. Returning a disabled status keeps the UI inert
// without issuing a request that would 404.
const EMPTY_INVEST_STATUS: InvestStatus = {
  idle: 0,
  total: 0,
  canInvest: false,
  canRebalance: false,
  cooldownRemaining: 0,
  allocations: [],
  targetAllocations: [],
};

async function fetchInvestStatus(): Promise<InvestStatus> {
  return EMPTY_INVEST_STATUS;
}

export function useVaultInvest(vaultContractId: string | null | undefined) {
  const [isInvesting, setIsInvesting] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const { refetch: refetchVaultData } = useVaultData(vaultContractId);

  const { data, refetch: refetchStatus } = useQuery({
    queryKey: ["vault-invest-status", vaultContractId],
    queryFn: fetchInvestStatus,
    staleTime: Infinity,
    enabled: !!vaultContractId,
  });

  const triggerInvest = useCallback(async () => {
    if (isInvesting) return;
    setIsInvesting(true);
    setLastResult(null);

    try {
      const q = vaultContractId
        ? `?vault=${encodeURIComponent(vaultContractId)}`
        : "";
      let json: InvestResponse;
      try {
        json = await backendClient.post<InvestResponse>(
          `/v1/vault-invest/run-now${q}`,
          {}
        );
      } catch (err) {
        const message =
          err instanceof BackendError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Unexpected error";
        setLastResult(`Error: ${message}`);
        return;
      }

      const vaultResult = json.vaults?.[0];
      if (vaultResult?.rebalance) {
        const { rebalance } = vaultResult;
        if (!rebalance.attempted) {
          setLastResult(
            rebalance.reason
              ? `Nothing to rebalance (${rebalance.reason.replaceAll("_", " ")})`
              : "Nothing to rebalance"
          );
        } else if (rebalance.status === "SUCCESS") {
          const count = rebalance.instructions?.length ?? 0;
          setLastResult(
            `Rebalance completed (${count} instruction${count === 1 ? "" : "s"})`
          );
        } else {
          setLastResult(`Rebalance returned ${rebalance.status ?? "unknown"}`);
        }

        await Promise.all([refetchStatus(), refetchVaultData()]);
        return;
      }

      if (!json.invested) {
        setLastResult(json.message ?? "Nothing to invest");
        return;
      }

      const results = json.results ?? [];
      const succeeded = results.filter((r) => r.status === "SUCCESS").length;
      const total = results.length;
      setLastResult(`Invested across ${succeeded}/${total} strategies`);

      await Promise.all([refetchStatus(), refetchVaultData()]);
    } catch (err) {
      setLastResult(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setIsInvesting(false);
    }
  }, [isInvesting, refetchStatus, refetchVaultData, vaultContractId]);

  return {
    idleAmount: data?.idle ?? 0,
    totalAmount: data?.total ?? 0,
    allocations: data?.allocations ?? [],
    canInvest: data?.canInvest ?? false,
    canRebalance: data?.canRebalance ?? data?.canInvest ?? false,
    targetAllocations: data?.targetAllocations ?? [],
    cooldownRemaining: data?.cooldownRemaining ?? 0,
    isInvesting,
    lastResult,
    triggerInvest,
  };
}
