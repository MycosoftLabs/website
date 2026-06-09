-- =============================================================================
-- Security hardening — RLS policies, SECURITY DEFINER exposure, public buckets
-- Generated: 2026-06-09 (audit). Project: hnevnsxnhfibhbsipqvz (production)
--
-- DO NOT APPLY BLIND TO PRODUCTION. Review each block, then apply via Cursor or
-- the Supabase SQL editor WITH the app open so you can confirm nothing breaks.
-- Legitimate server-side writes use the service-role key, which BYPASSES RLS, so
-- tightening the `authenticated` policies below should not affect server writes.
-- Each block is reversible.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. incidents — remove the always-true UPDATE/INSERT for `authenticated`.
--    Incidents are written/updated server-side (service-role). No end user
--    should be able to forge or mutate arbitrary incident rows.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated update incidents" ON public.incidents;
DROP POLICY IF EXISTS "Authenticated insert incidents" ON public.incidents;
-- (Reads can stay as-is if a SELECT policy exists; only write paths are removed.)

-- -----------------------------------------------------------------------------
-- 2. audit_logs — append-only via service-role. Drop authenticated INSERT.
--    An attacker who can write audit_logs can poison your audit trail.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated insert audit_logs" ON public.audit_logs;

-- -----------------------------------------------------------------------------
-- 3. security_events — same reasoning as audit_logs.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated insert security_events" ON public.security_events;

-- -----------------------------------------------------------------------------
-- 4. defense_briefing_requests — this MAY be an intentional public/authed
--    submission form. REVIEW before applying. If it is a contact-style form,
--    keep INSERT but scope the row to the submitter instead of always-true.
--    The conservative default below requires the row's user_id to match the
--    caller; adjust the column name to your schema, or skip this block.
-- -----------------------------------------------------------------------------
-- DROP POLICY IF EXISTS "Authenticated insert defense_briefing_requests" ON public.defense_briefing_requests;
-- CREATE POLICY "Authenticated insert own defense_briefing_requests"
--   ON public.defense_briefing_requests FOR INSERT TO authenticated
--   WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 5. SECURITY DEFINER functions callable by signed-in users.
--    Revoke direct EXECUTE from anon/authenticated. Trigger usage (e.g.
--    handle_new_user, handle_super_admin_role fired on row changes) is
--    UNAFFECTED — triggers run as the definer regardless of EXECUTE grants.
--    If any of these is intentionally called as an RPC from the client, leave
--    that one granted and document why.
-- -----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.handle_super_admin_role() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_staff() FROM anon, authenticated;
-- create_chain_entry: MINDEX chain-of-custody writer. Should be server-only.
REVOKE EXECUTE ON FUNCTION public.create_chain_entry(
  character varying, character varying, character varying, jsonb,
  character varying, character varying, character varying, character varying
) FROM anon, authenticated;
-- get_user_monthly_usage: if the client legitimately needs its OWN usage, keep
-- granted but ensure the function filters by auth.uid() internally. Otherwise:
REVOKE EXECUTE ON FUNCTION public.get_user_monthly_usage(uuid, text) FROM anon, authenticated;

-- -----------------------------------------------------------------------------
-- 6. Mutable search_path hardening on SECURITY DEFINER-adjacent functions.
-- -----------------------------------------------------------------------------
ALTER FUNCTION public.worldview_rate_weight_last_minute() SET search_path = public, pg_temp;
ALTER FUNCTION public.worldview_meter_and_limit() SET search_path = public, pg_temp;

-- -----------------------------------------------------------------------------
-- 7. Public storage buckets allow listing all objects. Object URLs still work
--    without a broad SELECT policy; this only stops directory enumeration.
--    REVIEW: confirm your app uses direct object URLs (it should) before drop.
-- -----------------------------------------------------------------------------
-- DROP POLICY IF EXISTS "Public read access for avatars" ON storage.objects;
-- DROP POLICY IF EXISTS "Public read access for species-images" ON storage.objects;
-- Replace with object-scoped read if needed, e.g.:
-- CREATE POLICY "avatars read own" ON storage.objects FOR SELECT
--   USING (bucket_id = 'avatars' AND owner = auth.uid());
