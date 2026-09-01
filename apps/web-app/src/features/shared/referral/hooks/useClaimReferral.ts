"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { referralsService } from "@/features/shared/referral/services/referrals.service";
import { useStellarWalletStore } from "@/stores/stellarWalletStore";

export function useClaimReferral() {
  const address = useStellarWalletStore((s) => s.address);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => referralsService.claim(address!, code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referral-me", address] });
    },
  });
}
