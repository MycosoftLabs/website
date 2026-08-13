# Cursor → Claude — payments live attempt — Aug 13, 2026

| Field | Value |
|---|---|
| **Date** | August 13, 2026 |
| **From** | Cursor |
| **To** | Claude (Launchpad UI) + Morgan (Stripe Dashboard only) |
| **Worktree** | `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website-cursor-launchpad` |
| **Claude tree** | `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website` — **untouched** (no checkout / switch / reset) |
| **Repo** | Public `MycosoftLabs/website`. Env **names** only — never values. |

No CUI. Mycosoft is **pursuing** CMMC Level 2 (Self-Assessment), not assessed compliant.

---

## Return card

| Gate | Result |
|---|---|
| Welcome URL | `https://mycosoft.com/fusarium/launchpad/welcome` and `https://sandbox.mycosoft.com/fusarium/launchpad/welcome` (also `?session_id=cs_live_…`) |
| Pending table `launchpad_pending_purchases` on prod (`hnevnsxnhfibhbsipqvz`) | **Y** (0 rows at apply; `launchpad_stripe_events` also **Y**) |
| Publishable key wired in build | **N** — no `pk_live` in gitignored env, GH secrets, or Stripe API (`/v1/keys` 404). Do not invent. Hosted Checkout does not need it. |
| CSP `js.stripe.com` in image | **Y after this image** (commit on this branch; was missing from `origin/main` `783d4e90`) |
| `LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED` | Set **true** only on the **new** blue slot after CSP image is healthy — not on live green `783d4e90` |
| `LAUNCHPAD_ENABLED` | Stays **true** |
| Stripe `charges_enabled` | **false** |
| Stripe `payouts_enabled` | **false** |
| Stripe `details_submitted` | **false** |
| Stripe `tos_accepted` | **false** |
| Checkout 503 gone | After cutover of this image + flag on that container |

---

## What shipped (this branch)

1. **CSP** — `https://js.stripe.com` on production + dev `script-src` (`next.config.js`). Needs image rebuild, not an env flip.
2. **Welcome page** — `app/fusarium/launchpad/welcome` reads `session_id`, calls read-only `GET /api/fusarium/launchpad/billing/session/:id`, **does not grant entitlements**, tells the buyer to sign up / sign in with the Stripe email, then onboarding claims.
3. **Pending purchases** — table applied on prod. Webhook `checkout.session.completed` + `lp_source=public_pricing` already upserts via `markPendingPurchasePaid` (on main from #260). Prod was missing **`STRIPE_LAUNCHPAD_WEBHOOK_SECRET`** on the container — that is written to VM `.env` (env_file) so the new slot can verify signatures.
4. **Public checkout flag** — route now uses `isLaunchpadPublicCheckoutEnabled()` (`true` or `1`), not `=== '1'` only.
5. **Hosted Checkout fallback** — if no publishable key, checkout POSTs `embedded: false` and redirects to `https://checkout.stripe.com/…`.
6. **Dockerfile.production** — `ARG/ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` + CI build-arg. Empty until a real `pk_` exists in GitHub secrets. Cache-bust so welcome + session routes register.
7. **Runtime pk endpoint** — `GET /api/fusarium/launchpad/billing/publishable-key` returns only `pk_test_` / `pk_live_` from container env (never `sk_`). Checkout will mount Embedded Checkout if a pk appears at runtime.

## Stripe account (live secret, no dump)

`GET /v1/account` 200. `charges_enabled=false`, `payouts_enabled=false`, `details_submitted=false`. Stripe MCP session is **sandbox only** (`livemode=false`). Live keys mean **test cards will not work**. Checkout session + webhook + pending row can still be created; **money will not hit the bank** until Morgan finishes Dashboard Activate.

## Morgan-only Dashboard (no paste into chat)

1. [Activate Stripe account](https://dashboard.stripe.com/account/onboarding) — identity, bank, ToS (`charges_enabled` / `payouts_enabled` / `details_submitted`).
2. Optional for Embedded widget: [API keys](https://dashboard.stripe.com/apikeys) (live mode) — copy **Publishable** `pk_live_…` into gitignored `.env.local` as `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `STRIPE_PUBLISHABLE_KEY`, and into GitHub Actions secret `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` so the next image bakes it. Do not commit. Do not paste into Slack/chat.

## What Claude can test next (after cutover)

- Fusarium `/defense/fusarium` 200, Launchpad `/fusarium/launchpad` 200, GCS `/natureos/psathyrella` exists.
- `/fusarium/launchpad/welcome` **200** (not 404).
- `POST /api/fusarium/launchpad/billing/public-checkout` is **not** `503 public_checkout_disabled`.
- Checkout: hosted redirect to Stripe (until pk exists). No CSP error on `js.stripe.com` if Embedded mounts.
- After a paid session: pending row in `launchpad_pending_purchases`; welcome shows Stripe email; claim still requires verified auth email.
- Honest: do not tell Morgan a live card funds the bank while `charges_enabled=false`.
