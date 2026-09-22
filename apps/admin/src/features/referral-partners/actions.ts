"use server";

import type { ReferralPartner, ReferralPartnerType } from "@neko-protocol/api-contracts";
import { fetchFromBackend, mutateBackend } from "@/lib/services/backend-client";
import { getActingAdminEmail } from "@/features/mailing/actingAdmin";

const PARTNERS = "admin/referral-partners";

export async function fetchReferralPartners(): Promise<ReferralPartner[]> {
  return fetchFromBackend<ReferralPartner[]>(PARTNERS);
}

export interface CreateReferralPartnerInput {
  name: string;
  type: ReferralPartnerType;
  code: string;
  email?: string;
  notes?: string;
}

export async function createReferralPartner(
  input: CreateReferralPartnerInput
): Promise<ReferralPartner> {
  const created_by = await getActingAdminEmail();
  return mutateBackend<ReferralPartner>("POST", PARTNERS, {
    ...input,
    ...(created_by ? { created_by } : {}),
  });
}

export async function deleteReferralPartner(id: string): Promise<void> {
  await mutateBackend<{ ok: true }>(
    "DELETE",
    `${PARTNERS}/${encodeURIComponent(id)}`
  );
}
