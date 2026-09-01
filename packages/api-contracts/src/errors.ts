/**
 * Canonical error codes returned by the backend's `{code, message, traceId}`
 * error body (see apps/backend/src/common/filters/all-exceptions.filter.ts)
 * and by the web-app's backend-proxy route for its own failure modes.
 *
 * Single source of truth so backend throw sites and frontend translation
 * lookups (messages/{locale}/errors.json) never drift out of sync.
 */
export const ErrorCode = {
  // ─── Generic / cross-cutting ──────────────────────────────────────────────
  ERROR: "ERROR",
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  NOT_FOUND: "NOT_FOUND",
  NOT_CONFIGURED: "NOT_CONFIGURED",
  DB_ERROR: "DB_ERROR",
  NAME_REQUIRED: "NAME_REQUIRED",
  WALLET_REQUIRED: "WALLET_REQUIRED",
  INVALID_EMAIL: "INVALID_EMAIL",
  INVALID_XDR: "INVALID_XDR",
  INVALID_SEGMENT: "INVALID_SEGMENT",

  // ─── web-app backend-proxy (synthetic, not backend-originated) ───────────
  BACKEND_PROXY_MISCONFIGURED: "BACKEND_PROXY_MISCONFIGURED",
  BACKEND_UNREACHABLE: "BACKEND_UNREACHABLE",

  // ─── market-data/etherfuse ─────────────────────────────────────────────
  ETHERFUSE_BOND_YIELDS_UNAVAILABLE: "ETHERFUSE_BOND_YIELDS_UNAVAILABLE",

  // ─── market-data/pool-rates ────────────────────────────────────────────
  POOL_RATES_FETCH_FAILED: "POOL_RATES_FETCH_FAILED",
  POOL_RATES_INSERT_FAILED: "POOL_RATES_INSERT_FAILED",

  // ─── investing/recommended-strategies ──────────────────────────────────
  INVALID_STACK: "INVALID_STACK",
  INVALID_STACK_KIND: "INVALID_STACK_KIND",
  TOKEN_CODE_REQUIRED: "TOKEN_CODE_REQUIRED",
  INVALID_DESTINATION_KIND: "INVALID_DESTINATION_KIND",
  DESTINATION_ID_REQUIRED: "DESTINATION_ID_REQUIRED",
  RECOMMENDED_CREATE_FAILED: "RECOMMENDED_CREATE_FAILED",

  // ─── platform/users ─────────────────────────────────────────────────────
  MISSING_PARAMS: "MISSING_PARAMS",
  INVALID_TOKEN: "INVALID_TOKEN",
  UPDATE_FAILED: "UPDATE_FAILED",
  EMAIL_SEND_FAILED: "EMAIL_SEND_FAILED",

  // ─── platform/referrals ─────────────────────────────────────────────────
  USER_NOT_FOUND: "USER_NOT_FOUND",
  CODE_CREATE_FAILED: "CODE_CREATE_FAILED",
  STATS_FAILED: "STATS_FAILED",
  REFERRED_FAILED: "REFERRED_FAILED",
  LEADERBOARD_FAILED: "LEADERBOARD_FAILED",
  INVALID_REFERRAL_CODE: "INVALID_REFERRAL_CODE",
  ALREADY_REFERRED: "ALREADY_REFERRED",
  SELF_REFERRAL_NOT_ALLOWED: "SELF_REFERRAL_NOT_ALLOWED",
  CLAIM_FAILED: "CLAIM_FAILED",
  PARTNER_LEADERBOARD_FAILED: "PARTNER_LEADERBOARD_FAILED",

  // ─── platform/referral-partners ─────────────────────────────────────────
  PARTNER_NAME_REQUIRED: "PARTNER_NAME_REQUIRED",
  PARTNER_CODE_REQUIRED: "PARTNER_CODE_REQUIRED",
  PARTNER_CODE_TAKEN: "PARTNER_CODE_TAKEN",
  PARTNER_CREATE_FAILED: "PARTNER_CREATE_FAILED",
  PARTNER_UPDATE_FAILED: "PARTNER_UPDATE_FAILED",
  PARTNER_NOT_FOUND: "PARTNER_NOT_FOUND",

  // ─── platform/dashboard ─────────────────────────────────────────────────
  INVALID_WALLET: "INVALID_WALLET",

  // ─── chain/transaction (user-facing — wallet tx prepare/submit/status) ──
  SUBMIT_REJECTED: "SUBMIT_REJECTED",
  RPC_ERROR: "RPC_ERROR",
  TRANSACTION_FAILED: "TRANSACTION_FAILED",
  DISALLOWED_OPERATION: "DISALLOWED_OPERATION",
  PREPARE_REJECTED: "PREPARE_REJECTED",
  DISALLOWED_CONTRACT: "DISALLOWED_CONTRACT",

  // ─── shared/stellar Soroban error classification (user-facing) ─────────
  SOROBAN_CONTRACT_ERROR: "SOROBAN_CONTRACT_ERROR",
  HOST_OBJECT_MISSING: "HOST_OBJECT_MISSING",
  INSUFFICIENT_FEE: "INSUFFICIENT_FEE",
  BAD_SEQUENCE: "BAD_SEQUENCE",
  SOURCE_ACCOUNT_NOT_FOUND: "SOURCE_ACCOUNT_NOT_FOUND",
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  AUTH_FAILED: "AUTH_FAILED",
  SOROBAN_UNKNOWN_ERROR: "SOROBAN_UNKNOWN_ERROR",

  // ─── packages/orchestrator client-side contract-error classifier
  //     (user-facing — see contractErrors.ts extractContractError) ────────
  USER_CANCELLED: "USER_CANCELLED",
  INSUFFICIENT_FUNDS: "INSUFFICIENT_FUNDS",
  NETWORK_ERROR: "NETWORK_ERROR",
  SIMULATION_FAILED: "SIMULATION_FAILED",
  UNKNOWN_CONTRACT_ERROR: "UNKNOWN_CONTRACT_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface ApiErrorBody {
  code: string;
  message: string;
  traceId: string;
  details?: unknown;
}
