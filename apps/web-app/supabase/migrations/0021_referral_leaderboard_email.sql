-- Surfaces the referrer's email (when known) on the wallet leaderboard, so
-- admins can identify who a wallet belongs to without cross-referencing
-- the users table by hand.

create or replace function public.referral_leaderboard()
returns table (
  referrer_wallet text,
  code            text,
  email           text,
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
    u.email,
    n.confirmed_count,
    coalesce(v.swap_volume, 0) as swap_volume_usd,
    coalesce(v.vault_tvl, 0) as vault_tvl_usd
  from counts n
  join public.referral_codes rc on rc.wallet_address = n.referrer_wallet
  left join public.users u on u.wallet_address = n.referrer_wallet
  left join volumes v on v.referrer_wallet = n.referrer_wallet
  order by coalesce(v.swap_volume, 0) + coalesce(v.vault_tvl, 0) desc,
           n.confirmed_count desc;
$$;
