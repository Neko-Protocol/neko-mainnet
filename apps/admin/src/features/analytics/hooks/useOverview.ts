import { useQuery } from "@tanstack/react-query";
import { fetchOverview } from "../actions";
import { analyticsKeys } from "../queryKeys";

export function useOverview() {
  return useQuery({
    queryKey: analyticsKeys.overview,
    queryFn: fetchOverview,
  });
}
