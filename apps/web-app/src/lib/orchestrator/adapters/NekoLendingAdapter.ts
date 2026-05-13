import { Client as RwaLendingClient } from "@neko/lending";
import {
  rpcUrl,
  networkPassphrase,
  allowHttpForSoroban,
} from "@/lib/constants/network";
import { getLendingContracts } from "@/lib/constants/lendingContracts";
import { getAvailableTokens } from "@/lib/helpers/stellar/soroswap";
import { atomicToDecimal, mulDivCeil, mulDivFloor } from "@/lib/helpers/amount";
import { depositToPool, withdrawFromPool } from "@/lib/helpers/stellar/lending";

import type { BasePoolAdapter } from "../types/adapter.types";
import type {
  PoolAction,
  PoolActionOptions,
  PoolInfo,
  PoolPosition,
  PoolType,
  TransactionResult,
} from "../types/pool.types";
import { AdapterError, UnsupportedActionError } from "../types/errors";

const SUPPORTED_ACTIONS: PoolAction[] = ["deposit", "withdraw"];
const RATE_SCALAR = 1_000_000_000_000n;

/** Assets that belong to Pool 2 (USDC/XLM collateral → borrow RWA) */
const POOL2_ASSETS = new Set(["USTRY", "TESOURO", "CETES", "USDY", "PYUSD"]);

function getPoolContractId(assetCode: string): string {
  const { pool1ContractId, pool2ContractId } = getLendingContracts();
  return POOL2_ASSETS.has(assetCode) ? pool2ContractId : pool1ContractId;
}

/**
 * Unwrap a Stellar SDK `Result<T>` value that may come back as
 * `{ tag, values, unwrap }` or a raw primitive.
 */
function unwrapResult(value: unknown): bigint {
  if (value === null || value === undefined) return 0n;
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string") return BigInt(value);

  const obj = value as {
    tag?: string;
    values?: unknown[];
    unwrap?: () => bigint;
  };

  if (typeof obj.unwrap === "function") {
    try {
      return BigInt(obj.unwrap());
    } catch {}
  }

  if (obj.tag === "Ok" && Array.isArray(obj.values) && obj.values.length > 0) {
    return BigInt(obj.values[0] as string | number | bigint);
  }

  return 0n;
}

async function getBTokenRateRaw(
  client: RwaLendingClient,
  assetCode: string
): Promise<bigint> {
  const rateTx = await client.get_b_token_rate(
    { asset: assetCode },
    { simulate: true }
  );
  return unwrapResult(rateTx.result) || RATE_SCALAR;
}

export class NekoLendingAdapter implements BasePoolAdapter {
  readonly type: PoolType = "neko";

  private pool1Client: RwaLendingClient;
  private pool2Client: RwaLendingClient;

  constructor() {
    const { pool1ContractId, pool2ContractId } = getLendingContracts();
    const clientOptions = {
      rpcUrl,
      networkPassphrase,
      ...(allowHttpForSoroban && { allowHttp: true }),
    };
    this.pool1Client = new RwaLendingClient({
      contractId: pool1ContractId,
      ...clientOptions,
    });
    this.pool2Client = new RwaLendingClient({
      contractId: pool2ContractId,
      ...clientOptions,
    });
  }

  private clientFor(assetCode: string): RwaLendingClient {
    return POOL2_ASSETS.has(assetCode) ? this.pool2Client : this.pool1Client;
  }

  async getPoolInfo(poolId: string): Promise<PoolInfo> {
    const assetCode = poolId;
    const tokens = getAvailableTokens();
    const token = tokens[assetCode];

    if (!token?.contract) {
      throw new AdapterError(
        "neko",
        "getPoolInfo",
        `Unknown asset: ${assetCode}`
      );
    }

    const client = this.clientFor(assetCode);
    const contractId = getPoolContractId(assetCode);

    try {
      const [balanceTx, interestRateTx, poolStateTx] = await Promise.all([
        client.get_pool_balance({ asset: assetCode }, { simulate: true }),
        client
          .get_interest_rate({ asset: assetCode }, { simulate: true })
          .catch(() => null),
        client.get_pool_state({ simulate: true }).catch(() => null),
      ]);

      const balance = unwrapResult(balanceTx.result);
      const rate = interestRateTx ? unwrapResult(interestRateTx.result) : 0n;
      const stateTag = (poolStateTx?.result as { tag?: string } | undefined)
        ?.tag;

      return {
        id: `neko:${assetCode}`,
        type: "neko",
        name: `${assetCode} Lending Pool`,
        tokens: [
          {
            address: token.contract,
            code: token.code,
            name: token.name,
            decimals: token.decimals,
          },
        ],
        tvl: balance,
        apy: Number(rate) / 100,
        state:
          stateTag === "Active"
            ? "active"
            : stateTag === "Frozen"
              ? "frozen"
              : "unknown",
        supportedActions: SUPPORTED_ACTIONS,
        metadata: {
          contractId,
          assetCode,
        },
      };
    } catch (error) {
      throw new AdapterError("neko", "getPoolInfo", error);
    }
  }

  async listPools(): Promise<PoolInfo[]> {
    const tokens = getAvailableTokens();
    // Pool 1 debt assets; Pool 2 debt assets
    const pool1Assets = ["USDC", "XLM"].filter((c) => tokens[c]?.contract);
    const pool2Assets = ["USTRY", "TESOURO", "CETES", "USDY", "PYUSD"].filter(
      (c) => tokens[c]?.contract
    );
    const allAssets = [...pool1Assets, ...pool2Assets];

    const pools: PoolInfo[] = [];
    for (const code of allAssets) {
      try {
        const info = await this.getPoolInfo(code);
        pools.push(info);
      } catch {
        continue;
      }
    }
    return pools;
  }

  async getUserPosition(
    poolId: string,
    userAddress: string
  ): Promise<PoolPosition> {
    const assetCode = poolId;
    const tokens = getAvailableTokens();
    const decimals = tokens[assetCode]?.decimals ?? 7;
    const client = this.clientFor(assetCode);

    try {
      const [balanceTx, rateRaw] = await Promise.all([
        client.get_b_token_balance(
          { lender: userAddress, asset: assetCode },
          { simulate: true }
        ),
        getBTokenRateRaw(client, assetCode),
      ]);
      const bTokens = unwrapResult(balanceTx.result);
      const deposited = mulDivFloor(bTokens, rateRaw, RATE_SCALAR);

      return {
        poolId: `neko:${assetCode}`,
        deposited,
        depositedFormatted: atomicToDecimal(deposited, decimals),
        rewards: 0n,
        rewardsFormatted: "0",
        metadata: {
          supplied: deposited.toString(),
          collateral: "0",
          liabilities: "0",
          bTokenBalance: bTokens.toString(),
          bTokenRateRaw: rateRaw.toString(),
        },
      };
    } catch {
      return {
        poolId: `neko:${assetCode}`,
        deposited: 0n,
        depositedFormatted: "0",
        rewards: 0n,
        rewardsFormatted: "0",
        metadata: {},
      };
    }
  }

  async deposit(
    poolId: string,
    userAddress: string,
    amount: bigint
  ): Promise<TransactionResult> {
    const assetCode = poolId;
    const tokens = getAvailableTokens();
    const decimals = tokens[assetCode]?.decimals ?? 7;
    const humanAmount = atomicToDecimal(amount, decimals);
    const contractId = getPoolContractId(assetCode);

    try {
      const xdr = await depositToPool(
        assetCode,
        humanAmount,
        decimals,
        userAddress,
        contractId
      );
      return { xdr, networkPassphrase };
    } catch (error) {
      throw new AdapterError("neko", "deposit", error);
    }
  }

  async withdraw(
    poolId: string,
    userAddress: string,
    amount: bigint,
    _tokenIndex?: number,
    options?: PoolActionOptions
  ): Promise<TransactionResult> {
    const assetCode = poolId;
    const tokens = getAvailableTokens();
    const decimals = tokens[assetCode]?.decimals ?? 7;
    const contractId = getPoolContractId(assetCode);
    const client = this.clientFor(assetCode);

    try {
      const [balanceTx, rateRaw] = await Promise.all([
        client.get_b_token_balance(
          { lender: userAddress, asset: assetCode },
          { simulate: true }
        ),
        getBTokenRateRaw(client, assetCode),
      ]);
      const bTokenBalance = unwrapResult(balanceTx.result);
      if (bTokenBalance <= 0n) {
        throw new Error("No supplied balance available to withdraw");
      }

      let bTokens = options?.withdrawAll
        ? bTokenBalance
        : mulDivCeil(amount, RATE_SCALAR, rateRaw);
      if (bTokens <= 0n) {
        throw new Error("Withdrawal amount is too small");
      }
      if (bTokens > bTokenBalance) {
        if (options?.withdrawAll) {
          bTokens = bTokenBalance;
        } else {
          throw new Error("Withdrawal amount exceeds supplied balance");
        }
      }

      const xdr = await withdrawFromPool(
        assetCode,
        atomicToDecimal(bTokens, decimals),
        decimals,
        userAddress,
        contractId
      );
      return { xdr, networkPassphrase };
    } catch (error) {
      throw new AdapterError("neko", "withdraw", error);
    }
  }

  async claimRewards(): Promise<TransactionResult> {
    throw new UnsupportedActionError("neko", "claimRewards");
  }

  supportsAction(action: PoolAction): boolean {
    return SUPPORTED_ACTIONS.includes(action);
  }
}
