-- ============================================================================
-- FUSARIUM Launchpad — Migration 4: Contract Radar + proposals
-- ============================================================================
-- Opportunities are GLOBAL (public federal data, ingested once, deduplicated by
-- unique(source, source_id)); matches/watches/proposals are tenant-scoped.
-- Collector writes are service-role only via /radar/ingest (Cursor's lane).
-- ============================================================================

create table if not exists public.launchpad_opportunities (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('sam','dsip','grants_gov','diu','darpa','nspires','nsf','other')),
  source_id text not null,
  title text not null,
  agency text,
  subagency text,
  instrument text,
  notice_type text,
  posted_at timestamptz,
  updated_at timestamptz,
  questions_due_at timestamptz,
  due_at timestamptz,
  timezone text,
  set_asides text[] not null default '{}',
  naics text[] not null default '{}',
  psc text[] not null default '{}',
  official_url text not null,
  source_hash text not null,
  normalized jsonb not null default '{}'::jsonb,
  ingested_at timestamptz not null default now(),
  unique (source, source_id)
);
comment on table public.launchpad_opportunities is
  'Normalized opportunity records from OFFICIAL sources, ingested centrally once and deduplicated — never per-tenant scans. Service-role writes only (collector via /radar/ingest).';

alter table public.launchpad_opportunities enable row level security;
create policy launchpad_opportunities_select on public.launchpad_opportunities
  for select to authenticated using (true); -- public federal data; plan gating happens in the BFF
revoke insert, update, delete on public.launchpad_opportunities from anon, authenticated;

create table if not exists public.launchpad_opportunity_amendments (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.launchpad_opportunities (id) on delete cascade,
  amendment_no int not null,
  diff jsonb not null,
  detected_at timestamptz not null default now(),
  unique (opportunity_id, amendment_no)
);
alter table public.launchpad_opportunity_amendments enable row level security;
create policy launchpad_amendments_select on public.launchpad_opportunity_amendments
  for select to authenticated using (true);
revoke insert, update, delete on public.launchpad_opportunity_amendments from anon, authenticated;

create table if not exists public.launchpad_opportunity_matches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  opportunity_id uuid not null references public.launchpad_opportunities (id) on delete cascade,
  fit_score numeric,
  fit_factors jsonb not null default '{}'::jsonb,
  disqualifiers jsonb not null default '[]'::jsonb,
  status text not null default 'matched'
    check (status in ('matched','review','qualified','watch','bid','submitted','no_bid','won','lost','cancelled')),
  no_bid_reason text,
  enriched jsonb,
  enrichment_credits_spent int not null default 0,
  updated_at timestamptz not null default now(),
  unique (tenant_id, opportunity_id)
);

create table if not exists public.launchpad_opportunity_watches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  opportunity_id uuid not null references public.launchpad_opportunities (id) on delete cascade,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (tenant_id, opportunity_id)
);

create table if not exists public.launchpad_proposal_workspaces (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  opportunity_id uuid references public.launchpad_opportunities (id) on delete set null,
  title text not null,
  status text not null default 'draft'
    check (status in ('draft','in_review','authorized','submitted_by_customer','closed')),
  compliance_matrix jsonb not null default '[]'::jsonb,
  sections jsonb not null default '[]'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.launchpad_proposal_workspaces.status is
  'submitted_by_customer is a customer-recorded fact. Launchpad never performs binding submission.';

alter table public.launchpad_opportunity_matches enable row level security;
alter table public.launchpad_opportunity_watches enable row level security;
alter table public.launchpad_proposal_workspaces enable row level security;

create policy launchpad_matches_member on public.launchpad_opportunity_matches
  for all to authenticated
  using (public.launchpad_is_member(tenant_id)) with check (public.launchpad_is_member(tenant_id));
create policy launchpad_watches_member on public.launchpad_opportunity_watches
  for all to authenticated
  using (public.launchpad_is_member(tenant_id)) with check (public.launchpad_is_member(tenant_id));
create policy launchpad_proposals_member on public.launchpad_proposal_workspaces
  for all to authenticated
  using (public.launchpad_is_member(tenant_id)) with check (public.launchpad_is_member(tenant_id));
