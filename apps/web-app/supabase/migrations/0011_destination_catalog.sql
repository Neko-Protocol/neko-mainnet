-- Snapshot of investable destinations (pools, vaults, yield tokens) for admin curation
create table if not exists public.destination_catalog (
  kind                 text        not null,
  id                   text        not null,
  name                 text        not null,
  protocol             text        not null,
  apy                  numeric,
  accepted_token_codes text[]      not null default '{}',
  updated_at           timestamptz not null default now(),
  primary key (kind, id)
);

alter table public.destination_catalog enable row level security;
