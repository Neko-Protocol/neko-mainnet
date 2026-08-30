import {
  PoolV2,
  PoolContractV2,
  RequestType,
  TokenMetadata,
  type Request,
} from "@blend-capital/blend-sdk";
import { TransactionBuilder, rpc, xdr } from "@stellar/stellar-sdk";

import {
  applySlippageBps,
  mulDivCeil,
  mulDivFloor,
} from "../stellar/amount.js";
import { throttledRpc } from "../stellar/rpcThrottle.js";
import type { OrchestratorConfig } from "../config.js";
import type { BasePoolAdapter } from "../types/adapter.types.js";
import type {
  PoolAction,
  PoolActionOptions,
  PoolInfo,
  PoolPosition,
  PoolType,
  TransactionResult,
} from "../types/pool.types.js";
import { AdapterError, UnsupportedActionError } from "../types/errors.js";
import {
  getBlendNetwork,
  BLEND_POOL_VAULTS,
  BLEND_ASSET_CODES,
} from "./blend-config.js";
import {
  getBlndPriceUsd,
  computeBlendEmissionsApy,
} from "./blend-emissions.js";
import { Client as DefindexVaultClient } from "@neko/defindex-vault";

type SdkResultLike = {
  tag?: string;
  value?: unknown;
  unwrap?: () => unknown;
};

function unwrapSdkResult(raw: unknown): unknown {
  const r = raw as SdkResultLike;
  if (typeof r?.unwrap === "function") return r.unwrap();
  if (r?.tag === "ok") return r.value;
  return raw;
}

function readSingleVaultFund(raw: unknown): bigint {
  const funds = unwrapSdkResult(raw) as VaultFund[];
  if (!Array.isArray(funds) || funds.length !== 1) {
    throw new Error("Only single-asset vault withdrawals are supported");
  }
  return BigInt(funds[0].total_amount.toString());
}

function readBigintResult(raw: unknown): bigint {
  const value = unwrapSdkResult(raw);
  return BigInt((value as { toString(): string }).toString());
}

const SUPPORTED_ACTIONS: PoolAction[] = [
  "deposit",
  "withdraw",
  "supplyCollateral",
  "withdrawCollateral",
  "borrow",
  "repay",
  "claimRewards",
];

const REQUEST_TYPE_MAP: Record<string, RequestType> = {
  deposit: RequestType.Supply,
  withdraw: RequestType.Withdraw,
  supplyCollateral: RequestType.SupplyCollateral,
  withdrawCollateral: RequestType.WithdrawCollateral,
  borrow: RequestType.Borrow,
  repay: RequestType.Repay,
};

const WITHDRAW_SLIPPAGE_BPS = 100;

type VaultFund = {
  total_amount: { toString(): string };
};

function parseRawId(rawId: string): {
  poolContractId: string;
  assetAddress: string;
} {
  const idx = rawId.indexOf(":");
  if (idx === -1) {
    throw new AdapterError(
      "blend",
      "parseRawId",
      `Invalid raw id "${rawId}" - expected <poolContractId>:<assetAddress>`
    );
  }
  return {
    poolContractId: rawId.slice(0, idx),
    assetAddress: rawId.slice(idx + 1),
  };
}

export class BlendPoolAdapter implements BasePoolAdapter {
  readonly type: PoolType = "blend";

  constructor(
    private readonly poolContractId: string,
    private readonly config: OrchestratorConfig
  ) {}

  private get rpcUrl(): string {
    return this.config.network.rpcUrl;
  }

  private get networkPassphrase(): string {
    return this.config.network.passphrase;
  }

  private get allowHttp(): boolean {
    return this.config.network.allowHttp ?? false;
  }

  /**
   * The pool's client when the host supplied one, otherwise undefined and the
   * SDK builds its own from `rpcUrl`.
   */
  private get server() {
    return this.config.network.server;
  }

  private static readonly POOL_CACHE_TTL_MS = 20_000;
  private poolCache?: { pool: PoolV2; loadedAt: number };
  private poolCacheInFlight?: Promise<PoolV2>;

  private async loadPool(): Promise<PoolV2> {
    const now = Date.now();
    if (
      this.poolCache &&
      now - this.poolCache.loadedAt < BlendPoolAdapter.POOL_CACHE_TTL_MS
    ) {
      return this.poolCache.pool;
    }
    if (this.poolCacheInFlight) return this.poolCacheInFlight;

    const network = getBlendNetwork(this.config.network);
    this.poolCacheInFlight = PoolV2.load(network, this.poolContractId)
      .then((pool) => {
        this.poolCache = { pool, loadedAt: Date.now() };
        return pool;
      })
      .finally(() => {
        this.poolCacheInFlight = undefined;
      });
    return this.poolCacheInFlight;
  }

  async getPoolInfo(rawId: string): Promise<PoolInfo> {
    const { poolContractId, assetAddress } = parseRawId(rawId);
    const network = getBlendNetwork(this.config.network);

    try {
      const pool = await throttledRpc(() =>
        PoolV2.load(network, poolContractId)
      );
      let blndPrice = 0;
      try {
        blndPrice = await getBlndPriceUsd(pool.metadata.backstop, network);
      } catch {}
      const reserve = pool.reserves.get(assetAddress);

      if (!reserve) {
        throw new AdapterError(
          "blend",
          "getPoolInfo",
          `Reserve ${assetAddress} not found in pool ${poolContractId}`
        );
      }

      let tokenMeta: TokenMetadata | undefined;
      try {
        tokenMeta = await TokenMetadata.load(network, assetAddress);
      } catch {}

      const contractToCode = this.config.contractToCodeMap;
      const onChainSymbol =
        tokenMeta?.symbol && tokenMeta.symbol !== "UNKNOWN"
          ? tokenMeta.symbol
          : undefined;
      const resolvedCode =
        BLEND_ASSET_CODES[assetAddress] ??
        onChainSymbol ??
        contractToCode[assetAddress] ??
        assetAddress.slice(0, 8);

      const isVaultPool =
        !!BLEND_POOL_VAULTS[`${poolContractId}:${assetAddress}`];
      let emissionsApy: number | null = null;
      if (reserve.supplyEmissions && !isVaultPool) {
        emissionsApy = await computeBlendEmissionsApy(
          reserve,
          pool,
          assetAddress,
          blndPrice
        );
      }
      const totalApy = reserve.estSupplyApy * 100 + (emissionsApy ?? 0);

      const statusMap: Record<number, "active" | "frozen" | "on_ice"> = {
        0: "active",
        2: "on_ice",
        4: "frozen",
      };

      return {
        id: `blend:${poolContractId}:${assetAddress}`,
        type: "blend",
        name: `${resolvedCode} Blend Pool`,
        tokens: [
          {
            address: assetAddress,
            code: resolvedCode,
            name: tokenMeta?.name ?? assetAddress,
            decimals: tokenMeta?.decimals ?? reserve.config.decimals,
          },
        ],
        tvl: reserve.totalSupply(),
        apy: totalApy,
        state: statusMap[pool.metadata.status] ?? "unknown",
        supportedActions: SUPPORTED_ACTIONS,
        metadata: {
          poolContractId,
          assetAddress,
          borrowApy: reserve.estBorrowApy * 100,
          supplyApy: reserve.estSupplyApy * 100,
          cFactor: reserve.getCollateralFactor(),
          lFactor: reserve.getLiabilityFactor(),
          minCollateral: pool.metadata.minCollateral ?? 0n,
          totalLiabilities: reserve.totalLiabilities().toString(),
          utilization: reserve.getUtilizationFloat(),
          poolName: pool.metadata.name,
          hasEmissions:
            !isVaultPool &&
            !!(reserve.supplyEmissions || reserve.borrowEmissions),
          emissionsApy: emissionsApy ?? 0,
        },
      };
    } catch (error) {
      if (error instanceof AdapterError) throw error;
      throw new AdapterError("blend", "getPoolInfo", error);
    }
  }

  async listPools(limit?: number): Promise<PoolInfo[]> {
    const network = getBlendNetwork(this.config.network);

    try {
      const pool = await this.loadPool();
      let blndPrice = 0;
      try {
        blndPrice = await getBlndPriceUsd(pool.metadata.backstop, network);
      } catch {}
      const pools: PoolInfo[] = [];

      const reserveEntries = [...pool.reserves.entries()];
      const toProcess =
        limit !== undefined ? reserveEntries.slice(0, limit) : reserveEntries;

      const contractToCode = this.config.contractToCodeMap;
      const statusMap: Record<number, "active" | "frozen" | "on_ice"> = {
        0: "active",
        2: "on_ice",
        4: "frozen",
      };

      for (const [assetAddress, reserve] of toProcess) {
        let tokenMeta: TokenMetadata | undefined;
        try {
          tokenMeta = await TokenMetadata.load(network, assetAddress);
        } catch {}

        const onChainSymbol =
          tokenMeta?.symbol && tokenMeta.symbol !== "UNKNOWN"
            ? tokenMeta.symbol
            : undefined;
        const resolvedCode =
          BLEND_ASSET_CODES[assetAddress] ??
          onChainSymbol ??
          contractToCode[assetAddress] ??
          assetAddress.slice(0, 8);

        const isVaultPool =
          !!BLEND_POOL_VAULTS[`${this.poolContractId}:${assetAddress}`];
        let emissionsApy: number | null = null;
        if (reserve.supplyEmissions && !isVaultPool) {
          emissionsApy = await computeBlendEmissionsApy(
            reserve,
            pool,
            assetAddress,
            blndPrice
          );
        }
        const totalApy = reserve.estSupplyApy * 100 + (emissionsApy ?? 0);

        pools.push({
          id: `blend:${this.poolContractId}:${assetAddress}`,
          type: "blend",
          name: `${resolvedCode} Blend Pool`,
          tokens: [
            {
              address: assetAddress,
              code: resolvedCode,
              name: tokenMeta?.name ?? assetAddress,
              decimals: tokenMeta?.decimals ?? reserve.config.decimals,
            },
          ],
          tvl: reserve.totalSupply(),
          apy: totalApy,
          state: statusMap[pool.metadata.status] ?? "unknown",
          supportedActions: SUPPORTED_ACTIONS,
          metadata: {
            poolContractId: this.poolContractId,
            assetAddress,
            borrowApy: reserve.estBorrowApy * 100,
            supplyApy: reserve.estSupplyApy * 100,
            cFactor: reserve.getCollateralFactor(),
            lFactor: reserve.getLiabilityFactor(),
            minCollateral: pool.metadata.minCollateral ?? 0n,
            totalLiabilities: reserve.totalLiabilities().toString(),
            utilization: reserve.getUtilizationFloat(),
            poolName: pool.metadata.name,
            hasEmissions:
              !isVaultPool &&
              !!(reserve.supplyEmissions || reserve.borrowEmissions),
            emissionsApy: emissionsApy ?? 0,
          },
        });
      }

      return pools;
    } catch (error) {
      console.error("[BlendPoolAdapter] listPools failed:", error);
      return [];
    }
  }

  async getAllVaultUserPositions(userAddress: string): Promise<PoolPosition[]> {
    const vaultEntries = Object.entries(BLEND_POOL_VAULTS).filter(([key]) =>
      key.startsWith(`${this.poolContractId}:`)
    );

    // Sequential with 200ms inter-vault stagger — load-shedding against the
    // public RPC's per-burst rate limit. Parallelizing all 5 vaults × 3 RPCs
    // simultaneously triggers 429s on gateway.fm.
    const results: PoolPosition[] = [];
    for (let vi = 0; vi < vaultEntries.length; vi++) {
      const [key, vaultId] = vaultEntries[vi];
      const assetAddress = key.slice(this.poolContractId.length + 1);
      const fullId = `blend:${this.poolContractId}:${assetAddress}`;
      if (vi > 0) await new Promise((r) => setTimeout(r, 200));
      try {
        const vault = new DefindexVaultClient({
          contractId: vaultId,
          rpcUrl: this.rpcUrl,
          allowHttp: this.allowHttp,
          server: this.server,
          networkPassphrase: this.networkPassphrase,
          publicKey: userAddress,
        });
        const [balanceTx, fundsTx, supplyTx] = await Promise.all([
          throttledRpc(() =>
            vault.balance({ id: userAddress }, { simulate: true })
          ),
          throttledRpc(() =>
            vault.fetch_total_managed_funds({ simulate: true })
          ),
          throttledRpc(() => vault.total_supply({ simulate: true })),
        ]);
        const sharesBig = readBigintResult(balanceTx.result);
        if (sharesBig === 0n) {
          results.push(emptyPosition(fullId));
          continue;
        }
        const totalUnderlying = readSingleVaultFund(fundsTx.result);
        const totalSupply = readBigintResult(supplyTx.result);
        const deposited =
          totalSupply > 0n
            ? mulDivFloor(sharesBig, totalUnderlying, totalSupply)
            : 0n;
        results.push({
          poolId: fullId,
          deposited,
          depositedFormatted: formatUnits(deposited, 7),
          rewards: 0n,
          rewardsFormatted: "0",
          metadata: {
            vaultId,
            supplied: deposited.toString(),
            collateral: "0",
            liabilities: "0",
            shares: sharesBig.toString(),
            totalUnderlying: totalUnderlying.toString(),
            totalSupply: totalSupply.toString(),
          },
        });
      } catch {
        results.push(emptyPosition(fullId));
      }
    }
    return results;
  }

  async getDirectUserPositions(userAddress: string): Promise<PoolPosition[]> {
    const pool = await this.loadPool();
    const directReserves = Array.from(pool.reserves.entries()).filter(
      ([assetAddress]) =>
        !BLEND_POOL_VAULTS[`${this.poolContractId}:${assetAddress}`]
    );

    if (directReserves.length === 0) return [];

    try {
      const poolUser = await throttledRpc(() => pool.loadUser(userAddress));
      const { claimedTokens } = poolUser.estimateEmissions(
        Array.from(pool.reserves.values())
      );
      return directReserves.map(([assetAddress, reserve]) => {
        const supplied = poolUser.getSupply(reserve);
        const collateral = poolUser.getCollateral(reserve);
        const liabilities = poolUser.getLiabilities(reserve);
        const deposited = supplied + collateral;
        return {
          poolId: `blend:${this.poolContractId}:${assetAddress}`,
          deposited,
          depositedFormatted: formatUnits(deposited, reserve.config.decimals),
          rewards: 0n,
          rewardsFormatted: "0",
          metadata: {
            supplied: supplied.toString(),
            collateral: collateral.toString(),
            liabilities: liabilities.toString(),
            claimedTokens,
          },
        };
      });
    } catch {
      return [];
    }
  }

  async getAllUserPositions(userAddress: string): Promise<PoolPosition[]> {
    const [vault, direct] = await Promise.all([
      this.getAllVaultUserPositions(userAddress),
      this.getDirectUserPositions(userAddress),
    ]);
    return [...vault, ...direct];
  }

  async getUserPosition(
    rawId: string,
    userAddress: string
  ): Promise<PoolPosition> {
    const { poolContractId, assetAddress } = parseRawId(rawId);
    const fullId = `blend:${poolContractId}:${assetAddress}`;
    const vaultId = BLEND_POOL_VAULTS[`${poolContractId}:${assetAddress}`];

    if (vaultId) {
      try {
        const vault = new DefindexVaultClient({
          contractId: vaultId,
          rpcUrl: this.rpcUrl,
          allowHttp: this.allowHttp,
          server: this.server,
          networkPassphrase: this.networkPassphrase,
          publicKey: userAddress,
        });

        const [balanceTx, fundsTx, supplyTx] = await Promise.all([
          throttledRpc(() =>
            vault.balance({ id: userAddress }, { simulate: true })
          ),
          throttledRpc(() =>
            vault.fetch_total_managed_funds({ simulate: true })
          ),
          throttledRpc(() => vault.total_supply({ simulate: true })),
        ]);

        const sharesBig = readBigintResult(balanceTx.result);

        if (sharesBig === 0n) return emptyPosition(fullId);

        const totalUnderlying = readSingleVaultFund(fundsTx.result);
        const totalSupply = readBigintResult(supplyTx.result);
        const deposited =
          totalSupply > 0n
            ? mulDivFloor(sharesBig, totalUnderlying, totalSupply)
            : 0n;

        return {
          poolId: fullId,
          deposited,
          depositedFormatted: formatUnits(deposited, 7),
          rewards: 0n,
          rewardsFormatted: "0",
          metadata: {
            vaultId,
            supplied: deposited.toString(),
            collateral: "0",
            liabilities: "0",
            shares: sharesBig.toString(),
            totalUnderlying: totalUnderlying.toString(),
            totalSupply: totalSupply.toString(),
          },
        };
      } catch {
        return emptyPosition(fullId);
      }
    }

    const network = getBlendNetwork(this.config.network);

    try {
      const pool = await throttledRpc(() =>
        PoolV2.load(network, poolContractId)
      );
      const reserve = pool.reserves.get(assetAddress);

      if (!reserve) {
        return emptyPosition(fullId);
      }

      const poolUser = await throttledRpc(() => pool.loadUser(userAddress));
      const supplied = poolUser.getSupply(reserve);
      const collateral = poolUser.getCollateral(reserve);
      const liabilities = poolUser.getLiabilities(reserve);
      const { claimedTokens } = poolUser.estimateEmissions(
        Array.from(pool.reserves.values())
      );

      const decimals = reserve.config.decimals;

      const deposited = supplied + collateral;

      return {
        poolId: fullId,
        deposited,
        depositedFormatted: formatUnits(deposited, decimals),
        rewards: 0n,
        rewardsFormatted: "0",
        metadata: {
          supplied: supplied.toString(),
          collateral: collateral.toString(),
          liabilities: liabilities.toString(),
          claimedTokens,
        },
      };
    } catch {
      return emptyPosition(fullId);
    }
  }

  async deposit(
    rawId: string,
    userAddress: string,
    amount: bigint
  ): Promise<TransactionResult> {
    const { poolContractId, assetAddress } = parseRawId(rawId);
    const vaultId = BLEND_POOL_VAULTS[`${poolContractId}:${assetAddress}`];

    if (vaultId) {
      const vault = new DefindexVaultClient({
        contractId: vaultId,
        rpcUrl: this.rpcUrl,
        allowHttp: this.allowHttp,
        server: this.server,
        networkPassphrase: this.networkPassphrase,
        publicKey: userAddress,
      });
      const tx = await vault.deposit({
        amounts_desired: [amount],
        amounts_min: [(amount * 99n) / 100n],
        from: userAddress,
        invest: false,
      });
      return { xdr: tx.toXDR(), networkPassphrase: this.networkPassphrase };
    }

    return this.buildSubmitTx(rawId, userAddress, amount, "deposit");
  }

  async withdraw(
    rawId: string,
    userAddress: string,
    amount: bigint,
    _tokenIndex?: number,
    options?: PoolActionOptions
  ): Promise<TransactionResult> {
    const { poolContractId, assetAddress } = parseRawId(rawId);
    const vaultId = BLEND_POOL_VAULTS[`${poolContractId}:${assetAddress}`];

    if (vaultId) {
      const vault = new DefindexVaultClient({
        contractId: vaultId,
        rpcUrl: this.rpcUrl,
        allowHttp: this.allowHttp,
        server: this.server,
        networkPassphrase: this.networkPassphrase,
        publicKey: userAddress,
      });

      const [fundsTx, supplyTx, balanceTx] = await Promise.all([
        throttledRpc(() => vault.fetch_total_managed_funds({ simulate: true })),
        throttledRpc(() => vault.total_supply({ simulate: true })),
        throttledRpc(() =>
          vault.balance({ id: userAddress }, { simulate: true })
        ),
      ]);

      const totalUnderlying = readSingleVaultFund(fundsTx.result);
      const totalSupply = readBigintResult(supplyTx.result);
      const userShares = readBigintResult(balanceTx.result);
      if (totalUnderlying <= 0n || totalSupply <= 0n || userShares <= 0n) {
        throw new Error("No supplied balance available to withdraw");
      }

      let shares = options?.withdrawAll
        ? userShares
        : mulDivCeil(amount, totalSupply, totalUnderlying);
      if (shares <= 0n) {
        throw new Error("Withdrawal amount is too small");
      }
      if (shares > userShares) {
        if (options?.withdrawAll) {
          shares = userShares;
        } else {
          throw new Error("Withdrawal amount exceeds supplied balance");
        }
      }

      const expectedOut = mulDivFloor(shares, totalUnderlying, totalSupply);

      const tx = await vault.withdraw({
        withdraw_shares: shares,
        min_amounts_out: [applySlippageBps(expectedOut, WITHDRAW_SLIPPAGE_BPS)],
        from: userAddress,
      });
      return { xdr: tx.toXDR(), networkPassphrase: this.networkPassphrase };
    }

    const network = getBlendNetwork(this.config.network);

    try {
      const pool = await throttledRpc(() =>
        PoolV2.load(network, poolContractId)
      );
      const reserve = pool.reserves.get(assetAddress);

      if (!reserve) {
        throw new AdapterError(
          "blend",
          "withdraw",
          `Reserve ${assetAddress} not found in pool ${poolContractId}`
        );
      }

      const poolUser = await throttledRpc(() => pool.loadUser(userAddress));
      const supplied = poolUser.getSupply(reserve);
      const effectiveAmount =
        options?.withdrawAll || amount > supplied ? supplied : amount;
      if (effectiveAmount <= 0n) {
        throw new Error("No supplied balance available to withdraw");
      }

      const requests: Request[] = [
        {
          request_type: RequestType.Withdraw,
          address: assetAddress,
          amount: effectiveAmount,
        },
      ];

      const poolContract = new PoolContractV2(poolContractId);
      const opXdr = poolContract.submit({
        from: userAddress,
        spender: userAddress,
        to: userAddress,
        requests,
      });

      return this.wrapOperation(opXdr, userAddress);
    } catch (error) {
      if (error instanceof AdapterError) throw error;
      throw new AdapterError("blend", "withdraw", error);
    }
  }

  async borrow(
    rawId: string,
    userAddress: string,
    amount: bigint
  ): Promise<TransactionResult> {
    return this.buildSubmitTx(rawId, userAddress, amount, "borrow");
  }

  /**
   * Bundle a supplyCollateral + borrow in one Blend submit transaction.
   * rawId identifies the asset being borrowed; collateralAssetAddress is the
   * asset the user is putting up as collateral (may be a different reserve in
   * the same pool contract).
   */
  async borrowWithCollateral(
    rawId: string,
    userAddress: string,
    borrowAmount: bigint,
    collateralAssetAddress: string,
    collateralAmount: bigint
  ): Promise<TransactionResult> {
    const { poolContractId, assetAddress } = parseRawId(rawId);

    try {
      const poolContract = new PoolContractV2(poolContractId);
      const requests: Request[] = [];

      if (collateralAmount > 0n) {
        requests.push({
          request_type: RequestType.SupplyCollateral,
          address: collateralAssetAddress,
          amount: collateralAmount,
        });
      }

      requests.push({
        request_type: RequestType.Borrow,
        address: assetAddress,
        amount: borrowAmount,
      });

      const opXdr = poolContract.submit({
        from: userAddress,
        spender: userAddress,
        to: userAddress,
        requests,
      });

      return this.wrapOperation(opXdr, userAddress);
    } catch (error) {
      throw new AdapterError("blend", "borrowWithCollateral", error);
    }
  }

  async repay(
    rawId: string,
    userAddress: string,
    amount: bigint
  ): Promise<TransactionResult> {
    return this.buildSubmitTx(rawId, userAddress, amount, "repay");
  }

  async supplyCollateral(
    rawId: string,
    userAddress: string,
    amount: bigint
  ): Promise<TransactionResult> {
    return this.buildSubmitTx(rawId, userAddress, amount, "supplyCollateral");
  }

  async withdrawCollateral(
    rawId: string,
    userAddress: string,
    amount: bigint,
    options?: PoolActionOptions
  ): Promise<TransactionResult> {
    const { poolContractId, assetAddress } = parseRawId(rawId);
    const network = getBlendNetwork(this.config.network);

    try {
      const pool = await throttledRpc(() =>
        PoolV2.load(network, poolContractId)
      );
      const reserve = pool.reserves.get(assetAddress);
      if (!reserve) {
        throw new AdapterError(
          "blend",
          "withdrawCollateral",
          `Reserve ${assetAddress} not found in pool ${poolContractId}`
        );
      }

      const poolUser = await throttledRpc(() => pool.loadUser(userAddress));
      const collateral = poolUser.getCollateral(reserve);
      const effectiveAmount =
        options?.withdrawAll || amount > collateral ? collateral : amount;
      if (effectiveAmount <= 0n) {
        throw new Error("No collateral balance available to remove");
      }

      const poolContract = new PoolContractV2(poolContractId);
      const opXdr = poolContract.submit({
        from: userAddress,
        spender: userAddress,
        to: userAddress,
        requests: [
          {
            request_type: RequestType.WithdrawCollateral,
            address: assetAddress,
            amount: effectiveAmount,
          },
        ],
      });

      return this.wrapOperation(opXdr, userAddress);
    } catch (error) {
      if (error instanceof AdapterError) throw error;
      throw new AdapterError("blend", "withdrawCollateral", error);
    }
  }

  async claimRewards(
    rawId: string,
    userAddress: string
  ): Promise<TransactionResult> {
    const { poolContractId, assetAddress } = parseRawId(rawId);
    const network = getBlendNetwork(this.config.network);

    try {
      const pool = await throttledRpc(() =>
        PoolV2.load(network, poolContractId)
      );
      const reserve = pool.reserves.get(assetAddress);

      if (!reserve) {
        throw new AdapterError(
          "blend",
          "claimRewards",
          `Reserve ${assetAddress} not found`
        );
      }

      const reserveTokenIds: number[] = [];
      if (reserve.supplyEmissions) {
        reserveTokenIds.push(reserve.getBTokenEmissionIndex());
      }
      if (reserve.borrowEmissions) {
        reserveTokenIds.push(reserve.getDTokenEmissionIndex());
      }

      if (reserveTokenIds.length === 0) {
        throw new UnsupportedActionError("blend", "claimRewards");
      }

      const poolContract = new PoolContractV2(poolContractId);
      const opXdr = poolContract.claim({
        from: userAddress,
        reserve_token_ids: reserveTokenIds,
        to: userAddress,
      });

      return this.wrapOperation(opXdr, userAddress);
    } catch (error) {
      if (
        error instanceof AdapterError ||
        error instanceof UnsupportedActionError
      ) {
        throw error;
      }
      throw new AdapterError("blend", "claimRewards", error);
    }
  }

  supportsAction(action: PoolAction): boolean {
    return SUPPORTED_ACTIONS.includes(action);
  }

  private async buildSubmitTx(
    rawId: string,
    userAddress: string,
    amount: bigint,
    action: string
  ): Promise<TransactionResult> {
    const { poolContractId, assetAddress } = parseRawId(rawId);
    const requestType = REQUEST_TYPE_MAP[action];

    if (requestType === undefined) {
      throw new UnsupportedActionError("blend", action);
    }

    try {
      const poolContract = new PoolContractV2(poolContractId);
      const request: Request = {
        request_type: requestType,
        address: assetAddress,
        amount,
      };

      const opXdr = poolContract.submit({
        from: userAddress,
        spender: userAddress,
        to: userAddress,
        requests: [request],
      });

      return this.wrapOperation(opXdr, userAddress);
    } catch (error) {
      throw new AdapterError("blend", action, error);
    }
  }

  private async wrapOperation(
    opXdrBase64: string,
    userAddress: string
  ): Promise<TransactionResult> {
    const operation = xdr.Operation.fromXDR(opXdrBase64, "base64");
    const server =
      this.server ?? new rpc.Server(this.rpcUrl, { allowHttp: this.allowHttp });
    const account = await server.getAccount(userAddress);

    const tx = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(operation)
      .setTimeout(300)
      .build();

    const prepared = await server.prepareTransaction(tx);

    return {
      xdr: prepared.toXDR(),
      networkPassphrase: this.networkPassphrase,
    };
  }
}

function emptyPosition(poolId: string): PoolPosition {
  return {
    poolId,
    deposited: 0n,
    depositedFormatted: "0",
    rewards: 0n,
    rewardsFormatted: "0",
    metadata: {},
  };
}

function formatUnits(value: bigint, decimals: number): string {
  if (value === 0n) return "0";
  const str = value.toString().padStart(decimals + 1, "0");
  const intPart = str.slice(0, str.length - decimals) || "0";
  const fracPart = str.slice(str.length - decimals);
  const trimmed = fracPart.replace(/0+$/, "");
  return trimmed ? `${intPart}.${trimmed}` : intPart;
}
