# Cursor → Claude — Stripe auth verified — Aug 12, 2026

| Field | Value |
|---|---|
| **Date** | August 12, 2026 |
| **From** | Cursor (backend / Stripe ops) |
| **To** | Claude (visual / marketing — do not redo UI) |
| **Repo / branch** | `WEBSITE/website` · `feat/launchpad-backend-aug12` ([PR #260](https://github.com/MycosoftLabs/website/pull/260)) |
| **Prod flag** | `LAUNCHPAD_ENABLED` **stays OFF** in sandbox/prod |

**No secrets in this document.** Env var *names* only. This repo is public.

Morgan completed Stripe MCP/plugin login. This note is the live-path verification after that login. Cursor did **not** touch Launchpad UI.

---

## MCP auth status

| Item | Result |
|---|---|
| `plugin-stripe-stripe` server | **ready** (not `needsAuth`) |
| Accounts in this session | **One:** `Mycosoft sandbox` (`acct_1SqidzExoi95oZvK`) |
| Mode | **test** (`livemode=false`) |
| Live Stripe account on MCP | **Not linked** — MCP cannot see live prices/webhooks |

The Launchpad checkout BFF (`app/api/fusarium/launchpad/billing/checkout/route.ts`) uses gitignored `STRIPE_SECRET_KEY`, which is **live**. So MCP test-mode emptiness does **not** block tenant checkout.

To drive live catalog from MCP later, add the **live** Mycosoft Stripe account in the plugin (Dashboard → connected accounts). Do not swap local `.env.local` to test keys unless you intend to charge test cards only.

---

## Catalog (16/16 lookup keys)

Source of truth: `lib/launchpad/catalog.ts`.

| Mode | How verified | Launchpad keys |
|---|---|---|
| **Live** (what checkout uses) | `STRIPE_SECRET_KEY` from gitignored `.env.local` — values never printed | **16/16 present** |
| **Test** (MCP sandbox) | Stripe MCP `GetPrices` / `GetProducts` | **0/16** Launchpad keys. Sandbox still has legacy NatureOS / MycoBrain prices with **no** `fus_launchpad_*` lookup keys |

Live Launch Pass: lookup_key `fus_launchpad_launch_pass`, one-time USD 39700, price id `price_1U3kwTIJZUAr9AGrnkhlA6vI`, livemode=true. Matches the earlier backend handoff. No prices created this session (none missing on live).

`fus_launchpad_founding_pass` remains unused by catalog — ignore if archived.

---

## Webhook

| Item | Result |
|---|---|
| Live endpoint | **`we_1U3kwsIJZUAr9AGrHLlUqdU9`** **enabled** |
| URL | **`https://sandbox.mycosoft.com/api/fusarium/launchpad/stripe/webhook`** (exact match) |
| Events | `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed` |
| MCP test-mode endpoints | **none** |
| `STRIPE_LAUNCHPAD_WEBHOOK_SECRET` | **present** in gitignored `.env.local` (not printed, not committed) |

Not recreated.

---

## Checkout resolve (no charge)

Server-side `stripe.prices.list({ lookup_keys: [...] })` against the live secret: **PASS** for all 16 keys, including `fus_launchpad_launch_pass`. No Checkout Session created. Morgan was not charged.

Local flag: `LAUNCHPAD_ENABLED=1` already in `.env.local`. Dev **3010** was **up** (HTTP 200). Prod/sandbox flag **not** flipped.

---

## Unauthenticated local BFF (localhost:3010)

| Request | Status | Body code | 500? |
|---|---|---|---|
| `POST /api/fusarium/launchpad/billing/checkout` (no session, valid JSON) | **401** | `auth_required` | no |
| `POST` checkout with invalid JSON | **401** | `auth_required` (auth runs before JSON parse) | no |
| `GET` checkout | **405** | — | no |
| `POST /api/fusarium/launchpad/stripe/webhook` (no / bad signature) | **400** | `invalid signature` | no |

Configured-but-unauthenticated behavior is 401/400, not 500.

---

## PASS / FAIL table

| Piece | PASS/FAIL | Notes |
|---|---|---|
| Stripe MCP authenticated | **PASS** | Mycosoft sandbox, test mode |
| MCP sees live Launchpad catalog | **FAIL** | Live account not in MCP session |
| Live 16/16 lookup keys | **PASS** | Via `STRIPE_SECRET_KEY` |
| `fus_launchpad_launch_pass` live | **PASS** | `price_1U3kwTIJZUAr9AGrnkhlA6vI` |
| Test-mode 16/16 Launchpad keys | **FAIL** | Optional later; checkout does not use this account |
| Live webhook URL | **PASS** | sandbox.mycosoft.com Launchpad path, enabled |
| `STRIPE_LAUNCHPAD_WEBHOOK_SECRET` in `.env.local` | **PASS** | gitignored; never printed |
| Checkout lookup resolve (no charge) | **PASS** | 16/16 live |
| Unauth checkout | **PASS** | 401 `auth_required` |
| Unauth/bad-sig webhook | **PASS** | 400 `invalid signature` |
| Local `LAUNCHPAD_ENABLED=1` | **PASS** | `.env.local` only |
| Prod/sandbox `LAUNCHPAD_ENABLED` | **OFF** (correct) | Do not flip |

**Overall for Claude visual + tenant checkout path: PASS** (live catalog + webhook + BFF auth). MCP is useful for test-mode ops only until the live account is added to the plugin.

---

## What Claude can assume

1. **Do not redo this Stripe work.** Catalog keys match `catalog.ts`. Checkout will not 400/503 `price_not_provisioned` for `fus_launchpad_launch_pass` on the live secret.
2. Visual verify on **http://localhost:3010** with local flag on. Marketing + liquid + keys UI remain Claude’s lane.
3. A **real tenant checkout** still needs a signed-in owner/admin session. Unauthenticated POST is 401 by design. Do **not** complete a live charge unless Morgan asks.
4. Prod/sandbox `LAUNCHPAD_ENABLED` stays **off** until counsel + Morgan.
5. Stripe **test-mode** Launchpad catalog is still empty. Ignore MCP sandbox products (NatureOS Pro, MycoBrain, etc.) — they are not Launchpad SKUs.

---

## Document control

| Version | Date | Change |
|---|---|---|
| 1.0 | Aug 12, 2026 | MCP login verified; live 16/16 + webhook + unauth BFF |
