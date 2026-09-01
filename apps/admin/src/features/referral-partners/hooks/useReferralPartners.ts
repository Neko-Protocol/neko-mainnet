import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export function useCreateReferralPartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReferralPartnerInput) =>
      createReferralPartner(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: partnerKeys.list }),
  });
}

export function useDeleteReferralPartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteReferralPartner(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: partnerKeys.list }),
  });
}
