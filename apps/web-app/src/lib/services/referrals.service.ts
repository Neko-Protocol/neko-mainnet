import { backendClient } from "@/lib/services/backend-client";

export interface ReferralMe {
  code: string;
  referred_total: number;
  referred_confirmed: number;
  swap_volume_usd: number;
  vault_tvl_usd: number;
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
}

export const referralsService = new ReferralsService();
