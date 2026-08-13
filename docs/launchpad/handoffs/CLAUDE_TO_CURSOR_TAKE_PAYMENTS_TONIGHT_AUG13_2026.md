# Cursor: make Launchpad take real money

**Date:** August 13, 2026 · **From:** Claude (frontend) · **To:** Cursor (backend/infra)
**Goal, in Morgan's words:** *"If I made a payment tonight for one of these plans, money is coming directly to our bank account now."*
**Repo is PUBLIC.** Env var **names** only — never values, never keys.

---

## The one-line summary

The pricing page is finished and honest, but **nothing on it can charge a card.** The only checkout route in the codebase requires an authenticated tenant, so a visitor can never reach it. Closing that is **one route plus one webhook branch** — everything else (products, prices, webhook, entitlements) already exists.

## What I finished on the front end (done, committed, PR #262)

- Billing toggle (monthly/annual) drives every displayed price.
- Plan cards are selectable and highlight when chosen.
- Each CTA carries `?plan=<key>&billing=<monthly|annual>`.
- `/get-started` resolves that against `lib/launchpad/catalog.ts` and renders **that plan's** real name, price, and entitlements — verified: Partner Mesh Pro shows $999 (annual $9,990), Core $149, and only the no-plan default shows the $397 pass.
- The chosen plan posts with the form (`selectedPlan`, `selectedBilling`, `selectedLookupKey`).
- Fixed: `NeuButton` hard-forced `type="button"` after spreading props, so **every NeuButton inside a form was dead** — the get-started submit included. Fixed: form `<select>` rendered white-on-white. Fixed: glass CTAs are aligned and the floating shadow artifact is gone.

**So the funnel works right up to the moment money should change hands, and then stops at a database insert.**

---

## What you build (in order)

### 1. `POST /api/fusarium/launchpad/billing/public-checkout` — the missing route

Full spec in `CLAUDE_TO_CURSOR_PUBLIC_CHECKOUT_SPEC_AUG13_2026.md`. Essentials:

- **Anonymous.** Do NOT call `requireTenant()`. Do not relax auth on the existing tenant route — build alongside it.
- Request: `{ lookupKey, email, company? }`.
- **Whitelist `lookupKey` against `CATALOG`.** Never accept a price ID or an amount from the client — that is the price-tampering hole.
- Resolve the live price **by lookup key at runtime** (test/live IDs differ, lookup keys don't).
- `mode: 'subscription'` for plan SKUs; `'payment'` for pass/credits/advisory (read `kind` from the catalog).
- `metadata`: `lp_lookup_key`, `lp_plan_key`, `lp_billing`, `lp_source: "public_pricing"`. **No readiness data, no CUI.**
- `success_url` → `/fusarium/launchpad/welcome?session_id={CHECKOUT_SESSION_ID}`; `cancel_url` → `/fusarium/launchpad/pricing`.
- Return `{ url }`. Rate-limit by IP + email — this is unauthenticated and creates Stripe objects.
- **Own kill switch: `LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED`.** Do NOT gate on `LAUNCHPAD_ENABLED` — Morgan wants to sell while the workspace stays closed. Fail closed with an honest 503.

### 2. Webhook: handle a purchase with no tenant yet

`checkout.session.completed` already works for known tenants. Add: when `metadata.lp_source === "public_pricing"` and there is no `lp_tenant_id`, write a **pending purchase** (`launchpad_pending_purchases`: stripe_customer_id, email, lookup_key, plan_key, billing, session_id, created_at, claimed_at) instead of provisioning blindly.

The buyer then signs up via Supabase auth, and onboarding claims it **by matching the verified auth email** — never a value from a request body, or anyone could claim someone else's purchase.

### 3. The part that actually gets money into the bank — Morgan + Stripe dashboard

A live Checkout Session is not enough. **Payouts require all of this on the Stripe account**, and none of it is code:

| # | Item | Owner |
|---|---|---|
| 3.1 | Stripe account in **live mode** (not test) | Morgan |
| 3.2 | **Business details + tax ID** submitted and verified | Morgan |
| 3.3 | **Bank account connected** and payout schedule set | Morgan |
| 3.4 | Identity verification cleared (Stripe holds payouts until this passes) | Morgan |
| 3.5 | Live **webhook endpoint registered** at the public URL + live signing secret in deployment secrets (`STRIPE_LAUNCHPAD_WEBHOOK_SECRET`) | Cursor |
| 3.6 | Live secret key in both blue-green colors (`STRIPE_SECRET_KEY`) | Cursor |
| 3.7 | Confirm the 16 live prices are attached to live **products** in the live-mode account | Cursor |

**If 3.1–3.4 are not complete, a customer's card can be charged and the funds sit in Stripe with payouts blocked.** Please verify these before flipping the switch rather than after the first sale.

### 4. Legal gate before real money

Terms, refund/cancellation policy, and the subscription auto-renewal disclosure must be real and reachable from checkout. Card networks and consumer-protection rules both require it, and our terms are still DRAFT pending counsel. **This is a genuine blocker on charging strangers, not a formality.**

---

## What I do the moment your route exists

One-line change per CTA: `href` → `onClick` that POSTs `{ lookupKey, email }` and redirects to `session.url`. Plus a `/fusarium/launchpad/welcome` page that confirms the session and walks the buyer into signup → claim. Both are ready to write; they are blocked only on the route.

## Merge order (unchanged, now proven)

**#260 → #262.** I verified main has **no** `lib/launchpad` at all — no `catalog.ts`, no `tenant-context.ts`, no `glass-button.tsx`. My pages import all three, so #262 cannot build on main until your backend lands. #261 (GCS) is already merged and conflicts with neither.

---

## Honest status of "can we take payment tonight"

**Code:** achievable tonight — one route, one webhook branch, one front-end wiring pass.
**Money actually reaching the bank:** depends entirely on §3, which is Stripe account state, not engineering. If the live account is already verified with a bank attached, tonight is realistic. If identity verification is still pending, Stripe will accept charges and hold the funds.

Please reply with the state of 3.1–3.4 so Morgan knows which of those two worlds he is in.

---

*Mycosoft, LLC is pursuing CMMC Level 2 (Self-Assessment). No purchase flow may state or imply certification, eligibility, or an award.*
