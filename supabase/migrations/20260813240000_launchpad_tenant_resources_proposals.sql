-- FUSARIUM Launchpad — tenant-scoped resource cards + agent approval inbox.
-- Date: 2026-08-13. Non-CUI: names, URLs, sanitized proposal text. No CUI, no secrets.
-- Does not modify 20260812210000. Capture of Cursor P1 items 3.3 and 4.4.

create table if not exists public.launchpad_tenant_resource_cards (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  category text not null check (char_length(category) between 1 and 40),
  vendor text not null check (char_length(vendor) between 1 and 200),
  offering text not null check (char_length(offering) between 1 and 200),
  why_consider text check (char_length(why_consider) <= 2000),
  when_required text check (char_length(when_required) <= 2000),
  when_not_required text check (char_length(when_not_required) <= 2000),
  external_url text check (char_length(coalesce(external_url, '')) <= 500),
  notes text check (char_length(notes) <= 2000),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.launchpad_tenant_resource_cards is
  'Workspace-scoped resource cards. The global launchpad_resource_cards catalog is read-only to tenants.';

alter table public.launchpad_tenant_resource_cards enable row level security;
drop policy if exists launchpad_tenant_resource_cards_all on public.launchpad_tenant_resource_cards;
create policy launchpad_tenant_resource_cards_all on public.launchpad_tenant_resource_cards
  for all to authenticated
  using (public.launchpad_is_member(tenant_id))
  with check (public.launchpad_is_member(tenant_id));

create index if not exists launchpad_tenant_resource_cards_tenant_idx
  on public.launchpad_tenant_resource_cards (tenant_id);

revoke all on public.launchpad_tenant_resource_cards from anon;
grant select, insert, update, delete on public.launchpad_tenant_resource_cards to authenticated;

create table if not exists public.launchpad_agent_proposals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  device_id uuid,
  agent_role text not null check (
    agent_role in ('readiness', 'evidence', 'document', 'systems_check', 'radar')
  ),
  title text not null check (char_length(title) between 1 and 200),
  summary text not null check (char_length(summary) between 1 and 4000),
  proposed_action jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  review_note text check (char_length(review_note) <= 2000),
  reviewed_by uuid,
  reviewed_at timestamptz,
  applied_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.launchpad_agent_proposals is
  'Human-gate inbox. An agent proposal never flips a control. Accept/reject happens under the human session.';

alter table public.launchpad_agent_proposals enable row level security;
drop policy if exists launchpad_agent_proposals_select on public.launchpad_agent_proposals;
create policy launchpad_agent_proposals_select on public.launchpad_agent_proposals
  for select to authenticated
  using (public.launchpad_is_member(tenant_id));
drop policy if exists launchpad_agent_proposals_insert on public.launchpad_agent_proposals;
create policy launchpad_agent_proposals_insert on public.launchpad_agent_proposals
  for insert to authenticated
  with check (public.launchpad_is_member(tenant_id));
drop policy if exists launchpad_agent_proposals_update on public.launchpad_agent_proposals;
create policy launchpad_agent_proposals_update on public.launchpad_agent_proposals
  for update to authenticated
  using (public.launchpad_has_role(tenant_id, array['owner', 'admin', 'member']))
  with check (public.launchpad_has_role(tenant_id, array['owner', 'admin', 'member']));

create index if not exists launchpad_agent_proposals_tenant_idx
  on public.launchpad_agent_proposals (tenant_id, status, created_at desc);

revoke all on public.launchpad_agent_proposals from anon;
grant select, insert, update on public.launchpad_agent_proposals to authenticated;
revoke delete on public.launchpad_agent_proposals from authenticated;
