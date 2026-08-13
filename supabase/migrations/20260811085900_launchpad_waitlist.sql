-- FUSARIUM Launchpad — get-started / enquiry intake.
-- Public marketing form data (pre-tenant). Service-role writes only; no anon or
-- authenticated access. This is deliberately NOT tenant-scoped — applicants do
-- not have tenants yet.

create table if not exists public.launchpad_waitlist (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text not null,
  website text,
  builds text,                        -- what the company builds (free text, non-CUI)
  stage text,                         -- idea | entity | bidding | award | production
  target_agencies text,
  heard_from text,
  notes text,
  status text not null default 'applied'
    check (status in ('applied', 'invited', 'activated', 'declined')),
  created_at timestamptz not null default now()
);

comment on table public.launchpad_waitlist is
  'Get-started enquiries from the public marketing site. Non-CUI intake only. Service-role access only.';

alter table public.launchpad_waitlist enable row level security;
-- No policies on purpose: anon/authenticated get nothing; service role bypasses RLS.

revoke all on public.launchpad_waitlist from anon, authenticated;
