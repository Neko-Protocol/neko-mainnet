-- In-app notifications: admin-authored content and per-user delivered rows.
--
-- Deliberately parallel to, but independent of, the mailing tables. A trigger
-- now drives two channels: a `notification_messages` row rendered in the app
-- and a `mailing_messages` automation delivered by email. They are separate
-- records because the copy is genuinely different: a bell item is one line,
-- an email is a full HTML document.
--
-- The two channels also differ in timing and in who qualifies. Notifications
-- are written in-band by the backend function that records the event, so they
-- appear immediately, and they key on wallet_address rather than a verified
-- email, so every connected user gets them. Server-only writes via the
-- service-role key, so no public policies are added.

-- ── Admin-authored content ──────────────────────────────────────────────────
create table if not exists public.notification_messages (
  id             uuid        primary key default gen_random_uuid(),
  kind           text        not null
                 check (kind in ('trigger', 'announcement')),
  name           text        not null,

  title          text        not null,
  body           text        not null,
  -- In-app deep link, e.g. /dashboard. Null renders a non-clickable item.
  url            text,
  category       text        not null default 'activity'
                 check (category in ('activity', 'reward', 'system', 'alert')),

  audience       text        not null default 'all'
                 check (audience in (
                   'all','vault_depositors','admins','depositors',
                   'non_depositors','swappers_only','inactive'
                 )),

  -- Trigger-only. Null on announcements, which are pushed by hand.
  --
  -- Deliberately excludes 'admin_wallet_low_balance', which mailing_messages
  -- does allow: that alert is email-only, because an operational warning
  -- belongs in an inbox someone watches rather than a tray a wallet holder may
  -- never open.
  trigger_type   text        check (trigger_type in (
                   'signup','first_deposit','swap_completed',
                   'inactivity','referral_confirmed'
                 )),
  trigger_params jsonb       not null default '{}'::jsonb,

  -- Triggers move draft -> active -> paused -> archived (and back to draft).
  -- Announcements move draft -> sent.
  status         text        not null default 'draft'
                 check (status in (
                   'draft','active','paused','archived','sent'
                 )),

  sent_count     int         not null default 0,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  sent_at        timestamptz,
  created_by     text        references public.admin_emails(email)
                             on delete set null on update cascade,

  -- A trigger is exactly what distinguishes the two kinds, mirroring
  -- mailing_messages_kind_trigger_check.
  constraint notification_messages_kind_trigger_check
    check ((kind = 'trigger' and trigger_type is not null)
           or (kind = 'announcement' and trigger_type is null))
);

-- At most one active message per trigger, so emit() has an unambiguous lookup
-- and never has to pick between two competing definitions.
create unique index if not exists notification_messages_active_trigger_idx
  on public.notification_messages (trigger_type)
  where kind = 'trigger' and status = 'active';

create index if not exists notification_messages_kind_status_idx
  on public.notification_messages (kind, status);
create index if not exists notification_messages_created_by_idx
  on public.notification_messages (created_by);

drop trigger if exists notification_messages_touch_updated_at
  on public.notification_messages;
create trigger notification_messages_touch_updated_at
  before update on public.notification_messages
  for each row
  execute function public.tg_touch_updated_at();

alter table public.notification_messages enable row level security;

-- ── One delivered row per user ──────────────────────────────────────────────
create table if not exists public.notifications (
  id             uuid        primary key default gen_random_uuid(),
  wallet_address text        not null,
  -- Kept nullable and set-null on delete: history outlives its definition.
  message_id     uuid        references public.notification_messages(id)
                             on delete set null,

  -- Denormalised on purpose. Editing a message later must not rewrite what
  -- people were already told.
  title          text        not null,
  body           text        not null,
  url            text,
  category       text        not null default 'activity',
  trigger_type   text,

  -- Idempotency key for a given wallet, e.g. 'signup', 'first_swap',
  -- 'referral:<id>', or a UTC-day bucket for recurring alerts. Lets emit() be
  -- called unconditionally from hot paths without a read-modify-write.
  dedupe_key     text        not null,

  read_at        timestamptz,
  created_at     timestamptz not null default now(),

  unique (wallet_address, dedupe_key)
);

create index if not exists notifications_wallet_created_at_idx
  on public.notifications (wallet_address, created_at desc);

create index if not exists notifications_wallet_unread_idx
  on public.notifications (wallet_address)
  where read_at is null;

alter table public.notifications enable row level security;
