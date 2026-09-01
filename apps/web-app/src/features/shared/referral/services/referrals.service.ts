import { backendClient } from "@/lib/services/backend-client";

export interface ReferredBy {
  code: string;
  status: "pending" | "confirmed";
}

export interface ReferralMe {
  code: string;
  referred_total: number;
  referred_confirmed: number;
  swap_volume_usd: number;
  vault_tvl_usd: number;
  referred_by: ReferredBy | null;
}

class ReferralsService {
  async getMe(wallet: string): Promise<ReferralMe | null> {
    try {
      const json = await backendClient.get<ReferralMe>(
        `/v1/referrals/me?wallet=${encodeURIComponent(wallet)}`
      );
      return json && typeof json === "object" ? json : null;
    } catch {
      return null;
    }
  }

  /** Throws BackendError on failure (invalid code, already referred, …) so
   * the caller can show the reason instead of failing silently. */
  async claim(wallet: string, code: string): Promise<ReferredBy> {
    return backendClient.post<ReferredBy>("/v1/referrals/claim", {
      wallet_address: wallet,
      code,
    });
  }
}

export const referralsService = new ReferralsService();
