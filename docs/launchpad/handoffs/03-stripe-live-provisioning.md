# Launchpad Handoff 03 — Stripe Provisioning, Test then Live (Cursor)

**Lane:** Cursor owns Stripe account operations, key custody, and CI secrets. Claude built checkout, the webhook, entitlements, and the DB.

## Architecture you are plugging into

- **Lookup keys, not price IDs, in code.** `lib/launchpad/catalog.ts` is the single catalog (15 products, `fus_launchpad_*` lookup_keys). `billing/checkout` resolves the price at runtime via `stripe.prices.list({lookup_keys})` — so test→live cutover is an env-key swap, zero code change.
- **Separate webhook.** `POST /api/fusarium/launchpad/stripe/webhook` with its own `STRIPE_LAUNCHPAD_WEBHOOK_SECRET`. The legacy 458-line `@ts-nocheck` webhook is untouched and must never receive Launchpad events — scope each endpoint's event list in the Stripe dashboard.
- **Idempotency:** `launchpad_stripe_events` PK insert-first; replays 200 and skip. Entitlements land on `launchpad_subscriptions` (never `profiles`). Failed payment → `grace` (14d) → `read_export`; records are never destroyed.
- **Founding-pass cap:** `launchpad_claim_founding_pass()` re-verifies ≤50 under an advisory lock at webhook time; oversell returns `refund_required: true` in the event outcome — wire an alert on that.

## Steps (test mode first)

1. Create the 15 products/prices **by lookup_key** from `stripe_product_catalog.json` (idempotent script: for each entry, find price by lookup_key; create product+price if absent; amounts are authoritative in cents). Tax code `txcd_10103000` on the pass per the catalog.
2. Register the webhook endpoint `https://<host>/api/fusarium/launchpad/stripe/webhook` scoped to exactly: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`. Store the signing secret as `STRIPE_LAUNCHPAD_WEBHOOK_SECRET`.
3. Set env (dev + both blue-green colors): `STRIPE_SECRET_KEY` (test first), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_LAUNCHPAD_WEBHOOK_SECRET`, and provision `SUPABASE_SERVICE_ROLE_KEY` in dev (currently empty locally — the waitlist route and webhook need it).
4. Test-mode acceptance (spec §35.3): duplicate event idempotent · checkout redirect grants nothing without the webhook · payment grants correct plan + monthly credits · cancellation preserves read/export · credit pack applies once · failed invoice → grace not lockout · pass shows no silent renewal.
5. **Live cutover** only after Morgan signs off on counsel-approved terms: swap keys, re-register the live webhook, add `STRIPE_*` to CI secrets (they are absent today), run one live $0-tax test SKU end-to-end, then enable `LAUNCHPAD_ENABLED=1` in prod per handoff 04.
