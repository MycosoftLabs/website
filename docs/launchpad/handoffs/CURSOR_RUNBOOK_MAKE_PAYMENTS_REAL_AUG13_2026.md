# Cursor runbook: make the Payment card real

**Date:** August 13, 2026 · **From:** Claude · **Branch:** `feat/launchpad-full-surface-aug13` · **Commit:** `f751ca46`
**Goal:** Step 2 "Payment" on `/fusarium/launchpad/checkout` renders a live Stripe widget, a real card is charged, and the workspace provisions itself.
**Repo is PUBLIC.** Env var **names** only below — never paste a key value into this file, a commit, or a chat.

Right now that card renders: *"Payments are not configured in this environment."* That is a single missing env var. Everything else below turns one payment into a provisioned account.

---

## STEP 1 — Make the widget appear (5 minutes)

`app/fusarium/launchpad/checkout/page.tsx` mounts Stripe Embedded Checkout only when `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set. It is currently absent.

1. Stripe Dashboard → **Developers → API keys** → copy the **Publishable key** (`pk_test_…` to start).
2. Add to `.env.local` (gitignored) **and** to both blue-green deployment secret sets:

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY   # pk_test_… now, pk_live_… at go-live
STRIPE_SECRET_KEY                    # sk_test_… now, sk_live_… at go-live
STRIPE_LAUNCHPAD_WEBHOOK_SECRET      # whsec_… from Step 3
LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED=1  # opens online sales
```

`NEXT_PUBLIC_*` is **baked at build time** — with `output: 'standalone'` and blue-green images, changing it requires a rebuild, not just a restart. Set it before you build the image.

**Verify:** load `/fusarium/launchpad/checkout?plan=core&billing=monthly`, fill the three fields, press *Continue to payment*. Stripe's card form must render inline. If it says "not configured," the publishable key did not reach the build.

---

## STEP 2 — Turn on the payment methods Morgan asked for

Stripe Dashboard → **Settings → Payment methods**. Enable, on the **same account** as the secret key:

| Method | Notes |
|---|---|
| **Cards** | On by default |
| **Apple Pay / Google Pay** | Require domain verification — Dashboard → Payment methods → Apple Pay → add `mycosoft.com` |
| **Link** | One-click for returning Stripe users |
| **Cash App Pay** | US only; toggle on |
| **PayPal** | Availability varies by account/region; toggle if offered |
| **ACH Direct Debit** | Cheapest for the $999 tier — 0.8% capped at $5 vs 2.9% + 30¢ |

The checkout session sets **no** `payment_method_types`, deliberately — Stripe serves whatever the account has enabled. **Enabling a method is a Dashboard toggle, never a code change or deploy.**

**Cryptocurrency:** Stripe Checkout does **not** settle arbitrary crypto. Their crypto offering is a separate stablecoin/onramp product with its own onboarding. It is not covered by this integration — it needs its own decision. Do not tell Morgan it works because Checkout is live.

---

## STEP 3 — Register the webhook (this is what provisions accounts)

Payment succeeding is not the same as the customer getting a workspace. The webhook does that.

1. Dashboard → **Developers → Webhooks → Add endpoint**
2. URL: `https://mycosoft.com/api/fusarium/launchpad/stripe/webhook`
3. Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
4. Copy the signing secret → `STRIPE_LAUNCHPAD_WEBHOOK_SECRET`

Local testing:
```bash
stripe listen --forward-to localhost:3010/api/fusarium/launchpad/stripe/webhook
```

---

## STEP 4 — The code you must write (the only real gap)

`app/api/fusarium/launchpad/stripe/webhook/route.ts:65` currently reads:

```ts
const tenantId = session.metadata?.lp_tenant_id;
if (!tenantId || !lookupKey) { /* ignored as "not a launchpad session" */ }
```

**A public sale has no `lp_tenant_id`** — the buyer has no account yet. So every public purchase is currently **accepted by Stripe and dropped on the floor.** This is the one change that turns money into an account.

### 4.1 Table

```sql
create table public.launchpad_pending_purchases (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text unique not null,      -- idempotency
  stripe_customer_id text,
  stripe_subscription_id text,
  email text not null,                          -- from Stripe, already verified by them
  contact_name text,
  company text,
  lookup_key text not null,
  plan_key text,
  kind text not null,                           -- plan | pass | credits | advisory
  amount_total int,
  claimed_at timestamptz,
  claimed_tenant_id uuid references public.launchpad_tenants(id),
  created_at timestamptz not null default now()
);
alter table public.launchpad_pending_purchases enable row level security;
-- No authenticated policy: service-role only. A buyer never reads this table
-- directly; the claim happens server-side against their verified auth email.
create index on public.launchpad_pending_purchases (lower(email)) where claimed_at is null;
```

### 4.2 Webhook branch

In `checkout.session.completed`, **before** the existing "no lp metadata" bail-out:

```ts
if (!tenantId && session.metadata?.lp_source === 'public_pricing') {
  const email = session.customer_details?.email ?? session.customer_email;
  if (!email) { outcome = { handled: false, reason: 'public sale without email' }; break; }
  await svc.from('launchpad_pending_purchases').upsert({
    stripe_session_id: session.id,                 // replay-safe
    stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null,
    stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : null,
    email,
    contact_name: session.metadata?.lp_contact_name ?? null,
    company: session.metadata?.lp_company ?? null,
    lookup_key: lookupKey,
    plan_key: session.metadata?.lp_plan_key ?? null,
    kind: session.metadata?.lp_kind ?? 'plan',
    amount_total: session.amount_total ?? null,
  }, { onConflict: 'stripe_session_id' });
  outcome = { handled: true, pending_purchase: true };
  break;
}
```

Metadata I already set on every public session: `lp_source='public_pricing'`, `lp_lookup_key`, `lp_kind`, `lp_plan_key`, `lp_company`, `lp_contact_name`.

### 4.3 The claim — the security-critical part

When a user completes Supabase signup and onboarding:

```ts
// Match ONLY on the authenticated user's verified email from the session.
// NEVER on an email from a request body, a query param, or a session_id the
// client hands you — that would let anyone claim someone else's purchase.
const { data: { user } } = await supabase.auth.getUser();
const pending = await svc.from('launchpad_pending_purchases')
  .select('*')
  .ilike('email', user.email)      // case-insensitive
  .is('claimed_at', null)
  .order('created_at', { ascending: false })
  .limit(1).maybeSingle();
```

Then, in a transaction: create the tenant → apply entitlements exactly as the existing tenant path does for that `lookup_key` → stamp `claimed_at` + `claimed_tenant_id`.

**Please review this yourself rather than trusting my sketch.** It is the one place in this flow where a bug is a security incident, and it is your lane.

### 4.4 `/fusarium/launchpad/welcome`

Both flows return to `…/welcome?session_id={CHECKOUT_SESSION_ID}`. **That page does not exist yet** — a paying customer currently lands on a 404. Give me a `GET /billing/session/:id` returning `{ paid, email, lookupKey, planName, claimed }` (service-role, read-only, no secrets) and **I will build the page within the hour.** It should confirm payment, then walk the buyer into signup → claim.

---

## STEP 5 — Test with fake money first

`4242 4242 4242 4242`, any future expiry, any CVC. Also worth running: `4000 0000 0000 9995` (declined) and `4000 0025 0000 3155` (3-D Secure).

Full pass, in order:
1. `/fusarium/launchpad/pricing` → toggle **Annual** → confirm Partner Mesh Pro reads **$9,990**
2. Click **Choose Partner Mesh Pro** → checkout shows **Partner Mesh Pro / $9,990 / per year**
3. Fill details → *Continue to payment* → widget renders inline
4. Pay with the test card
5. `launchpad_pending_purchases` has a row with the right email and `lookup_key`
6. Sign up with the same email → tenant created, Partner Mesh Pro entitlements applied
7. Re-send the same webhook event → **no duplicate row, no double grant** (idempotency)
8. Repeat once for a credit pack and once for an advisory session

---

## STEP 6 — Live money (Morgan + Stripe, not code)

**A successful Checkout Session is not money in the bank.** Stripe holds payouts until all of these are true:

- [ ] Account in **live mode**
- [ ] **Business details + tax ID** submitted and verified
- [ ] **Bank account connected**, payout schedule set
- [ ] **Identity verification cleared**
- [ ] Live webhook endpoint registered (Step 3 repeated in live mode — the secret differs)
- [ ] All 16 lookup keys confirmed on **live** prices attached to **live** products
- [ ] `pk_live_…` / `sk_live_…` in both blue-green colors, image rebuilt

**If the first four are incomplete, cards get charged and the funds sit in Stripe.** Please confirm this state explicitly to Morgan — he intends to test with real money.

**Also required before charging strangers:** a reachable refund/cancellation policy and subscription auto-renewal disclosure. Our terms are still DRAFT pending counsel. Card-network rules and consumer-protection law both require it; this is a genuine blocker, not a formality.

---

## The 16 lookup keys (authoritative — `lib/launchpad/catalog.ts`)

```
fus_launchpad_launch_pass
fus_launchpad_core_monthly        fus_launchpad_core_annual
fus_launchpad_ops_monthly         fus_launchpad_ops_annual
fus_launchpad_origin_monthly      fus_launchpad_origin_annual
fus_launchpad_partner_monthly     fus_launchpad_partner_annual
fus_launchpad_credits_100         fus_launchpad_credits_500      fus_launchpad_credits_2000
fus_launchpad_advisory_15         fus_launchpad_advisory_30
fus_launchpad_advisory_60         fus_launchpad_advisory_90
```

Prices resolve **by lookup key at runtime**, so test and live differ only by which secret key is loaded — no code change at cutover. The client may only send a lookup key; it can never send a price or an amount.

---

## Order of operations

**#260 must merge before #262.** `main` has no `lib/launchpad` at all — no `catalog.ts`, `tenant-context.ts`, or `glass-button.tsx` — and my pages import all three, so #262 cannot build on main until your backend lands. Then I rebase, the duplicate history drops out, and both the conflict and the two borrowed CodeQL alerts disappear together.

**Worktree rule:** this directory stays on `feat/launchpad-full-surface-aug13`. It was checked out onto another branch mid-edit twice today, silently reverting live UI including the whole glass system. Anything else gets its own worktree.

---

*Mycosoft, LLC is pursuing CMMC Level 2 (Self-Assessment). No purchase flow may state or imply certification, eligibility, or an award.*
