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

export interface AuditLog extends AuditEvent {
  id: string;
  created_at: string;
  network: string;
}
