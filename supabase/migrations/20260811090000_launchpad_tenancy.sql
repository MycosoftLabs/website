-- ============================================================================
-- FUSARIUM Launchpad — Migration 1: tenancy, memberships, terms, audit chain
-- ============================================================================
-- The multi-tenant foundation for the commercial, non-CUI Launchpad workspace.
--
-- Design rules (from the Launchpad master plan, enforced here structurally):
--   * Tenant identity NEVER comes from a request body; RLS derives membership
--     from auth.uid() via SECURITY DEFINER helpers.
--   * The canonical policy is exactly one pattern per tenant table:
--       for all to authenticated using/with check (launchpad_is_member(tenant_id))
--     Never USING (true) — the unified_capabilities mistake.
--   * Terms acceptances and audit events are INSERT-ONLY. Audit events are
--     hash-chained per tenant and nobody — including service_role — can
--     update or delete them.
--   * Tenant creation is an atomic SECURITY DEFINER RPC (tenant + owner
--     membership + genesis audit event), solving the no-membership-yet
--     bootstrap without weakening RLS.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table if not exists public.launchpad_tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique,
  status text not null default 'active'
    check (status in ('active', 'grace', 'read_export', 'suspended')),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.launchpad_tenants is
  'Launchpad customer organizations (commercial, non-CUI workspace). Status drives write gating: grace warns, read_export blocks mutations.';

create table if not exists public.launchpad_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'admin', 'member', 'readonly')),
  status text not null default 'active'
    check (status in ('active', 'invited', 'revoked')),
  invited_email text,
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);
comment on table public.launchpad_memberships is
  'Tenant membership + role. The single source RLS keys off. Tenant ID is derived from these rows via auth.uid(), never from request payloads.';

create table if not exists public.launchpad_authorized_officials (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  name text not null,
  title text,
  email text not null,
  attestation_scope text,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);
comment on table public.launchpad_authorized_officials is
  'Customer-designated officials for affirmations/exports. Mycosoft is never the affirming official.';

create table if not exists public.launchpad_terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.launchpad_tenants (id) on delete set null,
  user_id uuid not null references auth.users (id),
  doc_key text not null
    check (doc_key in ('terms', 'privacy', 'aup', 'non_cui_policy')),
  doc_version text not null,
  accepted_at timestamptz not null default now(),
  ip_hash text
);
comment on table public.launchpad_terms_acceptances is
  'Versioned acceptance ledger. INSERT-ONLY: acceptance history is never rewritten.';

create table if not exists public.launchpad_audit_events (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.launchpad_tenants (id) on delete restrict,
  seq bigint not null,
  actor_user_id uuid,
  actor_type text not null default 'user'
    check (actor_type in ('user', 'service', 'system')),
  action text not null,
  entity text,
  entity_id text,
  payload_hash text,
  prev_hash text not null,
  hash text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, seq)
);
comment on table public.launchpad_audit_events is
  'Per-tenant hash-chained append-only audit ledger. Chain fields (seq/prev_hash/hash) are computed by trigger — client-supplied values are overwritten. UPDATE/DELETE revoked from every role.';

-- ----------------------------------------------------------------------------
-- RLS helper functions (SECURITY DEFINER to avoid recursion on memberships)
-- ----------------------------------------------------------------------------

create or replace function public.launchpad_is_member(t uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.launchpad_memberships m
    where m.tenant_id = t
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function public.launchpad_has_role(t uuid, roles text[])
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.launchpad_memberships m
    where m.tenant_id = t
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = any (roles)
  );
$$;

revoke execute on function public.launchpad_is_member(uuid) from anon;
revoke execute on function public.launchpad_has_role(uuid, text[]) from anon;
grant execute on function public.launchpad_is_member(uuid) to authenticated;
grant execute on function public.launchpad_has_role(uuid, text[]) to authenticated;

-- ----------------------------------------------------------------------------
-- Audit hash chain trigger
-- ----------------------------------------------------------------------------

create or replace function public.launchpad_audit_chain()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  last_seq bigint;
  last_hash text;
begin
  -- Serialize chain computation per tenant for the transaction's duration.
  perform pg_advisory_xact_lock(hashtext('launchpad_audit:' || new.tenant_id::text));

  select seq, hash into last_seq, last_hash
  from public.launchpad_audit_events
  where tenant_id = new.tenant_id
  order by seq desc
  limit 1;

  new.seq := coalesce(last_seq, 0) + 1;
  new.prev_hash := coalesce(last_hash, 'GENESIS');
  new.created_at := now();
  -- pgcrypto installs into the `extensions` schema on Supabase; the function
  -- pins search_path = public (definer hygiene), so digest must be qualified.
  new.hash := encode(extensions.digest(
    new.prev_hash || '|' || new.tenant_id::text || '|' || new.seq::text || '|'
      || new.action || '|' || coalesce(new.entity, '') || '|'
      || coalesce(new.entity_id, '') || '|' || coalesce(new.payload_hash, '')
      || '|' || new.created_at::text,
    'sha256'), 'hex');
  return new;
end;
$$;

drop trigger if exists launchpad_audit_chain_tg on public.launchpad_audit_events;
create trigger launchpad_audit_chain_tg
  before insert on public.launchpad_audit_events
  for each row execute function public.launchpad_audit_chain();

-- ----------------------------------------------------------------------------
-- Tenant bootstrap RPC (atomic: tenant + owner membership + genesis event)
-- ----------------------------------------------------------------------------

create or replace function public.launchpad_create_tenant(p_name text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_tenant uuid;
  v_slug text;
begin
  if v_user is null then
    raise exception 'authentication required';
  end if;
  if p_name is null or char_length(btrim(p_name)) < 2 then
    raise exception 'tenant name must be at least 2 characters';
  end if;

  v_slug := lower(regexp_replace(btrim(p_name), '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := btrim(v_slug, '-') || '-' || substr(gen_random_uuid()::text, 1, 8);

  insert into public.launchpad_tenants (name, slug, created_by)
  values (btrim(p_name), v_slug, v_user)
  returning id into v_tenant;

  insert into public.launchpad_memberships (tenant_id, user_id, role, status)
  values (v_tenant, v_user, 'owner', 'active');

  insert into public.launchpad_audit_events
    (tenant_id, actor_user_id, actor_type, action, entity, entity_id)
  values
    (v_tenant, v_user, 'user', 'tenant.created', 'launchpad_tenants', v_tenant::text);

  return v_tenant;
end;
$$;

revoke execute on function public.launchpad_create_tenant(text) from anon;
grant execute on function public.launchpad_create_tenant(text) to authenticated;

-- ----------------------------------------------------------------------------
-- RLS policies
-- ----------------------------------------------------------------------------

alter table public.launchpad_tenants enable row level security;
alter table public.launchpad_memberships enable row level security;
alter table public.launchpad_authorized_officials enable row level security;
alter table public.launchpad_terms_acceptances enable row level security;
alter table public.launchpad_audit_events enable row level security;

-- Tenants: members read; owner/admin update (rename, never status — status is
-- service-managed by billing); no direct insert (RPC only); no delete (workflow).
create policy launchpad_tenants_select on public.launchpad_tenants
  for select to authenticated
  using (public.launchpad_is_member(id));
create policy launchpad_tenants_update on public.launchpad_tenants
  for update to authenticated
  using (public.launchpad_has_role(id, array['owner', 'admin']))
  with check (public.launchpad_has_role(id, array['owner', 'admin']));

-- Memberships: see your own row, or all rows if owner/admin; owner/admin manage.
create policy launchpad_memberships_select on public.launchpad_memberships
  for select to authenticated
  using (user_id = auth.uid() or public.launchpad_has_role(tenant_id, array['owner', 'admin']));
create policy launchpad_memberships_insert on public.launchpad_memberships
  for insert to authenticated
  with check (public.launchpad_has_role(tenant_id, array['owner', 'admin']));
create policy launchpad_memberships_update on public.launchpad_memberships
  for update to authenticated
  using (public.launchpad_has_role(tenant_id, array['owner', 'admin']))
  with check (public.launchpad_has_role(tenant_id, array['owner', 'admin']));
create policy launchpad_memberships_delete on public.launchpad_memberships
  for delete to authenticated
  using (public.launchpad_has_role(tenant_id, array['owner', 'admin']));

-- Authorized officials: canonical member pattern; writes for owner/admin.
create policy launchpad_officials_select on public.launchpad_authorized_officials
  for select to authenticated
  using (public.launchpad_is_member(tenant_id));
create policy launchpad_officials_write on public.launchpad_authorized_officials
  for insert to authenticated
  with check (public.launchpad_has_role(tenant_id, array['owner', 'admin']));
create policy launchpad_officials_update on public.launchpad_authorized_officials
  for update to authenticated
  using (public.launchpad_has_role(tenant_id, array['owner', 'admin']))
  with check (public.launchpad_has_role(tenant_id, array['owner', 'admin']));
create policy launchpad_officials_delete on public.launchpad_authorized_officials
  for delete to authenticated
  using (public.launchpad_has_role(tenant_id, array['owner', 'admin']));

-- Terms: user reads own acceptances (or tenant admins read tenant's); insert own.
create policy launchpad_terms_select on public.launchpad_terms_acceptances
  for select to authenticated
  using (
    user_id = auth.uid()
    or (tenant_id is not null and public.launchpad_has_role(tenant_id, array['owner', 'admin']))
  );
create policy launchpad_terms_insert on public.launchpad_terms_acceptances
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (tenant_id is null or public.launchpad_is_member(tenant_id))
  );
-- No update/delete policies: acceptance history is immutable for app roles.

-- Audit: members read + insert (trigger overwrites chain fields).
create policy launchpad_audit_select on public.launchpad_audit_events
  for select to authenticated
  using (public.launchpad_is_member(tenant_id));
create policy launchpad_audit_insert on public.launchpad_audit_events
  for insert to authenticated
  with check (public.launchpad_is_member(tenant_id));

-- History is immutable for EVERYONE, including service_role.
revoke update, delete on public.launchpad_audit_events from anon, authenticated, service_role;
revoke update, delete on public.launchpad_terms_acceptances from anon, authenticated;
