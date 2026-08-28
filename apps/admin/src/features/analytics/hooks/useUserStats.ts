import { useQuery } from "@tanstack/react-query";
import { fetchUserStats } from "../actions";
import { analyticsKeys } from "../queryKeys";

export function useUserStats() {
  return useQuery({
    queryKey: analyticsKeys.users,
    queryFn: fetchUserStats,
  });
}
