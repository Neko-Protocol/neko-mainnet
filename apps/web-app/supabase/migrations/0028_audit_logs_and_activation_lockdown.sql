-- audit_logs had a permissive anon-read policy (not tracked in any prior
-- migration, so it was created ad-hoc, likely via the dashboard) exposing
-- every wallet's swap/deposit/withdraw history to anyone with the public
-- anon key. Nothing in web-app or admin reads audit_logs directly — every
-- read goes through the backend with service_role, which bypasses RLS
-- regardless of this policy's presence — so dropping it changes nothing
-- for the app, only for anyone reading the table straight from the API.
drop policy if exists "Public read audit_logs" on public.audit_logs;

-- activation_reconcile is SECURITY DEFINER (bypasses RLS on
-- activation_participants/activations/users) with EXECUTE granted to
-- PUBLIC by default at creation time, same gap the referral functions had.
-- No caller found anywhere: not in web-app/admin/backend code, no pg_cron
-- job (the extension isn't even installed), no edge function. PUBLIC and
-- the explicit anon/authenticated grants are independent (the referral
-- fix needed both too), so both have to be revoked.
revoke execute on function public.activation_reconcile(uuid) from public, anon, authenticated;
