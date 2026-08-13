-- FUSARIUM Launchpad — public checkout pending purchases.
-- Date: 2026-08-14. Guest storefront: buyer has no tenant yet.
-- Claim is by verified auth email only (service role). No CUI. No secrets.

create table if not exists public.launchpad_pending_purchases (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text not null unique,
  stripe_customer_id text,
  email text not null,
  lookup_key text not null,
  plan_key text,
  billing text not null,
  kind text not null check (kind in ('plan', 'pass', 'credits', 'advisory')),
  company text,
  status text not null default 'checkout_created'
    check (status in ('checkout_created', 'paid', 'claimed')),
  claimed_at timestamptz,
  claimed_tenant_id uuid references public.launchpad_tenants (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.launchpad_pending_purchases is
  'Public-pricing Checkout Sessions with no tenant yet. Webhook marks paid. Claim matches verified auth email — never a request-body email.';

create index if not exists launchpad_pending_purchases_email_status_idx
  on public.launchpad_pending_purchases (email, status)
  where claimed_at is null;

alter table public.launchpad_pending_purchases enable row level security;

-- No authenticated policies: members must not list other buyers' pending rows.
-- Service role bypasses RLS for webhook + claim.

revoke all on public.launchpad_pending_purchases from anon, authenticated;
grant select, insert, update on public.launchpad_pending_purchases to service_role;
revoke delete on public.launchpad_pending_purchases from anon, authenticated;
