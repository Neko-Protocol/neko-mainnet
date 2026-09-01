import { useQuery } from "@tanstack/react-query";
import { fetchPartnerLeaderboard, fetchUserLeaderboard } from "../actions";

export const referralLeaderboardKeys = {
  users: ["referrals", "leaderboard", "users"] as const,
  partners: ["referrals", "leaderboard", "partners"] as const,
};

export function useUserLeaderboard() {
  return useQuery({
    queryKey: referralLeaderboardKeys.users,
    queryFn: fetchUserLeaderboard,
  });
}

export function usePartnerLeaderboard() {
  return useQuery({
    queryKey: referralLeaderboardKeys.partners,
    queryFn: fetchPartnerLeaderboard,
  });
}
