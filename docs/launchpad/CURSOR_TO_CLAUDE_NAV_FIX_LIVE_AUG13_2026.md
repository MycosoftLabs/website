# Cursor → Claude — nav fix is live (Aug 13, 2026)

**Date:** August 13, 2026 · **Status:** Live on green  
**Repo is PUBLIC.** Env var names only. No Stripe secrets.

Mycosoft, LLC is **pursuing** CMMC Level 2 (Self-Assessment). This ship does not change that.

---

## What shipped

PR **#265** merged with `--admin` (Morgan is the only GitHub user). Claude’s website checkout was not switched.

| Item | Value |
|---|---|
| Merge SHA on `main` | `a80a887c` (`Merge pull request #265`) |
| Nav fix | `4d46e2c3` |
| Journey test scope | `de401e5e` |
| Handoff commit | `c8b11ba3` |
| Checkout honesty (same PR) | `53f58d75`, `9d2d7294` |
| Live slot | **green** |
| Live image | `ghcr.io/mycosoftlabs/website:manual-a80a887c4c974901e9f390f02d069f07b9d7ccf0` |
| Primary left serving until candidate 200 | Yes (blue stayed up; wedged not touched) |
| Click-rescue left in place | **Y** — still mounted from `AppShellProviders` |

`theme-color-sync.tsx` now sets `content` and does not detach React’s hoistable `<meta>`.

---

## verify-navigation

| Target | Result |
|---|---|
| `https://mycosoft.com` (live green via nginx) | **Y — 4/4 PASS**, soft nav, destination rendered, previous page gone, no page errors |
| `http://192.168.0.187:3001` (socat sidecar, Host = LAN:3001) | N — 0/4, every hop dumped to `/` with a full reload. Probe artifact, not the public origin. |

Production hops that passed:

- `/fusarium/launchpad/pricing` → `/fusarium/launchpad/checkout?plan=core&billing=monthly`
- `/fusarium/launchpad/pricing` → `/fusarium/launchpad/checkout?plan=partner_mesh_pro&billing=monthly`
- `/defense/fusarium` → `/fusarium/launchpad`
- `/fusarium/launchpad` → `/fusarium/launchpad/pricing`

Pricing → checkout did **not** require a document reload on `mycosoft.com`.

---

## Production URLs (200)

| URL | Code |
|---|---|
| `https://mycosoft.com/defense/fusarium` | 200 |
| `https://mycosoft.com/fusarium/launchpad` | 200 |
| `https://mycosoft.com/fusarium/launchpad/checkout` | 200 |
| `https://mycosoft.com/fusarium/launchpad/welcome` | 200 |
| `https://sandbox.mycosoft.com/defense/fusarium` | 200 |
| `https://sandbox.mycosoft.com/fusarium/launchpad` | 200 |
| `https://sandbox.mycosoft.com/fusarium/launchpad/checkout` | 200 |
| `https://sandbox.mycosoft.com/fusarium/launchpad/welcome` | 200 |
| Device card mp4s (`agaric`, `sporebase`, `psathyrella`, `mushroom-1`, `hyphae-1`, `myconode`, `alarm`) | 200 |

Bare `/checkout` is 404. The live storefront path is `/fusarium/launchpad/checkout`.

Cloudflare was purged by Instant Deploy after cutover. Public `X-Active-Slot: green`.

---

## Payments honesty (code live; money is not)

- Automatic payment methods, fallback to `card` only on Stripe’s “No valid payment method types” error.
- Preflight `charges_enabled`; honest `503 stripe_account_not_activated` when the account is not activated.
- `LAUNCHPAD_CHECKOUT_ALLOW_UNACTIVATED=1` is sandbox-only. Do not set it on production.

**Do not tell Morgan a live card funds the bank.** `charges_enabled` is still false until he completes Stripe Dashboard Activate (identity, bank, ToS). Cursor did not complete Activate.

---

## Cutover note

Image built off-box (VM RAM was ~1 GiB free). Instant Deploy Phase B flipped nginx to green after candidate `/api/health` 200, before this session could hold the flip for `verify-navigation`. The live public origin was then gated: **4/4 soft-nav pass**. Blue remains as rollback. `mycosoft-website-blue-wedged` was not stopped.

---

*Cursor did not switch Claude’s `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website` checkout.*
