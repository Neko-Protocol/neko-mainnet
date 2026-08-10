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

  // ─── platform/dashboard ─────────────────────────────────────────────────
  INVALID_WALLET: "INVALID_WALLET",

  // ─── platform/activations (admin-only, internal ops) ───────────────────
  NO_EMAILS: "NO_EMAILS",
  CREATE_FAILED: "CREATE_FAILED",
  GET_FAILED: "GET_FAILED",
  LIST_FAILED: "LIST_FAILED",
  ACTIVATION_NOT_FOUND: "ACTIVATION_NOT_FOUND",
  LIST_PAYABLE_FAILED: "LIST_PAYABLE_FAILED",
  NOT_MATCHED: "NOT_MATCHED",
  SELF_PAYOUT: "SELF_PAYOUT",
  UNFUNDED_RECIPIENT: "UNFUNDED_RECIPIENT",
  ADMIN_ACCOUNT_NOT_FOUND: "ADMIN_ACCOUNT_NOT_FOUND",
  HORIZON_ERROR: "HORIZON_ERROR",
  SUBMIT_FAILED: "SUBMIT_FAILED",
  NO_PAYABLE: "NO_PAYABLE",
  SELF_PAYOUT_ONLY: "SELF_PAYOUT_ONLY",
  ALL_LOCKED: "ALL_LOCKED",
  NO_ELIGIBLE: "NO_ELIGIBLE",
  NOT_PAYING: "NOT_PAYING",
  PARTICIPANT_NOT_FOUND: "PARTICIPANT_NOT_FOUND",
  XDR_MISMATCH: "XDR_MISMATCH",
  ALREADY_PAID: "ALREADY_PAID",
  ALREADY_PAYING: "ALREADY_PAYING",

  // ─── admin/admin-auth (admin-only, internal ops) ───────────────────────
  EMAIL_REQUIRED: "EMAIL_REQUIRED",

  // ─── admin/admin-strategies (admin-only, internal ops) ─────────────────
  INVALID_STRATEGY_TYPE: "INVALID_STRATEGY_TYPE",
  STRATEGY_CREATE_FAILED: "STRATEGY_CREATE_FAILED",
  INVALID_STATUS: "INVALID_STATUS",

  // ─── admin/campaigns (admin-only, internal ops) ────────────────────────
  NAME_AND_SUBJECT_REQUIRED: "NAME_AND_SUBJECT_REQUIRED",
  CAMPAIGN_CREATE_FAILED: "CAMPAIGN_CREATE_FAILED",
  ONLY_DRAFT_EDITABLE: "ONLY_DRAFT_EDITABLE",
  INVALID_NAME: "INVALID_NAME",
  INVALID_SUBJECT: "INVALID_SUBJECT",
  CAMPAIGN_UPDATE_FAILED: "CAMPAIGN_UPDATE_FAILED",
  TVL_UPDATE_FAILED: "TVL_UPDATE_FAILED",
  ALREADY_SENT: "ALREADY_SENT",
  SEND_IN_PROGRESS: "SEND_IN_PROGRESS",
  RESEND_NOT_CONFIGURED: "RESEND_NOT_CONFIGURED",
  NO_RECIPIENTS: "NO_RECIPIENTS",
  SEND_FAILED: "SEND_FAILED",

  // ─── admin/invitations (admin-only, internal ops) ──────────────────────
  INVITATION_CREATE_FAILED: "INVITATION_CREATE_FAILED",
  INVITATION_ACCEPT_FAILED: "INVITATION_ACCEPT_FAILED",

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
