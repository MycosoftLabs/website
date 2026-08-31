-- FUSARIUM Launchpad — persist whether provision created the auth user,
-- and stop duplicate first-run term rows. Date: 2026-08-14.
-- No CUI. No secrets.

alter table public.launchpad_pending_purchases
  add column if not exists user_was_created boolean;

comment on column public.launchpad_pending_purchases.user_was_created is
  'True only when this purchase created the auth user. Activate auto-login requires this.';

create unique index if not exists launchpad_terms_acceptances_once_idx
  on public.launchpad_terms_acceptances (tenant_id, user_id, doc_key, doc_version);
