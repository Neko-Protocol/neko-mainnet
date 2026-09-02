-- Extends referrals to support partner-attributed rows (companies/influencers
-- from referral_partners) alongside the original wallet-to-wallet referrals.
-- referrer_wallet becomes optional; exactly one of referrer_wallet /
-- referrer_partner_id must be set per row. The FK from code -> referral_codes
-- is dropped because a partner-owned code lives in referral_partners instead,
-- code is now an informational snapshot, not a strict single-parent FK.

alter table public.referrals
  drop constraint if exists referrals_code_fkey;

alter table public.referrals
  alter column referrer_wallet drop not null;

alter table public.referrals
  add column if not exists referrer_partner_id uuid
    references public.referral_partners(id) on delete cascade;

alter table public.referrals
  add constraint referrals_referrer_xor_check check (
    (referrer_wallet is not null and referrer_partner_id is null) or
    (referrer_wallet is null and referrer_partner_id is not null)
  );

create index if not exists referrals_referrer_partner_status_idx
  on public.referrals (referrer_partner_id, status);

-- Per-partner stats, same shape/logic as referral_leaderboard but keyed by
-- referral_partners instead of a wallet. Includes zero-referral partners so
-- admins see everyone they've onboarded, not just the ones with activity.
create or replace function public.referral_partner_stats()
returns table (
  partner_id      uuid,
  name            text,
  type            text,
  code            text,
  confirmed_count bigint,
  swap_volume_usd numeric,
  vault_tvl_usd   numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with confirmed as (
    select referrer_partner_id, referred_wallet
    from public.referrals
    where status = 'confirmed' and referrer_partner_id is not null
  ),
  counts as (
    select referrer_partner_id, count(distinct referred_wallet) as confirmed_count
    from confirmed
    group by referrer_partner_id
  ),
  volumes as (
    select
      c.referrer_partner_id,
      coalesce(sum(al.amount_in) filter (where al.action_type = 'swap'), 0) as swap_volume,
      coalesce(sum(
        case al.action_type
          when 'vaults_deposit' then al.amount_in
          when 'vaults_withdraw' then -al.amount_in
        end
      ), 0) as vault_tvl
    from confirmed c
    left join public.audit_logs al on al.wallet_address = c.referred_wallet
    group by c.referrer_partner_id
  )
  select
    rp.id,
    rp.name,
    rp.type,
    rp.code,
    coalesce(n.confirmed_count, 0),
    coalesce(v.swap_volume, 0),
    coalesce(v.vault_tvl, 0)
  from public.referral_partners rp
  left join counts n on n.referrer_partner_id = rp.id
  left join volumes v on v.referrer_partner_id = rp.id
  order by coalesce(v.swap_volume, 0) desc, coalesce(n.confirmed_count, 0) desc;
$$;
