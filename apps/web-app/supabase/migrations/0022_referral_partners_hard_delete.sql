-- Revoking a partner's referral code now deletes the row outright instead
-- of soft-deactivating it (referrals.referrer_partner_id already cascades,
-- so this also removes that partner's referral history). There is no more
-- "revoked but still present" state, so is_active is dead weight, drop it.

alter table public.referral_partners
  drop column if exists is_active;
