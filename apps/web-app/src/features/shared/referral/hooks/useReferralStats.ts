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
    // Always revalidate on mount: whether this wallet has a referrer can
    // change from outside this session (an admin revoking a partner code
    // deletes the referral row), so a cached "confirmed" from before that
    // must never be trusted without a fresh check.
    staleTime: 0,
  });
}
