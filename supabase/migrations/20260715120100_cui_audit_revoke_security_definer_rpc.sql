-- CUI Audit JUL15 2026 — Finding MYCO-AUDIT-2026-0002
-- Revoke EXECUTE on dangerous SECURITY DEFINER RPCs from anon/authenticated
-- APPLY AFTER Morgan Rockcoons approval — verify triggers/staff UI still work
-- service_role and postgres retain EXECUTE.

BEGIN;

-- Trigger helpers: must not be callable via /rest/v1/rpc
REVOKE EXECUTE ON FUNCTION public.handle_super_admin_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_super_admin_role() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_super_admin_role() TO postgres, service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;

-- Authorization helper: block direct RPC; table-owner policies may still need GRANT to postgres
REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_staff() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO postgres, service_role;

-- Usage meter: keep authenticated callable only if app needs it; revoke anon
REVOKE EXECUTE ON FUNCTION public.get_user_monthly_usage(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_monthly_usage(uuid, text) FROM anon;
-- authenticated retained for in-app usage UI (function must enforce auth.uid() = p_user_id internally)
GRANT EXECUTE ON FUNCTION public.get_user_monthly_usage(uuid, text) TO authenticated, service_role, postgres;

-- Chain / integrity writer: service_role only
REVOKE EXECUTE ON FUNCTION public.create_chain_entry(character varying, character varying, character varying, jsonb, character varying, character varying, character varying, character varying) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_chain_entry(character varying, character varying, character varying, jsonb, character varying, character varying, character varying, character varying) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_chain_entry(character varying, character varying, character varying, jsonb, character varying, character varying, character varying, character varying) TO postgres, service_role;

COMMIT;
