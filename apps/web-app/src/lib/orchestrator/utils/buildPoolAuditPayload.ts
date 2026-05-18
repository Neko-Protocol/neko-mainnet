import type { AuditActionType, AuditEvent } from "@/lib/types/audit.types";
import type { PoolAction, PoolActionParams } from "../types/pool.types";
import { fromSmallestUnit } from "@/lib/helpers/tokenUtils";
import { aquaProportionalAmountB } from "@/lib/helpers/stellar/aquaDeposit";

function poolActionToAuditType(action: PoolAction): AuditActionType {
  switch (action) {
    case "deposit":
    case "supplyCollateral":
      return "lend_deposit";
    case "withdraw":
    case "withdrawCollateral":
      return "lend_withdraw";
    case "borrow":
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
    case "repay":
      return {
        ...base,
        asset_in: code0,
        token_amount_in: parseHuman(amount, d0),
      };
  }
}
