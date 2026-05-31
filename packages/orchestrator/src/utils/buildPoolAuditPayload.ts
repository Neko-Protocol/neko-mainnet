import type { PoolAction, PoolActionParams } from "../types/pool.types.js";
import { fromSmallestUnit } from "../stellar/tokenUtils.js";
import { aquaProportionalAmountB } from "../stellar/aquaDeposit.js";

export type AuditActionType =
  | "lend_deposit"
  | "lend_withdraw"
  | "borrow_deposit"
  | "borrow_withdraw"
  | "swap"
  | "on_ramp"
  | "off_ramp"
  | "vaults_deposit"
  | "vaults_withdraw"
  | "pool_repay"
  | "pool_claim_rewards";

export interface AuditEvent {
  wallet_address: string;
  action_type: AuditActionType;
  asset_in?: string;
  asset_out?: string;
  amount_in?: number;
  token_amount_in?: number;
  amount_out?: number;
  pool_id?: string;
  tx_hash?: string;
  platform_fee_bps?: number;
  platform_fee_amount?: string;
}

function poolActionToAuditType(action: PoolAction): AuditActionType {
  switch (action) {
    case "deposit":
    case "supplyCollateral":
      return "lend_deposit";
    case "withdraw":
    case "withdrawCollateral":
      return "lend_withdraw";
    case "borrow":
    case "borrowWithCollateral":
      return "borrow_deposit";
    case "repay":
      return "pool_repay";
    case "claimRewards":
      return "pool_claim_rewards";
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

function parseHuman(amount: bigint, decimals: number): number {
  return parseFloat(fromSmallestUnit(amount.toString(), decimals));
}

export function buildPoolAuditPayload(
  params: PoolActionParams,
  txHash: string,
  walletAddress: string
): AuditEvent | null {
  if (!params.audit) return null;
  const { poolId, action, amount, audit } = params;
  const tokens = audit.tokens;
  if (!tokens.length) return null;

  const action_type = poolActionToAuditType(action);
  const base = {
    wallet_address: walletAddress,
    action_type,
    pool_id: poolId,
    tx_hash: txHash,
  } satisfies Pick<
    AuditEvent,
    "wallet_address" | "action_type" | "pool_id" | "tx_hash"
  >;

  if (action === "claimRewards") {
    return base;
  }

  const t0 = tokens[0];
  const d0 = t0.decimals ?? 7;
  const code0 = t0.code ?? "?";

  switch (action) {
    case "deposit":
    case "supplyCollateral": {
      const token_amount_in = parseHuman(amount, d0);
      if (
        action === "deposit" &&
        audit.poolType === "aqua" &&
        tokens.length >= 2
      ) {
        const reserves = audit.metadata.reserves as string[] | undefined;
        if (reserves?.length) {
          const t1 = tokens[1];
          const d1 = t1.decimals ?? 7;
          const amtB = aquaProportionalAmountB(amount, reserves);
          return {
            ...base,
            asset_in: code0,
            token_amount_in,
            asset_out: t1.code ?? "?",
            amount_out: parseHuman(amtB, d1),
          };
        }
      }
      return {
        ...base,
        asset_in: code0,
        token_amount_in,
      };
    }
    case "withdraw":
    case "withdrawCollateral":
      return {
        ...base,
        asset_out: code0,
        amount_out: parseHuman(amount, d0),
      };
    case "borrow":
      return {
        ...base,
        asset_out: code0,
        amount_out: parseHuman(amount, d0),
      };
    case "borrowWithCollateral": {
      const collateral = tokens.find(
        (t) => t.address === params.collateralAssetAddress
      );
      const cDec = collateral?.decimals ?? 7;
      const cCode = collateral?.code ?? params.collateralAssetAddress ?? "?";
      return {
        ...base,
        asset_in: cCode,
        amount_in:
          params.collateralAmount !== undefined
            ? parseHuman(params.collateralAmount, cDec)
            : undefined,
        asset_out: code0,
        amount_out: parseHuman(amount, d0),
      };
    }
    case "repay":
      return {
        ...base,
        asset_in: code0,
        token_amount_in: parseHuman(amount, d0),
      };
  }
}
