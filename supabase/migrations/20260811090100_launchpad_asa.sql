-- ============================================================================
-- FUSARIUM Launchpad — Migration 2: ASA workspace (self-assessment core)
-- ============================================================================
-- Rule packs, company/capability profiles, control states, score snapshots,
-- POA&M items, evidence index, documents, training, tasks.
--
-- Honesty rules enforced structurally:
--   * launchpad_control_states.state_source ∈ ('customer','agent_check') —
--     the enum has NO 'ai' value; AI can only ever populate ai_suggestion.
--   * launchpad_score_snapshots is INSERT-ONLY and pins rule_pack_version —
--     historical scores are never recomputed or rewritten.
--   * launchpad_evidence_index has NO content column and no storage bucket —
--     metadata + sha256 only; content stays in customer systems.
--   * Every tenant table carries the canonical launchpad_is_member policy.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Rule packs (global, read-only to authenticated; service-role writes only)
-- ----------------------------------------------------------------------------
create table if not exists public.launchpad_rule_packs (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  corpus_hash text not null,
  params jsonb not null,
  active boolean not null default false,
  published_at timestamptz not null default now()
);
comment on table public.launchpad_rule_packs is
  'Versioned regulatory rule packs. The 110-control corpus lives in the app bundle; a pack pins its version + hash so historical snapshots stay auditable.';

alter table public.launchpad_rule_packs enable row level security;
create policy launchpad_rule_packs_select on public.launchpad_rule_packs
  for select to authenticated using (true); -- global reference data, no tenant rows
revoke insert, update, delete on public.launchpad_rule_packs from anon, authenticated;

insert into public.launchpad_rule_packs (version, corpus_hash, params, active)
values (
  'cmmc-l2-v2.13-r1',
  'md5:abca7ab11c0cd1f5d1cd340760a634f0',
  '{"max_score":110,"conditional_ratio":0.8,"poam_max_items":22,"poam_window_days":180,"retention_years":6}'::jsonb,
  true
) on conflict (version) do nothing;

-- ----------------------------------------------------------------------------
-- Company / registration / capability profiles
-- ----------------------------------------------------------------------------
create table if not exists public.launchpad_company_profiles (
  tenant_id uuid primary key references public.launchpad_tenants (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_by uuid,
  updated_at timestamptz not null default now()
);
comment on table public.launchpad_company_profiles is
  'Tenant company baseline (legal name, entity, addresses, UEI/CAGE/SAM status, NAICS, capability summary). Non-CUI facts only; EIN and restricted identifiers are excluded by policy.';

create table if not exists public.launchpad_registration_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  kind text not null,          -- sam | uei | cage | dsip | grants_gov | portal | insurance | other
  label text not null,
  status text not null default 'unknown',
  renewal_at date,
  data jsonb not null default '{}'::jsonb,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

create table if not exists public.launchpad_capability_profiles (
  tenant_id uuid primary key references public.launchpad_tenants (id) on delete cascade,
  data jsonb not null default '{}'::jsonb, -- capabilities, target agencies, NAICS/PSC, exclusions
  updated_by uuid,
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Control states — the customer-owned register
-- ----------------------------------------------------------------------------
create table if not exists public.launchpad_control_states (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  control_id text not null,
  state text not null default 'not_implemented'
    check (state in ('implemented', 'partial', 'not_implemented', 'not_applicable')),
  state_source text not null default 'customer'
    check (state_source in ('customer', 'agent_check')),
  narrative text,
  ai_suggestion text,          -- advisory only; NEVER a state
  marked_by uuid,
  marked_at timestamptz not null default now(),
  unique (tenant_id, control_id)
);
comment on column public.launchpad_control_states.state_source is
  'customer | agent_check only. There is deliberately no ai value: no AI action may mark a requirement implemented (Launchpad master plan, non-negotiable #5).';

-- ----------------------------------------------------------------------------
-- Score snapshots — INSERT-ONLY history
-- ----------------------------------------------------------------------------
create table if not exists public.launchpad_score_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  rule_pack_version text not null,
  score int not null,
  max_score int not null,
  implemented_count int not null,
  not_met_count int not null,
  na_count int not null,
  unassessed_count int not null,
  eligibility text not null,
  indicators jsonb not null,   -- the four independent indicators, never blended
  gaps jsonb not null,
  inputs_hash text not null,   -- sha256 of the state map that produced this
  created_by uuid,
  created_at timestamptz not null default now()
);
comment on table public.launchpad_score_snapshots is
  'Weighted score estimates, computed on explicit customer request. INSERT-ONLY: history is never recomputed; rule_pack_version is frozen per row.';

-- ----------------------------------------------------------------------------
-- POA&M items
-- ----------------------------------------------------------------------------
create table if not exists public.launchpad_poam_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  control_id text not null,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'closed', 'withdrawn')),
  weakness text,
  milestones jsonb not null default '[]'::jsonb,
  opened_at timestamptz not null default now(),
  due_at timestamptz,          -- opened + 180d, set by the app from the rule pack
  closed_at timestamptz,
  six_year_reminder_at date,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  unique (tenant_id, control_id)
);

-- ----------------------------------------------------------------------------
-- Evidence index — metadata + hash ONLY
-- ----------------------------------------------------------------------------
create table if not exists public.launchpad_evidence_index (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  title text not null,
  control_ids text[] not null default '{}',
  evidence_type text not null default 'other'
    check (evidence_type in ('policy','configuration','log','screenshot','ticket','training','interview','test_result','other')),
  authoritative_system text,   -- where the content actually lives (customer-controlled)
  authoritative_ref text,      -- opaque customer reference/URI — never fetched by Launchpad
  sha256 text,                 -- customer-computed content hash (client-side hashing in UI)
  size_bytes bigint,
  captured_at timestamptz,
  valid_through timestamptz,
  review_status text not null default 'unreviewed'
    check (review_status in ('unreviewed','reviewed','conflicted','stale')),
  cui_indicator text not null default 'no'
    check (cui_indicator in ('no','unknown')),  -- 'yes' is impossible by design: CUI is blocked, not labeled
  notes text,
  recorded_by uuid,
  created_at timestamptz not null default now()
);
comment on table public.launchpad_evidence_index is
  'METADATA + HASH ONLY — there is no content column and no storage bucket. Evidence content stays in the customer-controlled authoritative system. Non-CUI workspace.';

-- ----------------------------------------------------------------------------
-- Generated documents + templates
-- ----------------------------------------------------------------------------
create table if not exists public.launchpad_document_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  version text not null,
  body jsonb not null,
  active boolean not null default true
);
alter table public.launchpad_document_templates enable row level security;
create policy launchpad_doc_templates_select on public.launchpad_document_templates
  for select to authenticated using (true); -- global reference data
revoke insert, update, delete on public.launchpad_document_templates from anon, authenticated;

create table if not exists public.launchpad_generated_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  kind text not null check (kind in ('policy','ssp','poam','scope_memo','other')),
  title text not null,
  status text not null default 'draft'
    check (status in ('draft','customer_review','approved','superseded')),
  rule_pack_version text,
  template_version text,
  payload jsonb not null default '{}'::jsonb,
  rendered_html text,
  content_hash text,
  version int not null default 1,
  created_by uuid,
  created_at timestamptz not null default now(),
  approved_by uuid,
  approved_at timestamptz
);
comment on column public.launchpad_generated_documents.status is
  'Always starts draft. approved requires a human customer action; the document factory cannot set it.';

-- ----------------------------------------------------------------------------
-- Training + tasks
-- ----------------------------------------------------------------------------
create table if not exists public.launchpad_training_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  person_name text not null,
  person_email text,
  course text not null,
  assigned_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at date,
  certificate_ref text,        -- reference only; certificate content stays customer-side
  updated_by uuid
);

create table if not exists public.launchpad_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  title text not null,
  detail text,
  kind text not null default 'general',
  control_id text,
  status text not null default 'open' check (status in ('open','in_progress','done','dropped')),
  due_at date,
  assignee uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- RLS — canonical member pattern on every tenant table
-- ----------------------------------------------------------------------------
alter table public.launchpad_company_profiles enable row level security;
alter table public.launchpad_registration_records enable row level security;
alter table public.launchpad_capability_profiles enable row level security;
alter table public.launchpad_control_states enable row level security;
alter table public.launchpad_score_snapshots enable row level security;
alter table public.launchpad_poam_items enable row level security;
alter table public.launchpad_evidence_index enable row level security;
alter table public.launchpad_generated_documents enable row level security;
alter table public.launchpad_training_assignments enable row level security;
alter table public.launchpad_tasks enable row level security;

create policy launchpad_company_profiles_member on public.launchpad_company_profiles
  for all to authenticated
  using (public.launchpad_is_member(tenant_id)) with check (public.launchpad_is_member(tenant_id));
create policy launchpad_registration_records_member on public.launchpad_registration_records
  for all to authenticated
  using (public.launchpad_is_member(tenant_id)) with check (public.launchpad_is_member(tenant_id));
create policy launchpad_capability_profiles_member on public.launchpad_capability_profiles
  for all to authenticated
  using (public.launchpad_is_member(tenant_id)) with check (public.launchpad_is_member(tenant_id));
create policy launchpad_control_states_member on public.launchpad_control_states
  for all to authenticated
  using (public.launchpad_is_member(tenant_id)) with check (public.launchpad_is_member(tenant_id));
create policy launchpad_poam_items_member on public.launchpad_poam_items
  for all to authenticated
  using (public.launchpad_is_member(tenant_id)) with check (public.launchpad_is_member(tenant_id));
create policy launchpad_evidence_index_member on public.launchpad_evidence_index
  for all to authenticated
  using (public.launchpad_is_member(tenant_id)) with check (public.launchpad_is_member(tenant_id));
create policy launchpad_generated_documents_member on public.launchpad_generated_documents
  for all to authenticated
  using (public.launchpad_is_member(tenant_id)) with check (public.launchpad_is_member(tenant_id));
create policy launchpad_training_assignments_member on public.launchpad_training_assignments
  for all to authenticated
  using (public.launchpad_is_member(tenant_id)) with check (public.launchpad_is_member(tenant_id));
create policy launchpad_tasks_member on public.launchpad_tasks
  for all to authenticated
  using (public.launchpad_is_member(tenant_id)) with check (public.launchpad_is_member(tenant_id));

-- Score snapshots: members read + insert; history immutable for everyone.
create policy launchpad_score_snapshots_select on public.launchpad_score_snapshots
  for select to authenticated using (public.launchpad_is_member(tenant_id));
create policy launchpad_score_snapshots_insert on public.launchpad_score_snapshots
  for insert to authenticated with check (public.launchpad_is_member(tenant_id));
revoke update, delete on public.launchpad_score_snapshots from anon, authenticated, service_role;
