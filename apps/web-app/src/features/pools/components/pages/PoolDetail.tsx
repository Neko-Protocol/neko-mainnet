"use client";

import React, { useMemo, useState, useCallback } from "react";
import { use } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  orchestrator,
  useUserPosition,
  usePoolAction,
  usePools,
} from "@/lib/orchestrator";
import { fromSmallestUnit, toSmallestUnit } from "@/lib/helpers/tokenUtils";
import type { PoolAction, PoolInfo } from "@/lib/orchestrator";
import { useWallet } from "@/hooks/useWallet";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { usePoolDetail } from "@/features/pools/hooks/usePoolDetail";
import {
  PoolDetailLayout,
  type PoolDetailPanelPool,
  type CollateralOption,
} from "../ui/PoolDetailPanel";
import { formatAmount } from "@/lib/helpers/formatUtils";
import { formatLiquidity, safeParseFloat } from "../../utils/poolUtils";
import { getPoolTokenIcon } from "../../utils/poolTokenIcons";
import {
  reserveStroopsFromApiString,
  aquaProportionalAmountB,
} from "@/lib/helpers/stellar/aquaDeposit";
import { spendableNativeStroops } from "@/lib/helpers/stellar/stellarAccountReserve";
import { rpc, TransactionBuilder } from "@stellar/stellar-sdk";
import { rpcUrl } from "@/lib/constants/network";

interface PoolDetailProps {
  params: Promise<{ contractid: string }>;
}

const ISSUER_LABELS: Record<string, string> = {
  blend: "Blend",
  neko: "Neko",
  soroswap: "Soroswap",
  aqua: "Aqua",
};

const ISSUER_ICONS: Record<string, string> = {
  blend: "/assets/vault-creators/blend.png",
  neko: "/logo.svg",
  soroswap: "/assets/vault-creators/soroswap.jpg",
  aqua: "https://coin-images.coingecko.com/coins/images/20026/small/aqua-logo.png?1696519446",
};

const PoolDetail: React.FC<PoolDetailProps> = ({ params }) => {
  const { contractid: rawId } = use(params);
  const contractid = decodeURIComponent(rawId);

  const {
    address,
    nativeBalanceStroops,
    subentryCount,
    refetchBalances,
    signTransaction,
  } = useWallet();
  const queryClient = useQueryClient();
  const { data: pool, isLoading, error } = usePoolDetail(contractid);
  const { data: position } = useUserPosition(contractid, address);
  const { balance: token1Balance } = useTokenBalance(pool?.tokens[0]?.address);
  const { balance: token2Balance } = useTokenBalance(pool?.tokens[1]?.address);

  // Sibling reserves in the same Blend pool contract (used as collateral options)
  const { data: allPools = [] } = usePools();
  const blendPoolContractId =
    pool?.type === "blend"
      ? (pool.metadata?.poolContractId as string | undefined)
      : undefined;

  const collateralOptions = useMemo<CollateralOption[]>(() => {
    if (!blendPoolContractId) return [];
    return allPools
      .filter(
        (p: PoolInfo) =>
          p.type === "blend" &&
          (p.metadata?.poolContractId as string) === blendPoolContractId &&
          p.id !== contractid
      )
      .map((p: PoolInfo) => ({
        symbol: p.tokens[0]?.code ?? "?",
        address: p.tokens[0]?.address ?? "",
        poolId: p.id,
        decimals: p.tokens[0]?.decimals ?? 7,
        cFactor: (p.metadata?.cFactor as number) ?? 0,
        userBalance: "0", // updated below via useUserPosition per sibling pool
      }));
  }, [allPools, blendPoolContractId, contractid]);

  // Fetch user's deposited position in each sibling pool (up to 3 siblings typical)
  const collateralPosition0 = useUserPosition(
    collateralOptions[0]?.poolId,
    address
  );
  const collateralPosition1 = useUserPosition(
    collateralOptions[1]?.poolId,
    address
  );
  const collateralPosition2 = useUserPosition(
    collateralOptions[2]?.poolId,
    address
  );

  const collateralOptionsWithBalances = useMemo<CollateralOption[]>(() => {
    const deposited = [
      collateralPosition0.data?.depositedFormatted ?? "0",
      collateralPosition1.data?.depositedFormatted ?? "0",
      collateralPosition2.data?.depositedFormatted ?? "0",
    ];
    return collateralOptions.map((opt, i) => ({
      ...opt,
      userBalance: deposited[i] ?? "0",
    }));
  }, [
    collateralOptions,
    collateralPosition0.data,
    collateralPosition1.data,
    collateralPosition2.data,
  ]);

  const { mutateAsync: executePoolAction, isPending: isActionPending } =
    usePoolAction();

  const supportedActions = useMemo(
    () =>
      pool
        ? pool.supportedActions.filter((a: PoolAction) =>
            orchestrator.supportsAction(contractid, a)
          )
        : [],
    [contractid, pool]
  );

  const isLendingPool = pool?.type === "blend" || pool?.type === "neko";

  const { canLend, lendAction, canBorrow, canRemoveOrWithdraw } =
    useMemo(() => {
      if (!pool) {
        return {
          canLend: false,
          lendAction: "deposit" as PoolAction,
          canBorrow: false,
          canRemoveOrWithdraw: false,
        };
      }
      const dep = supportedActions.includes("deposit");
      const sc = supportedActions.includes("supplyCollateral");
      const canL = dep || sc;
      const lAct: PoolAction = dep ? "deposit" : "supplyCollateral";
      const canB = supportedActions.includes("borrow");
      const canR = supportedActions.includes("withdraw");
      return {
        canLend: canL,
        lendAction: lAct,
        canBorrow: canB,
        canRemoveOrWithdraw: canR,
      };
    }, [pool, supportedActions]);

  /** AMM / Neko-style: deposit + withdraw, no protocol borrow */
  const depositWithdrawMode =
    !!pool && canLend && canRemoveOrWithdraw && !canBorrow;

  const [ammTab, setAmmTab] = useState<"deposit" | "withdraw">("deposit");
  const [ammAmount, setAmmAmount] = useState("");

  const handleAmmTabChange = useCallback((t: "deposit" | "withdraw") => {
    setAmmTab(t);
    setAmmAmount("");
  }, []);

  const isAquaDeposit = pool?.type === "aqua" && ammTab === "deposit";

  const decimals = pool?.tokens[0]?.decimals ?? 7;

  const spendableXlmStroops = useMemo(
    () => spendableNativeStroops(nativeBalanceStroops, subentryCount),
    [nativeBalanceStroops, subentryCount]
  );

  const requiredSecondLegFormatted = useMemo(() => {
    if (!pool || pool.type !== "aqua" || ammTab !== "deposit" || !ammAmount) {
      return null;
    }
    const n = parseFloat(ammAmount);
    if (isNaN(n) || n <= 0) return null;
    const reserves = pool.metadata.reserves as string[] | undefined;
    if (!reserves?.length || pool.tokens.length < 2) return null;
    const amountA = BigInt(toSmallestUnit(ammAmount, decimals));
    const amtB = aquaProportionalAmountB(amountA, reserves);
    const d2 = pool.tokens[1]?.decimals ?? 7;
    return fromSmallestUnit(amtB.toString(), d2);
  }, [pool, ammTab, ammAmount, decimals]);

  const amountExceedsSpendableXlm =
    depositWithdrawMode &&
    ammTab === "deposit" &&
    pool?.tokens[0]?.code === "XLM" &&
    ammAmount !== "" &&
    !isNaN(parseFloat(ammAmount)) &&
    parseFloat(ammAmount) > 0 &&
    BigInt(toSmallestUnit(ammAmount, decimals)) > spendableXlmStroops;

  const secondTokenInsufficient =
    isAquaDeposit &&
    pool &&
    pool.tokens.length >= 2 &&
    requiredSecondLegFormatted != null &&
    parseFloat(token2Balance ?? "0") <
      parseFloat(requiredSecondLegFormatted) - 1e-10;

  const refetchAfterTx = useCallback(async () => {
    await Promise.all([
      queryClient.refetchQueries({
        queryKey: ["orchestrator", "pool", contractid],
      }),
      address
        ? queryClient.refetchQueries({
            queryKey: ["orchestrator", "position", contractid, address],
          })
        : Promise.resolve(),
      address
        ? queryClient.refetchQueries({
            queryKey: ["stellar-balances", address],
          })
        : Promise.resolve(),
      queryClient.refetchQueries({ queryKey: ["tokenBalance"] }),
    ]);
    await refetchBalances();
  }, [queryClient, contractid, address, refetchBalances]);

  const runPoolAction = useCallback(
    async (action: PoolAction, amount: bigint) => {
      await executePoolAction({
        poolId: contractid,
        action,
        amount,
        tokenIndex: 0,
      });
      await refetchAfterTx();
    },
    [contractid, executePoolAction, refetchAfterTx]
  );

  const ammFirstLegDepositInsufficient = useMemo(() => {
    if (ammTab !== "deposit" || !depositWithdrawMode || !ammAmount)
      return false;
    const n = parseFloat(ammAmount);
    if (isNaN(n) || n <= 0) return false;
    if (pool?.tokens[0]?.code === "XLM") {
      return amountExceedsSpendableXlm;
    }
    return n > parseFloat(token1Balance ?? "0") + 1e-10;
  }, [
    ammTab,
    depositWithdrawMode,
    ammAmount,
    pool?.tokens,
    amountExceedsSpendableXlm,
    token1Balance,
  ]);

  const ammWithdrawInsufficient = useMemo(() => {
    if (ammTab !== "withdraw" || !depositWithdrawMode || !ammAmount) {
      return false;
    }
    const n = parseFloat(ammAmount);
    if (isNaN(n) || n <= 0) return false;
    const max = parseFloat(position?.depositedFormatted ?? "0");
    return n > max + 1e-10;
  }, [ammTab, depositWithdrawMode, ammAmount, position?.depositedFormatted]);

  const ammInsufficientFunds = useMemo(() => {
    if (ammTab === "withdraw") return ammWithdrawInsufficient;
    return ammFirstLegDepositInsufficient || secondTokenInsufficient;
  }, [
    ammTab,
    ammFirstLegDepositInsufficient,
    ammWithdrawInsufficient,
    secondTokenInsufficient,
  ]);

  const handleAmmSubmit = useCallback(async () => {
    if (!pool || !address) return;
    const num = parseFloat(ammAmount);
    if (isNaN(num) || num <= 0) return;
    if (ammInsufficientFunds) return;

    const amountBigInt = BigInt(toSmallestUnit(ammAmount, decimals));
    const action: PoolAction = ammTab === "deposit" ? "deposit" : "withdraw";
    await runPoolAction(action, amountBigInt);
    setAmmAmount("");
  }, [
    pool,
    address,
    ammAmount,
    decimals,
    ammTab,
    ammInsufficientFunds,
    runPoolAction,
  ]);

  const handleLendOnlySubmit = useCallback(
    async (supplyAmount: string) => {
      if (!address) return;
      const n = parseFloat(supplyAmount);
      if (isNaN(n) || n <= 0) return;
      const amountBigInt = BigInt(toSmallestUnit(supplyAmount, decimals));
      await runPoolAction(lendAction, amountBigInt);
    },
    [address, decimals, lendAction, runPoolAction]
  );

  const handleBorrowingSubmit = useCallback(
    async (
      borrowAmount: string,
      collateralAssetAddress: string,
      collateralAmt: string
    ) => {
      if (!address || !signTransaction) return;
      const b = parseFloat(borrowAmount);
      if (isNaN(b) || b <= 0) return;
      const bDec = pool?.tokens[0]?.decimals ?? 7;
      const borrowBigInt = BigInt(toSmallestUnit(borrowAmount, bDec));

      const cNum = parseFloat(collateralAmt);
      const hasCollateral =
        !!collateralAssetAddress && !isNaN(cNum) && cNum > 0;

      if (hasCollateral) {
        const collateralOption = collateralOptionsWithBalances.find(
          (o) => o.address === collateralAssetAddress
        );
        const cDec = collateralOption?.decimals ?? 7;
        const collateralBigInt = BigInt(toSmallestUnit(collateralAmt, cDec));

        const result = await orchestrator.borrowWithCollateral(
          contractid,
          address,
          borrowBigInt,
          collateralAssetAddress,
          collateralBigInt
        );

        const signed = await signTransaction(result.xdr, {
          networkPassphrase: result.networkPassphrase,
        });
        const signedXdr =
          typeof signed === "string"
            ? signed
            : ((signed as { signedTxXdr?: string }).signedTxXdr ?? "");

        const server = new rpc.Server(rpcUrl, { allowHttp: true });
        const tx = TransactionBuilder.fromXDR(
          signedXdr,
          result.networkPassphrase
        );
        const txResult = await server.sendTransaction(tx);
        if (txResult.status === "ERROR") {
          throw new Error("Transaction failed");
        }
        await server.pollTransaction(txResult.hash, { attempts: 30 });
      } else {
        await runPoolAction("borrow", borrowBigInt);
      }

      await refetchAfterTx();
    },
    [
      address,
      signTransaction,
      pool,
      contractid,
      collateralOptionsWithBalances,
      runPoolAction,
      refetchAfterTx,
    ]
  );

  const ammSubmitDisabled =
    isActionPending ||
    !address ||
    !ammAmount ||
    parseFloat(ammAmount) <= 0 ||
    ammInsufficientFunds;

  const ammInsufficientFundsMessage = useMemo(() => {
    if (!depositWithdrawMode || !ammAmount || parseFloat(ammAmount) <= 0) {
      return null;
    }
    if (!ammInsufficientFunds) return null;
    return "Fondos insuficientes";
  }, [depositWithdrawMode, ammAmount, ammInsufficientFunds]);

  const panelPool = useMemo<PoolDetailPanelPool | null>(() => {
    if (!pool) return null;

    const t1 = pool.tokens[0];
    const t2 = pool.tokens[1] ?? t1;
    const d = t1?.decimals ?? 7;

    const tvlRaw = fromSmallestUnit(pool.tvl.toString(), d);
    const tvlNum = parseFloat(tvlRaw);

    const liabilitiesStr = position?.metadata?.liabilities
      ? String(position.metadata.liabilities)
      : "0";
    const totalLiabilities = parseFloat(
      fromSmallestUnit(
        (pool.metadata.totalLiabilities as string | undefined) ?? "0",
        d
      )
    );
    const availableLiquidityNum = Math.max(0, tvlNum - totalLiabilities);

    const cFactor = (pool.metadata.cFactor as number | undefined) ?? 0;
    const liquidationLtv = Math.round(cFactor * 100);

    const collateralRaw =
      position?.metadata?.collateral &&
      String(position.metadata.collateral) !== "0"
        ? fromSmallestUnit(String(position.metadata.collateral), d)
        : "0.00";

    const loanRaw =
      liabilitiesStr !== "0" ? fromSmallestUnit(liabilitiesStr, d) : "0.00";

    const supplyApyFromMeta =
      (pool.metadata.supplyApy as number | undefined) ?? pool.apy;
    const borrowApy = (pool.metadata.borrowApy as number | undefined) ?? 0;

    const isAqua = pool.type === "aqua";
    const liquidityUsd = String(
      (pool.metadata.liquidityUsd as string | undefined) ?? "0"
    );
    const reserveList = (pool.metadata.reserves as string[] | undefined) ?? [];

    let totalLiquidity: string;
    let totalLiquidityRaw: string | undefined;
    let supplyApyDisplay: string;
    let supplyApySub: string | undefined;
    let borrowApyLabel: string | undefined;

    if (isAqua) {
      const usd = safeParseFloat(liquidityUsd);
      totalLiquidity = formatLiquidity(usd);
      totalLiquidityRaw = pool.tokens
        .map((t, i) => {
          const r = reserveList[i] ?? "0";
          const dec = t.decimals ?? 7;
          const amt = fromSmallestUnit(
            reserveStroopsFromApiString(r).toString(),
            dec
          );
          return `${formatAmount(amt)} ${t.code ?? ""}`.trim();
        })
        .filter(Boolean)
        .join(" · ");

      const baseSup = (pool.metadata.supplyApy as number | undefined) ?? 0;
      const rewards = (pool.metadata.rewardsApy as number | undefined) ?? 0;
      const totalApy = pool.apy;
      supplyApyDisplay = `${Number.isFinite(totalApy) ? totalApy.toFixed(2) : "0.00"}%`;
      if (rewards > 0.0001) {
        supplyApySub = `Base ${baseSup.toFixed(2)}% + ${rewards.toFixed(2)}% rewards`;
      }
    } else if (isLendingPool) {
      totalLiquidity = formatLiquidity(availableLiquidityNum.toString());
      totalLiquidityRaw = `${availableLiquidityNum.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${t1?.code ?? ""}`;
      supplyApyDisplay = `${supplyApyFromMeta.toFixed(2)}%`;
      borrowApyLabel = `${borrowApy.toFixed(2)}%`;
    } else {
      totalLiquidity = formatLiquidity(availableLiquidityNum.toString());
      totalLiquidityRaw = `${availableLiquidityNum.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${t1?.code ?? ""}`;
      supplyApyDisplay = pool.apy > 0 ? `${pool.apy.toFixed(2)}%` : "0.00%";
    }

    return {
      id: pool.id,
      name: pool.name || `${t1?.code ?? "?"} / ${t2?.code ?? "?"}`,
      token1: {
        symbol: t1?.code ?? "?",
        icon: getPoolTokenIcon({ type: "contract", code: t1?.code ?? "" }),
        address: t1?.address,
      },
      token2: {
        symbol: t2?.code ?? "?",
        icon: getPoolTokenIcon({ type: "contract", code: t2?.code ?? "" }),
        address: t2?.address,
      },
      liquidationLtv,
      contractAddress: pool.id,
      network: "Stellar",
      totalLiquidity,
      totalLiquidityRaw,
      supplyApy: supplyApyDisplay,
      supplyApySub,
      borrowApyLabel,
      issuer: {
        name: ISSUER_LABELS[pool.type] ?? pool.type,
        icon: ISSUER_ICONS[pool.type] ?? null,
      },
      token1Balance: token1Balance ?? "0",
      /** LP / supplied position in human units (withdraw max) */
      lpBalance: position?.depositedFormatted ?? "0",
      collateralBalance: collateralRaw,
      loanBalance: loanRaw,
      currentLtv: 0,
      collateralOptions: collateralOptionsWithBalances,
    };
  }, [
    pool,
    position,
    token1Balance,
    isLendingPool,
    collateralOptionsWithBalances,
  ]);

  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center px-4 py-8 h-dvh">
        <div className="w-full max-w-md rounded-2xl bg-[#1C1C1C] border border-white/5 p-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-white/10 border-t-[#229EDF] mx-auto mb-4" />
          <p className="text-white/40 text-sm">Loading pool...</p>
        </div>
      </div>
    );
  }

  if (error || !pool || !panelPool) {
    return (
      <div className="w-full flex items-center justify-center px-4 py-8 h-dvh">
        <div className="max-w-2xl w-full rounded-2xl bg-red-500/10 border border-red-500/20 p-8 text-center">
          <h1 className="text-xl font-bold text-red-400 mb-2">
            Pool not found
          </h1>
          <p className="text-red-400/70 text-sm mb-6">
            {error instanceof Error
              ? error.message
              : "Could not load pool data."}
          </p>
          <Link
            href="/pools"
            className="text-[#229EDF] font-semibold text-sm hover:underline"
          >
            &larr; Back to Pools
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col h-[calc(100dvh-4rem)] lg:h-dvh px-4 sm:px-6 lg:px-8">
      <div className="py-4 shrink-0">
        <Link
          href="/pools"
          className="inline-flex items-center gap-1 text-white/60 hover:text-white font-medium text-sm transition-colors"
        >
          &larr; Back to Pools
        </Link>
      </div>

      <div className="flex-1 min-h-0 pb-4">
        <PoolDetailLayout
          pool={panelPool}
          type="lend"
          isWalletConnected={!!address}
          supportsBorrow={isLendingPool && supportedActions.includes("borrow")}
          depositWithdrawMode={depositWithdrawMode}
          ammTab={ammTab}
          onAmmTabChange={handleAmmTabChange}
          ammAmount={ammAmount}
          onAmmAmountChange={setAmmAmount}
          onAmmSubmit={handleAmmSubmit}
          isAmmSubmitting={isActionPending}
          ammSubmitDisabled={ammSubmitDisabled}
          ammInsufficientFundsMessage={ammInsufficientFundsMessage}
          canLend={canLend}
          canBorrow={canBorrow}
          onLendSubmit={handleLendOnlySubmit}
          onBorrowSubmit={handleBorrowingSubmit}
          isLendingActionPending={isActionPending}
        />
      </div>
    </div>
  );
};

export default PoolDetail;
