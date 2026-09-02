import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { referralLeaderboardKeys } from "@/features/referrals/hooks/useReferralLeaderboards";
import {
  createReferralPartner,
  deleteReferralPartner,
  fetchReferralPartners,
  type CreateReferralPartnerInput,
} from "../actions";

const partnerKeys = { list: ["referral-partners", "list"] as const };

export function useReferralPartners() {
  return useQuery({
    queryKey: partnerKeys.list,
    queryFn: fetchReferralPartners,
  });
}

// Creating/deleting a partner code changes both the management list and the
// partner leaderboard (a distinct query in features/referrals), invalidate
// both so the leaderboard tables never show a stale, already-deleted partner.
function invalidatePartnerQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: partnerKeys.list });
  qc.invalidateQueries({ queryKey: referralLeaderboardKeys.partners });
}

export function useCreateReferralPartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReferralPartnerInput) =>
      createReferralPartner(input),
    onSuccess: () => invalidatePartnerQueries(qc),
  });
}

export function useDeleteReferralPartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteReferralPartner(id),
    onSuccess: () => invalidatePartnerQueries(qc),
  });
}
