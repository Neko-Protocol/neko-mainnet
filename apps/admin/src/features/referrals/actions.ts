"use server";

import { fetchFromBackend } from "@/lib/services/backend-client";

export interface ReferralLeaderboardRow {
  referrer_wallet: string;
  code: string;
  email: string | null;
  confirmed_count: number;
  swap_volume_usd: number;
  vault_tvl_usd: number;
}

export interface ReferralPartnerLeaderboardRow {
  partner_id: string;
  name: string;
  type: "company" | "influencer";
  code: string;
  confirmed_count: number;
  swap_volume_usd: number;
  vault_tvl_usd: number;
}

export async function fetchUserLeaderboard(): Promise<
  ReferralLeaderboardRow[]
> {
  return fetchFromBackend<ReferralLeaderboardRow[]>("referrals/leaderboard");
}

export async function fetchPartnerLeaderboard(): Promise<
  ReferralPartnerLeaderboardRow[]
> {
  return fetchFromBackend<ReferralPartnerLeaderboardRow[]>(
    "referrals/leaderboard/partners"
  );
}
