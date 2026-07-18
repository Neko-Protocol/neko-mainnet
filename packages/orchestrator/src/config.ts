export type StellarNetworkId = "PUBLIC" | "TESTNET" | "FUTURENET" | "LOCAL";
export interface OrchestratorNetwork {
  id: StellarNetworkId;
  rpcUrl: string;
  passphrase: string;
  allowHttp?: boolean;
  /** Optional Horizon REST endpoint for classic Stellar operations. */
  horizonUrl?: string;
}
/**
 * Rich token metadata used by adapters that need decimals / icon / display
 * names beyond the address↔code mapping in `contractToCodeMap`.
 */
export interface OrchestratorTokenInfo {
  name: string;
  contract: string;
  code: string;
  decimals: number;
  icon?: string;
}
export interface AuditSink {
  log(event: unknown): Promise<void>;
}
export interface SubmitResult {
  hash: string;
  status: "SUCCESS" | "FAILED" | "PENDING";
}
export interface TransactionSubmitter {
  submitSignedXdr(signedXdr: string): Promise<SubmitResult>;
}
export interface OrchestratorConfig {
  network: OrchestratorNetwork;
  contractToCodeMap: Record<string, string>;
  /**
   * Optional rich token metadata keyed by token code (e.g. "XLM"). Adapters
   * that need decimals (such as Aqua) consume this when present, falling
   * back to defaults derived from `contractToCodeMap` otherwise.
   */
  tokens?: Record<string, OrchestratorTokenInfo>;
  auditSink?: AuditSink;
  transactionSubmitter?: TransactionSubmitter;
}
export const noopAuditSink: AuditSink = { log: async () => undefined };
