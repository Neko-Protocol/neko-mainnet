"use client";

const LOBSTR_VAULT_API = "https://vault.lobstr.co/api/transactions/";

export type LobstrVaultSubmitResult =
  | { ok: true }
  | { ok: false; error: string };

export const lobstrVaultService = {
  /**
   * Submits a partially-signed transaction XDR to Lobstr Vault so co-signers
   * can review and approve it in the Lobstr Vault mobile app. Once the
   * multisig threshold is met, Lobstr Vault submits the transaction to the
   * Stellar network.
   *
   * Endpoint: POST https://vault.lobstr.co/api/transactions/
   * Body: { xdr: string }
   * No auth required.
   */
  submitForCosigning: async (xdr: string): Promise<LobstrVaultSubmitResult> => {
    try {
      const res = await fetch(LOBSTR_VAULT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xdr }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return { ok: false, error: text || `Lobstr Vault HTTP ${res.status}` };
      }
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error";
      return { ok: false, error: message };
    }
  },
};
