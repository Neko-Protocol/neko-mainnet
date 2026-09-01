import { useQuery } from "@tanstack/react-query";
import { fetchPartnerLeaderboard, fetchUserLeaderboard } from "../actions";

export function useUserLeaderboard() {
  return useQuery({
    queryKey: ["referrals", "leaderboard", "users"],
    queryFn: fetchUserLeaderboard,
  });
}

export function usePartnerLeaderboard() {
  return useQuery({
    queryKey: ["referrals", "leaderboard", "partners"],
    queryFn: fetchPartnerLeaderboard,
  });
}
