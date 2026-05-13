import {
  Account,
  Address,
  Contract,
  rpc,
  scValToNative,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import {
  getPool,
  addLiquidity,
  removeLiquidity,
  getAvailableTokens,
} from "@/lib/helpers/stellar/soroswap";
import {
  networkPassphrase,
  rpcUrl,
  stellarNetwork,
} from "@/lib/constants/network";
import { fromSmallestUnit } from "@/lib/helpers/tokenUtils";
import { mulDivCeil, mulDivFloor } from "@/lib/helpers/amount";

import type { BasePoolAdapter } from "../types/adapter.types";
import type {
  PoolAction,
  PoolActionOptions,
  PoolInfo,
  PoolPosition,
  PoolType,
  TokenInfo,
  TransactionResult,
} from "../types/pool.types";
import { AdapterError, UnsupportedActionError } from "../types/errors";

const SUPPORTED_ACTIONS: PoolAction[] = ["deposit", "withdraw"];
const WITHDRAW_SLIPPAGE_BPS = 100;
const LIST_POOLS_CACHE_TTL_MS = 5 * 60 * 1000;
const BASE_CODES = ["XLM", "USDC", "USDY", "PYUSD", "EURC"];
// Cap pair discovery so the pools UI stays responsive (each pair may RPC).
const MAX_DISCOVERY_PAIRS = 12;
const PAIR_FETCH_TIMEOUT_MS = 4_000;

type SoroswapApiPool = {
  address: string;
  tokenA: string;
  tokenB: string;
  reserveA: string;
  reserveB: string;
  protocol?: string;
  ledger?: number;
};

function parsePairId(poolId: string): { codeA: string; codeB: string } {
  const [codeA, codeB] = poolId.split("-");
  if (!codeA || !codeB) {
    throw new Error(
      `Invalid SoroSwap pool id "${poolId}". Expected format: TOKEN_A-TOKEN_B`
    );
  }
  return { codeA, codeB };
}

function resolveToken(code: string): TokenInfo {
  const tokens = getAvailableTokens();
  const t = tokens[code];
  if (!t?.contract) {
    throw new Error(`Unknown token code: ${code}`);
  }
  return {
    address: t.contract,
    code: t.code,
    name: t.name,
    decimals: t.decimals,
  };
}

function getReservesForRequestedOrder(
  pool: SoroswapApiPool,
  tokenA: TokenInfo,
  tokenB: TokenInfo
): { reserveForTokenA: bigint; reserveForTokenB: bigint } {
  const poolTokenA = String(pool.tokenA).toUpperCase();
  const poolTokenB = String(pool.tokenB).toUpperCase();
  const requestTokenA = tokenA.address.toUpperCase();
  const requestTokenB = tokenB.address.toUpperCase();

  if (poolTokenA === requestTokenA && poolTokenB === requestTokenB) {
    return {
      reserveForTokenA: BigInt(pool.reserveA),
      reserveForTokenB: BigInt(pool.reserveB),
    };
  }

  if (poolTokenA === requestTokenB && poolTokenB === requestTokenA) {
    return {
      reserveForTokenA: BigInt(pool.reserveB),
      reserveForTokenB: BigInt(pool.reserveA),
    };
  }

  throw new Error(
    `Unexpected pool token mapping for ${tokenA.code}/${tokenB.code}.`
  );
}

export class SoroswapPoolAdapter implements BasePoolAdapter {
  readonly type: PoolType = "soroswap";
  private static listPoolsCache: { at: number; value: PoolInfo[] } | null =
    null;

  private buildDiscoveryPairs(codes: string[]): string[] {
    const codeSet = new Set(codes);
    const selectedBases = BASE_CODES.filter((c) => codeSet.has(c));
    const pairs: string[] = [];
    const seen = new Set<string>();

    const addPair = (a: string, b: string) => {
      if (!a || !b || a === b) return;
      const [left, right] = [a, b].sort();
      const key = `${left}-${right}`;
      if (seen.has(key)) return;
      seen.add(key);
      pairs.push(key);
    };

    // Phase A: liquidity-centric pairs around base tokens.
    for (const base of selectedBases) {
      for (const code of codes) {
        if (code !== base) {
          addPair(base, code);
        }
      }
    }

    // Keep base-to-base pairs even when token universe is large.
    for (let i = 0; i < selectedBases.length; i++) {
      for (let j = i + 1; j < selectedBases.length; j++) {
        addPair(selectedBases[i], selectedBases[j]);
      }
    }

    // If no configured base token exists on this network, fall back to a small deterministic sample.
    if (!pairs.length) {
      for (let i = 0; i < codes.length; i++) {
        for (let j = i + 1; j < codes.length; j++) {
          addPair(codes[i], codes[j]);
          if (pairs.length >= MAX_DISCOVERY_PAIRS) break;
        }
        if (pairs.length >= MAX_DISCOVERY_PAIRS) break;
      }
    }

    return pairs.slice(0, MAX_DISCOVERY_PAIRS);
  }

  private async getPoolInfoWithTimeout(pair: string): Promise<PoolInfo> {
    return new Promise<PoolInfo>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timed out fetching Soroswap pair ${pair}`));
      }, PAIR_FETCH_TIMEOUT_MS);

      void this.getPoolInfo(pair)
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  async getPoolInfo(poolId: string): Promise<PoolInfo> {
    const { codeA, codeB } = parsePairId(poolId);
    const tokenA = resolveToken(codeA);
    const tokenB = resolveToken(codeB);

    try {
      const pools = await getPool({
        tokenA: tokenA.address,
        tokenB: tokenB.address,
      });

      if (!pools.length) {
        return {
          id: `soroswap:${poolId}`,
          type: "soroswap",
          name: `${codeA} / ${codeB} Soroswap Pool`,
          tokens: [tokenA, tokenB],
          tvl: 0n,
          apy: 0,
          state: "unknown",
          supportedActions: SUPPORTED_ACTIONS,
          metadata: { exists: false },
        };
      }

      const pool = pools[0];
      const { reserveForTokenA, reserveForTokenB } =
        getReservesForRequestedOrder(pool, tokenA, tokenB);

      return {
        id: `soroswap:${poolId}`,
        type: "soroswap",
        name: `${codeA} / ${codeB} Soroswap Pool`,
        tokens: [tokenA, tokenB],
        tvl: reserveForTokenA + reserveForTokenB,
        apy: 0,
        state: "active",
        supportedActions: SUPPORTED_ACTIONS,
        metadata: {
          poolAddress: pool.address,
          protocol: pool.protocol,
          reserveA: reserveForTokenA.toString(),
          reserveB: reserveForTokenB.toString(),
          reserveAFormatted: fromSmallestUnit(
            reserveForTokenA.toString(),
            tokenA.decimals
          ),
          reserveBFormatted: fromSmallestUnit(
            reserveForTokenB.toString(),
            tokenB.decimals
          ),
          ledger: pool.ledger,
        },
      };
    } catch (error) {
      throw new AdapterError("soroswap", "getPoolInfo", error);
    }
  }

  async listPools(limit?: number): Promise<PoolInfo[]> {
    const now = Date.now();

    // Adapter-level cache only applies to the full (unlimited) fetch
    if (
      limit === undefined &&
      SoroswapPoolAdapter.listPoolsCache &&
      now - SoroswapPoolAdapter.listPoolsCache.at < LIST_POOLS_CACHE_TTL_MS
    ) {
      return SoroswapPoolAdapter.listPoolsCache.value;
    }

    // If a cache exists and we just need a subset, slice it without re-fetching
    if (
      limit !== undefined &&
      SoroswapPoolAdapter.listPoolsCache &&
      now - SoroswapPoolAdapter.listPoolsCache.at < LIST_POOLS_CACHE_TTL_MS
    ) {
      return SoroswapPoolAdapter.listPoolsCache.value.slice(0, limit);
    }

    const tokens = getAvailableTokens();
    const codes = Object.keys(tokens);
    const allPairs = this.buildDiscoveryPairs(codes);
    const pairsToFetch =
      limit !== undefined ? allPairs.slice(0, limit) : allPairs;

    // Process in bounded batches to avoid bursty 429 spikes
    const BATCH_SIZE = 4;
    const settled: PromiseSettledResult<PoolInfo>[] = [];
    for (let i = 0; i < pairsToFetch.length; i += BATCH_SIZE) {
      const batch = pairsToFetch.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map((pair) => this.getPoolInfoWithTimeout(pair))
      );
      settled.push(...batchResults);
      if (i + BATCH_SIZE < pairsToFetch.length) {
        const has429 = batchResults.some(
          (result) =>
            result.status === "rejected" &&
            String(result.reason).includes("429")
        );
        await new Promise((r) => setTimeout(r, has429 ? 700 : 150));
      }
    }

    const pools = settled
      .filter(
        (r): r is PromiseFulfilledResult<PoolInfo> =>
          r.status === "fulfilled" && r.value.state !== "unknown"
      )
      .map((r) => r.value);

    // Only cache the full result so partial fetches don't poison it
    if (limit === undefined) {
      SoroswapPoolAdapter.listPoolsCache = { at: now, value: pools };
    }
    return pools;
  }

  async getUserPosition(
    poolId: string,
    userAddress: string
  ): Promise<PoolPosition> {
    const emptyPosition: PoolPosition = {
      poolId: `soroswap:${poolId}`,
      deposited: 0n,
      depositedFormatted: "0",
      rewards: 0n,
      rewardsFormatted: "0",
      metadata: {},
    };

    try {
      const { codeA, codeB } = parsePairId(poolId);
      const tokenA = resolveToken(codeA);
      const tokenB = resolveToken(codeB);
      const pools = await getPool({
        tokenA: tokenA.address,
        tokenB: tokenB.address,
      });

      const pool = pools[0];
      if (!pool?.address) {
        return emptyPosition;
      }

      const lpTokenDecimals = 7;
      const sorobanServer = new rpc.Server(rpcUrl, {
        allowHttp: stellarNetwork === "LOCAL",
      });
      const account = await sorobanServer.getAccount(userAddress);
      const lpShares = await simulateTokenBigint(
        pool.address,
        "balance",
        account,
        sorobanServer,
        userAddress
      );
      if (lpShares === 0n) return emptyPosition;

      let deposited = lpShares;
      let depositedDecimals = lpTokenDecimals;
      let totalLpSupply = 0n;
      let reserveForTokenA = 0n;
      let reserveForTokenB = 0n;
      let underlyingAmountsRaw: string[] = [];
      let withdrawUnit: "underlying" | "lp_shares" = "lp_shares";

      try {
        totalLpSupply = await simulateTokenBigint(
          pool.address,
          "total_supply",
          account,
          sorobanServer
        );
        const reserves = getReservesForRequestedOrder(pool, tokenA, tokenB);
        reserveForTokenA = reserves.reserveForTokenA;
        reserveForTokenB = reserves.reserveForTokenB;

        if (
          totalLpSupply > 0n &&
          reserveForTokenA > 0n &&
          reserveForTokenB > 0n
        ) {
          const underlyingA = mulDivFloor(
            lpShares,
            reserveForTokenA,
            totalLpSupply
          );
          const underlyingB = mulDivFloor(
            lpShares,
            reserveForTokenB,
            totalLpSupply
          );
          deposited = underlyingA;
          depositedDecimals = tokenA.decimals;
          underlyingAmountsRaw = [
            underlyingA.toString(),
            underlyingB.toString(),
          ];
          withdrawUnit = "underlying";
        }
      } catch {
        // Keep the position visible as LP shares if the pair data cannot be
        // converted to underlying token amounts.
      }

      return {
        poolId: `soroswap:${poolId}`,
        deposited,
        depositedFormatted: fromSmallestUnit(
          deposited.toString(),
          depositedDecimals
        ),
        rewards: 0n,
        rewardsFormatted: "0",
        metadata: {
          poolAddress: pool.address,
          lpTokenAddress: pool.address,
          lpSharesRaw: lpShares.toString(),
          totalLpSupply: totalLpSupply.toString(),
          reserveA: reserveForTokenA.toString(),
          reserveB: reserveForTokenB.toString(),
          underlyingAmountsRaw,
          withdrawUnit,
        },
      };
    } catch {
      return emptyPosition;
    }
  }

  async deposit(
    poolId: string,
    userAddress: string,
    amount: bigint,
    _tokenIndex?: number
  ): Promise<TransactionResult> {
    const { codeA, codeB } = parsePairId(poolId);
    const tokenA = resolveToken(codeA);
    const tokenB = resolveToken(codeB);

    const humanAmountA = fromSmallestUnit(amount.toString(), tokenA.decimals);

    try {
      const pools = await getPool({
        tokenA: tokenA.address,
        tokenB: tokenB.address,
      });
      const pool = pools[0];

      if (!pool) {
        throw new Error(
          `No active Soroswap pool found for ${tokenA.code}/${tokenB.code}.`
        );
      }

      const { reserveForTokenA, reserveForTokenB } =
        getReservesForRequestedOrder(pool, tokenA, tokenB);

      if (reserveForTokenA <= 0n || reserveForTokenB <= 0n) {
        throw new Error(
          `Pool reserves are invalid for ${tokenA.code}/${tokenB.code}.`
        );
      }

      // Keep deposit amounts aligned with pool ratio to satisfy slippage checks.
      const amountB = (amount * reserveForTokenB) / reserveForTokenA;
      if (amountB <= 0n) {
        throw new Error(
          "Calculated token B amount is too small for this pool."
        );
      }

      const humanAmountB = fromSmallestUnit(
        amountB.toString(),
        tokenB.decimals
      );

      const result = await addLiquidity({
        assetA: tokenA.address,
        assetB: tokenB.address,
        amountA: humanAmountA,
        amountB: humanAmountB,
        to: userAddress,
      });

      return { xdr: result.xdr, networkPassphrase };
    } catch (error) {
      throw new AdapterError("soroswap", "deposit", error);
    }
  }
  async withdraw(
    poolId: string,
    userAddress: string,
    amount: bigint,
    _tokenIndex?: number,
    options?: PoolActionOptions
  ): Promise<TransactionResult> {
    const { codeA, codeB } = parsePairId(poolId);
    const tokenA = resolveToken(codeA);
    const tokenB = resolveToken(codeB);

    try {
      const pools = await getPool({
        tokenA: tokenA.address,
        tokenB: tokenB.address,
      });
      const pool = pools[0];

      if (!pool?.address) {
        throw new Error(
          `No active Soroswap pool found for ${tokenA.code}/${tokenB.code}.`
        );
      }

      const { reserveForTokenA, reserveForTokenB } =
        getReservesForRequestedOrder(pool, tokenA, tokenB);

      if (reserveForTokenA <= 0n || reserveForTokenB <= 0n) {
        throw new Error(
          `Pool reserves are invalid for ${tokenA.code}/${tokenB.code}.`
        );
      }

      const sorobanServer = new rpc.Server(rpcUrl, {
        allowHttp: stellarNetwork === "LOCAL",
      });
      const account = await sorobanServer.getAccount(userAddress);
      const [userLpShares, totalLpSupply] = await Promise.all([
        simulateTokenBigint(
          pool.address,
          "balance",
          account,
          sorobanServer,
          userAddress
        ),
        simulateTokenBigint(
          pool.address,
          "total_supply",
          account,
          sorobanServer
        ),
      ]);

      if (userLpShares <= 0n) {
        throw new Error("No Soroswap LP position to withdraw.");
      }
      if (totalLpSupply <= 0n) {
        throw new Error("Soroswap LP total supply is zero.");
      }

      let liquidity: bigint;
      if (options?.withdrawAll) {
        liquidity = userLpShares;
      } else if (options?.withdrawUnit === "lp_shares") {
        liquidity = amount;
      } else {
        liquidity = mulDivCeil(amount, totalLpSupply, reserveForTokenA);
      }

      if (liquidity <= 0n) {
        throw new Error("Withdrawal amount is too small for this pool.");
      }
      if (liquidity > userLpShares) {
        throw new Error("Withdrawal amount exceeds your LP balance.");
      }

      const expectedA = mulDivFloor(liquidity, reserveForTokenA, totalLpSupply);
      const expectedB = mulDivFloor(liquidity, reserveForTokenB, totalLpSupply);
      if (expectedA <= 0n || expectedB <= 0n) {
        throw new Error("Withdrawal output is too small for this pool.");
      }

      const result = await removeLiquidity({
        assetA: tokenA.address,
        assetB: tokenB.address,
        liquidity,
        amountA: expectedA,
        amountB: expectedB,
        to: userAddress,
        slippageBps: WITHDRAW_SLIPPAGE_BPS,
      });

      return { xdr: result.xdr, networkPassphrase };
    } catch (error) {
      throw new AdapterError("soroswap", "withdraw", error);
    }
  }

  async claimRewards(): Promise<TransactionResult> {
    throw new UnsupportedActionError("soroswap", "claimRewards");
  }

  supportsAction(action: PoolAction): boolean {
    return SUPPORTED_ACTIONS.includes(action);
  }
}

async function simulateTokenBigint(
  contractAddress: string,
  method: "balance" | "total_supply",
  account: Account,
  server: rpc.Server,
  address?: string
): Promise<bigint> {
  const contract = new Contract(contractAddress);
  const args = address ? [new Address(address).toScVal()] : [];
  const simulationAccount = new Account(
    account.accountId(),
    account.sequenceNumber()
  );
  const tx = new TransactionBuilder(simulationAccount, {
    fee: "1000000",
    networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(300)
    .build();

  const simulated = await server.simulateTransaction(tx);
  const result = simulated as { result?: { retval?: unknown }; error?: string };
  if (result.error || !result.result?.retval) {
    throw new Error(`Failed to simulate ${method} for ${contractAddress}`);
  }
  const native = scValToNative(
    result.result.retval as Parameters<typeof scValToNative>[0]
  );
  return BigInt(native as string | number | bigint);
}
