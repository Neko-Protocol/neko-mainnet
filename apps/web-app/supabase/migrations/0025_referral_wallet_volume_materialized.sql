-- Precomputes per-wallet volume (swap + matured vault TVL, scoped to
-- activity from each wallet's referral date forward) into a materialized
-- view instead of every stats/leaderboard/breakdown function re-aggregating
-- audit_logs live on each request. audit_logs is scanned once per refresh
-- cycle (see refresh_referral_wallet_volume(), called by the backend's
-- ReferralWalletVolumeCron) instead of once per page load, so reads against
-- it stay an indexed lookup against a small precomputed view as audit_logs
-- itself grows.
create materialized view if not exists public.referral_wallet_volume as
select
  r.referred_wallet as wallet_address,
  coalesce(sum(al.amount_in) filter (where al.action_type = 'swap'), 0) as swap_volume_usd,
  coalesce(sum(
    case al.action_type
      when 'vaults_deposit' then al.amount_in
      when 'vaults_withdraw' then -al.amount_in
    end
  ) filter (where al.created_at <= now() - interval '12 days'), 0) as vault_tvl_usd
from public.referrals r
left join public.audit_logs al
  on al.wallet_address = r.referred_wallet
 and al.created_at >= r.created_at
group by r.referred_wallet;

create unique index if not exists referral_wallet_volume_wallet_idx
  on public.referral_wallet_volume (wallet_address);

-- REFRESH ... CONCURRENTLY needs the unique index above; concurrent refresh
-- means reads are never blocked while it runs. Callable via rpc() since
-- supabase-js has no generic raw-SQL execution.
create or replace function public.refresh_referral_wallet_volume()
returns void
language sql
security definer
set search_path = public
as $$
  refresh materialized view concurrently public.referral_wallet_volume;
$$;

create or replace function public.referral_stats(p_referrer text)
returns table (
  referred_total     bigint,
  referred_confirmed bigint,
  swap_volume_usd    numeric,
  vault_tvl_usd       numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*),
    count(*),
    coalesce(sum(v.swap_volume_usd), 0),
    coalesce(sum(v.vault_tvl_usd), 0)
  from public.referrals r
  left join public.referral_wallet_volume v on v.wallet_address = r.referred_wallet
  where r.referrer_wallet = p_referrer;
$$;

create or replace function public.referral_leaderboard()
returns table (
  referrer_wallet text,
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
  with counts as (
    select referrer_wallet, count(distinct referred_wallet) as confirmed_count
    from public.referrals
    group by referrer_wallet
  ),
  volumes as (
    select
      r.referrer_wallet,
      coalesce(sum(v.swap_volume_usd), 0) as swap_volume,
      coalesce(sum(v.vault_tvl_usd), 0) as vault_tvl
    from public.referrals r
    left join public.referral_wallet_volume v on v.wallet_address = r.referred_wallet
    group by r.referrer_wallet
  )
  select
    n.referrer_wallet,
    rc.code,
    n.confirmed_count,
    coalesce(vol.swap_volume, 0) as swap_volume_usd,
    coalesce(vol.vault_tvl, 0) as vault_tvl_usd
  from counts n
  join public.referral_codes rc on rc.wallet_address = n.referrer_wallet
  left join volumes vol on vol.referrer_wallet = n.referrer_wallet
  order by coalesce(vol.swap_volume, 0) + coalesce(vol.vault_tvl, 0) desc,
           n.confirmed_count desc;
$$;

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
  with counts as (
    select referrer_partner_id, count(distinct referred_wallet) as confirmed_count
    from public.referrals
    where referrer_partner_id is not null
    group by referrer_partner_id
  ),
  volumes as (
    select
      r.referrer_partner_id,
      coalesce(sum(v.swap_volume_usd), 0) as swap_volume,
      coalesce(sum(v.vault_tvl_usd), 0) as vault_tvl
    from public.referrals r
    left join public.referral_wallet_volume v on v.wallet_address = r.referred_wallet
    where r.referrer_partner_id is not null
    group by r.referrer_partner_id
  )
  select
    rp.id,
    rp.name,
    rp.type,
    rp.code,
    coalesce(n.confirmed_count, 0),
    coalesce(vol.swap_volume, 0),
    coalesce(vol.vault_tvl, 0)
  from public.referral_partners rp
  left join counts n on n.referrer_partner_id = rp.id
  left join volumes vol on vol.referrer_partner_id = rp.id
  order by coalesce(vol.swap_volume, 0) + coalesce(vol.vault_tvl, 0) desc,
           coalesce(n.confirmed_count, 0) desc;
$$;

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
  select
    r.referred_wallet,
    u.email,
    r.created_at as referred_at,
    coalesce(v.swap_volume_usd, 0) as swap_volume_usd,
    coalesce(v.vault_tvl_usd, 0) as vault_tvl_usd
  from public.referrals r
  join public.users u on u.wallet_address = r.referred_wallet
  left join public.referral_wallet_volume v on v.wallet_address = r.referred_wallet
  where r.referrer_wallet = p_referrer
  order by coalesce(v.swap_volume_usd, 0) + coalesce(v.vault_tvl_usd, 0) desc;
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
  select
    r.referred_wallet,
    u.email,
    r.created_at as referred_at,
    coalesce(v.swap_volume_usd, 0) as swap_volume_usd,
    coalesce(v.vault_tvl_usd, 0) as vault_tvl_usd
  from public.referrals r
  join public.users u on u.wallet_address = r.referred_wallet
  left join public.referral_wallet_volume v on v.wallet_address = r.referred_wallet
  where r.referrer_partner_id = p_partner_id
  order by coalesce(v.swap_volume_usd, 0) + coalesce(v.vault_tvl_usd, 0) desc;
$$;
