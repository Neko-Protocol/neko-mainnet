create table if not exists public.admin_users (
  id          uuid        primary key default gen_random_uuid(),
  email       text        unique not null,
  password_hash text      not null,
  totp_secret text        not null,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

alter table public.admin_users enable row level security;
-- No public policies: only service-role key can read/write.
