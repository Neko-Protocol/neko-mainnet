import { useQuery } from "@tanstack/react-query";
import { fetchReferredByPartner, fetchReferredByWallet } from "../actions";

export function useReferredByWallet(wallet: string) {
  return useQuery({
    queryKey: ["referrals", "referred", "wallet", wallet],
    queryFn: () => fetchReferredByWallet(wallet),
  });
}

export function useReferredByPartner(partnerId: string) {
  return useQuery({
    queryKey: ["referrals", "referred", "partner", partnerId],
    queryFn: () => fetchReferredByPartner(partnerId),
  });
}
