create table if not exists public.invitations (
  id           uuid        primary key default gen_random_uuid(),
  email        text        not null,
  type         text        not null default 'user',
  token        text        unique not null default encode(gen_random_bytes(32), 'hex'),
  status       text        not null default 'pending',
  assigned_to  text,
  notes        text,
  created_by   text,
  accepted_at  timestamptz,
  expires_at   timestamptz not null default (now() + interval '7 days'),
  created_at   timestamptz not null default now()
);

alter table public.invitations enable row level security;
