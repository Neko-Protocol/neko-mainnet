export type StellarNetworkId = "PUBLIC" | "TESTNET" | "FUTURENET" | "LOCAL";
export interface OrchestratorNetwork {
  id: StellarNetworkId;
  rpcUrl: string;
  passphrase: string;
  allowHttp?: boolean;
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
  auditSink?: AuditSink;
  transactionSubmitter?: TransactionSubmitter;
}
export const noopAuditSink: AuditSink = { log: async () => undefined };
