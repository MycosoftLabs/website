# Cursor → Claude — Stripe keys, sandbox proof, live bake (August 13, 2026)

**Date:** August 13, 2026  
**Status:** Phase 1 live path proven (account + sandbox session + hosted checkout). Publishable-key image bake in flight.  
**Did not switch** `WEBSITE/website`. Did not stop `mycosoft-website-blue-wedged`. No secrets in this file.

## Live account (`GET /v1/account` with live secret)

| Field | Value |
|---|---|
| `charges_enabled` | **true** |
| `payouts_enabled` | **true** |
| `details_submitted` | **true** |
| Default currency | `usd` |
| `capabilities.card_payments` | `active` |
| Card payment method | available / display on |
| Payout schedule | daily |

Both charge and payout flags are true, so the account can take cards and pay out. Do not print bank details.

## Creds (paths only)

| Path | Written |
|---|---|
| `MAS/mycosoft-mas/.credentials.local` | Y (gitignored) |
| `WEBSITE/website-cursor-launchpad/.env.local` | Y (gitignored) |
| GitHub repo + `production` env secrets `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY` | Y |

Git status did not stage those files.

## Sandbox / test

| Check | Result |
|---|---|
| Test restricted key can list prices | Y |
| Catalog lookup_key `fus_launchpad_core_monthly` in **test** mode | N (0 prices) — used existing test $149 price |
| Test Checkout Session created | **Y** `cs_test_a1XpBCQg0xuRpeOXmk3iBGgwzuFSa3bNzmzUiekCWMLZMIkk97GDsfmYSa` |
| Session `status` | `open` |
| Session URL | `checkout.stripe.com` HTTP 200 |
| Livemode | false |
| Test webhook endpoint | created `we_1U4AwcExoi95oZvKmzgD5Ytx` → `https://sandbox.mycosoft.com/api/fusarium/launchpad/stripe/webhook` |
| Test webhook secret | stored as `STRIPE_LAUNCHPAD_WEBHOOK_SECRET_TEST` in gitignored files only |

Live webhook already existed (enabled) at the same path for `checkout.session.completed`, subscription update/delete, `invoice.paid`, `invoice.payment_failed`.

## Production (before pk bake)

| Check | Result |
|---|---|
| Active slot | **blue** (`mycosoft-website-blue`, healthy) |
| Image (pre-bake) | `ghcr.io/mycosoftlabs/website:production-latest` SHA `931b2059f4a90b6361ccc221b1f777a98ce4a0ad153bbbf6ae7335faa05a4715` |
| Git SHA on main at trigger | `ca1f49bd` |
| NAS mount | `/opt/mycosoft/media/website/assets` → `/app/public/assets` |
| `STRIPE_SECRET_KEY` on blue/green | live prefix, set |
| `LAUNCHPAD_ENABLED` | true |
| `LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED` | true |
| Origin `POST` empty body | **400** `unknown_product` — **not 503** |
| Origin `POST` `fus_launchpad_core_monthly` | **200**, hosted Checkout URL on `checkout.stripe.com` |
| Live catalog prices | Core monthly + Launch Pass present |
| Instant Deploy (no-cache bake `pk_live`) | run `31764152988` — in progress at write time |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in running blue image | **not baked yet** (hosted Checkout still works; embedded widget needs the bake) |

## Dashboard clicks (if anything still blocks)

Account API says activated. Remaining Dashboard items only if a buyer cannot pay:

1. **Payment methods** — enable Card (already on via API). Optionally Apple Pay / Google Pay / Link / Cash App / PayPal.
2. If Instant Deploy fails, re-run Instant Deploy on `main` with `no_cache=true` after confirming the GitHub secret `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` exists.

No Activate / bank-link click is required unless a later `/v1/account` read shows `charges_enabled=false` or `payouts_enabled=false`.
