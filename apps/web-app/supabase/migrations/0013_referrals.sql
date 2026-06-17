-- Referrals: each wallet can own one short referral code. A referral is
-- created (pending) when a brand-new wallet registers carrying a ref code,
-- and is confirmed once the referred user verifies their email.
-- Server-only writes via the service-role key (same pattern as users/audit_logs).

create table if not exists public.referral_codes (
  wallet_address text        primary key references public.users(wallet_address) on delete cascade,
  code           text        not null unique,
  created_at     timestamptz not null default now()
);

alter table public.referral_codes enable row level security;

create table if not exists public.referrals (
  id              uuid        primary key default gen_random_uuid(),
  code            text        not null references public.referral_codes(code),
  referrer_wallet text        not null references public.users(wallet_address),
  referred_wallet text        not null unique references public.users(wallet_address) on delete cascade,
  status          text        not null default 'pending'
                  check (status in ('pending','confirmed')),
  created_at      timestamptz not null default now(),
  confirmed_at    timestamptz,
  check (referrer_wallet <> referred_wallet)
);

create index if not exists referrals_referrer_status_idx
  on public.referrals (referrer_wallet, status);

alter table public.referrals enable row level security;

-- Per-referrer stats: confirmed referrals plus the volume those referred
-- wallets brought. Swap volume = sum of USD amount_in on swaps; vault TVL =
-- deposits minus withdrawals (USD). Aggregated per referred wallet first so
-- the join never multiplies counts.
create or replace function public.referral_stats(p_referrer text)
returns table (
  referred_total     bigint,
  referred_confirmed bigint,
  swap_volume_usd    numeric,
  vault_tvl_usd      numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with confirmed as (
    select referred_wallet
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
      ), 0) as vault_tvl
    from public.audit_logs al
    join confirmed c on c.referred_wallet = al.wallet_address
  )
  select
    (select count(*) from public.referrals where referrer_wallet = p_referrer),
    (select count(*) from confirmed),
    v.swap_volume,
    v.vault_tvl
  from volumes v;
$$;

-- Leaderboard across all referrers with at least one confirmed referral.
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
    select referrer_wallet, referred_wallet
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
      ), 0) as vault_tvl
    from confirmed c
    left join public.audit_logs al on al.wallet_address = c.referred_wallet
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
  order by swap_volume_usd desc, confirmed_count desc;
$$;
