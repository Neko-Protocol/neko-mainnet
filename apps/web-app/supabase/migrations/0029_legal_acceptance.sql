-- Neko now gates app access on explicit acceptance of the Privacy Policy and
-- Terms of Service (required ahead of the on/off-ramp, lending, and vault
-- features that move real funds). Acceptance is tracked per-document, not as
-- a single flag, so either document can be re-versioned independently and
-- force re-acceptance without touching the other.
alter table public.users
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists privacy_version text;
