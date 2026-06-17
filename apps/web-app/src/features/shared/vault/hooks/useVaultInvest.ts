"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
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

async function fetchInvestStatus({
  queryKey,
}: {
  queryKey: readonly unknown[];
}): Promise<InvestStatus> {
  const id = queryKey[1] as string | undefined;
  const q = id ? `?vault=${encodeURIComponent(id)}` : "";
  const res = await fetch(`/api/vault/invest${q}`);
  if (!res.ok) throw new Error("Failed to fetch invest status");
  return res.json();
}

export function useVaultInvest(vaultContractId: string | null | undefined) {
  const [isInvesting, setIsInvesting] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const { refetch: refetchVaultData } = useVaultData(vaultContractId);

  const { data, refetch: refetchStatus } = useQuery({
    queryKey: ["vault-invest-status", vaultContractId],
    queryFn: fetchInvestStatus,
    refetchInterval: 30_000,
    staleTime: 15_000,
    enabled: !!vaultContractId,
  });

  const triggerInvest = useCallback(async () => {
    if (isInvesting) return;
    setIsInvesting(true);
    setLastResult(null);

    try {
      const res = await fetch("/api/vault/invest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vault: vaultContractId }),
      });
      const json = (await res.json()) as InvestResponse;

      if (!res.ok && res.status !== 207) {
        setLastResult(`Error: ${json.error}`);
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
