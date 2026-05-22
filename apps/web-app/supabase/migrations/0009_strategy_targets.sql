alter table public.strategies
  add column if not exists target_volume numeric(18, 2) not null default 0,
  add column if not exists completed_at  timestamptz;
