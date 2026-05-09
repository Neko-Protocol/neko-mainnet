-- public.users - one row per Stellar wallet that has ever connected.
-- Identity is the wallet address; email is optional and verified via Supabase Auth magic link.
-- Run this in the Supabase SQL editor (or via the CLI) once.

create table if not exists public.users (
  wallet_address     text primary key,
  wallet_provider    text,
  network            text not null,
  email              text unique,
  email_verified_at  timestamptz,
  auth_user_id       uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists users_email_idx
  on public.users (email)
  where email is not null;

create index if not exists users_network_idx
  on public.users (network);

create or replace function public.tg_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_touch_updated_at on public.users;
create trigger users_touch_updated_at
  before update on public.users
  for each row
  execute function public.tg_touch_updated_at();

-- Server-only writes via the service-role key. No public policies are added,
-- so anon/authenticated roles cannot read or write directly. This matches the
-- existing audit_logs pattern.
alter table public.users enable row level security;
