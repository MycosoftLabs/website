-- FUSARIUM Launchpad — DocuSign signature pipeline + Cal.com advisory credits.
-- Date: 2026-08-13. Non-CUI workspace: envelope metadata + hashes only. No signed PDF bytes.
-- Extends live schema (do not recreate AI connections / ops tables).

-- ---------------------------------------------------------------------------
-- Signer registry (GTM §21.5 authorized-official workflow)
-- ---------------------------------------------------------------------------
create table if not exists public.launchpad_signer_roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  email text not null check (char_length(email) between 3 and 320),
  title text,
  is_authorized_official boolean not null default false,
  mfa_confirmed_at timestamptz,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, email)
);

comment on table public.launchpad_signer_roles is
  'Per-tenant signer registry. is_authorized_official marks who may attest under §21.5. No signature images.';

alter table public.launchpad_signer_roles enable row level security;
create policy launchpad_signer_roles_all on public.launchpad_signer_roles
  for all to authenticated
  using (public.launchpad_is_member(tenant_id))
  with check (public.launchpad_is_member(tenant_id));

create index if not exists launchpad_signer_roles_tenant_idx
  on public.launchpad_signer_roles (tenant_id);

alter table public.launchpad_authorized_officials
  add column if not exists mfa_confirmed_at timestamptz;

-- ---------------------------------------------------------------------------
-- Tenant DocuSign OAuth connection (customer account — their audit trail)
-- Tokens are recoverable credentials (same custody class as BYO AI keys).
-- ---------------------------------------------------------------------------
create table if not exists public.launchpad_docusign_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'revoked', 'error', 'pending')),
  docusign_account_id text,
  docusign_base_uri text,
  docusign_user_id text,
  token_ciphertext bytea,
  token_dek_wrapped bytea,
  token_kms_key_id text,
  token_last4 text,
  expires_at timestamptz,
  last_error text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (tenant_id)
);

comment on table public.launchpad_docusign_connections is
  'Customer DocuSign OAuth tokens under envelope encryption. Authenticated role cannot read ciphertext. Mycosoft JWT is not the default customer send path.';

alter table public.launchpad_docusign_connections enable row level security;
create policy launchpad_docusign_connections_select on public.launchpad_docusign_connections
  for select to authenticated using (public.launchpad_is_member(tenant_id));
create policy launchpad_docusign_connections_insert on public.launchpad_docusign_connections
  for insert to authenticated
  with check (public.launchpad_has_role(tenant_id, array['owner', 'admin']));
create policy launchpad_docusign_connections_update on public.launchpad_docusign_connections
  for update to authenticated
  using (public.launchpad_has_role(tenant_id, array['owner', 'admin']))
  with check (public.launchpad_has_role(tenant_id, array['owner', 'admin']));
revoke delete on public.launchpad_docusign_connections from anon, authenticated;

revoke select, insert, update on public.launchpad_docusign_connections from anon, authenticated;
grant select (id, tenant_id, status, docusign_account_id, docusign_base_uri, docusign_user_id,
              token_kms_key_id, token_last4, expires_at, last_error, created_by, created_at, revoked_at)
  on public.launchpad_docusign_connections to authenticated;
grant insert (tenant_id, status) on public.launchpad_docusign_connections to authenticated;
grant update (status, revoked_at, last_error) on public.launchpad_docusign_connections to authenticated;

-- ---------------------------------------------------------------------------
-- Envelopes — metadata + hash only (GTM §10.6)
-- ---------------------------------------------------------------------------
create table if not exists public.launchpad_signature_envelopes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  document_id uuid references public.launchpad_generated_documents (id) on delete set null,
  provider text not null default 'docusign',
  provider_envelope_id text,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'delivered', 'completed', 'declined', 'voided', 'expired')),
  signers jsonb not null default '[]'::jsonb,
  sent_at timestamptz,
  completed_at timestamptz,
  completed_doc_sha256 text
    check (completed_doc_sha256 is null or completed_doc_sha256 ~ '^[a-f0-9]{64}$'),
  completed_doc_uri text,
  provider_cert_ref text,
  reminder_at timestamptz,
  void_reason text,
  authorized_official_attestation jsonb,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.launchpad_signature_envelopes is
  'E-signature envelopes. Stores envelope id, signer roles, completion time, and final document hash. NEVER stores signature images or signed PDF bytes. Status transitions from Connect webhook are service-role only.';

alter table public.launchpad_signature_envelopes enable row level security;
create policy launchpad_signature_envelopes_select on public.launchpad_signature_envelopes
  for select to authenticated using (public.launchpad_is_member(tenant_id));
create policy launchpad_signature_envelopes_insert on public.launchpad_signature_envelopes
  for insert to authenticated
  with check (public.launchpad_is_member(tenant_id));
create policy launchpad_signature_envelopes_update on public.launchpad_signature_envelopes
  for update to authenticated
  using (public.launchpad_has_role(tenant_id, array['owner', 'admin']))
  with check (public.launchpad_has_role(tenant_id, array['owner', 'admin']));
revoke delete on public.launchpad_signature_envelopes from anon, authenticated;

create index if not exists launchpad_signature_envelopes_tenant_idx
  on public.launchpad_signature_envelopes (tenant_id, created_at desc);
create unique index if not exists launchpad_signature_envelopes_provider_idx
  on public.launchpad_signature_envelopes (tenant_id, provider, provider_envelope_id)
  where provider_envelope_id is not null;

create table if not exists public.launchpad_signature_webhook_events (
  provider_event_id text primary key,
  provider text not null default 'docusign',
  type text,
  payload_hash text not null,
  tenant_id uuid,
  envelope_id uuid,
  outcome jsonb,
  received_at timestamptz not null default now()
);

comment on table public.launchpad_signature_webhook_events is
  'DocuSign Connect idempotency ledger. Payload hash only — never the signed file.';

alter table public.launchpad_signature_webhook_events enable row level security;
revoke all on public.launchpad_signature_webhook_events from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Advisory credits (Stripe gate) + Cal.com booking metadata
-- ---------------------------------------------------------------------------
create table if not exists public.launchpad_advisory_credits (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  sku text not null,
  minutes int not null check (minutes in (15, 30, 60, 90)),
  status text not null default 'unredeemed'
    check (status in ('unredeemed', 'redeemed', 'expired', 'refunded')),
  stripe_event_id text,
  redeemed_at timestamptz,
  booking_id uuid,
  created_at timestamptz not null default now()
);

comment on table public.launchpad_advisory_credits is
  'Minted on Stripe checkout.session.completed for advisory SKUs. Redeemed by Cal.com BOOKING_CREATED. No meeting content.';

alter table public.launchpad_advisory_credits enable row level security;
create policy launchpad_advisory_credits_select on public.launchpad_advisory_credits
  for select to authenticated using (public.launchpad_is_member(tenant_id));
revoke insert, update, delete on public.launchpad_advisory_credits from anon, authenticated;

create unique index if not exists launchpad_advisory_credits_stripe_idx
  on public.launchpad_advisory_credits (stripe_event_id)
  where stripe_event_id is not null;
create index if not exists launchpad_advisory_credits_tenant_idx
  on public.launchpad_advisory_credits (tenant_id, status);

create table if not exists public.launchpad_advisory_bookings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.launchpad_tenants (id) on delete cascade,
  credit_id uuid references public.launchpad_advisory_credits (id) on delete set null,
  sku text not null,
  minutes int not null,
  status text not null default 'pending'
    check (status in ('pending', 'scheduled', 'cancelled', 'completed')),
  calcom_booking_id text,
  scheduled_at timestamptz,
  booking_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.launchpad_advisory_bookings is
  'Cal.com booking metadata (time, sku, status). Never stores meeting content. Advisory is guidance — not legal representation or certification.';

alter table public.launchpad_advisory_bookings enable row level security;
create policy launchpad_advisory_bookings_select on public.launchpad_advisory_bookings
  for select to authenticated using (public.launchpad_is_member(tenant_id));
create policy launchpad_advisory_bookings_insert on public.launchpad_advisory_bookings
  for insert to authenticated
  with check (public.launchpad_is_member(tenant_id));
revoke update, delete on public.launchpad_advisory_bookings from anon, authenticated;

create table if not exists public.launchpad_calcom_webhook_events (
  provider_event_id text primary key,
  type text,
  payload_hash text not null,
  tenant_id uuid,
  outcome jsonb,
  received_at timestamptz not null default now()
);

alter table public.launchpad_calcom_webhook_events enable row level security;
revoke all on public.launchpad_calcom_webhook_events from anon, authenticated;
