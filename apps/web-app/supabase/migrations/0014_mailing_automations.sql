-- Mailing automations: event-triggered, delayed lifecycle emails.
-- Distinct from one-off campaigns (public.campaigns). Server-only writes via
-- the service-role key; no public policies are added.

create table if not exists public.mailing_templates (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  subject     text        not null,
  body_html   text        not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  text
);

drop trigger if exists mailing_templates_touch_updated_at on public.mailing_templates;
create trigger mailing_templates_touch_updated_at
  before update on public.mailing_templates
  for each row
  execute function public.tg_touch_updated_at();

alter table public.mailing_templates enable row level security;

create table if not exists public.mailing_automations (
  id              uuid        primary key default gen_random_uuid(),
  name            text        not null,
  trigger_type    text        not null
                  check (trigger_type in (
                    'signup','first_deposit','swap_completed',
                    'inactivity','referral_confirmed','activation_paid'
                  )),
  trigger_params  jsonb       not null default '{}'::jsonb,
  delay_value     int         not null default 0,
  delay_unit      text        not null default 'days'
                  check (delay_unit in ('minutes','hours','days')),
  segment         text        not null default 'all',
  template_id     uuid        references public.mailing_templates(id) on delete restrict,
  status          text        not null default 'draft'
                  check (status in ('draft','active','paused','archived')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      text
);

create index if not exists mailing_automations_status_idx
  on public.mailing_automations (status);

drop trigger if exists mailing_automations_touch_updated_at on public.mailing_automations;
create trigger mailing_automations_touch_updated_at
  before update on public.mailing_automations
  for each row
  execute function public.tg_touch_updated_at();

alter table public.mailing_automations enable row level security;

create table if not exists public.mailing_automation_runs (
  id                uuid        primary key default gen_random_uuid(),
  automation_id     uuid        not null references public.mailing_automations(id) on delete cascade,
  wallet_address    text        not null,
  email             text        not null,
  trigger_at        timestamptz not null,
  scheduled_send_at timestamptz not null,
  status            text        not null default 'pending'
                    check (status in ('pending','sent','skipped','failed')),
  sent_at           timestamptz,
  error             text,
  created_at        timestamptz not null default now(),
  unique (automation_id, wallet_address)
);

create index if not exists mailing_automation_runs_status_scheduled_send_at_idx
  on public.mailing_automation_runs (status, scheduled_send_at);

alter table public.mailing_automation_runs enable row level security;

create table if not exists public.mailing_opt_outs (
  wallet_address text        primary key,
  email          text,
  opted_out_at   timestamptz not null default now(),
  reason         text
);

alter table public.mailing_opt_outs enable row level security;
