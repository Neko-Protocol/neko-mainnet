"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  orchestrator,
  usePoolAction,
  POOLS_QUERY_KEY,
} from "@/lib/orchestrator";
import type { PoolAction, PoolInfo } from "@/lib/orchestrator";
import { toSmallestUnit } from "@neko-protocol/orchestrator";

export function resolveOrchestratorSupplyAction(
  poolInfo: PoolInfo
): PoolAction {
  const supported = poolInfo.supportedActions.filter((a) =>
    orchestrator.supportsAction(poolInfo.id, a)
  );
  if (supported.includes("deposit")) return "deposit";
  if (supported.includes("supplyCollateral")) return "supplyCollateral";
  return "deposit";
}

export function useOrchestratorSupplyDeposit() {
  const { mutateAsync, isPending } = usePoolAction();
  const queryClient = useQueryClient();

  const submit = useCallback(
    async (poolInfo: PoolInfo, amountHuman: string) => {
      const decimals = poolInfo.tokens[0]?.decimals ?? 7;
      const n = parseFloat(amountHuman);
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error("Invalid amount");
      }
      const action = resolveOrchestratorSupplyAction(poolInfo);
      const amountBigInt = BigInt(toSmallestUnit(amountHuman, decimals));
      const hash = await mutateAsync({
        poolId: poolInfo.id,
        action,
        amount: amountBigInt,
        tokenIndex: 0,
      });
      await queryClient.invalidateQueries({ queryKey: ["lendingPools"] });
      await queryClient.invalidateQueries({ queryKey: ["balances"] });
      await queryClient.invalidateQueries({ queryKey: [...POOLS_QUERY_KEY] });
      return hash;
    },
    [mutateAsync, queryClient]
  );

  return { submit, isPending };
}
