-- Admin-curated strategy recipes surfaced on /strategies
create table if not exists public.recommended_strategies (
  id               uuid        primary key default gen_random_uuid(),
  name             text        not null,
  description      text,
  token_code       text        not null,
  destination_kind text        not null,
  destination_id   text        not null,
  stack_kind       text,
  stack_id         text,
  amount           numeric,
  snapshot_apy     numeric,
  position         int         not null default 0,
  is_active        boolean     not null default true,
  created_by       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.recommended_strategies enable row level security;

create index if not exists recommended_strategies_active_position_idx
  on public.recommended_strategies (is_active, position);
