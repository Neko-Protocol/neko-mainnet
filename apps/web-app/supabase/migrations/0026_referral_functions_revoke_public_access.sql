-- SECURITY DEFINER functions run with the function owner's privileges,
-- bypassing the RLS that protects referrals/audit_logs/users/
-- referral_partners against direct anon/authenticated table access.
-- Postgres grants EXECUTE to PUBLIC by default on new functions, so every
-- referral stats/leaderboard/breakdown function (and this migration's own
-- materialized view) was callable directly via the Supabase REST/RPC API
-- with just the public anon key, completely bypassing the backend's
-- AdminAuthGuard. Only the backend (service_role, which bypasses RLS/grants
-- regardless) has any legitimate reason to read this data.
-- Postgres also grants EXECUTE to the PUBLIC pseudo-role by default at
-- function creation time, on top of (and independent from) any per-role
-- grant. Revoking from anon/authenticated alone leaves them with EXECUTE
-- anyway via that PUBLIC grant, so PUBLIC has to be revoked explicitly too.
revoke execute on function public.referral_stats(text) from public;
revoke execute on function public.referral_leaderboard() from public;
revoke execute on function public.referral_partner_stats() from public;
revoke execute on function public.referral_referred_breakdown(text) from public;
revoke execute on function public.referral_partner_referred_breakdown(uuid) from public;
revoke execute on function public.refresh_referral_wallet_volume() from public;

revoke all on public.referral_wallet_volume from anon, authenticated;
