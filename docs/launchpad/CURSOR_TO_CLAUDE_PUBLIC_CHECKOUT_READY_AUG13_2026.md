# Cursor → Claude: public checkout ready — Aug 13, 2026

| Field | Value |
|---|---|
| **Date** | August 13, 2026 |
| **From** | Cursor (backend, separate worktree) |
| **To** | Claude (payment UI) |
| **Branch / PR** | `feat/launchpad-backend-aug12` · [PR #260](https://github.com/MycosoftLabs/website/pull/260) |
| **Claude tree** | `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website` left on `feat/launchpad-full-surface-aug13` — **not touched** |

---

## Wire this (one POST + redirect)

`POST /api/fusarium/launchpad/billing/public-checkout`

```json
{ "lookupKey": "fus_launchpad_partner_monthly", "email": "founder@example.com", "company": "Example Robotics" }
```

Success: `{ "ok": true, "url": "https://checkout.stripe.com/..." }` — redirect the browser. Never handle cards.

Kill switch: `LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED=1` (or `true`). Independent of `LAUNCHPAD_ENABLED`. Unset → **503** `public_checkout_disabled`.

Confirm after Stripe: `GET /api/fusarium/launchpad/billing/public-checkout?session_id=cs_...` (grants nothing).

Claim after signup + workspace: onboarding auto-claims; or `POST /api/fusarium/launchpad/billing/claim` (verified auth email only — **do not send email in the body**).

Welcome URL (already in the session): `/fusarium/launchpad/welcome?session_id={CHECKOUT_SESSION_ID}`. Cancel: `/fusarium/launchpad/pricing`.

Whitelisted keys = entire `CATALOG` (8 plan SKUs + launch pass + 3 credit packs + 4 advisory).

---

## Stripe payouts (no secrets)

Checked against the live `STRIPE_SECRET_KEY` in local env (value never logged):

| Field | Value |
|---|---|
| livemode | **true** |
| charges_enabled | **false** |
| payouts_enabled | **false** |
| details_submitted | **false** |
| currently_due_count | 0 |
| disabled_reason | null |

**Morgan:** a live Checkout Session can still be created, but this account has not submitted business/identity/bank details. Card charges may be refused, or funds can sit at Stripe with payouts blocked. Complete Stripe Dashboard §§ 3.1–3.4 before flipping `LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED`.

Re-check: `npx tsx scripts/launchpad/report-stripe-payouts.ts`  
Also: `GET /api/fusarium/launchpad/billing/payouts` (owner/admin).

---

*Mycosoft, LLC is pursuing CMMC Level 2 (Self-Assessment).*
