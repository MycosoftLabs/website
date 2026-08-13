# Cursor: the payment system is built — here is exactly what remains

**Date:** August 13, 2026 · **From:** Claude · **To:** Cursor
**Commit:** `f751ca46` on `feat/launchpad-full-surface-aug13` (PR #262)
**Repo is PUBLIC.** Env var **names** only — never values.

I built the front-end payment path end to end rather than only specifying it, because Morgan needs to sell. Below is what exists, what I deliberately did **not** touch in your lane, and the precise list of what makes money actually land in the bank.

---

## 1. What I built (done, committed, type-clean)

### `POST /api/fusarium/launchpad/billing/public-checkout` — new, anonymous
Sits **alongside** your `../checkout` route; I did not relax auth on yours.

- Caller sends a **catalog `lookupKey`** — never a price id, never an amount. Whitelisted against `lib/launchpad/catalog.ts`; the price is resolved from Stripe at runtime by lookup key. A tampered request cannot invent a cheaper price or buy a product we don't sell.
- Two modes: hosted redirect (`{url}`) and **`ui_mode: 'embedded'`** (`{clientSecret}`).
- `mode: 'subscription'` for plan SKUs, `'payment'` for pass/credits/advisory, read from the catalog `kind`.
- Metadata carries billing identity only — `lp_source`, `lp_lookup_key`, `lp_kind`, `lp_plan_key`, `lp_company`, `lp_contact_name`. **No readiness data, no CUI.**
- IP rate-limited (in-process; see §4.1).
- **Own switch: `LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED`** — deliberately NOT `LAUNCHPAD_ENABLED`, so sales can open while the workspace stays closed, and checkout can be killed without taking the app down. Fails closed with an honest 503.

### `/fusarium/launchpad/checkout` — new page
Account details and payment on one screen, which is how SaaS signup actually works:

- **Step 1** — name, work email, company. Collected *before* the session is created, so the Stripe customer, the pending purchase, and the eventual Supabase user all agree on one email instead of a payment landing with no idea whose workspace it is.
- **Step 2** — Stripe **Embedded Checkout** mounted directly beneath. Card fields live inside Stripe's iframe: they never touch our DOM, our state, or our servers, which is what keeps us out of PCI scope.
- Every payment method enabled on the Stripe account appears automatically — card, Apple Pay, Google Pay, Link, Cash App Pay, PayPal, bank debit. **Enabling one is a Dashboard setting, not a deploy.**
- Order summary renders from the catalog. Verified: Partner Mesh Pro → **$999**, 60-minute advisory → **$325**.

### Pricing page
Billing toggle drives every price; plan cards select and highlight; every plan, the Launch Pass, each credit pack and each advisory length routes to checkout **carrying its own SKU**. Add-on rows are individually purchasable rather than funnelling through one generic CTA.

### Dependency added
`@stripe/react-stripe-js@^6.8.1` (`@stripe/stripe-js` and `stripe` were already present).

---

## 2. What YOU still own — the money path

### 2.1 Webhook: a purchase with no tenant yet
`checkout.session.completed` currently assumes a known tenant. A public sale has none. Add: when `metadata.lp_source === 'public_pricing'` and there is no `lp_tenant_id`, write a **pending purchase** — `launchpad_pending_purchases` (stripe_customer_id, email, lookup_key, plan_key, billing, session_id, created_at, claimed_at) — instead of provisioning blindly.

Onboarding then claims it **by matching the verified Supabase auth email**. Never a value from a request body: otherwise anyone could claim someone else's purchase. This is the single most security-sensitive piece left.

### 2.2 `/fusarium/launchpad/welcome`
Both flows return there with `?session_id=`. Needs a route that reads the session, confirms payment, and walks the buyer into Supabase signup → claim. **I can build the page** the moment the pending-purchase table and a `GET /billing/session/:id` (or similar) exist — tell me the shape and it's an hour.

### 2.3 Env, both blue-green colors
| Name | Purpose |
|---|---|
| `LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED` | `1` opens online sales |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | **required** for the embedded widget to mount; safe in the browser by design |
| `STRIPE_SECRET_KEY` | live key |
| `STRIPE_LAUNCHPAD_WEBHOOK_SECRET` | live webhook signing secret |

Without the publishable key the page renders "Payments are not configured in this environment" — honest, but it will not take money.

### 2.4 The part that is not code at all — Morgan + Stripe Dashboard
**A successful Checkout Session is not the same as money in the bank.** Stripe holds payouts until:

1. Account is in **live mode**
2. **Business details + tax ID** submitted and verified
3. **Bank account connected**, payout schedule set
4. **Identity verification cleared**
5. Live **webhook endpoint registered** at the public URL
6. The 16 live prices confirmed attached to live **products** in the live account

**If 1–4 are incomplete, cards get charged and the funds sit in Stripe.** Please confirm this state explicitly — Morgan is planning to test with real money tonight.

### 2.5 Crypto
Morgan asked for cryptocurrency. Stripe's standard Checkout **does not** settle arbitrary crypto; their crypto product is a separate onramp/stablecoin path with its own onboarding. Cash App Pay and PayPal are available through the Dashboard today; **crypto needs a separate decision and probably a separate provider.** I did not silently pretend it was covered.

### 2.6 Legal gate
Refund/cancellation policy and the subscription auto-renewal disclosure must be real and reachable from checkout before charging strangers. Our terms are still DRAFT pending counsel. This is a genuine blocker, not a formality.

---

## 3. Merge order (proven by inspection)

**#260 → #262.** Main has **no** `lib/launchpad` — no `catalog.ts`, no `tenant-context.ts`, no `glass-button.tsx`. My pages import all three, so #262 cannot build on main until your backend lands. #261 is merged and conflicts with nothing here.

## 4. Known limitations I am flagging rather than hiding

1. **Rate limiting is in-process.** Fine for launch traffic on one container; it does not survive a restart and does not coordinate across blue-green colors. A shared limiter (Upstash/KV) belongs here before real volume.
2. **Test the whole flow in Stripe TEST mode first** — card `4242 4242 4242 4242`. The route works identically in test; only the keys differ.
3. The pending-purchase claim (§2.1) is the one place a bug becomes a security incident. Please review that logic carefully rather than accepting mine on trust — I did not write it, deliberately, because it is your lane.

---

## 5. Working-tree rule that must hold

Today the shared worktree was checked out onto another branch mid-edit **twice**, silently reverting live UI work — including the entire glass system — and costing hours. Both other lanes have now moved to separate worktrees. **Please keep it that way:** this directory stays on `feat/launchpad-full-surface-aug13`. Anything else gets its own worktree.

---

*Mycosoft, LLC is pursuing CMMC Level 2 (Self-Assessment). No purchase flow may state or imply certification, eligibility, or an award.*
