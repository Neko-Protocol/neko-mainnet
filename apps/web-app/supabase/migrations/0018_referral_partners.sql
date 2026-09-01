-- Referral codes for companies and influencers the team contracts directly,
-- created by an admin rather than self-served by a connected wallet. Kept
-- separate from referral_codes/referrals (the organic wallet-to-wallet flow):
-- these codes have no owning wallet, no pending/confirmed lifecycle, and are
-- deactivated rather than tied to on-chain activity.

create table if not exists public.referral_partners (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  type        text        not null check (type in ('company', 'influencer')),
  email       text,
  code        text        not null unique,
  notes       text,
  is_active   boolean     not null default true,
  created_by  text        references public.admin_emails(email)
              on delete set null on update cascade,
  created_at  timestamptz not null default now()
);

create index if not exists referral_partners_type_idx
  on public.referral_partners (type);

alter table public.referral_partners enable row level security;
