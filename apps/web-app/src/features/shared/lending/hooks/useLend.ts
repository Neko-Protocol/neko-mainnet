"use client";

import { useState, useMemo, useCallback } from "react";
import { TransactionBuilder, Networks } from "@stellar/stellar-sdk";
import { rpc } from "@stellar/stellar-sdk";
import { useWallet } from "@/hooks/useWallet";
import { useToast } from "@/hooks/useToast";
import { TOAST_CONFIG } from "@/lib/constants/toast.config";
import { useLendingPools } from "./useLendingPools";
import {
  depositToPool,
  withdrawFromPool,
  getBTokenBalance,
} from "@/lib/helpers/stellar/lending";
import { getAvailableTokens } from "@/lib/helpers/stellar/soroswap";
import { rpcUrl, stellarNetwork } from "@/lib/config/stellar.config";
import { extractContractErrorOrNull } from "@/lib/helpers/stellar/contractErrors";
import { usePools, usePoolAction } from "@/lib/orchestrator";
import type { PoolInfo } from "@/lib/orchestrator";
import { fromSmallestUnit } from "@/lib/helpers/tokenUtils";
import { formatLiquidity } from "@/lib/helpers/formatUtils";
import type { PoolData } from "../types/lending";
import {
  LENDING_PROTOCOL_LABELS,
  LENDING_PROTOCOL_ORDER,
} from "../constants/protocols";
import { auditService } from "@/lib/services/audit.service";

function toBTokens(tokensAmount: string, bTokenRate: string): string {
  if (
    !tokensAmount ||
    parseFloat(tokensAmount) <= 0 ||
    !bTokenRate ||
    parseFloat(bTokenRate) <= 0
  )
    return "0";
  return (parseFloat(tokensAmount) / parseFloat(bTokenRate)).toFixed(7);
}

export function useLend() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeposit, setIsDeposit] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [bTokenBalance, setBTokenBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [selectedPool, setSelectedPool] = useState<PoolData | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [protocolFilter, setProtocolFilterState] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { address, signTransaction, networkPassphrase } = useWallet();
  const { addNotification } = useToast();

  const showError = useCallback(
    (msg: string) =>
      addNotification("Something went wrong", "error", {
        ...TOAST_CONFIG.defaultOpts,
        description: msg,
      }),
    [addNotification]
  );
  const showSuccess = useCallback(
    (msg: string) =>
      addNotification("Success", "success", {
        ...TOAST_CONFIG.defaultOpts,
        description: msg,
      }),
    [addNotification]
  );

  const {
    data: lendingPools = [],
    isLoading: isLoadingNekoPools,
    isFetching: isFetchingNekoPools,
    error: nekoPoolsError,
    refetch: refetchPools,
  } = useLendingPools();

  const {
    data: orchestratorPools = [],
    isLoading: isLoadingOrchestratorPools,
    isFetching: isFetchingOrchestratorPools,
    error: orchestratorPoolsError,
  } = usePools();

  const { mutateAsync: executePoolAction } = usePoolAction();

  const hasAnyPools = lendingPools.length > 0 || orchestratorPools.length > 0;
  const isLoadingPools = isLoadingNekoPools && !hasAnyPools;
  const isFetchingPools = isFetchingNekoPools || isFetchingOrchestratorPools;
  const poolsError = nekoPoolsError || orchestratorPoolsError;

  const pools: PoolData[] = useMemo(() => {
    const nekoPools: PoolData[] = lendingPools.map((pool, index) => {
      const balanceNum = parseFloat(pool.poolBalance);
      const liquidity =
        balanceNum >= 1000
          ? `$${(balanceNum / 1000).toFixed(2)}k`
          : `$${balanceNum.toFixed(2)}`;
      return {
        id: `pool-${index}`,
        protocolId: "neko",
        name: `${pool.assetCode} Pool`,
        token1: pool.assetCode,
        token2: "",
        fee: "0%",
        roi: `${pool.interestRate.toFixed(2)}%`,
        feeApy: `${pool.interestRate.toFixed(2)}%`,
        liquidity,
        isActive: pool.isActive,
        assetCode: pool.assetCode,
        asset: pool.asset,
        bTokenRate: pool.bTokenRate,
        contractId: pool.contractId,
      };
    });

    const aggregated: PoolData[] = orchestratorPools
      .filter(
        (p: PoolInfo) =>
          p.type !== "neko" && p.supportedActions.includes("deposit")
      )
      .map((p: PoolInfo) => {
        const token = p.tokens[0];
        const decimals = token?.decimals ?? 7;
        const liquidityUsd = p.metadata?.liquidityUsd as string | undefined;
        const liquidity =
          liquidityUsd && parseFloat(liquidityUsd) > 0
            ? formatLiquidity(liquidityUsd)
            : p.tvl > 0n
              ? formatLiquidity(fromSmallestUnit(p.tvl.toString(), decimals))
              : "—";
        const contractId = p.id.split(":")[1] ?? p.id;
        const canInteract = p.supportedActions.includes("deposit");

        // Total borrowed for Blend pools (totalLiabilities in stroops)
        let totalBorrowed: string | undefined;
        let liquidityTokenAmount: string | undefined;
        let liquidityTokenCode: string | undefined;
        let totalBorrowedTokenAmount: string | undefined;
        let borrowApy: string | undefined;
        if (p.type === "blend") {
          const liabRaw = String(
            (p.metadata?.totalLiabilities as string | undefined) ?? "0"
          );
          const liabTokens = fromSmallestUnit(liabRaw, decimals);
          totalBorrowed = formatLiquidity(liabTokens);
          liquidityTokenAmount = fromSmallestUnit(p.tvl.toString(), decimals);
          liquidityTokenCode = token?.code;
          totalBorrowedTokenAmount = liabTokens;
          const bApy = (p.metadata?.borrowApy as number | undefined) ?? 0;
          borrowApy = `${bApy.toFixed(2)}%`;
        }

        return {
          id: `agg-${p.id}`,
          protocolId: p.type,
          name: p.name,
          token1: token?.code ?? "?",
          token2: p.tokens[1]?.code ?? (canInteract ? "Lending" : ""),
          fee: "0%",
          roi: p.apy > 0 ? `${p.apy.toFixed(2)}%` : "0.00%",
          feeApy: p.apy > 0 ? `${p.apy.toFixed(2)}%` : "0.00%",
          liquidity,
          isActive: p.state === "active",
          assetCode: token?.code ?? "?",
          asset: token?.address ?? "",
          bTokenRate: undefined,
          totalBorrowed,
          liquidityTokenAmount,
          liquidityTokenCode,
          totalBorrowedTokenAmount,
          borrowApy,
          contractId,
          isAggregated: true,
          orchestratorId: canInteract ? p.id : undefined,
          hideRowActions: !canInteract,
        };
      });

    return [...nekoPools, ...aggregated];
  }, [lendingPools, orchestratorPools]);

  const protocolOptions = useMemo(() => {
    const ids = new Set(pools.map((p) => p.protocolId));
    const order = LENDING_PROTOCOL_ORDER as readonly string[];
    const known = order
      .filter((id) => ids.has(id))
      .map((id) => ({ id, label: LENDING_PROTOCOL_LABELS[id] ?? id }));
    const unknown = [...ids].filter((id) => !order.includes(id));
    const extras = unknown.map((id) => ({
      id,
      label: LENDING_PROTOCOL_LABELS[id] ?? id,
    }));
    return [...known, ...extras];
  }, [pools]);

  const filteredPools = useMemo(() => {
    let result =
      protocolFilter === "all"
        ? pools
        : pools.filter((p) => p.protocolId === protocolFilter);
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.token1.toLowerCase().includes(q) ||
          p.token2.toLowerCase().includes(q)
      );
    }
    return result;
  }, [pools, protocolFilter, searchQuery]);

  const totalRows = filteredPools.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const paginatedPools = filteredPools.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage
  );

  const setProtocolFilter = useCallback((id: string) => {
    setProtocolFilterState(id);
    setPage(0);
  }, []);

  const handleSetSearchQuery = useCallback((q: string) => {
    setSearchQuery(q);
    setPage(0);
  }, []);

  const changeRowsPerPage = useCallback((value: number) => {
    setRowsPerPage(value);
    setPage(0);
  }, []);

  const loadBTokenBalance = useCallback(async () => {
    if (!selectedPool || !address) {
      setBTokenBalance(null);
      return;
    }
    if (selectedPool.isAggregated) {
      setBTokenBalance(null);
      return;
    }
    setIsLoadingBalance(true);
    try {
      const balance = await getBTokenBalance(
        selectedPool.assetCode,
        address,
        7,
        selectedPool.contractId
      );
      setBTokenBalance(balance);
    } catch {
      setBTokenBalance("0");
    } finally {
      setIsLoadingBalance(false);
    }
  }, [selectedPool, address]);

  const openModal = useCallback(
    (pool: PoolData, deposit: boolean) => {
      setSelectedPool(pool);
      setIsDeposit(deposit);
      setBTokenBalance(null);
      setIsModalOpen(true);
      if (address) void loadBTokenBalance();
    },
    [address, loadBTokenBalance]
  );

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleConfirm = useCallback(
    async (amount: string) => {
      if (!selectedPool || !address || !amount || parseFloat(amount) <= 0)
        return;

      setIsLoading(true);

      const logAction = (poolId: string, txHash?: string) => {
        auditService.log({
          wallet_address: address,
          action_type: isDeposit ? "lend_deposit" : "lend_withdraw",
          asset_in: isDeposit ? selectedPool.assetCode : undefined,
          asset_out: isDeposit ? undefined : selectedPool.assetCode,
          amount_in: isDeposit ? parseFloat(amount) : undefined,
          amount_out: isDeposit ? undefined : parseFloat(amount),
          pool_id: poolId,
          tx_hash: txHash,
        });
      };

      try {
        if (selectedPool.isAggregated && selectedPool.orchestratorId) {
          const decimals = 7;

          const isWithdrawAll =
            !isDeposit &&
            selectedPool.depositedAmount !== undefined &&
            parseFloat(amount) >=
              parseFloat(selectedPool.depositedAmount) - 1e-7;

          const rawAmount = isWithdrawAll
            ? BigInt("999999999999999999")
            : BigInt(Math.floor(parseFloat(amount) * 10 ** decimals));

          const txHash = await executePoolAction({
            poolId: selectedPool.orchestratorId,
            action: isDeposit ? "deposit" : "withdraw",
            amount: rawAmount,
          });

          logAction(selectedPool.orchestratorId, txHash);

          await refetchPools();
          showSuccess(
            isDeposit
              ? `Successfully deposited ${amount} ${selectedPool.assetCode}`
              : `Successfully withdrew ${amount} ${selectedPool.assetCode}`
          );
          closeModal();
          return;
        }

        const availableTokens = getAvailableTokens();
        const token = availableTokens[selectedPool.assetCode];
        if (!token?.contract)
          throw new Error(`Token ${selectedPool.assetCode} not found`);

        const decimals = token.decimals || 7;
        if (!networkPassphrase)
          throw new Error("Network passphrase not available");
        const passphrase = networkPassphrase;
        const sorobanServer = new rpc.Server(rpcUrl, {
          allowHttp: stellarNetwork === "LOCAL",
        });

        const lendingContractId = selectedPool.contractId;
        let txHash: string | undefined;

        if (isDeposit) {
          const depositXdr = await depositToPool(
            selectedPool.assetCode,
            amount,
            decimals,
            address,
            lendingContractId
          );

          const signedDeposit = await signTransaction(depositXdr as string, {
            networkPassphrase: passphrase,
            address,
          });
          const sendResult = await sorobanServer.sendTransaction(
            TransactionBuilder.fromXDR(signedDeposit.signedTxXdr, passphrase)
          );
          txHash = sendResult.hash;
        } else {
          if (!selectedPool.bTokenRate)
            throw new Error("Unable to calculate bTokens. Please try again.");
          const bTokensAmount = toBTokens(amount, selectedPool.bTokenRate);
          const withdrawXdr = await withdrawFromPool(
            selectedPool.assetCode,
            bTokensAmount,
            decimals,
            address,
            lendingContractId
          );

          const signedWithdraw = await signTransaction(withdrawXdr as string, {
            networkPassphrase: passphrase,
            address,
          });
          const sendResult = await sorobanServer.sendTransaction(
            TransactionBuilder.fromXDR(signedWithdraw.signedTxXdr, passphrase)
          );
          txHash = sendResult.hash;
        }

        await new Promise((r) => setTimeout(r, 3000));
        await loadBTokenBalance();
        await refetchPools();
        showSuccess(
          isDeposit
            ? `Successfully deposited ${amount} ${selectedPool.assetCode}`
            : `Successfully withdrew ${amount} ${selectedPool.assetCode}`
        );
        logAction(selectedPool.id, txHash);
        closeModal();
      } catch (err) {
        const msg = extractContractErrorOrNull(err);
        showError(
          typeof msg === "string" ? msg : "An unexpected error occurred."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      selectedPool,
      address,
      isDeposit,
      networkPassphrase,
      signTransaction,
      executePoolAction,
      loadBTokenBalance,
      refetchPools,
      closeModal,
      showError,
      showSuccess,
    ]
  );

  return {
    pools,
    paginatedPools,
    isLoadingPools,
    isFetchingPools,
    poolsError,
    protocolFilter,
    setProtocolFilter,
    protocolOptions,
    page,
    totalRows,
    totalPages,
    rowsPerPage,
    setPage,
    changeRowsPerPage,
    selectedPool,
    isModalOpen,
    isDeposit,
    isLoading,
    bTokenBalance,
    isLoadingBalance,
    hasWallet: !!address,
    openModal,
    closeModal,
    handleConfirm,
    refreshBalance: loadBTokenBalance,
    searchQuery,
    setSearchQuery: handleSetSearchQuery,
  };
}
