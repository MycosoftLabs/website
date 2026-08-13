-- FUSARIUM Launchpad — AI provider connections (KMS envelope custody) + Tier-1 operator records.
--
-- DECISION (Morgan, 2026-08-13): BYO AI provider keys are stored under KMS
-- envelope encryption — per-tenant DEK wrapped by a KMS master key, ciphertext
-- in Postgres, decrypt in-request only. This is the ONE recoverable credential
-- class in Launchpad (you cannot call a model provider with a hash), so it gets
-- its own table with column-level privileges: the authenticated role can NEVER
-- read or write key material, even though RLS lets members see their own
-- connection rows. Encrypt/decrypt happens service-side only (Cursor's KMS
-- service). Until that service is deployed, the BFF refuses BYO writes.
--
-- Requires data_classification_policy v1.1 (credentials carve-out for
-- customer-connected AI provider keys) before BYO goes live to real tenants.

-- ---------------------------------------------------------------------------
-- launchpad_ai_connections
-- ---------------------------------------------------------------------------
create table if not exists public.launchpad_ai_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  provider text not null
    check (provider in ('anthropic', 'openai', 'perplexity', 'xai', 'cursor')),
  mode text not null check (mode in ('managed', 'byo')),
  status text not null default 'active'
    check (status in ('active', 'revoked', 'error', 'pending_verification')),
  label text,
  -- KMS envelope (BYO only; ALWAYS null for managed rows). No plaintext column exists.
  key_ciphertext bytea,
  key_dek_wrapped bytea,
  key_kms_key_id text,
  key_last4 text,          -- display hint only, e.g. "…k3Qa"
  scopes text[] not null default '{}',
  last_verified_at timestamptz,
  last_error text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  -- one live connection per provider+mode per tenant
  unique (tenant_id, provider, mode)
);

comment on table public.launchpad_ai_connections is
  'Tenant AI provider connections. managed = Mycosoft keys billed in credits; byo = customer key under KMS envelope encryption (ciphertext + wrapped DEK; decrypt service-side, in-request only). Key columns are unreadable/unwritable by the authenticated role via column grants.';

alter table public.launchpad_ai_connections enable row level security;

create policy launchpad_ai_connections_select on public.launchpad_ai_connections
  for select to authenticated using (public.launchpad_is_member(tenant_id));
create policy launchpad_ai_connections_insert on public.launchpad_ai_connections
  for insert to authenticated
  with check (public.launchpad_has_role(tenant_id, array['owner', 'admin']));
create policy launchpad_ai_connections_update on public.launchpad_ai_connections
  for update to authenticated
  using (public.launchpad_has_role(tenant_id, array['owner', 'admin']))
  with check (public.launchpad_has_role(tenant_id, array['owner', 'admin']));
revoke delete on public.launchpad_ai_connections from anon, authenticated;

-- Column-level custody boundary: strip table-wide grants, re-grant everything
-- EXCEPT key material. The authenticated role cannot select, insert, or update
-- key_ciphertext / key_dek_wrapped even on its own rows; only service_role
-- (the KMS-holding BFF path) touches those columns.
revoke select, insert, update on public.launchpad_ai_connections from anon, authenticated;
grant select (id, tenant_id, provider, mode, status, label, key_kms_key_id, key_last4,
              scopes, last_verified_at, last_error, created_by, created_at, revoked_at)
  on public.launchpad_ai_connections to authenticated;
grant insert (tenant_id, provider, mode, status, label, scopes)
  on public.launchpad_ai_connections to authenticated;
grant update (status, label, scopes, revoked_at)
  on public.launchpad_ai_connections to authenticated;

create index if not exists launchpad_ai_connections_tenant_idx
  on public.launchpad_ai_connections (tenant_id) where status = 'active';

-- ---------------------------------------------------------------------------
-- launchpad_ai_cost_ledger — per-action AI cost record (spec §11.4).
-- Insert-only; service-role writes (the model-calling BFF path); members read.
-- ---------------------------------------------------------------------------
create table if not exists public.launchpad_ai_cost_ledger (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  user_id uuid,
  task text not null,                    -- e.g. 'policy_draft', 'opportunity_enrichment'
  provider text not null,
  model text not null,
  provider_price_version text,
  byo_key boolean not null default false,
  input_units int not null default 0,
  output_units int not null default 0,
  search_requests int not null default 0,
  retrieval_requests int not null default 0,
  reasoning_units int not null default 0,
  cache_read int not null default 0,
  cache_write int not null default 0,
  reserved_cost_cents int not null default 0,
  actual_cost_cents int not null default 0,
  credits_charged int not null default 0, -- 0 for every byo_key action
  ref jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.launchpad_ai_cost_ledger is
  'Per-AI-action cost record (GTM plan §11.4). Insert-only, service-role writes. byo_key=true rows always have credits_charged=0 — customer keys are never metered in credits.';

alter table public.launchpad_ai_cost_ledger enable row level security;
create policy launchpad_ai_cost_ledger_select on public.launchpad_ai_cost_ledger
  for select to authenticated using (public.launchpad_is_member(tenant_id));
revoke insert, update, delete on public.launchpad_ai_cost_ledger from anon, authenticated;

create index if not exists launchpad_ai_cost_ledger_tenant_idx
  on public.launchpad_ai_cost_ledger (tenant_id, created_at desc);

-- ---------------------------------------------------------------------------
-- launchpad_tier1_records — the operator controls no scanner can prove
-- (AT training, PS screening/access agreements/termination, IR tabletop +
-- incident reporting readiness, DIBNet readiness). Ported from the internal
-- Tier-1 turnkey; tenant-scoped, human-entered, per-person where applicable.
-- ---------------------------------------------------------------------------
create table if not exists public.launchpad_tier1_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  control_id text not null,              -- e.g. 'AT.L2-3.2.1'
  category text not null
    check (category in ('training', 'screening', 'access_agreement', 'termination',
                        'tabletop', 'incident_readiness', 'dibnet')),
  person text,                           -- who this record covers (customer-entered)
  status text not null default 'open'
    check (status in ('open', 'done', 'expired')),
  completed_at timestamptz,
  expires_at timestamptz,                -- e.g. annual training expiry
  artifact_ref text,                     -- reference into the customer system — never content
  artifact_sha256 text
    check (artifact_sha256 is null or artifact_sha256 ~ '^[a-f0-9]{64}$'),
  notes text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.launchpad_tier1_records is
  'Tier-1 operator-control records (AT/PS/IR/DIBNet): per-person training, screening, access agreements, tabletops, incident-readiness, with expiry clocks. Human-entered; an AI or agent check can never create or complete one.';

alter table public.launchpad_tier1_records enable row level security;
create policy launchpad_tier1_records_all on public.launchpad_tier1_records
  for all to authenticated
  using (public.launchpad_is_member(tenant_id))
  with check (public.launchpad_is_member(tenant_id));

create index if not exists launchpad_tier1_records_tenant_idx
  on public.launchpad_tier1_records (tenant_id, control_id);
