-- ============================================================================
-- FUSARIUM Launchpad — Migration 5: Local Assurance Agent, Partner Mesh,
-- Origin Graph shells, Resource Graph, integrations
-- ============================================================================

create table if not exists public.launchpad_local_agents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  name text not null,
  platform text check (platform in ('windows','linux','macos')),
  enrollment_token_hash text not null,  -- hash only; the token is shown once at enrollment
  hmac_key_hash text,
  status text not null default 'enrolled'
    check (status in ('enrolled','active','revoked','expired')),
  last_seen_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);
comment on table public.launchpad_local_agents is
  'Customer-installed read-only agents. No credential columns; token/key hashes only. Enrollment, revocation, and kill switch are customer-controlled.';

create table if not exists public.launchpad_local_check_results (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  agent_id uuid not null references public.launchpad_local_agents (id) on delete cascade,
  check_id text not null,
  check_version text,
  result text not null check (result in ('pass','fail','indeterminate','not_applicable')),
  summary text,                          -- one sanitized sentence, never raw output
  detail_hash text,                      -- hash of local detail; detail itself stays on the device
  mapped_controls text[] not null default '{}',
  observed_at timestamptz not null,
  received_at timestamptz not null default now()
);
comment on table public.launchpad_local_check_results is
  'Sanitized structured results ONLY: result + summary sentence + detail hash. Raw logs, configuration bodies, and packet captures never leave the customer device (schema has nowhere to put them).';

create table if not exists public.launchpad_partner_profiles (
  tenant_id uuid primary key references public.launchpad_tenants (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,  -- capability ontology, APIs, TRL (customer-provided)
  updated_by uuid,
  updated_at timestamptz not null default now()
);

create table if not exists public.launchpad_partner_consents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  scope text not null,                   -- what is shared
  purpose text not null,
  granted_by uuid not null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);
comment on table public.launchpad_partner_consents is
  'Partner Mesh opt-in ledger: affirmative, scoped, revocable. No consent row = no data flows toward the FUSARIUM ecosystem, period.';

create table if not exists public.launchpad_bom_parts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  assembly text,
  part_number text,
  description text,
  quantity numeric,
  unit_cost numeric,
  manufacturer text,
  supplier text,
  country_of_origin text,
  origin_confidence numeric,
  prototype_only boolean not null default false,
  flags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.launchpad_resource_cards (
  id uuid primary key default gen_random_uuid(),
  vendor text not null,
  offering text not null,
  category text not null,
  card jsonb not null,                   -- full ResourceCard schema incl. relationship_type + compensation_disclosure
  active boolean not null default true,
  last_verified_at date
);
comment on table public.launchpad_resource_cards is
  'Global vendor/resource cards. Every card must disclose the Mycosoft relationship and compensation (FTC material-connection). Service-role writes only.';

alter table public.launchpad_local_agents enable row level security;
alter table public.launchpad_local_check_results enable row level security;
alter table public.launchpad_partner_profiles enable row level security;
alter table public.launchpad_partner_consents enable row level security;
alter table public.launchpad_bom_parts enable row level security;
alter table public.launchpad_resource_cards enable row level security;

create policy launchpad_local_agents_member on public.launchpad_local_agents
  for all to authenticated
  using (public.launchpad_is_member(tenant_id)) with check (public.launchpad_is_member(tenant_id));
-- Results: members read; INSERT is service-role only (the agent intake route
-- authenticates by HMAC and derives tenant from the agent row).
create policy launchpad_local_results_select on public.launchpad_local_check_results
  for select to authenticated using (public.launchpad_is_member(tenant_id));
create policy launchpad_partner_profiles_member on public.launchpad_partner_profiles
  for all to authenticated
  using (public.launchpad_is_member(tenant_id)) with check (public.launchpad_is_member(tenant_id));
create policy launchpad_partner_consents_select on public.launchpad_partner_consents
  for select to authenticated using (public.launchpad_is_member(tenant_id));
create policy launchpad_partner_consents_insert on public.launchpad_partner_consents
  for insert to authenticated
  with check (public.launchpad_has_role(tenant_id, array['owner','admin']) and granted_by = auth.uid());
create policy launchpad_partner_consents_revoke on public.launchpad_partner_consents
  for update to authenticated
  using (public.launchpad_has_role(tenant_id, array['owner','admin']))
  with check (public.launchpad_has_role(tenant_id, array['owner','admin']));
create policy launchpad_bom_parts_member on public.launchpad_bom_parts
  for all to authenticated
  using (public.launchpad_is_member(tenant_id)) with check (public.launchpad_is_member(tenant_id));
create policy launchpad_resource_cards_select on public.launchpad_resource_cards
  for select to authenticated using (active = true);
revoke insert, update, delete on public.launchpad_resource_cards from anon, authenticated;
