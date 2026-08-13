# Cursor → Claude — remaining charge gates — Aug 13, 2026

| Field | Value |
|---|---|
| **Date** | August 13, 2026 (re-verified Aug 12 ~23:55 PT) |
| **From** | Cursor (backend / Stripe ops) |
| **To** | Claude (checkout UI) + Morgan (Dashboard clicks only) |
| **Worktree** | `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website-cursor-launchpad` |
| **Branch / PR** | `feat/launchpad-backend-aug12` · [PR #260](https://github.com/MycosoftLabs/website/pull/260) |
| **Claude tree** | `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website` — **still** `feat/launchpad-full-surface-aug13` (no checkout / switch / commit) |
| **Prod flags** | `LAUNCHPAD_ENABLED` and `LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED` **not** flipped on sandbox/prod |
| **Live charge** | **Not taken** |

No secrets. No CUI. Mycosoft is pursuing CMMC L2 (Self-Assessment), not assessed compliant.

Claude confirmed CodeQL SHA-256 on `hashApiKey` is a **false positive**. Cursor did **not** change it.

---

## Return card

| Gate | Result |
|---|---|
| Publishable key wired | **N** (names present in gitignored env; values empty; never printed) |
| Webhook path + handler on PR #260 | **Y** |
| `launchpad_pending_purchases` migration applied to prod | **N** (2026-08-12 23:55 PT attempt — MCP OAuth did not complete; SQL not executed) |
| Webhook + migration (combined) | **N** until the table exists |
| `charges_enabled` | **false** |
| `payouts_enabled` | **false** |
| `details_submitted` | **false** |
| Claude tree branch unchanged | **Y** (`feat/launchpad-full-surface-aug13`) |

---

## 1. Publishable key — **N**

Searched gitignored `.env.local` in both trees. Values never printed.

| Location | `STRIPE_SECRET_KEY` | `STRIPE_LAUNCHPAD_WEBHOOK_SECRET` | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `STRIPE_PUBLISHABLE_KEY` |
|---|---|---|---|---|
| Claude tree `.env.local` | present (`sk_live` prefix) | present (`whsec_` prefix) | **absent** | **absent** |
| Cursor worktree `.env.local` | copied from Claude (gitignored) | copied | **name appended, value empty** | **name appended, value empty** |

Claude’s embedded checkout (`app/fusarium/launchpad/checkout/page.tsx`) mounts only when `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set. Hosted Checkout (`POST /api/fusarium/launchpad/billing/public-checkout` → `{ url }`) does not need a publishable key on the client.

**Stripe API cannot retrieve the publishable key from the secret key.** Probed `GET /v1/keys`, `/v1/api_keys`, `/v1/application_keys` against the live secret → all **404**. No `pk_live` / `pk_test` value exists in either `.env.local`, `.env.local` backup, `.credentials.local`, or `env.production.generated` (that generated file has the **name** with an empty value).

Cursor browser MCP could not open Dashboard this session (tab create/navigate failed). Did not ask Morgan to paste keys into chat.

### What Morgan clicks (no paste)

1. Open [Stripe Dashboard → Developers → API keys](https://dashboard.stripe.com/apikeys) (live mode, not test).
2. Copy the **Publishable** key (`pk_live_…`) into gitignored `.env.local` as **both**:
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_PUBLISHABLE_KEY`
3. Same names in sandbox/prod **build** env when Claude’s embedded widget must mount on `sandbox.mycosoft.com` (`NEXT_PUBLIC_*` is baked at Docker build). Do not commit. Do not paste into Slack/chat.

Restart local `3010` after the gitignored file changes. Do not flip prod flags.

---

## 2. Pending-purchase webhook — path **Y**, table **N**

### Live Stripe endpoint (re-listed this session)

| Item | Value |
|---|---|
| ID | `we_1U3kwsIJZUAr9AGrHLlUqdU9` |
| URL | `https://sandbox.mycosoft.com/api/fusarium/launchpad/stripe/webhook` |
| Status | **enabled** |
| livemode | **true** |
| Events | `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed` |

This is the public-checkout webhook path. Not recreated.

### Handler writes `launchpad_pending_purchases`

Re-read this session (no rewrite — handler is not broken). On [PR #260](https://github.com/MycosoftLabs/website/pull/260):

- `app/api/fusarium/launchpad/stripe/webhook/route.ts` — `checkout.session.completed` + `lp_source=public_pricing` and no `lp_tenant_id` → `markPendingPurchasePaid`
- `lib/launchpad/billing/public-checkout.ts` — upserts `launchpad_pending_purchases`
- `supabase/migrations/20260814010000_launchpad_pending_purchases.sql`

### Prod Supabase (`hnevnsxnhfibhbsipqvz`)

REST probe with service role (no row data). Re-probed **Aug 12, 2026 ~23:55 PT**:

| Table | HTTP |
|---|---|
| `launchpad_tenants` | 206 (exists) |
| `launchpad_subscriptions` | 206 (exists) |
| `launchpad_stripe_events` | 200 (exists) |
| `launchpad_waitlist` | 206 (exists) |
| `launchpad_credit_ledger` | 206 (exists) |
| **`launchpad_pending_purchases`** | **404 — not in schema cache** |

Migration file is on the PR. **It is not applied** to prod.

#### Apply attempt this session (did not succeed)

| Step | Result |
|---|---|
| `plugin-supabase-supabase` in MCP catalog | **Absent** (same as prior session) |
| Official HTTP MCP added to user `mcp.json` (no secrets; scoped `project_ref=hnevnsxnhfibhbsipqvz&features=database`) | **Y** |
| `user-supabase` tools | **needsAuth** — `mcp_auth` started; OAuth stayed in progress; no browser tab this agent could complete |
| `SUPABASE_ACCESS_TOKEN` / CLI login / DB URL | **Absent** (names only; no values printed) |
| `apply_migration` / `execute_sql` | **Not called** — tools never became available |
| Flags / live charge | Unchanged; no charge |

**Do not treat this as a Morgan Dashboard click.** Remaining Morgan-only gates are still **pk_live** and **Stripe Activate** (identity, bank, ToS). Next agent with a completed Supabase MCP OAuth should `list_tables` / `list_migrations` then `apply_migration` with the exact SQL in `supabase/migrations/20260814010000_launchpad_pending_purchases.sql`, then re-probe until HTTP 206 on `launchpad_pending_purchases`. Until then a live `checkout.session.completed` for public pricing cannot persist a claimable row.

---

## 3. Stripe live account — still incomplete

Re-ran `npx tsx scripts/launchpad/report-stripe-payouts.ts` against gitignored live `STRIPE_SECRET_KEY` (value not logged):

| Field | Value |
|---|---|
| livemode | **true** |
| **charges_enabled** | **false** |
| **payouts_enabled** | **false** |
| **details_submitted** | **false** |
| currently_due_count | 0 |
| past_due_count | 0 |
| disabled_reason | null |
| tos_accepted | **false** |
| country | US |
| type | standard |

Do **not** tell Morgan money reaches the bank tonight.

### What Morgan clicks (identity + bank — no keys)

1. [Stripe Dashboard → Activate account / Business settings](https://dashboard.stripe.com/settings/update) (or the onboarding banner on the home page).
2. **Identity:** legal entity, representative, and ID verification Stripe asks for.
3. **Bank:** payouts bank account (US).
4. Accept the Stripe Services Agreement (`tos_accepted` is currently false).

When `details_submitted`, `charges_enabled`, and `payouts_enabled` are all true, re-run `npx tsx scripts/launchpad/report-stripe-payouts.ts`. Do not flip `LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED` on prod until counsel + Morgan.

A Checkout Session can still be *created* on an incomplete standard account; live card charges can be refused and payouts are blocked. No test charge and no live charge were run this session.

---

## What was not done (by design)

- No `git checkout` / `switch` / `reset` in `WEBSITE\website`
- No edits to `useOpenClaw.ts` / `useDroidChat.ts`
- No CodeQL change to `hashApiKey`
- No prod flag flips
- No live charge
- Temp Stripe probe script deleted; not committed
- Cursor worktree `.env.local` is gitignored (`.gitignore` line 25)

---

*Mycosoft, LLC is pursuing CMMC Level 2 (Self-Assessment); nothing here claims achieved compliance.*
