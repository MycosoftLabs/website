# Cursor → Claude — activate auth gate is fixed (August 14, 2026)

**Date:** August 14, 2026  
**Status:** Backend fix shipped. Claude can re-run the full paid journey.  
**Owner split:** Cursor = backend + tests (this). **Claude owns Launchpad UI.** No restyle in this pass.  
**No secrets. No CUI. No mock data.**

`e531dd76` was **docs only** (`docs: report an auth bypass in the activate path`). It did not change `provision.ts` or `activate`. The code fix is on this Cursor ship branch, merged to `main`.

## What changed

### P0 — Auto-login gated on created user

Stripe Checkout does not prove the payer owns the typed email. Provision still **honours the purchase** (tenant + entitlements). Activate **redeems a magic link and sets cookies only when this purchase created the auth user**.

| Case | `created` | `loggedIn` | Cookies | What the buyer sees |
|---|---|---|---|---|
| New email (almost everyone) | `true` | `true` | Auth + `lp_tenant` | Same as before — welcome can send them to onboarding |
| Email already had an account | `false` | `false` | **None** | Your welcome `loggedIn: false` path. A **real** magic link is emailed. No `actionLink` in the JSON |

`actionLink` is never returned on the existing-email branch (that would be the same bypass).

### P0 — Auth lookup past 200 users

`findUserIdByEmail` pages the Auth Admin API (`perPage: 200`) until found or exhausted. If the client later exposes `getUserByEmail`, that is used first. A paid `activate` must not 500 because the user was on page 2+.

### P1 — Acceptance on `GET /tenant`

```json
{
  "state": "ok",
  "tenant": { "id": "uuid", "name": "…", "status": "active" },
  "role": "owner",
  "user": { "email": "work@company.example" },
  "acceptance": {
    "termsVersion": "draft-2026-08-11",
    "accepted": false,
    "docs": []
  }
}
```

`accepted: true` when this `(tenant, user)` has all four docs at `TERMS_VERSION`. Skip the wizard and go to the dashboard.

`POST /onboarding/accept-terms` returns **409 `already_onboarded`** (with `redirectTo` dashboard) if those four rows already exist — your existing “treat 409 as success” branch is now real. A unique index `(tenant_id, user_id, doc_key, doc_version)` stops duplicate ledger rows.

### P1 — 409 memberships (real list, not invented)

`requireTenant` 409 `tenant_selection_required` now includes memberships the session can already see under RLS:

```json
{
  "error": "Select a workspace",
  "code": "tenant_selection_required",
  "memberships": [
    { "id": "uuid", "name": "Workspace A" },
    { "id": "uuid", "name": "Workspace B" }
  ]
}
```

This is the body on **GET/POST `/api/fusarium/launchpad/tenant`**, **POST `/onboarding`**, and any other route that uses `requireTenant` when the user has multiple active memberships and no valid `lp_tenant` cookie. No extra list endpoint. `POST /tenant` `{ tenantId }` still selects among those rows.

Activate itself does **not** 409 for multiple workspaces (new buyers get `lp_tenant` set; existing emails get `loggedIn: false` and sign in first). After sign-in, GET `/tenant` is the picker contract.

## Activate response shape

`POST /api/fusarium/launchpad/billing/activate` `{ "session_id": "cs_live_…" }`

New customer (this purchase created the user):

```json
{
  "ok": true,
  "provisioned": true,
  "alreadyClaimed": false,
  "created": true,
  "tenantId": "uuid",
  "email": "work@company.example",
  "loggedIn": true,
  "nextStep": "onboarding",
  "redirectTo": "/app/launchpad/onboarding",
  "dashboardPath": "/app/launchpad/dashboard"
}
```

Existing account (pay does not prove inbox ownership):

```json
{
  "ok": true,
  "provisioned": true,
  "alreadyClaimed": false,
  "created": false,
  "tenantId": "uuid",
  "email": "work@company.example",
  "loggedIn": false,
  "nextStep": "onboarding",
  "redirectTo": "/login?redirectTo=%2Fapp%2Flaunchpad%2Fonboarding",
  "dashboardPath": "/app/launchpad/dashboard",
  "note": "This email already has an account. Sign in to claim the purchase."
}
```

`created` mirrors `userWasCreated` from provision. Gate auto-login on `created === true` / `loggedIn === true`. Your welcome page already handles `loggedIn: false`.

## Claude — re-run the full journey

1. New email through pricing → Checkout → welcome → activate → expect `created: true`, `loggedIn: true`, onboarding.
2. Existing auth email through the same path → expect `created: false`, `loggedIn: false`, magic link in that inbox, **no** session as that person from activate alone.
3. GET `/tenant` after terms → `acceptance.accepted: true`; skip wizard.
4. Multi-workspace user without `lp_tenant` → 409 with real `memberships`; POST `/tenant` to pick.

Activate is **safe to use on production** with this gate. Do not turn it on against a SHA that lacks this commit.

Mycosoft, LLC is pursuing CMMC Level 2 (Self-Assessment). No purchase flow may state or imply certification, eligibility, or an award.
