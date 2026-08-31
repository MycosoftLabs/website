-- ============================================================================
-- FUSARIUM Launchpad — prepaid hosted envelopes, tenant-to-tenant mesh
-- invites, shared radar enrichment cache. Commercial / non-CUI only.
-- Date: 2026-08-31
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Hosted envelope sends (marked-up SKU; platform JWT never free)
-- ---------------------------------------------------------------------------
create table if not exists public.launchpad_envelope_credits (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  sku text not null,
  status text not null default 'unredeemed'
    check (status in ('unredeemed', 'redeemed', 'expired', 'refunded')),
  stripe_event_id text,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.launchpad_envelope_credits is
  'Minted on Stripe checkout for fus_launchpad_envelope_send. Consumed before Mycosoft-hosted (platform JWT) send. Customer OAuth send does not consume.';

alter table public.launchpad_envelope_credits enable row level security;
create policy launchpad_envelope_credits_select on public.launchpad_envelope_credits
  for select to authenticated using (public.launchpad_is_member(tenant_id));
revoke insert, update, delete on public.launchpad_envelope_credits from anon, authenticated;

create unique index if not exists launchpad_envelope_credits_stripe_idx
  on public.launchpad_envelope_credits (stripe_event_id)
  where stripe_event_id is not null;
create index if not exists launchpad_envelope_credits_tenant_idx
  on public.launchpad_envelope_credits (tenant_id, status);

-- ---------------------------------------------------------------------------
-- Tenant-to-tenant Partner Mesh invites
-- ---------------------------------------------------------------------------
create table if not exists public.launchpad_partner_invites (
  id uuid primary key default gen_random_uuid(),
  from_tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  to_tenant_id uuid references public.launchpad_tenants (id) on delete set null,
  to_email text,
  scopes text[] not null default '{}',
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'revoked', 'expired')),
  created_by uuid,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (to_tenant_id is not null or to_email is not null)
);

comment on table public.launchpad_partner_invites is
  'Pro initiates; any paid tenant may accept. Readiness, evidence, and billing are never shared by this row.';

alter table public.launchpad_partner_invites enable row level security;
create policy launchpad_partner_invites_select on public.launchpad_partner_invites
  for select to authenticated
  using (
    public.launchpad_is_member(from_tenant_id)
    or (to_tenant_id is not null and public.launchpad_is_member(to_tenant_id))
  );
revoke insert, update, delete on public.launchpad_partner_invites from anon, authenticated;

create index if not exists launchpad_partner_invites_from_idx
  on public.launchpad_partner_invites (from_tenant_id, status);
create index if not exists launchpad_partner_invites_to_idx
  on public.launchpad_partner_invites (to_tenant_id, status);
create index if not exists launchpad_partner_invites_email_idx
  on public.launchpad_partner_invites (lower(to_email))
  where to_email is not null;

create or replace function public.launchpad_tenant_ids_for_email(p_email text)
returns table (tenant_id uuid)
language sql
security definer
set search_path = public
as $$
  select distinct m.tenant_id
  from public.launchpad_memberships m
  join auth.users u on u.id = m.user_id
  where m.status = 'active'
    and u.email is not null
    and lower(u.email) = lower(p_email)
  union
  select distinct m2.tenant_id
  from public.launchpad_memberships m2
  where m2.status in ('active', 'invited')
    and m2.invited_email is not null
    and lower(m2.invited_email) = lower(p_email);
$$;

comment on function public.launchpad_tenant_ids_for_email(text) is
  'Service-role discovery of Launchpad tenants by workspace email. Never expose to anon/authenticated.';

revoke all on function public.launchpad_tenant_ids_for_email(text) from public, anon, authenticated;
grant execute on function public.launchpad_tenant_ids_for_email(text) to service_role;

-- ---------------------------------------------------------------------------
-- Cross-tenant radar enrichment cache (pay once per solicitation)
-- ---------------------------------------------------------------------------
create table if not exists public.launchpad_radar_enrichment_cache (
  cache_key text primary key,
  opportunity_id text,
  summary text not null,
  updated_at timestamptz not null default now()
);

comment on table public.launchpad_radar_enrichment_cache is
  'Shared commercial summaries of public notices. No CUI. Written by service role after metered routeCompletion.';

alter table public.launchpad_radar_enrichment_cache enable row level security;
revoke all on public.launchpad_radar_enrichment_cache from anon, authenticated;
