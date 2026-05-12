import {
  PoolV2,
  PoolContractV2,
  RequestType,
  TokenMetadata,
  type Request,
} from "@blend-capital/blend-sdk";
import { TransactionBuilder, rpc, xdr, Horizon } from "@stellar/stellar-sdk";

import { rpcUrl, networkPassphrase, horizonUrl } from "@/lib/constants/network";

import type { BasePoolAdapter } from "../types/adapter.types";
import type {
  PoolAction,
  PoolInfo,
  PoolPosition,
  PoolType,
  TransactionResult,
} from "../types/pool.types";
import { AdapterError, UnsupportedActionError } from "../types/errors";
import { getBlendNetwork, BLEND_POOL_VAULTS } from "./blend-config";
import { getBlndPriceUsd, computeBlendEmissionsApy } from "./blend-emissions";
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

  private poolContractId: string;

  constructor(poolContractId: string) {
    this.poolContractId = poolContractId;
  }

  async getPoolInfo(rawId: string): Promise<PoolInfo> {
    const { poolContractId, assetAddress } = parseRawId(rawId);
    const network = getBlendNetwork();

    try {
      const pool = await PoolV2.load(network, poolContractId);
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
        name: `${tokenMeta?.symbol ?? assetAddress.slice(0, 8)} Blend Pool`,
        tokens: [
          {
            address: assetAddress,
            code: tokenMeta?.symbol ?? "UNKNOWN",
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
    const network = getBlendNetwork();

    try {
      const pool = await PoolV2.load(network, this.poolContractId);
      let blndPrice = 0;
      try {
        blndPrice = await getBlndPriceUsd(pool.metadata.backstop, network);
      } catch {}
      const pools: PoolInfo[] = [];

      const reserveEntries = [...pool.reserves.entries()];
      const toProcess =
        limit !== undefined ? reserveEntries.slice(0, limit) : reserveEntries;

      for (const [assetAddress, reserve] of toProcess) {
        let tokenMeta: TokenMetadata | undefined;
        try {
          tokenMeta = await TokenMetadata.load(network, assetAddress);
        } catch {}

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

        const statusMap: Record<number, "active" | "frozen" | "on_ice"> = {
          0: "active",
          2: "on_ice",
          4: "frozen",
        };

        pools.push({
          id: `blend:${this.poolContractId}:${assetAddress}`,
          type: "blend",
          name: `${tokenMeta?.symbol ?? assetAddress.slice(0, 8)} Blend Pool`,
          tokens: [
            {
              address: assetAddress,
              code: tokenMeta?.symbol ?? "UNKNOWN",
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

  /**
   * Load pool + user ONCE and return positions for every reserve.
   * Use this on the dashboard instead of N separate getUserPosition calls.
   */
  async getAllUserPositions(userAddress: string): Promise<PoolPosition[]> {
    const network = getBlendNetwork();
    // Let PoolV2.load() errors propagate so React Query can retry and set isError.
    const pool = await PoolV2.load(network, this.poolContractId);
    const reserveEntries = Array.from(pool.reserves.entries());

    const vaultReserves: typeof reserveEntries = [];
    const directReserves: typeof reserveEntries = [];

    for (const entry of reserveEntries) {
      const [assetAddress] = entry;
      const vaultId =
        BLEND_POOL_VAULTS[`${this.poolContractId}:${assetAddress}`];
      if (vaultId) {
        vaultReserves.push(entry);
      } else {
        directReserves.push(entry);
      }
    }

    const vaultResults = await Promise.all(
      vaultReserves.map(async ([assetAddress, reserve]) => {
        const fullId = `blend:${this.poolContractId}:${assetAddress}`;
        const vaultId =
          BLEND_POOL_VAULTS[`${this.poolContractId}:${assetAddress}`]!;
        try {
          const vault = new DefindexVaultClient({
            contractId: vaultId,
            rpcUrl,
            networkPassphrase,
            publicKey: userAddress,
          });

          const [balanceTx, fundsTx, supplyTx] = await Promise.all([
            vault.balance({ id: userAddress }, { simulate: true }),
            vault.fetch_total_managed_funds({ simulate: true }),
            vault.total_supply({ simulate: true }),
          ]);

          let sharesRaw = balanceTx.result as any;
          if (typeof sharesRaw?.unwrap === "function")
            sharesRaw = sharesRaw.unwrap();
          else if (sharesRaw?.tag === "ok") sharesRaw = sharesRaw.value;
          const sharesBig = BigInt(sharesRaw.toString());

          if (sharesBig === 0n) return emptyPosition(fullId);

          let funds = fundsTx.result as any;
          if (typeof funds?.unwrap === "function") funds = funds.unwrap();
          else if (funds?.tag === "ok") funds = funds.value;

          let totalSharesRaw = supplyTx.result as any;
          if (typeof totalSharesRaw?.unwrap === "function")
            totalSharesRaw = totalSharesRaw.unwrap();
          else if (totalSharesRaw?.tag === "ok")
            totalSharesRaw = totalSharesRaw.value;

          const totalUnderlying = BigInt(funds[0].total_amount.toString());
          const totalSupply = BigInt(totalSharesRaw.toString());
          const deposited =
            totalSupply > 0n ? (sharesBig * totalUnderlying) / totalSupply : 0n;

          return {
            poolId: fullId,
            deposited,
            depositedFormatted: formatUnits(deposited, reserve.config.decimals),
            rewards: 0n,
            rewardsFormatted: "0",
            metadata: {
              supplied: deposited.toString(),
              collateral: "0",
              liabilities: "0",
            },
          };
        } catch {
          return emptyPosition(fullId);
        }
      })
    );

    const directResults: PoolPosition[] = [];
    if (directReserves.length > 0) {
      try {
        const poolUser = await pool.loadUser(userAddress);
        const { claimedTokens } = poolUser.estimateEmissions(
          Array.from(pool.reserves.values())
        );
        for (const [assetAddress, reserve] of directReserves) {
          const supplied = poolUser.getSupply(reserve);
          const collateral = poolUser.getCollateral(reserve);
          const liabilities = poolUser.getLiabilities(reserve);
          const deposited = supplied + collateral;
          directResults.push({
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
          });
        }
      } catch {
        // loadUser failed  skip direct reserves, vault results still returned
      }
    }

    return [...vaultResults, ...directResults];
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
          rpcUrl,
          networkPassphrase,
          publicKey: userAddress,
        });

        const [balanceTx, fundsTx, supplyTx] = await Promise.all([
          vault.balance({ id: userAddress }, { simulate: true }),
          vault.fetch_total_managed_funds({ simulate: true }),
          vault.total_supply({ simulate: true }),
        ]);

        const sharesRaw = unwrapSdkResult(balanceTx.result);
        const sharesBig = BigInt(
          (sharesRaw as { toString(): string }).toString()
        );

        if (sharesBig === 0n) return emptyPosition(fullId);

        const funds = unwrapSdkResult(fundsTx.result) as Array<{
          total_amount: { toString(): string };
        }>;
        const totalSharesRaw = unwrapSdkResult(supplyTx.result);

        const totalUnderlying = BigInt(funds[0].total_amount.toString());
        const totalSupply = BigInt(
          (totalSharesRaw as { toString(): string }).toString()
        );
        const deposited =
          totalSupply > 0n ? (sharesBig * totalUnderlying) / totalSupply : 0n;

        return {
          poolId: fullId,
          deposited,
          depositedFormatted: formatUnits(deposited, 7),
          rewards: 0n,
          rewardsFormatted: "0",
          metadata: {
            supplied: deposited.toString(),
            collateral: "0",
            liabilities: "0",
          },
        };
      } catch {
        return emptyPosition(fullId);
      }
    }

    const network = getBlendNetwork();

    try {
      const pool = await PoolV2.load(network, poolContractId);
      const reserve = pool.reserves.get(assetAddress);

      if (!reserve) {
        return emptyPosition(fullId);
      }

      const poolUser = await pool.loadUser(userAddress);
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
        rpcUrl,
        networkPassphrase,
        publicKey: userAddress,
      });
      const tx = await vault.deposit({
        amounts_desired: [amount],
        amounts_min: [(amount * 99n) / 100n],
        from: userAddress,
        invest: false,
      });
      return { xdr: tx.toXDR(), networkPassphrase };
    }

    return this.buildSubmitTx(rawId, userAddress, amount, "deposit");
  }

  async withdraw(
    rawId: string,
    userAddress: string,
    amount: bigint
  ): Promise<TransactionResult> {
    const { poolContractId, assetAddress } = parseRawId(rawId);
    const vaultId = BLEND_POOL_VAULTS[`${poolContractId}:${assetAddress}`];

    if (vaultId) {
      const vault = new DefindexVaultClient({
        contractId: vaultId,
        rpcUrl,
        networkPassphrase,
        publicKey: userAddress,
      });

      const [fundsTx, supplyTx] = await Promise.all([
        vault.fetch_total_managed_funds({ simulate: true }),
        vault.total_supply({ simulate: true }),
      ]);

      const funds = unwrapSdkResult(fundsTx.result) as Array<{
        total_amount: { toString(): string };
      }>;
      const totalSharesRaw = unwrapSdkResult(supplyTx.result);

      const totalUnderlying = BigInt(funds[0].total_amount.toString());
      const totalSupply = BigInt(
        (totalSharesRaw as { toString(): string }).toString()
      );
      const shares =
        totalUnderlying > 0n ? (amount * totalSupply) / totalUnderlying : 0n;

      const tx = await vault.withdraw({
        withdraw_shares: shares,
        min_amounts_out: [0n],
        from: userAddress,
      });
      return { xdr: tx.toXDR(), networkPassphrase };
    }

    const network = getBlendNetwork();

    try {
      const pool = await PoolV2.load(network, poolContractId);
      const reserve = pool.reserves.get(assetAddress);

      if (!reserve) {
        throw new AdapterError(
          "blend",
          "withdraw",
          `Reserve ${assetAddress} not found in pool ${poolContractId}`
        );
      }

      const poolUser = await pool.loadUser(userAddress);
      const supplied = poolUser.getSupply(reserve);
      const collateral = poolUser.getCollateral(reserve);
      const total = supplied + collateral;

      // Clamp requested amount to actual on-chain total to handle stale/rounded values
      const effectiveAmount = amount > total ? total : amount;

      const requests: Request[] = [];

      if (collateral > 0n && supplied > 0n) {
        // User has both: split proportionally
        const collateralShare =
          effectiveAmount >= total
            ? collateral
            : (collateral * effectiveAmount) / total;
        const supplyShare =
          effectiveAmount >= total
            ? supplied
            : effectiveAmount - collateralShare;

        if (collateralShare > 0n) {
          requests.push({
            request_type: RequestType.WithdrawCollateral,
            address: assetAddress,
            amount: collateralShare,
          });
        }
        if (supplyShare > 0n) {
          requests.push({
            request_type: RequestType.Withdraw,
            address: assetAddress,
            amount: supplyShare,
          });
        }
      } else if (collateral > 0n) {
        // Only collateral
        const withdrawAmt =
          effectiveAmount > collateral ? collateral : effectiveAmount;
        requests.push({
          request_type: RequestType.WithdrawCollateral,
          address: assetAddress,
          amount: withdrawAmt,
        });
      } else {
        // Only supply (most common case)
        const withdrawAmt =
          effectiveAmount > supplied ? supplied : effectiveAmount;
        requests.push({
          request_type: RequestType.Withdraw,
          address: assetAddress,
          amount: withdrawAmt,
        });
      }

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
    amount: bigint
  ): Promise<TransactionResult> {
    return this.buildSubmitTx(rawId, userAddress, amount, "withdrawCollateral");
  }

  async claimRewards(
    rawId: string,
    userAddress: string
  ): Promise<TransactionResult> {
    const { poolContractId, assetAddress } = parseRawId(rawId);
    const network = getBlendNetwork();

    try {
      const pool = await PoolV2.load(network, poolContractId);
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
    const horizon = new Horizon.Server(horizonUrl);
    const account = await horizon.loadAccount(userAddress);

    const tx = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase,
    })
      .addOperation(operation)
      .setTimeout(300)
      .build();

    const server = new rpc.Server(rpcUrl, { allowHttp: true });
    const prepared = await server.prepareTransaction(tx);

    return {
      xdr: prepared.toXDR(),
      networkPassphrase,
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
