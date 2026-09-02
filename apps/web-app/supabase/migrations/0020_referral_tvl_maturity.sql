-- Two corrections to referral volume accounting:
--
-- 1. Only audit_logs activity from ON OR AFTER the referral was recorded
--    counts. Without this, a wallet that already had swap/vault history
--    before applying a referral code (e.g. via the claim() flow, which lets
--    an existing wallet attach a code after the fact) would retroactively
--    inflate the referrer's stats with activity that predates the referral
--    entirely.
--
-- 2. Vault TVL only counts audit_logs rows at least 7 days old. Applied to
--    both deposit and withdraw rows (not just deposits) so a same-day
--    deposit-then-withdraw never nets negative, it simply doesn't appear
--    until both sides have matured, at which point they net out correctly.
--    Prevents wash deposits from inflating a referrer's TVL the moment a
--    referred wallet touches a vault.
--
-- Ranking (leaderboard order) now sorts by combined volume
-- (swap_volume_usd + vault_tvl_usd) instead of swap volume alone, matching
-- the "Volumen" metric shown in the admin UI.

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
  with confirmed as (
    select referred_wallet, created_at as referred_at
    from public.referrals
    where referrer_wallet = p_referrer
      and status = 'confirmed'
  ),
  volumes as (
    select
      coalesce(sum(al.amount_in) filter (where al.action_type = 'swap'), 0) as swap_volume,
      coalesce(sum(
        case al.action_type
          when 'vaults_deposit' then al.amount_in
          when 'vaults_withdraw' then -al.amount_in
        end
      ) filter (where al.created_at <= now() - interval '7 days'), 0) as vault_tvl
    from public.audit_logs al
    join confirmed c
      on c.referred_wallet = al.wallet_address
     and al.created_at >= c.referred_at
  )
  select
    (select count(*) from public.referrals where referrer_wallet = p_referrer),
    (select count(*) from confirmed),
    v.swap_volume,
    v.vault_tvl
  from volumes v;
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
  with confirmed as (
    select referrer_wallet, referred_wallet, created_at as referred_at
    from public.referrals
    where status = 'confirmed'
  ),
  counts as (
    select referrer_wallet, count(distinct referred_wallet) as confirmed_count
    from confirmed
    group by referrer_wallet
  ),
  volumes as (
    select
      c.referrer_wallet,
      coalesce(sum(al.amount_in) filter (where al.action_type = 'swap'), 0) as swap_volume,
      coalesce(sum(
        case al.action_type
          when 'vaults_deposit' then al.amount_in
          when 'vaults_withdraw' then -al.amount_in
        end
      ) filter (where al.created_at <= now() - interval '7 days'), 0) as vault_tvl
    from confirmed c
    left join public.audit_logs al
      on al.wallet_address = c.referred_wallet
     and al.created_at >= c.referred_at
    group by c.referrer_wallet
  )
  select
    n.referrer_wallet,
    rc.code,
    n.confirmed_count,
    coalesce(v.swap_volume, 0) as swap_volume_usd,
    coalesce(v.vault_tvl, 0) as vault_tvl_usd
  from counts n
  join public.referral_codes rc on rc.wallet_address = n.referrer_wallet
  left join volumes v on v.referrer_wallet = n.referrer_wallet
  order by coalesce(v.swap_volume, 0) + coalesce(v.vault_tvl, 0) desc,
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
  with confirmed as (
    select referrer_partner_id, referred_wallet, created_at as referred_at
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
      ) filter (where al.created_at <= now() - interval '7 days'), 0) as vault_tvl
    from confirmed c
    left join public.audit_logs al
      on al.wallet_address = c.referred_wallet
     and al.created_at >= c.referred_at
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
  order by coalesce(v.swap_volume, 0) + coalesce(v.vault_tvl, 0) desc,
           coalesce(n.confirmed_count, 0) desc;
$$;
