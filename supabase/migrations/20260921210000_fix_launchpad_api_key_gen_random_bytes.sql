-- ============================================================================
-- Fix launchpad_create_api_key: gen_random_bytes lives in extensions (pgcrypto).
-- Applied live to Mycosoft.com Production (hnevnsxnhfibhbsipqvz) on 2026-09-21.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.launchpad_create_api_key(
  p_tenant_id uuid,
  p_name text,
  p_scopes text[]
)
RETURNS TABLE (
  id uuid,
  key_prefix text,
  scopes text[],
  plaintext_key text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_scopes text[];
  v_raw bytea;
  v_plain text;
  v_prefix text;
  v_hash text;
  v_id uuid;
  v_created timestamptz;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;
  IF NOT public.launchpad_has_role(p_tenant_id, array['owner', 'admin']) THEN
    RAISE EXCEPTION 'insufficient_role';
  END IF;
  IF p_name IS NULL OR char_length(btrim(p_name)) < 1 THEN
    RAISE EXCEPTION 'name required';
  END IF;

  v_scopes := coalesce(p_scopes, array['read']::text[]);
  IF cardinality(v_scopes) < 1 THEN
    RAISE EXCEPTION 'scopes required';
  END IF;
  IF NOT (v_scopes <@ array['ingest', 'agent', 'read', 'admin']::text[]) THEN
    RAISE EXCEPTION 'invalid scope';
  END IF;

  v_raw := extensions.gen_random_bytes(32);
  v_plain := 'lp_' || translate(encode(v_raw, 'base64'), '+/=', '-_');
  v_plain := rtrim(v_plain, '-_');
  IF char_length(v_plain) < 40 THEN
    v_plain := 'lp_' || encode(v_raw, 'hex');
  END IF;
  v_prefix := substr(v_plain, 1, 12);
  v_hash := encode(extensions.digest(v_plain, 'sha256'), 'hex');

  INSERT INTO public.launchpad_api_keys (
    tenant_id, name, key_prefix, key_hash, scopes, created_by
  ) VALUES (
    p_tenant_id, btrim(p_name), v_prefix, v_hash, v_scopes, v_user
  )
  RETURNING launchpad_api_keys.id, launchpad_api_keys.created_at
  INTO v_id, v_created;

  INSERT INTO public.launchpad_audit_events
    (tenant_id, actor_user_id, actor_type, action, entity, entity_id, payload_hash)
  VALUES (
    p_tenant_id,
    v_user,
    'user',
    'api_key.created',
    'launchpad_api_keys',
    v_id::text,
    encode(extensions.digest(
      jsonb_build_object('name', btrim(p_name), 'scopes', v_scopes, 'prefix', v_prefix)::text,
      'sha256'
    ), 'hex')
  );

  id := v_id;
  key_prefix := v_prefix;
  scopes := v_scopes;
  plaintext_key := v_plain;
  created_at := v_created;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.launchpad_create_api_key(uuid, text, text[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.launchpad_create_api_key(uuid, text, text[]) TO authenticated;
