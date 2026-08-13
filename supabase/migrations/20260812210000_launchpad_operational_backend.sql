-- ============================================================================
-- DO NOT APPLY ON PROD.
-- Claude already applied launchpad_ai_connections (bytea key_ciphertext /
-- key_dek_wrapped) as 20260813031155. This file would create a competing
-- text-column envelope schema and 500 the live BFFs.
-- Canonical: live bytea columns + surgical extend 20260812223000
-- (MCP launchpad_ops_extend_aug12 / launchpad_ops_tables_aug12).
-- Date: 2026-08-12
-- ============================================================================
-- FUSARIUM Launchpad — Operational backend (WP-1, WP-4/5/8/10/11 schema)
-- SUPERSEDED for apply. Kept for history only.
-- ============================================================================
-- Recoverable BYO AI provider keys (envelope ciphertext — NEVER plaintext).
-- Dual-meter cost ledger. Reserve-then-settle credit RPCs.
-- Tier-1, closure, enclave metadata, formation/clearance, quarantine.
-- Resource Graph + document template seeds (commercial non-CUI; no SF-86).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Generated-document kinds: add report
-- ----------------------------------------------------------------------------
alter table public.launchpad_generated_documents drop constraint if exists launchpad_generated_documents_kind_check;
alter table public.launchpad_generated_documents
  add constraint launchpad_generated_documents_kind_check
  check (kind in ('policy','ssp','poam','scope_memo','report','other'));

-- ----------------------------------------------------------------------------
-- AI connections (envelope) + cost ledger
-- ----------------------------------------------------------------------------
create table if not exists public.launchpad_ai_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  provider text not null check (provider in ('anthropic','openai','perplexity','xai','cursor')),
  mode text not null check (mode in ('managed','byo','mcp')),
  status text not null default 'pending'
    check (status in ('pending','verified','revoked','failed')),
  display_prefix text,
  last_verified_at timestamptz,
  scopes text[] not null default '{}'::text[],
  ciphertext text,
  nonce text,
  tag text,
  wrapped_dek text,
  wrap_nonce text,
  wrap_tag text,
  dek_id text,
  alg text,
  kms_backend text,
  created_by uuid,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (tenant_id, provider, mode)
);
comment on table public.launchpad_ai_connections is
  'Tenant AI connectors. BYO provider secrets are envelope-encrypted (ciphertext + wrapped DEK). No plaintext column. Cursor connections are MCP metadata only.';

create index if not exists launchpad_ai_connections_tenant_idx
  on public.launchpad_ai_connections (tenant_id)
  where revoked_at is null;

alter table public.launchpad_ai_connections enable row level security;

create policy launchpad_ai_connections_select on public.launchpad_ai_connections
  for select to authenticated using (public.launchpad_is_member(tenant_id));
create policy launchpad_ai_connections_insert on public.launchpad_ai_connections
  for insert to authenticated
  with check (public.launchpad_has_role(tenant_id, array['owner','admin']));
create policy launchpad_ai_connections_update on public.launchpad_ai_connections
  for update to authenticated
  using (public.launchpad_has_role(tenant_id, array['owner','admin']))
  with check (public.launchpad_has_role(tenant_id, array['owner','admin']));

-- Members may read metadata; ciphertext columns are revoked from authenticated.
revoke all on public.launchpad_ai_connections from anon;
grant select (
  id, tenant_id, provider, mode, status, display_prefix, last_verified_at,
  scopes, created_by, created_at, revoked_at, kms_backend, alg, dek_id
) on public.launchpad_ai_connections to authenticated;
grant insert, update on public.launchpad_ai_connections to authenticated;

create table if not exists public.launchpad_ai_cost_ledger (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  user_id uuid,
  task_id text,
  reservation_id uuid,
  provider text not null,
  model text not null,
  provider_price_version text,
  input_units int not null default 0,
  output_units int not null default 0,
  search_requests int not null default 0,
  retrieval_requests int not null default 0,
  reasoning_units int not null default 0,
  cache_read int not null default 0,
  cache_write int not null default 0,
  actual_cost numeric,
  reserved_cost numeric,
  credits_charged int not null default 0,
  byo_key boolean not null default false,
  created_at timestamptz not null default now()
);
comment on table public.launchpad_ai_cost_ledger is
  'Per-action AI cost ledger (spec §11.4). BYO rows MUST have credits_charged=0. Insert-only.';

alter table public.launchpad_ai_cost_ledger enable row level security;
create policy launchpad_ai_cost_ledger_select on public.launchpad_ai_cost_ledger
  for select to authenticated using (public.launchpad_is_member(tenant_id));
create policy launchpad_ai_cost_ledger_insert on public.launchpad_ai_cost_ledger
  for insert to authenticated with check (public.launchpad_is_member(tenant_id));
revoke update, delete on public.launchpad_ai_cost_ledger from anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Reserve-then-settle credits
-- ----------------------------------------------------------------------------
create or replace function public.launchpad_reserve_credits(
  t uuid, amount int, p_reason text, p_reservation_id uuid, p_ref jsonb default '{}'::jsonb
) returns int
language plpgsql security definer
set search_path = public
as $$
declare
  bal int;
begin
  if amount <= 0 then return coalesce((select sum(delta) from public.launchpad_credit_ledger where tenant_id = t), 0); end if;
  if not public.launchpad_is_member(t) then raise exception 'not a member of this tenant'; end if;
  perform pg_advisory_xact_lock(hashtext('launchpad_credits:' || t::text));
  select coalesce(sum(delta), 0) into bal from public.launchpad_credit_ledger where tenant_id = t;
  if bal < amount then
    raise exception 'insufficient credits: have %, need %', bal, amount;
  end if;
  insert into public.launchpad_credit_ledger (tenant_id, delta, reason, ref)
  values (t, -amount, 'reserve:' || p_reason, jsonb_build_object('reservation_id', p_reservation_id) || coalesce(p_ref, '{}'::jsonb));
  return bal - amount;
end;
$$;
revoke execute on function public.launchpad_reserve_credits(uuid, int, text, uuid, jsonb) from anon;
grant execute on function public.launchpad_reserve_credits(uuid, int, text, uuid, jsonb) to authenticated;

create or replace function public.launchpad_settle_credits(
  t uuid, p_reservation_id uuid, p_actual int
) returns int
language plpgsql security definer
set search_path = public
as $$
declare
  reserved int;
  bal int;
begin
  if not public.launchpad_is_member(t) then raise exception 'not a member of this tenant'; end if;
  if p_actual < 0 then raise exception 'actual must be >= 0'; end if;
  perform pg_advisory_xact_lock(hashtext('launchpad_credits:' || t::text));
  select coalesce(sum(-delta), 0) into reserved
    from public.launchpad_credit_ledger
    where tenant_id = t
      and ref->>'reservation_id' = p_reservation_id::text
      and reason like 'reserve:%';
  if reserved <= 0 then raise exception 'reservation not found'; end if;
  if p_actual < reserved then
    insert into public.launchpad_credit_ledger (tenant_id, delta, reason, ref)
    values (t, reserved - p_actual, 'settle_refund', jsonb_build_object('reservation_id', p_reservation_id));
  elsif p_actual > reserved then
    perform public.launchpad_spend_credits(t, p_actual - reserved, 'settle_extra', jsonb_build_object('reservation_id', p_reservation_id));
  end if;
  select coalesce(sum(delta), 0) into bal from public.launchpad_credit_ledger where tenant_id = t;
  return bal;
end;
$$;
revoke execute on function public.launchpad_settle_credits(uuid, uuid, int) from anon;
grant execute on function public.launchpad_settle_credits(uuid, uuid, int) to authenticated;

create or replace function public.launchpad_refund_reservation(
  t uuid, p_reservation_id uuid
) returns int
language plpgsql security definer
set search_path = public
as $$
declare
  reserved int;
  already int;
  bal int;
begin
  if not public.launchpad_is_member(t) then raise exception 'not a member of this tenant'; end if;
  perform pg_advisory_xact_lock(hashtext('launchpad_credits:' || t::text));
  select coalesce(sum(-delta), 0) into reserved
    from public.launchpad_credit_ledger
    where tenant_id = t
      and ref->>'reservation_id' = p_reservation_id::text
      and reason like 'reserve:%';
  select coalesce(sum(delta), 0) into already
    from public.launchpad_credit_ledger
    where tenant_id = t
      and ref->>'reservation_id' = p_reservation_id::text
      and reason in ('refund','settle_refund');
  if reserved <= 0 then raise exception 'reservation not found'; end if;
  if already >= reserved then
    select coalesce(sum(delta), 0) into bal from public.launchpad_credit_ledger where tenant_id = t;
    return bal;
  end if;
  insert into public.launchpad_credit_ledger (tenant_id, delta, reason, ref)
  values (t, reserved - already, 'refund', jsonb_build_object('reservation_id', p_reservation_id));
  select coalesce(sum(delta), 0) into bal from public.launchpad_credit_ledger where tenant_id = t;
  return bal;
end;
$$;
revoke execute on function public.launchpad_refund_reservation(uuid, uuid) from anon;
grant execute on function public.launchpad_refund_reservation(uuid, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Tier-1 turnkey (tenant edition)
-- ----------------------------------------------------------------------------
create table if not exists public.launchpad_tier1_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  person_name text not null,
  person_email text,
  control_id text not null,
  kind text not null check (kind in (
    'awareness_training','role_training','screening','access_agreement',
    'termination','incident_report','tabletop'
  )),
  completed_at timestamptz,
  expires_at date,
  artifact_ref text,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.launchpad_tier1_records is
  'Operator controls no scanner can prove (AT/PS/IR). Customer-recorded facts only; AI cannot write these rows as implemented state.';

alter table public.launchpad_tier1_records enable row level security;
create policy launchpad_tier1_member on public.launchpad_tier1_records
  for all to authenticated
  using (public.launchpad_is_member(tenant_id)) with check (public.launchpad_is_member(tenant_id));

-- ----------------------------------------------------------------------------
-- Closure board (generic waves; per-tenant statements)
-- ----------------------------------------------------------------------------
create table if not exists public.launchpad_closure_statements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  wave int not null check (wave between 1 and 5),
  statement_key text not null,
  statement_text text not null,
  valid boolean not null default true,
  invalidated_at timestamptz,
  invalidated_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (tenant_id, statement_key)
);
comment on table public.launchpad_closure_statements is
  'Self-invalidating remediation statements. Mechanism only — no Mycosoft-specific content.';

alter table public.launchpad_closure_statements enable row level security;
create policy launchpad_closure_member on public.launchpad_closure_statements
  for all to authenticated
  using (public.launchpad_is_member(tenant_id)) with check (public.launchpad_is_member(tenant_id));

-- ----------------------------------------------------------------------------
-- Enclave Bridge — metadata only, no imported content
-- ----------------------------------------------------------------------------
create table if not exists public.launchpad_enclave_references (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  provider text not null check (provider in (
    'preveil','gcc_high','govcloud','assured_workloads','self_hosted','exostar','other'
  )),
  title text not null,
  external_id text,
  owner_label text,
  item_date date,
  content_hash text,
  status text not null default 'referenced'
    check (status in ('referenced','approved','revoked')),
  created_by uuid,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
comment on table public.launchpad_enclave_references is
  'Enclave/connector metadata only (title, id, owner, date, hash, status). Content is never imported.';

alter table public.launchpad_enclave_references enable row level security;
create policy launchpad_enclave_member on public.launchpad_enclave_references
  for all to authenticated
  using (public.launchpad_is_member(tenant_id)) with check (public.launchpad_is_member(tenant_id));

-- ----------------------------------------------------------------------------
-- Clearance readiness (disclaimer-required; no SF-86)
-- ----------------------------------------------------------------------------
create table if not exists public.launchpad_clearance_readiness (
  tenant_id uuid primary key references public.launchpad_tenants (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  disclaimer_acknowledged_at timestamptz,
  foci_referral_opened boolean not null default false,
  export_referral_opened boolean not null default false,
  updated_by uuid,
  updated_at timestamptz not null default now()
);
comment on table public.launchpad_clearance_readiness is
  'Facility-clearance readiness checklist. Individuals do not self-apply; a company cannot sponsor its own FCL; Launchpad cannot obtain or guarantee clearance. No SF-86 fields.';

alter table public.launchpad_clearance_readiness enable row level security;
create policy launchpad_clearance_member on public.launchpad_clearance_readiness
  for all to authenticated
  using (public.launchpad_is_member(tenant_id)) with check (public.launchpad_is_member(tenant_id));

-- ----------------------------------------------------------------------------
-- Quarantine / blocked-boundary events (insert-only)
-- ----------------------------------------------------------------------------
create table if not exists public.launchpad_quarantine_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  kind text not null,
  hits jsonb not null default '[]'::jsonb,
  actor_user_id uuid,
  created_at timestamptz not null default now()
);
comment on table public.launchpad_quarantine_events is
  'Immutable blocked-event audit for DLP hits. No file content stored — kind + hit metadata only.';

alter table public.launchpad_quarantine_events enable row level security;
create policy launchpad_quarantine_select on public.launchpad_quarantine_events
  for select to authenticated using (public.launchpad_is_member(tenant_id));
create policy launchpad_quarantine_insert on public.launchpad_quarantine_events
  for insert to authenticated with check (public.launchpad_is_member(tenant_id));
revoke update, delete on public.launchpad_quarantine_events from anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Document templates (global). SF-86 is explicitly excluded.
-- ----------------------------------------------------------------------------
insert into public.launchpad_document_templates (key, title, version, body, active)
values
  ('ssp-outline', 'System Security Plan outline (DRAFT)', 'v1',
    '{"placeholders":true,"excludes":["sf-86"],"note":"Customer facts only. Never marks a control MET."}'::jsonb, true),
  ('poam-worksheet', 'POA&M worksheet (DRAFT)', 'v1',
    '{"placeholders":true,"window_days":180}'::jsonb, true),
  ('sprs-worksheet', 'SPRS score worksheet (DRAFT)', 'v1',
    '{"placeholders":true,"engine":"deterministic"}'::jsonb, true),
  ('self-assessment-cover', 'CMMC L2 self-assessment cover (DRAFT)', 'v1',
    '{"placeholders":true,"never_claims_compliant":true}'::jsonb, true),
  ('dd254-checklist', 'DD-254 customer checklist (DRAFT)', 'v1',
    '{"placeholders":true,"not_a_submission":true}'::jsonb, true),
  ('sf312-placeholder', 'SF-312 acknowledgment tracker (reference only)', 'v1',
    '{"stores":"completion_metadata_only"}'::jsonb, true),
  ('sf328-placeholder', 'SF-328 FOCI questionnaire tracker (reference only)', 'v1',
    '{"stores":"completion_metadata_only","ai_does_not_classify":true}'::jsonb, true),
  ('foci-counsel-referral', 'FOCI / export-control counsel referral task', 'v1',
    '{"ai_does_not_classify":true}'::jsonb, true),
  ('sbir-proposal-outline', 'SBIR/STTR proposal outline (DRAFT)', 'v1',
    '{"placeholders":true,"not_a_binding_submission":true}'::jsonb, true),
  ('remediation-plan', 'Remediation plan (DRAFT)', 'v1',
    '{"placeholders":true}'::jsonb, true)
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- Resource Graph seed (plain vendor names, FTC disclosure, no logos, no "official partner")
-- ----------------------------------------------------------------------------
create unique index if not exists launchpad_resource_cards_vendor_offering_uidx
  on public.launchpad_resource_cards (vendor, offering);

insert into public.launchpad_resource_cards (vendor, offering, category, last_verified_at, card)
values
  ('PreVeil', 'Gov Community encrypted collaboration', 'enclave', current_date,
    '{"relationship_type":"vendor_named","compensation_disclosure":"Mycosoft receives no compensation from PreVeil for this listing.","alternatives":["Microsoft GCC High","AWS GovCloud","self-hosted"],"data_allowed":["metadata references the customer chooses"],"data_not_allowed":["CUI content","drive-wide search"],"disclaimer":"Listing is not a certification and does not make a company CMMC compliant."}'::jsonb),
  ('Microsoft', 'GCC High', 'enclave', current_date,
    '{"relationship_type":"vendor_named","compensation_disclosure":"No compensation for this listing.","alternatives":["PreVeil","AWS GovCloud"],"data_allowed":["customer-selected folder metadata"],"data_not_allowed":["mailbox content","CUI import"],"disclaimer":"Not an official Microsoft partner endorsement."}'::jsonb),
  ('Amazon Web Services', 'GovCloud', 'enclave', current_date,
    '{"relationship_type":"vendor_named","compensation_disclosure":"No compensation for this listing.","alternatives":["Azure Government","self-hosted"],"data_allowed":["account metadata the customer selects"],"data_not_allowed":["workload data","CUI"],"disclaimer":"Not certified by AWS or the government."}'::jsonb),
  ('Google', 'Assured Workloads', 'enclave', current_date,
    '{"relationship_type":"vendor_named","compensation_disclosure":"No compensation for this listing.","alternatives":["GCC High","GovCloud"],"data_allowed":["project metadata"],"data_not_allowed":["workspace content import"],"disclaimer":"Not an official Google partner endorsement."}'::jsonb),
  ('Self-hosted', 'Customer-operated enclave', 'enclave', current_date,
    '{"relationship_type":"architecture_option","compensation_disclosure":"None.","alternatives":["PreVeil","GCC High"],"data_allowed":["customer-described boundary facts"],"data_not_allowed":["CUI copies"],"disclaimer":"Self-hosting is not automatically compliant."}'::jsonb),
  ('Exostar', 'Supplier / assessment network', 'supplier_network', current_date,
    '{"relationship_type":"vendor_named","compensation_disclosure":"No compensation for this listing.","alternatives":[],"data_allowed":["org metadata the customer selects"],"data_not_allowed":["DD-254 content import","SPRS credentials"],"disclaimer":"Launchpad does not submit SPRS or DD-254 on the customer''s behalf."}'::jsonb),
  ('Ubiquiti-class', 'Managed firewall / router / VLAN switching / Wi-Fi APs', 'network', current_date,
    '{"relationship_type":"architecture_class","compensation_disclosure":"No compensation for this listing. Presented as a decision-tree class, not a shopping cart.","alternatives":["enterprise firewall vendors","managed service providers"],"data_allowed":["site topology the customer describes"],"data_not_allowed":["packet captures","raw firewall logs"],"disclaimer":"Network gear does not make an organization CMMC compliant."}'::jsonb),
  ('NAS + immutable backup', 'On-prem NAS with offsite / immutable backup', 'network', current_date,
    '{"relationship_type":"architecture_class","compensation_disclosure":"None.","alternatives":["cloud backup with customer-held keys"],"data_allowed":["backup status metadata"],"data_not_allowed":["backup contents"],"disclaimer":"Backup architecture is customer-owned evidence."}'::jsonb),
  ('UPS / power', 'Uninterruptible power for the site', 'network', current_date,
    '{"relationship_type":"architecture_class","compensation_disclosure":"None.","alternatives":[],"data_allowed":["presence/absence facts"],"data_not_allowed":[],"disclaimer":"Not a compliance certification."}'::jsonb),
  ('Endpoint management', 'MDM / endpoint protection', 'network', current_date,
    '{"relationship_type":"architecture_class","compensation_disclosure":"None.","alternatives":[],"data_allowed":["sanitized agent results"],"data_not_allowed":["raw EDR telemetry"],"disclaimer":"Local Agent results never auto-mark a control implemented."}'::jsonb),
  ('Logging / SIEM', 'Customer-operated logging', 'network', current_date,
    '{"relationship_type":"architecture_class","compensation_disclosure":"None.","alternatives":["Wazuh","commercial SIEM"],"data_allowed":["sanitized health status"],"data_not_allowed":["full unredacted SIEM logs"],"disclaimer":"Scanners and raw telemetry stay on-prem."}'::jsonb),
  ('Fiber / structured cabling', 'Site connectivity decision tree', 'network', current_date,
    '{"relationship_type":"architecture_class","compensation_disclosure":"None.","alternatives":[],"data_allowed":["ZIP-level serviceability the customer records"],"data_not_allowed":[],"disclaimer":"Not a carrier partnership."}'::jsonb),
  ('Clerky', 'Startup corporate formation', 'formation', current_date,
    '{"relationship_type":"vendor_named","compensation_disclosure":"No compensation for this listing.","alternatives":["counsel referral","registered agent"],"data_allowed":["formation status the customer records"],"data_not_allowed":["cap-table secrets","SSNs"],"disclaimer":"Not legal advice. Not an official Clerky partnership claim."}'::jsonb),
  ('Registered agent / EIN path', 'Entity hygiene checklist', 'formation', current_date,
    '{"relationship_type":"process","compensation_disclosure":"None.","alternatives":["Clerky","counsel"],"data_allowed":["status flags"],"data_not_allowed":["EIN value — restricted identifier"],"disclaimer":"Launchpad does not store EINs."}'::jsonb),
  ('Pulley', 'Cap table / equity administration', 'cap_table', current_date,
    '{"relationship_type":"vendor_named","compensation_disclosure":"No compensation for this listing.","alternatives":["other cap-table administrators"],"data_allowed":["whether a cap table exists"],"data_not_allowed":["holder PII","instrument terms"],"disclaimer":"Not an official Pulley partnership claim."}'::jsonb),
  ('SAM.gov registration path', 'Login.gov → SAM.gov → UEI → CAGE', 'federal_registration', current_date,
    '{"relationship_type":"official_process","compensation_disclosure":"None.","alternatives":[],"data_allowed":["UEI","CAGE","portal email","renewal dates"],"data_not_allowed":["passwords","DUNS numbers","SAM credentials"],"disclaimer":"Launchpad never asks for a DUNS number. Portal passwords are never stored."}'::jsonb),
  ('Accelerators / VCs / primes (directory)', 'Funding landscape pointers', 'funding', current_date,
    '{"relationship_type":"directory","compensation_disclosure":"None unless a future affiliate relationship is disclosed here.","alternatives":[],"data_allowed":["public program names"],"data_not_allowed":["implied funding commitments"],"disclaimer":"Listing does not imply any named investor will fund the customer."}'::jsonb)
on conflict (vendor, offering) do nothing;
