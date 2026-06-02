import { describe, it, expect } from "vitest";
import type {
  OrchestratorConfig,
  AuditSink,
  TransactionSubmitter,
  StellarNetworkId,
} from "../src/config";
describe("OrchestratorConfig", () => {
  it("accepts a minimal valid shape", () => {
    const sink: AuditSink = { log: async () => undefined };
    const submitter: TransactionSubmitter = {
      submitSignedXdr: async () => ({ hash: "h", status: "SUCCESS" }),
    };
    const net: StellarNetworkId = "PUBLIC";
    const cfg: OrchestratorConfig = {
      network: { id: net, rpcUrl: "https://rpc", passphrase: "p" },
      contractToCodeMap: { CXYZ: "USDC" },
      auditSink: sink,
      transactionSubmitter: submitter,
    };
    expect(cfg.network.id).toBe("PUBLIC");
  });
});
