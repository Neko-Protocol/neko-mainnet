export const AUDIT_ACTION_TYPES = [
  "lend_deposit",
  "lend_withdraw",
  "borrow_deposit",
  "borrow_withdraw",
  "swap",
  "on_ramp",
  "off_ramp",
  "vaults_deposit",
  "vaults_withdraw",
  "vaults_claim_earnings",
  "pool_repay",
  "pool_claim_rewards",
] as const;

export type AuditActionType = (typeof AUDIT_ACTION_TYPES)[number];
