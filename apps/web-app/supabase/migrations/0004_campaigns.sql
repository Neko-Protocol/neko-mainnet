create table if not exists public.campaigns (
  id              uuid        primary key default gen_random_uuid(),
  name            text        not null,
  subject         text        not null,
  body_html       text        not null,
  segment         text        not null default 'all',
  status          text        not null default 'draft',
  recipient_count int,
  sent_at         timestamptz,
  created_at      timestamptz not null default now(),
  created_by      text
);

alter table public.campaigns enable row level security;
