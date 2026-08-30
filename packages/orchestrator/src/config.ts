import type { rpc } from "@stellar/stellar-sdk";

export type StellarNetworkId = "PUBLIC" | "TESTNET" | "FUTURENET" | "LOCAL";
export interface OrchestratorNetwork {
  id: StellarNetworkId;
  rpcUrl: string;
  passphrase: string;
  allowHttp?: boolean;
  /** Optional Horizon REST endpoint for classic Stellar operations. */
  horizonUrl?: string;
  /**
   * An RPC client to use instead of building one from `rpcUrl`.
   *
   * The backend passes its endpoint pool here, so these reads get the same
   * health-aware selection, retry and failover as the rest of the app. The
   * browser leaves it unset: it already reaches the pool through the gateway
   * that `rpcUrl` points at.
   */
  server?: rpc.Server;
  /**
   * Headers to send with RPC requests built from `rpcUrl`.
   *
   * Only one consumer needs this: Blend's SDK takes a URL and builds its own
   * client, so it cannot be handed `server`. Pointing `rpcUrl` at a gateway
   * that requires a key is the only way to get it onto the pool, and this is
   * how the key travels.
   */
  rpcHeaders?: Record<string, string>;
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
