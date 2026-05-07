import {
  getPool,
  addLiquidity,
  getAvailableTokens,
} from "@/lib/helpers/stellar/soroswap";
import { networkPassphrase } from "@/lib/constants/network";
import { fromSmallestUnit } from "@/lib/helpers/tokenUtils";
import { getTokenBalanceFromContract } from "@/lib/helpers/stellar/sorobanBalance";

import type { BasePoolAdapter } from "../types/adapter.types";
import type {
  PoolAction,
  PoolInfo,
  PoolPosition,
  PoolType,
  TokenInfo,
  TransactionResult,
} from "../types/pool.types";
import { AdapterError, UnsupportedActionError } from "../types/errors";

const SUPPORTED_ACTIONS: PoolAction[] = ["deposit", "withdraw"];
const LIST_POOLS_CACHE_TTL_MS = 5 * 60 * 1000;
const BASE_CODES = ["XLM", "USDC", "USDY", "PYUSD", "EURC"];
// Cap pair discovery so the pools UI stays responsive (each pair may RPC).
const MAX_DISCOVERY_PAIRS = 12;
const PAIR_FETCH_TIMEOUT_MS = 4_000;

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
      const reserveA = BigInt(pool.reserveA);
      const reserveB = BigInt(pool.reserveB);

      return {
        id: `soroswap:${poolId}`,
        type: "soroswap",
        name: `${codeA} / ${codeB} Soroswap Pool`,
        tokens: [tokenA, tokenB],
        tvl: reserveA + reserveB,
        apy: 0,
        state: "active",
        supportedActions: SUPPORTED_ACTIONS,
        metadata: {
          poolAddress: pool.address,
          protocol: pool.protocol,
          reserveA: pool.reserveA,
          reserveB: pool.reserveB,
          reserveAFormatted: fromSmallestUnit(
            reserveA.toString(),
            tokenA.decimals
          ),
          reserveBFormatted: fromSmallestUnit(
            reserveB.toString(),
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
      const depositedFormatted = await getTokenBalanceFromContract(
        pool.address,
        userAddress,
        lpTokenDecimals
      );
      const deposited = toBigIntFromDecimalString(
        depositedFormatted,
        lpTokenDecimals
      );

      return {
        poolId: `soroswap:${poolId}`,
        deposited,
        depositedFormatted: fromSmallestUnit(
          deposited.toString(),
          lpTokenDecimals
        ),
        rewards: 0n,
        rewardsFormatted: "0",
        metadata: {
          lpTokenAddress: pool.address,
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

      const poolTokenA = String(pool.tokenA).toUpperCase();
      const poolTokenB = String(pool.tokenB).toUpperCase();
      const requestTokenA = tokenA.address.toUpperCase();
      const requestTokenB = tokenB.address.toUpperCase();

      let reserveForTokenA: bigint;
      let reserveForTokenB: bigint;

      if (poolTokenA === requestTokenA && poolTokenB === requestTokenB) {
        reserveForTokenA = BigInt(pool.reserveA);
        reserveForTokenB = BigInt(pool.reserveB);
      } else if (poolTokenA === requestTokenB && poolTokenB === requestTokenA) {
        reserveForTokenA = BigInt(pool.reserveB);
        reserveForTokenB = BigInt(pool.reserveA);
      } else {
        throw new Error(
          `Unexpected pool token mapping for ${tokenA.code}/${tokenB.code}.`
        );
      }

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
  async withdraw(): Promise<TransactionResult> {
    throw new UnsupportedActionError(
      "soroswap",
      "withdraw (remove liquidity not yet available via API)"
    );
  }

  async claimRewards(): Promise<TransactionResult> {
    throw new UnsupportedActionError("soroswap", "claimRewards");
  }

  supportsAction(action: PoolAction): boolean {
    if (action === "withdraw") return false;
    return SUPPORTED_ACTIONS.includes(action);
  }
}

function toBigIntFromDecimalString(value: string, decimals: number): bigint {
  if (!value || value === "0") return 0n;
  const [integerPart = "0", fractionPart = ""] = value.split(".");
  const normalizedFraction = fractionPart
    .slice(0, decimals)
    .padEnd(decimals, "0");
  const normalizedInteger = integerPart.replace(/^0+(?=\d)/, "") || "0";
  return BigInt(`${normalizedInteger}${normalizedFraction}`);
}
