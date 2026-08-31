-- ============================================================================
-- FUSARIUM Launchpad — Tenant API keys + agent credentials
-- ============================================================================
-- Multi-tenant product keys live in Supabase (hashed). Platform secrets
-- (Stripe, Supabase service role, SAM.gov) stay in env — see
-- docs/launchpad/TENANT_API_KEYS_AND_SECRETS_AUG12_2026.md.
--
-- Members may list key *metadata* (prefix, name, scopes) but never key_hash.
-- Create/revoke only via SECURITY DEFINER RPCs (owner/admin).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table if not exists public.launchpad_api_keys (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  key_prefix text not null check (char_length(key_prefix) between 8 and 24),
  key_hash text not null,
  scopes text[] not null default '{}'::text[]
    check (
      scopes <@ array['ingest', 'agent', 'read', 'admin']::text[]
      and cardinality(scopes) >= 1
    ),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_used_at timestamptz,
  constraint launchpad_api_keys_hash_unique unique (key_hash)
);

create index if not exists launchpad_api_keys_tenant_idx
  on public.launchpad_api_keys (tenant_id)
  where revoked_at is null;

comment on table public.launchpad_api_keys is
  'Per-tenant API keys (Bearer lp_…). Plaintext shown once at create; only SHA-256 hash stored. Scopes: ingest|agent|read|admin.';

create table if not exists public.launchpad_agent_credentials (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  agent_id uuid not null references public.launchpad_local_agents (id) on delete cascade,
  enroll_secret_hash text not null,
  status text not null default 'active'
    check (status in ('active', 'revoked', 'expired')),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (agent_id)
);

create index if not exists launchpad_agent_credentials_tenant_idx
  on public.launchpad_agent_credentials (tenant_id)
  where status = 'active';

comment on table public.launchpad_agent_credentials is
  'Per-agent enroll secret hashes. Plaintext enroll secret shown once; HMAC body signing still uses platform root derivation when configured, else Bearer lp_ keys with agent scope.';

-- Metadata only — never store Stripe/live secrets here.
create table if not exists public.launchpad_platform_secrets_meta (
  key_name text primary key,
  description text not null,
  source text not null default 'env'
    check (source in ('env', 'stripe_dashboard', 'supabase_dashboard', 'generated')),
  configured boolean not null default false,
  notes text,
  updated_at timestamptz not null default now()
);

comment on table public.launchpad_platform_secrets_meta is
  'Inventory of platform secret *names* and whether they appear configured. Never stores secret values. Prefer env/KMS for Stripe and service_role.';

insert into public.launchpad_platform_secrets_meta (key_name, description, source, notes)
values
  ('NEXT_PUBLIC_SUPABASE_URL', 'Supabase project URL', 'supabase_dashboard', 'Public'),
  ('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'Supabase anon key', 'supabase_dashboard', 'Public client'),
  ('SUPABASE_SERVICE_ROLE_KEY', 'Supabase service role', 'supabase_dashboard', 'Server only — never client'),
  ('STRIPE_SECRET_KEY', 'Stripe API secret', 'env', 'Test then live after Morgan go'),
  ('STRIPE_LAUNCHPAD_WEBHOOK_SECRET', 'Launchpad webhook signing secret', 'stripe_dashboard', 'Created when webhook endpoint is registered'),
  ('SAM_API_KEY', 'SAM.gov / api.data.gov', 'env', 'Platform collector; optional tenant override later'),
  ('LAUNCHPAD_INGEST_TOKEN', 'Break-glass ingest bearer (deprecated)', 'generated', 'Prefer launchpad_api_keys scope=ingest'),
  ('LAUNCHPAD_AGENT_ROOT_SECRET', 'Break-glass agent HMAC root (deprecated)', 'generated', 'Prefer per-tenant lp_ keys with agent scope')
on conflict (key_name) do nothing;

-- ----------------------------------------------------------------------------
-- RLS — column grants hide key_hash from authenticated
-- ----------------------------------------------------------------------------

alter table public.launchpad_api_keys enable row level security;
alter table public.launchpad_agent_credentials enable row level security;
alter table public.launchpad_platform_secrets_meta enable row level security;

revoke all on public.launchpad_api_keys from anon, authenticated;
grant select (
  id, tenant_id, name, key_prefix, scopes, created_by, created_at, revoked_at, last_used_at
) on public.launchpad_api_keys to authenticated;

create policy launchpad_api_keys_select on public.launchpad_api_keys
  for select to authenticated
  using (public.launchpad_is_member(tenant_id));

-- No insert/update/delete policies for authenticated — RPCs only.
-- service_role bypasses RLS for hash lookup + last_used_at updates.

revoke all on public.launchpad_agent_credentials from anon, authenticated;
grant select (
  id, tenant_id, agent_id, status, created_at, revoked_at
) on public.launchpad_agent_credentials to authenticated;

create policy launchpad_agent_credentials_select on public.launchpad_agent_credentials
  for select to authenticated
  using (public.launchpad_is_member(tenant_id));

revoke all on public.launchpad_platform_secrets_meta from anon, authenticated;
-- Platform meta is operator-facing; authenticated Launchpad users do not need it.
-- service_role / SQL editor only.

-- ----------------------------------------------------------------------------
-- RPC: create API key (returns plaintext once)
-- ----------------------------------------------------------------------------

create or replace function public.launchpad_create_api_key(
  p_tenant_id uuid,
  p_name text,
  p_scopes text[]
)
returns table (
  id uuid,
  key_prefix text,
  scopes text[],
  plaintext_key text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_scopes text[];
  v_raw bytea;
  v_plain text;
  v_prefix text;
  v_hash text;
  v_id uuid;
  v_created timestamptz;
begin
  if v_user is null then
    raise exception 'authentication required';
  end if;
  if not public.launchpad_has_role(p_tenant_id, array['owner', 'admin']) then
    raise exception 'insufficient_role';
  end if;
  if p_name is null or char_length(btrim(p_name)) < 1 then
    raise exception 'name required';
  end if;

  v_scopes := coalesce(p_scopes, array['read']::text[]);
  if cardinality(v_scopes) < 1 then
    raise exception 'scopes required';
  end if;
  if not (v_scopes <@ array['ingest', 'agent', 'read', 'admin']::text[]) then
    raise exception 'invalid scope';
  end if;

  v_raw := gen_random_bytes(32);
  v_plain := 'lp_' || translate(encode(v_raw, 'base64'), '+/=', '-_');
  -- trim padding artifacts from translate
  v_plain := rtrim(v_plain, '-_');
  if char_length(v_plain) < 40 then
    v_plain := 'lp_' || encode(v_raw, 'hex');
  end if;
  v_prefix := substr(v_plain, 1, 12);
  v_hash := encode(extensions.digest(v_plain, 'sha256'), 'hex');

  insert into public.launchpad_api_keys (
    tenant_id, name, key_prefix, key_hash, scopes, created_by
  ) values (
    p_tenant_id, btrim(p_name), v_prefix, v_hash, v_scopes, v_user
  )
  returning launchpad_api_keys.id, launchpad_api_keys.created_at
  into v_id, v_created;

  insert into public.launchpad_audit_events
    (tenant_id, actor_user_id, actor_type, action, entity, entity_id, payload_hash)
  values (
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
  return next;
end;
$$;

revoke execute on function public.launchpad_create_api_key(uuid, text, text[]) from anon;
grant execute on function public.launchpad_create_api_key(uuid, text, text[]) to authenticated;

-- ----------------------------------------------------------------------------
-- RPC: revoke API key
-- ----------------------------------------------------------------------------

create or replace function public.launchpad_revoke_api_key(p_key_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_tenant uuid;
  v_prefix text;
begin
  if v_user is null then
    raise exception 'authentication required';
  end if;

  select tenant_id, key_prefix into v_tenant, v_prefix
  from public.launchpad_api_keys
  where id = p_key_id;

  if v_tenant is null then
    raise exception 'key not found';
  end if;
  if not public.launchpad_has_role(v_tenant, array['owner', 'admin']) then
    raise exception 'insufficient_role';
  end if;

  update public.launchpad_api_keys
  set revoked_at = coalesce(revoked_at, now())
  where id = p_key_id
    and revoked_at is null;

  insert into public.launchpad_audit_events
    (tenant_id, actor_user_id, actor_type, action, entity, entity_id, payload_hash)
  values (
    v_tenant,
    v_user,
    'user',
    'api_key.revoked',
    'launchpad_api_keys',
    p_key_id::text,
    encode(extensions.digest(
      jsonb_build_object('prefix', v_prefix)::text,
      'sha256'
    ), 'hex')
  );

  return true;
end;
$$;

revoke execute on function public.launchpad_revoke_api_key(uuid) from anon;
grant execute on function public.launchpad_revoke_api_key(uuid) to authenticated;
