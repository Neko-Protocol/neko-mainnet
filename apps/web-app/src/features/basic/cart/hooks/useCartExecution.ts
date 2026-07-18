"use client";

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getTokens, getTokenAddress } from "@/lib/helpers/stellar/swap-kit";
import { useSwapExecution } from "@/features/shared/swap-engine/hooks/useSwapExecution";
import { useWallet } from "@/hooks/useWallet";
import { useToast } from "@/hooks/useToast";
import {
  useCartStore,
  type CartItem,
} from "@/features/basic/cart/stores/cart.store";
import { extractContractErrorOrNull } from "@neko/orchestrator";
import { TOAST_CONFIG } from "@/lib/constants/toast.config";

export type ItemExecutionStatus =
  | "idle"
  | "executing"
  | "success"
  | "error"
  | "rejected";

export interface ItemStatus {
  status: ItemExecutionStatus;
  errorMsg?: string;
}

export function useCartExecution() {
  const { address, networkPassphrase, refetchBalances } = useWallet();
  const { addNotification } = useToast();
  const queryClient = useQueryClient();
  const { items, removeItem } = useCartStore();
  const { executeSwap } = useSwapExecution();

  const [statuses, setStatuses] = useState<Record<string, ItemStatus>>({});
  const [isExecuting, setIsExecuting] = useState(false);

  const setItemStatus = (id: string, update: ItemStatus) =>
    setStatuses((prev) => ({ ...prev, [id]: update }));

  const executeAll = useCallback(async () => {
    if (!address || items.length === 0) return;

    setIsExecuting(true);
    const tokens = getTokens();
    const successIds: string[] = [];

    for (const item of items) {
      setItemStatus(item.id, { status: "executing" });

      try {
        const tokenIn = tokens[item.paymentToken] ?? item.paymentToken;
        const tokenOut = tokens[item.symbol] ?? item.symbol;

        // executeSwap always fetches a fresh quote internally before signing
        // this satisfies the "re-fetch if stale" requirement.
        const result = await executeSwap({
          amountIn: item.paymentAmount,
          tokenIn,
          tokenOut,
          address,
          networkPassphrase,
        });

        setItemStatus(item.id, { status: "success" });
        successIds.push(item.id);

        const tokenOutAddress = getTokenAddress(
          tokenOut as Parameters<typeof getTokenAddress>[0]
        );
        const tokenInAddress = getTokenAddress(
          tokenIn as Parameters<typeof getTokenAddress>[0]
        );
        void queryClient.invalidateQueries({
          queryKey: ["tokenBalance", tokenOutAddress, address],
        });
        void queryClient.invalidateQueries({
          queryKey: ["tokenBalance", tokenInAddress, address],
        });

        void result;
      } catch (err) {
        if (err instanceof Error && err.message === "USER_REJECTED") {
          setItemStatus(item.id, { status: "rejected" });
          break;
        }

        const contractError = extractContractErrorOrNull(err);
        const msg = contractError
          ? `Contract error: ${contractError}`
          : err instanceof Error
            ? err.message
            : "Transaction failed";
        setItemStatus(item.id, { status: "error", errorMsg: msg });
      }
    }

    for (const id of successIds) {
      removeItem(id);
    }

    void refetchBalances();
    void queryClient.invalidateQueries({
      queryKey: ["balances", address],
    });

    setIsExecuting(false);

    const total = items.length;
    if (successIds.length === total) {
      addNotification("All purchases complete", "success", {
        ...TOAST_CONFIG.defaultOpts,
        description: `${total} item${total !== 1 ? "s" : ""} added to your wallet`,
      });
      setStatuses({});
    } else if (successIds.length > 0) {
      addNotification(
        `${successIds.length} of ${total} purchases complete`,
        "warning",
        { ...TOAST_CONFIG.defaultOpts }
      );
    }
  }, [
    address,
    networkPassphrase,
    items,
    executeSwap,
    removeItem,
    refetchBalances,
    queryClient,
    addNotification,
  ]);

  const getStatus = (item: CartItem): ItemStatus =>
    statuses[item.id] ?? { status: "idle" };

  return { isExecuting, getStatus, executeAll };
}
