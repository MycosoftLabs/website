# Cursor → Claude — post-pay onboarding and richer intake (August 13, 2026)

**Date:** August 13, 2026  
**Owner split:** Cursor = backend (this handoff). **Claude owns all Launchpad frontend.** Do not restyle pages in this pass.  
**No secrets. No CUI. No mock data.**

## What “logged in access” means

After a successful Stripe payment the buyer must be able to:

1. Land on `/fusarium/launchpad/welcome?session_id={CHECKOUT_SESSION_ID}` (already the Checkout return URL).
2. Call **activate** with that `session_id` (capability token from Stripe — not an email the client invents).
3. Receive a **logged-in session** (Supabase cookies) plus `lp_tenant`.
4. Sit in a real workspace whose **entitlements match the paid `lookupKey` / `planKey`**.
5. Complete **first-run onboarding** (terms) if they have not accepted yet, then use `/app/launchpad/dashboard`.

Pay-and-drop (welcome that only says “go sign up”) is the old contract. Backend now provisions on webhook and activate.

## Built (Cursor) vs Claude must render

| Piece | Status | Claude |
|---|---|---|
| Hosted Checkout + embedded Checkout (`ui_mode=embedded`) | Built | Keep using existing checkout page; add intake fields |
| Public checkout API extra fields | Built (optional so current form still pays) | Collect and POST them |
| `launchpad_pending_purchases` intake columns | Built + applied on prod | Display on welcome / first-run |
| Webhook `checkout.session.completed` → mark paid **and provision** user+tenant+entitlements | Built | Show “workspace ready” when `accessReady` |
| `POST /api/fusarium/launchpad/billing/activate` | Built | Call it from welcome; redirect to `redirectTo` |
| Session lookup expanded | Built | Use new shape; do not grant from this GET |
| `POST /api/fusarium/launchpad/onboarding/accept-terms` | Built | First-run wizard for an **already provisioned** tenant |
| Welcome / checkout / onboarding UI | Unchanged | Claude owns restyle + new fields + activate button |
| Connect marketplace | Not invented | Do not add |

## Extra intake fields + API body

`POST /api/fusarium/launchpad/billing/public-checkout`

Existing:

```json
{
  "lookupKey": "fus_launchpad_core_monthly",
  "email": "work@company.example",
  "name": "Jordan Lee",
  "company": "Example Defense LLC",
  "embedded": true
}
```

Add (commercial / non-CUI only):

| Field | Required for Claude UI | Rules |
|---|---|---|
| `jobTitle` | yes | string, max 120 |
| `companySize` | yes | one of `solo`, `2-10`, `11-50`, `51-200`, `201-1000`, `1000+` |
| `companyWebsite` | no | string, max 300 |
| `applyReason` | **yes** | why they are applying/paying; min 12, max 2000; refuse `CUI//`, ITAR, EAR 99, CTI |
| `intendedUse` | no | max 500; same CUI refuse |

Backend currently does **not** hard-fail if `applyReason` is missing so today’s form still creates a session. Claude should still collect it. Values persist on `launchpad_pending_purchases` and survive the webhook. Stripe metadata only gets short copies (`lp_job_title`, `lp_company_size`, `lp_apply_reason` truncated).

## Redirect URLs

| When | URL |
|---|---|
| Hosted Checkout success | `/fusarium/launchpad/welcome?session_id={CHECKOUT_SESSION_ID}` |
| Embedded Checkout return | same |
| Hosted cancel | `/fusarium/launchpad/pricing?checkout=cancelled` |
| After activate (logged in) | `/app/launchpad/onboarding` |
| After terms | `/app/launchpad/dashboard` |
| Activate could not set cookies | `/login?redirectTo=/app/launchpad/onboarding` (optional `actionLink` in JSON) |

## Webhook events (Launchpad endpoint)

`https://sandbox.mycosoft.com/api/fusarium/launchpad/stripe/webhook`  
Secret: `STRIPE_LAUNCHPAD_WEBHOOK_SECRET` (live). Test secret is `STRIPE_LAUNCHPAD_WEBHOOK_SECRET_TEST` in gitignore only.

| Event | Backend |
|---|---|
| `checkout.session.completed` | Stage paid row; **provision** user + tenant + grant for `public_pricing` |
| `customer.subscription.updated` / `deleted` | Existing tenant subscription sync |
| `invoice.paid` / `invoice.payment_failed` | Existing grace / credits |

Entitlements are never granted by the browser redirect.

## Session-lookup shape

`GET /api/fusarium/launchpad/billing/session/:id`

```json
{
  "paid": true,
  "email": "work@company.example",
  "lookupKey": "fus_launchpad_core_monthly",
  "planName": "FUSARIUM Launchpad Core",
  "claimed": true,
  "kind": "plan",
  "company": "Example Defense LLC",
  "contactName": "Jordan Lee",
  "jobTitle": "COO",
  "companySize": "11-50",
  "companyWebsite": "https://example.example",
  "applyReason": "We need a commercial CMMC readiness workspace.",
  "intendedUse": "Internal readiness only.",
  "accessReady": true,
  "nextStep": "onboarding",
  "activatePath": "/api/fusarium/launchpad/billing/activate"
}
```

`nextStep`: `pay` | `activate` | `onboarding` | `dashboard`.  
GET does **not** log the user in. Claude must POST activate.

## Activate contract

`POST /api/fusarium/launchpad/billing/activate`

```json
{ "session_id": "cs_live_..." }
```

Success:

```json
{
  "ok": true,
  "provisioned": true,
  "alreadyClaimed": false,
  "tenantId": "uuid",
  "email": "work@company.example",
  "loggedIn": true,
  "nextStep": "onboarding",
  "redirectTo": "/app/launchpad/onboarding",
  "dashboardPath": "/app/launchpad/dashboard"
}
```

If `loggedIn` is false, send them to `redirectTo` (login) or `actionLink` (one-time magic link). Identity is always the Stripe email.

## First-run onboarding (provisioned tenant)

Do **not** call `POST /api/fusarium/launchpad/onboarding` if they already have a tenant (409 `already_onboarded`).

Use:

`POST /api/fusarium/launchpad/onboarding/accept-terms`

```json
{ "accepted": ["terms", "privacy", "aup", "non_cui_policy"] }
```

Then send them to `/app/launchpad/dashboard`.

Suggested first-run screens (Claude): confirm company + plan they paid for, show intake `applyReason` read-only, four legal checkboxes, enter workspace. Persistent `COMMERCIAL // NON-CUI` banner. No certification claims.

## Claim fallback

`POST /api/fusarium/launchpad/billing/claim` still matches **verified auth email** only, if someone signs in later instead of activate.

## Claude UI checklist

1. Checkout form: add job title, company size, why applying, optional website / intended use.
2. Welcome: if `paid` and `nextStep === "activate"`, POST activate, then `window.location = redirectTo`.
3. If `loggedIn` and `nextStep === "onboarding"`, render terms wizard against accept-terms.
4. If `accessReady` and terms already done, go to dashboard.
5. Do not invent Connect. Do not put CUI in intake.
