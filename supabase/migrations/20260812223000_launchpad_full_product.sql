-- ============================================================================
-- FUSARIUM Launchpad — surgical extend (Aug 12 2026)
-- ============================================================================
-- DO NOT recreate launchpad_ai_connections. Production already has
-- 20260813031155 (bytea envelope: key_ciphertext / key_dek_wrapped).
-- This file only adds missing ops tables, mcp mode, report kind, credit RPCs.
-- ============================================================================

alter table public.launchpad_ai_connections drop constraint if exists launchpad_ai_connections_mode_check;
alter table public.launchpad_ai_connections
  add constraint launchpad_ai_connections_mode_check
  check (mode in ('managed', 'byo', 'mcp'));

alter table public.launchpad_generated_documents drop constraint if exists launchpad_generated_documents_kind_check;
alter table public.launchpad_generated_documents
  add constraint launchpad_generated_documents_kind_check
  check (kind in ('policy','ssp','poam','scope_memo','report','other'));

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
alter table public.launchpad_closure_statements enable row level security;
drop policy if exists launchpad_closure_member on public.launchpad_closure_statements;
create policy launchpad_closure_member on public.launchpad_closure_statements
  for all to authenticated
  using (public.launchpad_is_member(tenant_id)) with check (public.launchpad_is_member(tenant_id));

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
alter table public.launchpad_enclave_references enable row level security;
drop policy if exists launchpad_enclave_member on public.launchpad_enclave_references;
create policy launchpad_enclave_member on public.launchpad_enclave_references
  for all to authenticated
  using (public.launchpad_is_member(tenant_id)) with check (public.launchpad_is_member(tenant_id));

create table if not exists public.launchpad_clearance_readiness (
  tenant_id uuid primary key references public.launchpad_tenants (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  disclaimer_acknowledged_at timestamptz,
  foci_referral_opened boolean not null default false,
  export_referral_opened boolean not null default false,
  updated_by uuid,
  updated_at timestamptz not null default now()
);
alter table public.launchpad_clearance_readiness enable row level security;
drop policy if exists launchpad_clearance_member on public.launchpad_clearance_readiness;
create policy launchpad_clearance_member on public.launchpad_clearance_readiness
  for all to authenticated
  using (public.launchpad_is_member(tenant_id)) with check (public.launchpad_is_member(tenant_id));

create table if not exists public.launchpad_quarantine_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  kind text not null,
  hits jsonb not null default '[]'::jsonb,
  actor_user_id uuid,
  created_at timestamptz not null default now()
);
alter table public.launchpad_quarantine_events enable row level security;
drop policy if exists launchpad_quarantine_select on public.launchpad_quarantine_events;
drop policy if exists launchpad_quarantine_insert on public.launchpad_quarantine_events;
create policy launchpad_quarantine_select on public.launchpad_quarantine_events
  for select to authenticated using (public.launchpad_is_member(tenant_id));
create policy launchpad_quarantine_insert on public.launchpad_quarantine_events
  for insert to authenticated with check (public.launchpad_is_member(tenant_id));
revoke update, delete on public.launchpad_quarantine_events from anon, authenticated;

create table if not exists public.launchpad_calendar_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  source text not null check (source in ('registration','poam','training','task','manual')),
  title text not null,
  due_at date not null,
  ref_id text,
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table public.launchpad_calendar_events enable row level security;
drop policy if exists launchpad_calendar_member on public.launchpad_calendar_events;
create policy launchpad_calendar_member on public.launchpad_calendar_events
  for all to authenticated
  using (public.launchpad_is_member(tenant_id)) with check (public.launchpad_is_member(tenant_id));

create table if not exists public.launchpad_role_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  person_name text not null,
  person_email text,
  role_title text not null,
  scope text,
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table public.launchpad_role_assignments enable row level security;
drop policy if exists launchpad_roles_member on public.launchpad_role_assignments;
create policy launchpad_roles_member on public.launchpad_role_assignments
  for all to authenticated
  using (public.launchpad_is_member(tenant_id)) with check (public.launchpad_is_member(tenant_id));

create table if not exists public.launchpad_radar_alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  opportunity_id uuid references public.launchpad_opportunities (id) on delete cascade,
  kind text not null check (kind in ('due_soon','amendment','watch','manual')),
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.launchpad_radar_alerts enable row level security;
drop policy if exists launchpad_radar_alerts_member on public.launchpad_radar_alerts;
create policy launchpad_radar_alerts_member on public.launchpad_radar_alerts
  for all to authenticated
  using (public.launchpad_is_member(tenant_id)) with check (public.launchpad_is_member(tenant_id));

create table if not exists public.launchpad_bom_replacements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  bom_part_id uuid not null references public.launchpad_bom_parts (id) on delete cascade,
  candidate_part_number text,
  candidate_manufacturer text,
  candidate_country text,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table public.launchpad_bom_replacements enable row level security;
drop policy if exists launchpad_bom_repl_member on public.launchpad_bom_replacements;
create policy launchpad_bom_repl_member on public.launchpad_bom_replacements
  for all to authenticated
  using (public.launchpad_is_member(tenant_id)) with check (public.launchpad_is_member(tenant_id));

create table if not exists public.launchpad_workbook_progress (
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  step_id text not null,
  completed_at timestamptz not null default now(),
  completed_by uuid,
  primary key (tenant_id, step_id)
);
alter table public.launchpad_workbook_progress enable row level security;
drop policy if exists launchpad_workbook_member on public.launchpad_workbook_progress;
create policy launchpad_workbook_member on public.launchpad_workbook_progress
  for all to authenticated
  using (public.launchpad_is_member(tenant_id)) with check (public.launchpad_is_member(tenant_id));

create unique index if not exists launchpad_resource_cards_vendor_offering_uidx
  on public.launchpad_resource_cards (vendor, offering);

insert into public.launchpad_resource_cards (vendor, offering, category, last_verified_at, card)
values
  ('Coworking / physical workspace', 'Secure office / SCIF-adjacent commercial space pointers', 'workspace', current_date,
    '{"relationship_type":"directory","compensation_disclosure":"None unless a future affiliate relationship is disclosed here.","disclaimer":"Not a lease. Not a certification."}'::jsonb),
  ('Networking architecture class', 'Firewall / VLAN / AP decision tree', 'networking', current_date,
    '{"relationship_type":"architecture_class","compensation_disclosure":"None.","disclaimer":"Network gear does not make an organization CMMC compliant."}'::jsonb),
  ('Outside counsel (export / FOCI / NISP)', 'Counsel referral — Launchpad does not practice law', 'legal', current_date,
    '{"relationship_type":"process","compensation_disclosure":"None.","disclaimer":"Not legal advice. AI does not classify FOCI or export."}'::jsonb),
  ('Registered agent', 'Entity hygiene checklist', 'registered_agent', current_date,
    '{"relationship_type":"process","compensation_disclosure":"None.","disclaimer":"Launchpad does not store EINs."}'::jsonb),
  ('Accelerators / primes directory', 'Public program names only', 'accelerator', current_date,
    '{"relationship_type":"directory","compensation_disclosure":"None unless disclosed here.","disclaimer":"Listing does not imply funding."}'::jsonb),
  ('PreVeil', 'Gov Community encrypted collaboration', 'enclave', current_date,
    '{"relationship_type":"vendor_named","compensation_disclosure":"Mycosoft receives no compensation from PreVeil for this listing.","disclaimer":"Listing is not a certification and does not make a company CMMC compliant."}'::jsonb),
  ('Microsoft', 'GCC High', 'enclave', current_date,
    '{"relationship_type":"vendor_named","compensation_disclosure":"No compensation for this listing.","disclaimer":"Not an official Microsoft partner endorsement."}'::jsonb),
  ('Amazon Web Services', 'GovCloud', 'enclave', current_date,
    '{"relationship_type":"vendor_named","compensation_disclosure":"No compensation for this listing.","disclaimer":"Not certified by AWS or the government."}'::jsonb),
  ('Wazuh (local)', 'On-prem SIEM — sanitized health only in cloud', 'logging', current_date,
    '{"relationship_type":"architecture_class","compensation_disclosure":"None.","disclaimer":"Raw Wazuh logs never enter Launchpad."}'::jsonb)
on conflict (vendor, offering) do nothing;

insert into public.launchpad_document_templates (key, title, version, body, active)
values
  ('nist-800-171-cover', 'NIST SP 800-171 worksheet (DRAFT)', 'v1', '{"placeholders":true,"never_claims_met":true}'::jsonb, true),
  ('sbir-sttr-cover', 'SBIR/STTR readiness cover (DRAFT)', 'v1', '{"placeholders":true,"not_a_submission":true}'::jsonb, true),
  ('ear-itar-referral', 'EAR/ITAR counsel referral (DRAFT)', 'v1', '{"placeholders":true,"ai_does_not_classify":true}'::jsonb, true),
  ('foci-cover', 'FOCI questionnaire tracker (DRAFT)', 'v1', '{"placeholders":true,"ai_does_not_classify":true}'::jsonb, true),
  ('nisp-fcl-checklist', 'NISP / FCL readiness checklist (DRAFT)', 'v1', '{"placeholders":true,"cannot_obtain_fcl":true}'::jsonb, true),
  ('om-cover', 'Operations & maintenance worksheet (DRAFT)', 'v1', '{"placeholders":true}'::jsonb, true),
  ('fedramp-pointer', 'FedRAMP pointer (DRAFT — not an authorization)', 'v1', '{"placeholders":true,"not_an_ato":true}'::jsonb, true)
on conflict (key) do nothing;
