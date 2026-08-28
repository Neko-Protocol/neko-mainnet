import { useQuery } from "@tanstack/react-query";
import { fetchWalletPositions } from "../wallet-positions-actions";
import { analyticsKeys } from "../queryKeys";

export function useWalletPositions(wallet: string) {
  return useQuery({
    queryKey: analyticsKeys.walletPositions(wallet),
    queryFn: () => fetchWalletPositions(wallet),
  });
}
