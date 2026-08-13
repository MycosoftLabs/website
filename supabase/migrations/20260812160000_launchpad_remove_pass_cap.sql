-- FUSARIUM Launchpad — remove the pass cohort cap.
--
-- 20260811090200_launchpad_billing.sql shipped a capped "Founding 50" cohort:
-- a claims table plus launchpad_claim_founding_pass(), which counted claims
-- under an advisory lock and refused the 51st buyer (flagging it for refund).
--
-- That cap was lifted from the spec package and was never a real business
-- constraint. Launchpad is not seat-limited, and a public seat counter tells
-- customers how small the book is. This migration removes the mechanism at the
-- source so no future caller can reintroduce a limit by passing a `cap`.
--
-- Safe to run: the launchpad_* schema has never served a paying customer
-- (LAUNCHPAD_ENABLED has been off in every environment), so there are no
-- claims to preserve. The table is dropped rather than left dormant — a
-- scarcity counter that still exists is a scarcity counter someone re-wires.

begin;

-- The webhook no longer calls this; drop before the table it reads.
drop function if exists public.launchpad_claim_founding_pass(uuid, text, int);

drop table if exists public.launchpad_founding_pass_claims;

-- The one-time pass itself survives, renamed. Existing rows carry the old plan
-- key only in environments that were seeded for local demos.
update public.launchpad_subscriptions
   set plan_key = 'launch_pass_30d'
 where plan_key = 'founding_pass_30d';

update public.launchpad_credit_ledger
   set reason = 'launch_pass_grant'
 where reason = 'founding_pass_grant';

-- Column name is internal and referenced by routes outside this lane, so it
-- keeps its name for now; only the customer-facing vocabulary changed.
comment on column public.launchpad_subscriptions.founding_pass_expires_at is
  'Expiry of the one-time Launch Pass (30 days of Core). No cohort cap exists; do not add one.';

comment on table public.launchpad_waitlist is
  'Get-started enquiries from the public marketing site. Non-CUI intake only. Service-role access only.';

commit;
