-- Drop tables for features that no longer exist anywhere in the codebase.
--
-- campaigns / invitations / strategies: their backend domains were deleted in
-- the admin rewrite (see commits "chore(backend): remove legacy ..."), leaving
-- these tables with zero read or write paths.
--
-- activations / activation_participants: the activations feature is removed in
-- full; its admin UI was already gone and its backend domain is deleted here.
--
-- Historical audit_logs rows with action_type = 'activation_payout' are left
-- untouched — they are a record of payouts that really happened.
--
-- Dropped children-first so no cascade is needed.

drop table if exists public.invitations;
drop table if exists public.strategies;
drop table if exists public.campaigns;

drop table if exists public.activation_participants;
drop table if exists public.activations;
