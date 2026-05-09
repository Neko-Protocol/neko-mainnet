-- Add a preferences JSONB column to store user preferences synced across devices.
-- Preferences are wallet-keyed; Supabase wins over localStorage on every connect.
-- Shape: { "currency": "MXN", "ui_mode": "expert" }
-- New preference keys can be added with no further migrations.

alter table public.users
  add column if not exists preferences jsonb not null default '{}'::jsonb;
