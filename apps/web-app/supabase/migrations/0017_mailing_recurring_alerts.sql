-- Support alert automations that can fire more than once.
--
-- The old unique key (message_id, email) meant a recipient could only ever be
-- enrolled once per message, which is right for "welcome on signup" but wrong
-- for an operational alert that should re-fire each time a condition recurs.
--
-- Widening the key to include trigger_at makes both behave correctly, because
-- trigger_at is the identity of the occasion rather than the moment of sending:
--   * event triggers  -> the event's own timestamp, stable, so no duplicates
--   * broadcasts      -> the message's created_at, stable across retries
--   * balance alerts  -> the UTC day, so at most one reminder per day per admin
--
-- trigger_at therefore becomes mandatory. Broadcast rows written by the earlier
-- shape carry NULL, so they are backfilled from their message first.

update public.mailing_sends s
set trigger_at = m.created_at
from public.mailing_messages m
where s.message_id = m.id
  and s.trigger_at is null;

-- Any orphan left over (message already deleted) falls back to its own row.
update public.mailing_sends
set trigger_at = created_at
where trigger_at is null;

alter table public.mailing_sends
  alter column trigger_at set not null;

alter table public.mailing_sends
  drop constraint if exists mailing_sends_message_id_email_key;

alter table public.mailing_sends
  add constraint mailing_sends_message_id_email_trigger_at_key
  unique (message_id, email, trigger_at);

-- New trigger: the keeper wallet running low on XLM stops vault operations, so
-- admins need to hear about it before it does.
alter table public.mailing_messages
  drop constraint if exists mailing_messages_trigger_type_check;

alter table public.mailing_messages
  add constraint mailing_messages_trigger_type_check
  check (trigger_type in (
    'signup','first_deposit','swap_completed',
    'inactivity','referral_confirmed','admin_wallet_low_balance'
  ));
