import { useQuery } from "@tanstack/react-query";
import { fetchVaultDepositors } from "../vault-depositors-actions";
import { analyticsKeys } from "../queryKeys";

// Matches the backend's own 2-minute in-memory cache for this endpoint, so no
// point re-fetching client-side more often than the server data can change.
const VAULTS_STALE_TIME_MS = 2 * 60_000;

export function useVaultDepositors() {
  return useQuery({
    queryKey: analyticsKeys.vaults,
    queryFn: fetchVaultDepositors,
    staleTime: VAULTS_STALE_TIME_MS,
  });
}
