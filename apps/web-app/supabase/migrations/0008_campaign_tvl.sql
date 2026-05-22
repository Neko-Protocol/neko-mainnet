alter table public.campaigns
  add column if not exists tvl_moved numeric(18, 2);
