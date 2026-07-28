"use client";

import { useQuery } from "@tanstack/react-query";
import { referralsService } from "@/features/shared/referral/services/referrals.service";
import { useStellarWalletStore } from "@/stores/stellarWalletStore";

export function useReferralStats() {
  const address = useStellarWalletStore((s) => s.address);

  return useQuery({
    queryKey: ["referral-me", address],
    queryFn: () => referralsService.getMe(address!),
    enabled: Boolean(address),
    staleTime: 60_000,
  });
}
