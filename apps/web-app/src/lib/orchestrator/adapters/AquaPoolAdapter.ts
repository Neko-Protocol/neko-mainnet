import {
  Contract,
  Address,
  nativeToScVal,
  scValToNative,
  xdr as StellarXdr,
  rpc,
  TransactionBuilder,
  Account,
} from "@stellar/stellar-sdk";
import type { BasePoolAdapter } from "../types/adapter.types";
import type {
  PoolAction,
  PoolInfo,
  PoolPosition,
  PoolType,
  TokenInfo,
  TransactionResult,
} from "../types/pool.types";
import { AdapterError } from "../types/errors";
import { getAquaPoolAddresses, AQUA_API_BASE } from "./aqua-config";
import {
  aquaProportionalAmountB,
  reserveStroopsFromApiString,
} from "@/lib/helpers/stellar/aquaDeposit";
import {
  rpcUrl,
  networkPassphrase,
  stellarNetwork,
} from "@/lib/constants/network";
import { getTokenBalanceFromContract } from "@/lib/helpers/stellar/sorobanBalance";
import {
  decimalToAtomic,
  mulDivCeil,
  mulDivFloor,
  applySlippageBps,
} from "@/lib/helpers/amount";
import { fromSmallestUnit } from "@/lib/helpers/tokenUtils";
import type { PoolActionOptions } from "../types/pool.types";

// Aqua pool type identifiers as returned by the REST API
type AquaPoolType = "constant_product" | "stable_swap" | "stable";

interface AquaApiPool {
  index: string;
  address: string;
  share_token_address: string;
  share_token_decimals?: number;
  tokens_addresses: string[];
  tokens_str: string[];
  pool_type: AquaPoolType;
  fee: string;
  a: number | null;
  n_tokens: number;
  // Reserves in stroops (7 decimal places)
  reserves: string[];
  // APY fields (decimal fractions, multiply by 100 for percentage)
  apy: string;
  rewards_apy: string;
  total_apy: string | number;
  // Liquidity/volume in stroops-denominated USD (divide by 10^7 for real USD)
  liquidity_usd: string;
  volume_usd: string;
  // Pool state flags
  deposit_killed: boolean;
  swap_killed: boolean;
  total_share?: string;
  [key: string]: unknown;
}

interface AquaApiResponse {
  items?: AquaApiPool[];
  results?: AquaApiPool[];
}

const AQUA_ROUTER = "CBQDHNBFBZYE4MKPWBSJOPIYLW4SFSXAXUTSXJN76GNKYVYPCKWC6QUK";
const SUPPORTED_ACTIONS: PoolAction[] = ["deposit", "withdraw", "claimRewards"];
const WITHDRAW_SLIPPAGE_BPS = 100;

// Parse a token string like "native" or "CODE:ISSUER" into a TokenInfo
function parseTokenStr(tokenStr: string, contractAddress: string): TokenInfo {
  if (tokenStr === "native") {
    return {
      address: contractAddress, // SAC contract address from API (not "native" literal)
      code: "XLM",
      name: "Stellar Lumens",
      decimals: 7,
    };
  }

  const colonIdx = tokenStr.indexOf(":");
  if (colonIdx === -1) {
    return {
      address: contractAddress,
      code: tokenStr,
      name: tokenStr,
      decimals: 7,
    };
  }

  const code = tokenStr.slice(0, colonIdx);
  return {
    address: contractAddress,
    code,
    name: code,
    decimals: 7,
  };
}

function buildPoolName(tokens: TokenInfo[], poolType: AquaPoolType): string {
  const names = tokens.map((t) => t.code).join(" / ");
  return poolType === "stable_swap" || poolType === "stable"
    ? `${names} Aqua Stable Pool`
    : `${names} Aqua Pool`;
}

function mapApiPool(raw: AquaApiPool): PoolInfo {
  const tokens: TokenInfo[] = raw.tokens_str.map((str, i) =>
    parseTokenStr(str, raw.tokens_addresses[i] ?? "")
  );

  // total_apy, apy, rewards_apy: decimal fractions (e.g. 0.0398 = 3.98%)
  const totalApyStr = String(raw.total_apy ?? "");
  const apy = totalApyStr ? parseFloat(totalApyStr) * 100 : 0;
  const baseSupplyApy = raw.apy ? parseFloat(String(raw.apy)) * 100 : 0;
  const rewardsApy = raw.rewards_apy
    ? parseFloat(String(raw.rewards_apy)) * 100
    : 0;

  // liquidity_usd from the API is in stroops-denominated USD (7 decimal places)
  // Values like "15963137326050.91" → divide by 1e7 → "$1596313.73"
  const liquidityUsd = raw.liquidity_usd
    ? (parseFloat(raw.liquidity_usd) / 1e7).toFixed(4)
    : "0";

  // Store reserves for use in deposit ratio calculation (avoids RPC call)
  const reserves = raw.reserves ?? [];

  const isActive = !raw.deposit_killed;

  return {
    id: `aqua:${raw.address}`,
    type: "aqua" as PoolType,
    name: buildPoolName(tokens, raw.pool_type),
    tokens,
    tvl: 0n,
    apy,
    state: isActive ? "active" : "frozen",
    supportedActions: isActive ? SUPPORTED_ACTIONS : [],
    metadata: {
      aquaPoolType: raw.pool_type,
      fee: raw.fee,
      amplificationFactor: raw.a,
      nTokens: raw.n_tokens ?? tokens.length,
      poolIndex: raw.index,
      tokenAddresses: raw.tokens_addresses,
      /** Horizon trustline check: `"native"` or `"CODE:ISSUER"` per Aqua API. */
      tokensStr: raw.tokens_str,
      shareTokenAddress: raw.share_token_address,
      shareTokenDecimals: raw.share_token_decimals ?? 7,
      totalShare: raw.total_share,
      liquidityUsd,
      reserves,
      /** LP supply (base) APY % */
      supplyApy: baseSupplyApy,
      /** Additional rewards APY % */
      rewardsApy,
      hasEmissions: rewardsApy > 0,
    },
  };
}

async function fetchAquaPools(addresses: string[]): Promise<AquaApiPool[]> {
  if (addresses.length === 0) return [];

  const base = AQUA_API_BASE;
  const query = addresses.join(",");
  const res = await fetch(`${base}/pools/?address__in=${query}`);

  if (!res.ok) {
    throw new Error(`Aqua API error: ${res.status} ${res.statusText}`);
  }

  const data: AquaApiResponse = await res.json();
  return data.items ?? data.results ?? [];
}

export class AquaPoolAdapter implements BasePoolAdapter {
  readonly type: PoolType = "aqua";

  async listPools(limit?: number): Promise<PoolInfo[]> {
    try {
      const raw = await fetchAquaPools(getAquaPoolAddresses());
      const mapped = raw.map(mapApiPool);
      return limit !== undefined ? mapped.slice(0, limit) : mapped;
    } catch (error) {
      throw new AdapterError("aqua", "listPools", error);
    }
  }

  async getPoolInfo(poolId: string): Promise<PoolInfo> {
    try {
      const address = poolId.replace("aqua:", "");
      const [pool] = await fetchAquaPools([address]);
      if (!pool) {
        throw new Error(`Aqua pool not found: ${poolId}`);
      }
      return mapApiPool(pool);
    } catch (error) {
      throw new AdapterError("aqua", "getPoolInfo", error);
    }
  }

  async getUserPosition(
    poolId: string,
    userAddress: string
  ): Promise<PoolPosition> {
    const fullPoolId = `aqua:${poolId}`;
    const emptyPosition: PoolPosition = {
      poolId: fullPoolId,
      deposited: 0n,
      depositedFormatted: "0",
      rewards: 0n,
      rewardsFormatted: "0",
      metadata: {},
    };

    try {
      const poolInfo = await this.getPoolInfo(poolId);
      const shareTokenAddress = poolInfo.metadata.shareTokenAddress as
        | string
        | undefined;
      if (!shareTokenAddress) {
        return emptyPosition;
      }

      const shareTokenDecimals =
        (poolInfo.metadata.shareTokenDecimals as number | undefined) ?? 7;
      const shareBalanceFormatted = await getTokenBalanceFromContract(
        shareTokenAddress,
        userAddress,
        shareTokenDecimals
      );
      const lpShares = decimalToAtomic(
        shareBalanceFormatted,
        shareTokenDecimals
      );
      if (lpShares === 0n) return emptyPosition;

      const reserves = poolInfo.metadata.reserves as string[] | undefined;
      const tokenDecimals = poolInfo.tokens[0]?.decimals ?? 7;

      const totalShare = reserveStroopsFromApiString(
        String(poolInfo.metadata.totalShare ?? "0")
      );
      let deposited = lpShares;
      const totalLpSupply = totalShare;
      let reserve0 = 0n;
      let underlyingAmountsRaw: string[] = [];
      let withdrawUnit: "underlying" | "lp_shares" = "lp_shares";

      try {
        reserve0 = reserveStroopsFromApiString(reserves?.[0] ?? "0");
        if (totalLpSupply > 0n && reserve0 > 0n) {
          underlyingAmountsRaw = (reserves ?? []).map((reserve) =>
            mulDivFloor(
              lpShares,
              reserveStroopsFromApiString(reserve),
              totalLpSupply
            ).toString()
          );
          deposited = BigInt(underlyingAmountsRaw[0] ?? "0");
          withdrawUnit = "underlying";
        }
      } catch {
        // Keep the position visible even if the LP -> underlying conversion
        // cannot be simulated for this Aqua share token.
      }

      return {
        poolId: fullPoolId,
        deposited,
        depositedFormatted: fromSmallestUnit(
          deposited.toString(),
          withdrawUnit === "underlying" ? tokenDecimals : shareTokenDecimals
        ),
        rewards: 0n,
        rewardsFormatted: "0",
        metadata: {
          shareTokenAddress,
          lpSharesRaw: lpShares.toString(),
          totalLpSupply: totalLpSupply.toString(),
          reserve0: reserve0.toString(),
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
    try {
      const sorobanServer = new rpc.Server(rpcUrl, {
        allowHttp: stellarNetwork === "LOCAL",
      });
      const account = await sorobanServer.getAccount(userAddress);

      // Get pool metadata — reserves come directly from the API (no RPC call needed)
      const poolInfo = await this.getPoolInfo(poolId);
      const tokenAddresses = poolInfo.metadata.tokenAddresses as string[];
      const poolIndexHex = poolInfo.metadata.poolIndex as string;
      const reserves = poolInfo.metadata.reserves as string[];

      // Calculate proportional token B amount from API reserves
      const amountA = amount;
      const amountB = aquaProportionalAmountB(amountA, reserves);

      // Call the Aquarius Router contract (entry point for all AMM operations)
      const router = new Contract(AQUA_ROUTER);
      const operation = router.call(
        "deposit",
        new Address(userAddress).toScVal(),
        StellarXdr.ScVal.scvVec(
          tokenAddresses.map((addr) => new Address(addr).toScVal())
        ),
        StellarXdr.ScVal.scvBytes(Buffer.from(poolIndexHex, "hex")),
        StellarXdr.ScVal.scvVec([
          nativeToScVal(amountA, { type: "u128" }),
          nativeToScVal(amountB, { type: "u128" }),
        ]),
        nativeToScVal(BigInt(1), { type: "u128" }) // min_shares = 1 stroop
      );

      const tx = new TransactionBuilder(account, {
        fee: "1000000",
        networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(300)
        .build();

      const preparedTx = await sorobanServer.prepareTransaction(tx);
      return { xdr: preparedTx.toXDR(), networkPassphrase };
    } catch (error) {
      throw new AdapterError("aqua", "deposit", error);
    }
  }

  async withdraw(
    poolId: string,
    userAddress: string,
    amount: bigint,
    _tokenIndex?: number,
    options?: PoolActionOptions
  ): Promise<TransactionResult> {
    try {
      const sorobanServer = new rpc.Server(rpcUrl, {
        allowHttp: stellarNetwork === "LOCAL",
      });
      const account = await sorobanServer.getAccount(userAddress);

      // Get pool metadata for tokens, pool_index, and token count
      const poolInfo = await this.getPoolInfo(poolId);
      const tokenAddresses = poolInfo.metadata.tokenAddresses as string[];
      const poolIndexHex = poolInfo.metadata.poolIndex as string;
      const shareTokenAddress = poolInfo.metadata.shareTokenAddress as
        | string
        | undefined;
      const reserves = poolInfo.metadata.reserves as string[] | undefined;
      const totalShare = reserveStroopsFromApiString(
        String(poolInfo.metadata.totalShare ?? "0")
      );
      const nTokens =
        (poolInfo.metadata?.nTokens as number | undefined) ??
        poolInfo.tokens.length;
      if (!shareTokenAddress) {
        throw new Error("Aqua share token is not configured for this pool");
      }

      const userLpShares = await simulateTokenBigint(
        shareTokenAddress,
        "balance",
        account,
        sorobanServer,
        userAddress
      );
      if (userLpShares <= 0n) {
        throw new Error("No LP balance available to withdraw");
      }

      let totalLpSupply: bigint | undefined =
        totalShare > 0n ? totalShare : undefined;
      let reserve0 = 0n;
      let shares: bigint;

      if (options?.withdrawAll) {
        shares = userLpShares;
      } else if (options?.withdrawUnit === "lp_shares") {
        shares = amount;
      } else {
        reserve0 = reserveStroopsFromApiString(reserves?.[0] ?? "0");
        if (!totalLpSupply || totalLpSupply <= 0n || reserve0 <= 0n) {
          throw new Error("Unable to calculate LP shares for this withdrawal");
        }
        shares = mulDivCeil(amount, totalLpSupply, reserve0);
      }

      if (shares <= 0n) {
        throw new Error("Withdrawal amount is too small");
      }
      if (shares > userLpShares) {
        if (options?.withdrawAll) {
          shares = userLpShares;
        } else {
          throw new Error("Withdrawal amount exceeds LP balance");
        }
      }

      if (totalLpSupply === undefined) {
        totalLpSupply = totalShare > 0n ? totalShare : undefined;
      }

      const minAmounts =
        totalLpSupply && totalLpSupply > 0n
          ? Array(nTokens)
              .fill(null)
              .map((_, index) => {
                const reserve = reserveStroopsFromApiString(
                  reserves?.[index] ?? "0"
                );
                const expected = mulDivFloor(shares, reserve, totalLpSupply);
                return nativeToScVal(
                  expected > 0n
                    ? applySlippageBps(expected, WITHDRAW_SLIPPAGE_BPS)
                    : 0n,
                  { type: "u128" }
                );
              })
          : Array(nTokens)
              .fill(null)
              .map(() => nativeToScVal(1n, { type: "u128" }));

      // Call the Aquarius Router contract (entry point for all AMM operations)
      const router = new Contract(AQUA_ROUTER);
      const operation = router.call(
        "withdraw",
        new Address(userAddress).toScVal(),
        StellarXdr.ScVal.scvVec(
          tokenAddresses.map((addr) => new Address(addr).toScVal())
        ),
        StellarXdr.ScVal.scvBytes(Buffer.from(poolIndexHex, "hex")),
        nativeToScVal(shares, { type: "u128" }),
        StellarXdr.ScVal.scvVec(minAmounts)
      );

      const tx = new TransactionBuilder(account, {
        fee: "1000000",
        networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(300)
        .build();

      const preparedTx = await sorobanServer.prepareTransaction(tx);
      return { xdr: preparedTx.toXDR(), networkPassphrase };
    } catch (error) {
      throw new AdapterError("aqua", "withdraw", error);
    }
  }

  async claimRewards(
    poolId: string,
    userAddress: string
  ): Promise<TransactionResult> {
    try {
      const poolAddress = poolId.replace("aqua:", "");

      const sorobanServer = new rpc.Server(rpcUrl, {
        allowHttp: stellarNetwork === "LOCAL",
      });
      const account = await sorobanServer.getAccount(userAddress);

      const poolContract = new Contract(poolAddress);
      const operation = poolContract.call(
        "claim",
        new Address(userAddress).toScVal()
      );

      const tx = new TransactionBuilder(account, {
        fee: "1000000",
        networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(300)
        .build();

      const preparedTx = await sorobanServer.prepareTransaction(tx);
      return { xdr: preparedTx.toXDR(), networkPassphrase };
    } catch (error) {
      throw new AdapterError("aqua", "claimRewards", error);
    }
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
