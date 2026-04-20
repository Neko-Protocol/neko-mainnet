import {
  Contract,
  Address,
  nativeToScVal,
  xdr as StellarXdr,
  rpc,
  TransactionBuilder,
  Horizon,
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
import { AdapterError, UnsupportedActionError } from "../types/errors";
import { getAquaPoolAddresses, AQUA_API_BASE } from "./aqua-config";
import { aquaProportionalAmountB } from "@/lib/helpers/stellar/aquaDeposit";
import {
  rpcUrl,
  networkPassphrase,
  horizonUrl,
  stellarNetwork,
} from "@/lib/constants/network";

// Aqua pool type identifiers as returned by the REST API
type AquaPoolType = "constant_product" | "stable_swap" | "stable";

interface AquaApiPool {
  index: string;
  address: string;
  share_token_address: string;
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
  [key: string]: unknown;
}

interface AquaApiResponse {
  items?: AquaApiPool[];
  results?: AquaApiPool[];
}

const AQUA_ROUTER = "CBQDHNBFBZYE4MKPWBSJOPIYLW4SFSXAXUTSXJN76GNKYVYPCKWC6QUK";
const SUPPORTED_ACTIONS: PoolAction[] = ["deposit", "withdraw"];

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
    return { address: contractAddress, code: tokenStr, name: tokenStr, decimals: 7 };
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

  // total_apy is a decimal fraction (e.g. 0.0398 = 3.98%)
  const apy = raw.total_apy ? parseFloat(String(raw.total_apy)) * 100 : 0;

  // liquidity_usd from the API is in stroops-denominated USD (7 decimal places)
  // Values like "15963137326050.91" → divide by 1e7 → "$1596313.73"
  const liquidityUsd = raw.liquidity_usd
    ? (parseFloat(raw.liquidity_usd) / 1e7).toFixed(2)
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
      liquidityUsd,
      reserves,
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

  async listPools(): Promise<PoolInfo[]> {
    try {
      const raw = await fetchAquaPools(getAquaPoolAddresses());
      return raw.map(mapApiPool);
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
    _userAddress: string
  ): Promise<PoolPosition> {
    return {
      poolId: `aqua:${poolId}`,
      deposited: 0n,
      depositedFormatted: "0",
      rewards: 0n,
      rewardsFormatted: "0",
      metadata: {},
    };
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
      const horizonServer = new Horizon.Server(horizonUrl);
      const account = await horizonServer.loadAccount(userAddress);

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
    _tokenIndex?: number
  ): Promise<TransactionResult> {
    try {
      const sorobanServer = new rpc.Server(rpcUrl, {
        allowHttp: stellarNetwork === "LOCAL",
      });
      const horizonServer = new Horizon.Server(horizonUrl);
      const account = await horizonServer.loadAccount(userAddress);

      // Get pool metadata for tokens, pool_index, and token count
      const poolInfo = await this.getPoolInfo(poolId);
      const tokenAddresses = poolInfo.metadata.tokenAddresses as string[];
      const poolIndexHex = poolInfo.metadata.poolIndex as string;
      const nTokens =
        (poolInfo.metadata?.nTokens as number | undefined) ??
        poolInfo.tokens.length;

      // Call the Aquarius Router contract (entry point for all AMM operations)
      const router = new Contract(AQUA_ROUTER);
      const operation = router.call(
        "withdraw",
        new Address(userAddress).toScVal(),
        StellarXdr.ScVal.scvVec(
          tokenAddresses.map((addr) => new Address(addr).toScVal())
        ),
        StellarXdr.ScVal.scvBytes(Buffer.from(poolIndexHex, "hex")),
        nativeToScVal(amount, { type: "u128" }), // LP shares to redeem
        StellarXdr.ScVal.scvVec(
          Array(nTokens)
            .fill(null)
            .map(() => nativeToScVal(BigInt(1), { type: "u128" }))
        ) // min_amounts = [1, 1, ...] — accept any amounts
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

  async claimRewards(): Promise<TransactionResult> {
    throw new UnsupportedActionError("aqua", "claimRewards");
  }

  supportsAction(action: PoolAction): boolean {
    return SUPPORTED_ACTIONS.includes(action);
  }
}
