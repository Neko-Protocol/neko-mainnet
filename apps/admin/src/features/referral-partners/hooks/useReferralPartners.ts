import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createReferralPartner,
  fetchReferralPartners,
  setReferralPartnerActive,
  type CreateReferralPartnerInput,
} from "../actions";

const partnerKeys = { list: ["referral-partners", "list"] as const };

export function useReferralPartners() {
  return useQuery({
    queryKey: partnerKeys.list,
    queryFn: fetchReferralPartners,
  });
}

export function useCreateReferralPartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReferralPartnerInput) =>
      createReferralPartner(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: partnerKeys.list }),
  });
}

export function useSetReferralPartnerActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; isActive: boolean }) =>
      setReferralPartnerActive(input.id, input.isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: partnerKeys.list }),
  });
}
