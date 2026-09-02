-- Referrals no longer wait on email verification: every claim/attribution
-- is confirmed immediately (the app no longer inserts 'pending', and the
-- confirmPending() promotion path is removed). Backfill any existing
-- pending rows so nothing is left stuck in that state.
update public.referrals
set status = 'confirmed', confirmed_at = coalesce(confirmed_at, created_at)
where status = 'pending';

alter table public.referrals
  alter column status set default 'confirmed';

-- Per-referred-wallet breakdown: wallet, email, when, and the volume that
-- specific wallet generated (same swap/vault-maturity accounting as
-- referral_stats/referral_leaderboard). Powers the leaderboard row's
-- drill-down page, which is what a future rewards program will need to
-- know who actually generated volume, not just aggregate totals.
create or replace function public.referral_referred_breakdown(p_referrer text)
returns table (
  referred_wallet text,
  email           text,
  referred_at     timestamptz,
  swap_volume_usd numeric,
  vault_tvl_usd   numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with rows as (
    select r.referred_wallet, u.email, r.created_at as referred_at
    from public.referrals r
    join public.users u on u.wallet_address = r.referred_wallet
    where r.referrer_wallet = p_referrer
  ),
  volumes as (
    select
      rows.referred_wallet,
      coalesce(sum(al.amount_in) filter (where al.action_type = 'swap'), 0) as swap_volume,
      coalesce(sum(
        case al.action_type
          when 'vaults_deposit' then al.amount_in
          when 'vaults_withdraw' then -al.amount_in
        end
      ) filter (where al.created_at <= now() - interval '12 days'), 0) as vault_tvl
    from rows
    left join public.audit_logs al
      on al.wallet_address = rows.referred_wallet
     and al.created_at >= rows.referred_at
    group by rows.referred_wallet
  )
  select
    rows.referred_wallet,
    rows.email,
    rows.referred_at,
    coalesce(v.swap_volume, 0) as swap_volume_usd,
    coalesce(v.vault_tvl, 0) as vault_tvl_usd
  from rows
  left join volumes v on v.referred_wallet = rows.referred_wallet
  order by coalesce(v.swap_volume, 0) + coalesce(v.vault_tvl, 0) desc;
$$;

create or replace function public.referral_partner_referred_breakdown(p_partner_id uuid)
returns table (
  referred_wallet text,
  email           text,
  referred_at     timestamptz,
  swap_volume_usd numeric,
  vault_tvl_usd   numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with rows as (
    select r.referred_wallet, u.email, r.created_at as referred_at
    from public.referrals r
    join public.users u on u.wallet_address = r.referred_wallet
    where r.referrer_partner_id = p_partner_id
  ),
  volumes as (
    select
      rows.referred_wallet,
      coalesce(sum(al.amount_in) filter (where al.action_type = 'swap'), 0) as swap_volume,
      coalesce(sum(
        case al.action_type
          when 'vaults_deposit' then al.amount_in
          when 'vaults_withdraw' then -al.amount_in
        end
      ) filter (where al.created_at <= now() - interval '12 days'), 0) as vault_tvl
    from rows
    left join public.audit_logs al
      on al.wallet_address = rows.referred_wallet
     and al.created_at >= rows.referred_at
    group by rows.referred_wallet
  )
  select
    rows.referred_wallet,
    rows.email,
    rows.referred_at,
    coalesce(v.swap_volume, 0) as swap_volume_usd,
    coalesce(v.vault_tvl, 0) as vault_tvl_usd
  from rows
  left join volumes v on v.referred_wallet = rows.referred_wallet
  order by coalesce(v.swap_volume, 0) + coalesce(v.vault_tvl, 0) desc;
$$;
