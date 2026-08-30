-- Mailing: templates, messages, per-recipient sends, and opt-outs.
--
-- Supersedes the earlier draft of this migration, which split sendable things
-- across `mailing_automations` and `mailing_broadcasts`. A broadcast is just a
-- message with no trigger, so both now live in `mailing_messages` behind a
-- `kind` discriminator, and every send — triggered or one-off — is recorded
-- per recipient in `mailing_sends`.
--
-- The drops below only fire on environments that applied the earlier draft;
-- that shape was never released. Server-only writes via the service-role key,
-- so no public policies are added.

drop table if exists public.mailing_automation_runs;
drop table if exists public.mailing_broadcasts;
drop table if exists public.mailing_automations;

-- ── Reusable content ────────────────────────────────────────────────────────
create table if not exists public.mailing_templates (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  subject     text        not null,
  body_html   text        not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Attributed to a real admin; null when the admin was later removed.
  created_by  text        references public.admin_emails(email)
                          on delete set null on update cascade
);

drop trigger if exists mailing_templates_touch_updated_at on public.mailing_templates;
create trigger mailing_templates_touch_updated_at
  before update on public.mailing_templates
  for each row
  execute function public.tg_touch_updated_at();

create index if not exists mailing_templates_created_by_idx
  on public.mailing_templates (created_by);

alter table public.mailing_templates enable row level security;

-- ── Anything sendable: one-off broadcasts and triggered automations ─────────
create table public.mailing_messages (
  id              uuid        primary key default gen_random_uuid(),
  kind            text        not null
                  check (kind in ('broadcast', 'automation')),
  name            text        not null,

  -- Content is either a template reference or inline copy, never neither.
  template_id     uuid        references public.mailing_templates(id)
                              on delete restrict,
  subject         text,
  body_html       text,

  audience        text        not null default 'all'
                  check (audience in (
                    'all','vault_depositors','admins','depositors',
                    'non_depositors','swappers_only','inactive'
                  )),

  -- Automation-only scheduling. Null on broadcasts.
  trigger_type    text        check (trigger_type in (
                    'signup','first_deposit','swap_completed',
                    'inactivity','referral_confirmed'
                  )),
  trigger_params  jsonb       not null default '{}'::jsonb,
  delay_value     int         not null default 0,
  delay_unit      text        not null default 'days'
                  check (delay_unit in ('minutes','hours','days')),

  -- Broadcasts move draft → sending → sent/failed.
  -- Automations move draft → active → paused → archived (and back to draft).
  status          text        not null default 'draft'
                  check (status in (
                    'draft','active','paused','archived',
                    'sending','sent','failed'
                  )),

  recipient_count int         not null default 0,
  sent_count      int         not null default 0,
  failed_count    int         not null default 0,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  sent_at         timestamptz,
  created_by      text        references public.admin_emails(email)
                              on delete set null on update cascade,
  error           text,

  constraint mailing_messages_content_check
    check (template_id is not null
           or (subject is not null and body_html is not null)),

  -- A trigger is exactly what distinguishes the two kinds.
  constraint mailing_messages_kind_trigger_check
    check ((kind = 'automation' and trigger_type is not null)
           or (kind = 'broadcast' and trigger_type is null))
);

create index if not exists mailing_messages_kind_status_idx
  on public.mailing_messages (kind, status);
create index if not exists mailing_messages_created_by_idx
  on public.mailing_messages (created_by);

drop trigger if exists mailing_messages_touch_updated_at on public.mailing_messages;
create trigger mailing_messages_touch_updated_at
  before update on public.mailing_messages
  for each row
  execute function public.tg_touch_updated_at();

alter table public.mailing_messages enable row level security;

-- ── One row per recipient per message, for both kinds ───────────────────────
create table public.mailing_sends (
  id                uuid        primary key default gen_random_uuid(),
  message_id        uuid        not null references public.mailing_messages(id)
                                on delete cascade,
  -- Null for admin-list recipients, who have no wallet.
  wallet_address    text,
  email             text        not null,
  -- Null on broadcasts, which aren't triggered by an event.
  trigger_at        timestamptz,
  scheduled_send_at timestamptz not null,
  status            text        not null default 'pending'
                    check (status in ('pending','sent','skipped','failed')),
  sent_at           timestamptz,
  error             text,
  created_at        timestamptz not null default now(),

  -- Email rather than wallet: it's the one key present for every recipient,
  -- and it's what actually must not be mailed twice for a given message.
  unique (message_id, email)
);

create index if not exists mailing_sends_status_scheduled_send_at_idx
  on public.mailing_sends (status, scheduled_send_at);
create index if not exists mailing_sends_message_id_idx
  on public.mailing_sends (message_id);

alter table public.mailing_sends enable row level security;

-- ── Standing opt-outs, a fact about a person rather than a message ──────────
create table if not exists public.mailing_opt_outs (
  wallet_address text        primary key,
  email          text,
  opted_out_at   timestamptz not null default now(),
  reason         text
);

alter table public.mailing_opt_outs enable row level security;
