create table public.admin_login_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index admin_login_codes_email_idx on public.admin_login_codes (email);
alter table public.admin_login_codes enable row level security;
