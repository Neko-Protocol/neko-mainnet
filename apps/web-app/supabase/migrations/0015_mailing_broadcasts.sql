-- One-off mass emails ("broadcasts"), composed and sent from the admin app.
-- Distinct from mailing_automations, which are event-triggered and delayed.
-- Server-only writes via the service-role key; no public policies are added.

create table if not exists public.mailing_broadcasts (
  id              uuid        primary key default gen_random_uuid(),
  name            text        not null,
  subject         text        not null,
  body_html       text        not null,
  audience        text        not null default 'all'
                  check (audience in (
                    'all','vault_depositors','admins','depositors',
                    'non_depositors','swappers_only','inactive'
                  )),
  status          text        not null default 'draft'
                  check (status in ('draft','sending','sent','failed')),
  recipient_count int         not null default 0,
  sent_count      int         not null default 0,
  failed_count    int         not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  sent_at         timestamptz,
  created_by      text,
  error           text
);

create index if not exists mailing_broadcasts_status_created_at_idx
  on public.mailing_broadcasts (status, created_at desc);

drop trigger if exists mailing_broadcasts_touch_updated_at on public.mailing_broadcasts;
create trigger mailing_broadcasts_touch_updated_at
  before update on public.mailing_broadcasts
  for each row
  execute function public.tg_touch_updated_at();

alter table public.mailing_broadcasts enable row level security;

-- mailing_automations.segment previously accepted only the legacy segment ids.
-- Widen it to the shared audience catalog (minus 'admins', which has no wallet
-- and so can never match a wallet-triggered enrollment).
alter table public.mailing_automations
  drop constraint if exists mailing_automations_segment_check;

alter table public.mailing_automations
  add constraint mailing_automations_segment_check
  check (segment in (
    'all','vault_depositors','depositors',
    'non_depositors','swappers_only','inactive'
  ));
