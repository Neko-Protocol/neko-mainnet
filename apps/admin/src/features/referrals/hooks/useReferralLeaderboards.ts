import { useQuery } from "@tanstack/react-query";
import { fetchPartnerLeaderboard, fetchUserLeaderboard } from "../actions";

export const referralLeaderboardKeys = {
  users: ["referrals", "leaderboard", "users"] as const,
  partners: ["referrals", "leaderboard", "partners"] as const,
};

// Partner create/delete already invalidates .partners directly (see
// useReferralPartners.ts), but a user's referral can also get confirmed
// from the web-app side, which this admin app has no mutation to invalidate
// on. Polling is the simple, TanStack-native way to keep both leaderboards
// close to live without wiring up a websocket for a low-traffic admin page.
const LEADERBOARD_REFETCH_INTERVAL_MS = 15_000;

export function useUserLeaderboard() {
  return useQuery({
    queryKey: referralLeaderboardKeys.users,
    queryFn: fetchUserLeaderboard,
    refetchInterval: LEADERBOARD_REFETCH_INTERVAL_MS,
  });
}

export function usePartnerLeaderboard() {
  return useQuery({
    queryKey: referralLeaderboardKeys.partners,
    queryFn: fetchPartnerLeaderboard,
    refetchInterval: LEADERBOARD_REFETCH_INTERVAL_MS,
  });
}
