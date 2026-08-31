-- CMMC L2 Tier-1 turnkey: multi-user, auth'd tracking of the operator controls
-- (AT training, PS screening/access-agreements, IR tabletop/incident-log/DIBNet).
-- Additive only. RLS gates to @mycosoft.org / @mycosoft.com authenticated users.
-- Applied to Production (hnevnsxnhfibhbsipqvz) 2026-07-16 via migration `cmmc_tier1_turnkey`.

create table if not exists public.cmmc_personnel (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  email text,
  is_cui_handler boolean not null default true,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  created_by text
);

create table if not exists public.cmmc_tier1_records (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('training','screening','access_agreement','tabletop','incident','dibnet')),
  person_id uuid references public.cmmc_personnel(id) on delete cascade,
  item_key text not null default '',
  data jsonb not null default '{}'::jsonb,
  updated_by text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists cmmc_tier1_records_uniq
  on public.cmmc_tier1_records (kind, coalesce(person_id, '00000000-0000-0000-0000-000000000000'::uuid), item_key);

alter table public.cmmc_personnel enable row level security;
alter table public.cmmc_tier1_records enable row level security;

drop policy if exists cmmc_personnel_company_all on public.cmmc_personnel;
create policy cmmc_personnel_company_all on public.cmmc_personnel for all to authenticated
  using ((auth.jwt()->>'email') ilike '%@mycosoft.org' or (auth.jwt()->>'email') ilike '%@mycosoft.com')
  with check ((auth.jwt()->>'email') ilike '%@mycosoft.org' or (auth.jwt()->>'email') ilike '%@mycosoft.com');

drop policy if exists cmmc_tier1_company_all on public.cmmc_tier1_records;
create policy cmmc_tier1_company_all on public.cmmc_tier1_records for all to authenticated
  using ((auth.jwt()->>'email') ilike '%@mycosoft.org' or (auth.jwt()->>'email') ilike '%@mycosoft.com')
  with check ((auth.jwt()->>'email') ilike '%@mycosoft.org' or (auth.jwt()->>'email') ilike '%@mycosoft.com');

insert into public.cmmc_personnel (name, role, email, sort_order)
select v.name, v.role, v.email, v.sort_order from (values
  ('Morgan Rockcoons','CEO / SAO · Primary CUI handler','morgan@mycosoft.org',1),
  ('RJ Ricasata','Engineering · Secondary CUI handler','rj@mycosoft.org',2)
) as v(name,role,email,sort_order)
where not exists (select 1 from public.cmmc_personnel);
