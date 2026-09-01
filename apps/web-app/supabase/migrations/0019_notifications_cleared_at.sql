-- Let a user clear notifications out of their tray.
--
-- A soft clear rather than a delete: the (wallet_address, dedupe_key) unique
-- constraint is what makes first-time-only triggers first-time-only, so
-- deleting the row would let 'first_deposit' fire a second time for someone
-- who had simply tidied their bell.

alter table public.notifications
  add column if not exists cleared_at timestamptz;

-- The feed and the badge both read only uncleared rows, so both indexes need
-- the new predicate to stay useful.
drop index if exists public.notifications_wallet_created_at_idx;
create index if not exists notifications_wallet_created_at_idx
  on public.notifications (wallet_address, created_at desc)
  where cleared_at is null;

drop index if exists public.notifications_wallet_unread_idx;
create index if not exists notifications_wallet_unread_idx
  on public.notifications (wallet_address)
  where read_at is null and cleared_at is null;
