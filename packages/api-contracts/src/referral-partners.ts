export type ReferralPartnerType = "company" | "influencer";

/** A referral code an admin created for a contracted company or influencer. */
export interface ReferralPartner {
  id: string;
  name: string;
  type: ReferralPartnerType;
  email: string | null;
  code: string;
  notes: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}
