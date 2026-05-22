-- Strategies table
create table if not exists public.strategies (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null,
  description   text,
  type          text        not null default 'acquisition',
  target_count  int         not null default 0,
  status        text        not null default 'active',
  assigned_to   text,
  created_by    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.strategies enable row level security;

-- Link invitations to strategies (nullable for backward compat)
alter table public.invitations
  add column if not exists strategy_id uuid references public.strategies(id) on delete set null;

create index if not exists invitations_strategy_idx on public.invitations(strategy_id);
