# Cursor spec: public Stripe checkout (take money from the pricing page)

**Date:** August 13, 2026 · **From:** Claude · **To:** Cursor
**Why:** The pricing page cannot accept payment. Today its CTAs land on `/fusarium/launchpad/get-started`, which inserts a row into `launchpad_waitlist`. That is a lead form, not a purchase. This spec is the one route that closes the gap.
**Repo is PUBLIC.** Env var names only — never values.

---

## 1. What exists now (verified, not assumed)

| Piece | State |
|---|---|
| Stripe products + live prices | **Done.** 16/16 lookup keys verified live by you, incl. all plan SKUs. |
| `POST /api/fusarium/launchpad/billing/checkout` | Exists, but calls `requireTenant({ roles: ['owner','admin'] })` — **an anonymous visitor cannot call it.** It is the in-app upgrade path, not a storefront. |
| `stripe/webhook` | **Done.** Already handles `checkout.session.completed`, is idempotent via `launchpad_stripe_events`, derives entitlements, writes `launchpad_subscriptions`. |
| `LAUNCHPAD_ENABLED` | Unset in prod; fails closed. `requireTenant()` 404s while off — so it also blocks any tenant-scoped checkout. |
| Plan selection on `/pricing` | **Done (mine, PR #262).** Billing toggle + selectable cards; CTA carries `?plan=<key>&billing=<monthly\|annual>`; `/get-started` resolves it against the catalog and posts `selectedPlan` / `selectedBilling` / `selectedLookupKey`. |

**The gap is exactly one thing:** there is no checkout route an unauthenticated buyer can reach.

## 2. Build: `POST /api/fusarium/launchpad/billing/public-checkout`

**Deliberately a separate route from the tenant one** — different trust model, different failure modes. Do not relax auth on the existing route.

### Request
```json
{ "lookupKey": "fus_launchpad_partner_monthly", "email": "founder@example.com", "company": "Example Robotics" }
```

### Rules
1. **Whitelist `lookupKey` against `lib/launchpad/catalog.ts`.** Reject anything not in `CATALOG`. Never let a caller pass a raw price ID or amount — that is the classic price-tampering hole.
2. Resolve the live Stripe price **by lookup key at runtime** (test and live IDs differ; lookup keys do not). Already how the tenant route works — reuse it.
3. Create a Stripe Checkout Session:
   - `mode`: `subscription` for plan SKUs, `payment` for `launch_pass` / credits / advisory (read `kind` from the catalog).
   - `customer_email` from the request.
   - `metadata`: `lp_lookup_key`, `lp_plan_key`, `lp_billing`, `lp_company`, `lp_source: "public_pricing"`. **No readiness data, no CUI, no control states in metadata** (GTM §24.1).
   - `success_url` → `/fusarium/launchpad/welcome?session_id={CHECKOUT_SESSION_ID}`
   - `cancel_url` → `/fusarium/launchpad/pricing`
4. Return `{ url }`. The page redirects; we never handle card data.
5. **Rate-limit by IP** (and email). This is an unauthenticated endpoint that creates Stripe objects — it will get scraped.
6. **Do NOT gate this on `LAUNCHPAD_ENABLED`.** That flag hides the authenticated app; the storefront needs its own switch. Add `LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED` so Morgan can open sales before opening the workspace, and so checkout can be killed independently. Fail closed with an honest 503.

### Webhook — one addition
`checkout.session.completed` already grants entitlements for a known tenant. For a public session there is **no tenant yet**. Add: when `metadata.lp_source === "public_pricing"` and no `lp_tenant_id` is present, create a **pending purchase** record (`launchpad_pending_purchases`: stripe_customer_id, email, lookup_key, plan_key, billing, session_id, created_at, claimed_at) rather than provisioning blindly.

The buyer then signs up (Supabase auth) and onboarding claims the pending purchase by matching the verified email → creates the tenant → applies entitlements. **Claim on the verified auth email only**, never on a value from the request body, or anyone could claim someone else's purchase.

## 3. What I do on the front end once it lands

- Pricing CTAs post `{ lookupKey, email }` and redirect to `session.url` instead of routing to `/get-started`.
- New `/fusarium/launchpad/welcome` that reads `session_id`, confirms the purchase, and walks the buyer into signup → claim.
- `/get-started` stays as the no-payment path (lead capture / "talk to us first"), which is still worth having.

One line changes on my side: `href` → `onClick` that calls the route. Everything else is already built.

## 4. Honesty constraints (unchanged)

Prices render from `lib/launchpad/catalog.ts` only — never invented, never hardcoded in a component. No claim that purchase confers compliance, certification, eligibility, or an award. The Launch Pass must keep saying it does not silently convert to a subscription. Refund/cancel terms need to be real before this takes live money — that is a Morgan + counsel item, not a code item.

## 5. Sequencing

This is independent of the merge queue and can be built now. My PR #262 is blocked behind **#260** — main has no `lib/launchpad` at all (verified: no `catalog.ts`, no `tenant-context.ts`, no `glass-button.tsx`), so my pages cannot build on main until your backend lands. Order stays **#260 → #262**.

---

*Mycosoft, LLC is pursuing CMMC Level 2 (Self-Assessment). Nothing in the purchase flow may state or imply otherwise.*
