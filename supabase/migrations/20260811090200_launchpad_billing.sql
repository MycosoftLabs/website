-- ============================================================================
-- FUSARIUM Launchpad — Migration 3: billing, credits, webhook idempotency
-- ============================================================================
-- Entitlements are DERIVED server-side from plan_key + status; nothing here is
-- client-writable. The webhook (service role) is the only writer for
-- subscriptions/events; credit spending goes through a locked RPC.
-- ============================================================================

create table if not exists public.launchpad_subscriptions (
  tenant_id uuid primary key references public.launchpad_tenants (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  plan_key text,                        -- catalog PlanKey; null = no plan
  status text not null default 'none',  -- stripe vocabulary + none|grace
  current_period_end timestamptz,
  cancel_at timestamptz,
  grace_until timestamptz,
  founding_pass_expires_at timestamptz, -- pass = 30 days of core; explicit renewal only
  updated_at timestamptz not null default now()
);
comment on table public.launchpad_subscriptions is
  'Billing state per tenant. Written ONLY by the Launchpad Stripe webhook (service role); members read. Entitlements derive from plan_key+status in code.';

alter table public.launchpad_subscriptions enable row level security;
create policy launchpad_subscriptions_select on public.launchpad_subscriptions
  for select to authenticated using (public.launchpad_is_member(tenant_id));
-- No authenticated write policies on purpose.

create table if not exists public.launchpad_credit_ledger (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  delta int not null,                   -- +grant / -spend
  reason text not null,                 -- monthly_grant | pack_purchase | spend:<task> | refund
  ref jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
comment on table public.launchpad_credit_ledger is
  'AI credit ledger, insert-only. Balance = sum(delta). Spends go through launchpad_spend_credits (advisory-locked); grants are service-role inserts from the webhook/cron.';

alter table public.launchpad_credit_ledger enable row level security;
create policy launchpad_credit_ledger_select on public.launchpad_credit_ledger
  for select to authenticated using (public.launchpad_is_member(tenant_id));
revoke update, delete on public.launchpad_credit_ledger from anon, authenticated, service_role;

create or replace function public.launchpad_spend_credits(
  t uuid, amount int, p_reason text, p_ref jsonb default '{}'::jsonb
) returns int
language plpgsql security definer
set search_path = public
as $$
declare
  bal int;
begin
  if amount <= 0 then raise exception 'amount must be positive'; end if;
  if not public.launchpad_is_member(t) then raise exception 'not a member of this tenant'; end if;
  perform pg_advisory_xact_lock(hashtext('launchpad_credits:' || t::text));
  select coalesce(sum(delta), 0) into bal from public.launchpad_credit_ledger where tenant_id = t;
  if bal < amount then
    raise exception 'insufficient credits: have %, need %', bal, amount;
  end if;
  insert into public.launchpad_credit_ledger (tenant_id, delta, reason, ref)
  values (t, -amount, p_reason, p_ref);
  return bal - amount;
end;
$$;
revoke execute on function public.launchpad_spend_credits(uuid, int, text, jsonb) from anon;
grant execute on function public.launchpad_spend_credits(uuid, int, text, jsonb) to authenticated;

create table if not exists public.launchpad_stripe_events (
  stripe_event_id text primary key,
  type text not null,
  payload_hash text,
  processed_at timestamptz not null default now(),
  outcome jsonb not null default '{}'::jsonb
);
comment on table public.launchpad_stripe_events is
  'Webhook idempotency ledger: insert-first with ON CONFLICT DO NOTHING; a conflict means replay — acknowledge and skip. Service role only.';
alter table public.launchpad_stripe_events enable row level security;
revoke all on public.launchpad_stripe_events from anon, authenticated;

create table if not exists public.launchpad_founding_pass_claims (
  tenant_id uuid primary key references public.launchpad_tenants (id) on delete cascade,
  stripe_payment_intent text,
  claimed_at timestamptz not null default now()
);
alter table public.launchpad_founding_pass_claims enable row level security;
create policy launchpad_founding_claims_select on public.launchpad_founding_pass_claims
  for select to authenticated using (public.launchpad_is_member(tenant_id));

-- Cap enforcement: advisory lock + count. Called by the webhook (service role).
create or replace function public.launchpad_claim_founding_pass(
  t uuid, p_payment_intent text, cap int default 50
) returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  n int;
begin
  perform pg_advisory_xact_lock(hashtext('launchpad_founding_pass'));
  if exists (select 1 from public.launchpad_founding_pass_claims where tenant_id = t) then
    return true; -- already claimed (idempotent for webhook replays)
  end if;
  select count(*) into n from public.launchpad_founding_pass_claims;
  if n >= cap then
    return false; -- oversold — caller flags for refund; never silently grants
  end if;
  insert into public.launchpad_founding_pass_claims (tenant_id, stripe_payment_intent)
  values (t, p_payment_intent);
  return true;
end;
$$;
revoke execute on function public.launchpad_claim_founding_pass(uuid, text, int) from anon, authenticated;
