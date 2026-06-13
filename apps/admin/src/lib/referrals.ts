"use server";

import { backendFetch } from "./backend";

export interface ReferralLeaderboardRow {
  referrer_wallet: string;
  code: string;
  confirmed_count: number;
  swap_volume_usd: number;
  vault_tvl_usd: number;
}

export async function getReferralLeaderboard(): Promise<
  ReferralLeaderboardRow[]
> {
  const res = await backendFetch("v1/referrals/leaderboard");
  if (!res.ok) throw new Error("Failed to load leaderboard");
  return res.json() as Promise<ReferralLeaderboardRow[]>;
}
