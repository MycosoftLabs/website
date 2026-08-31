# Cursor → Claude: backend complete for payment UI — Aug 13, 2026

| Field | Value |
|---|---|
| **Date** | August 13, 2026 |
| **From** | Cursor (backend lane) |
| **To** | Claude (full payment pipeline UI) |
| **Branch / PR** | `feat/launchpad-backend-aug12` · [PR #260](https://github.com/MycosoftLabs/website/pull/260) |
| **Worktree** | `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website-cursor-launchpad` |
| **Claude tree** | `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website` — **do not switch**; still `feat/launchpad-full-surface-aug13` |
| **Merge order** | **#260 → #262** (unchanged) |

No secrets. No CUI. Mycosoft is pursuing CMMC L2 (Self-Assessment), not assessed compliant.

Cursor did **not** edit pricing pages, NeuButton, NavLink, or checkout UI.

---

## Payment UI — POST these

| When | Method | Route | Body | Notes |
|---|---|---|---|---|
| Pricing CTA / buy | **POST** | `/api/fusarium/launchpad/billing/public-checkout` | `{ lookupKey, email, company? }` | Anonymous. Returns `{ url }`. Flag `LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED`. **503** if off. |
| Welcome confirm | **GET** | `/api/fusarium/launchpad/billing/public-checkout?session_id=` | — | Confirms Stripe session. **Grants nothing.** |
| After signup + workspace | **POST** | `/api/fusarium/launchpad/onboarding` | `{ companyName, accepted[] }` | Auto-claims paid pending rows for **verified auth email**. |
| Manual claim | **POST** | `/api/fusarium/launchpad/billing/claim` | `{}` (ignore email in body) | Same claim rule. 403 `email_unverified` / `tenant_required`. |
| In-app upgrade (existing tenant) | **POST** | `/api/fusarium/launchpad/billing/checkout` | `{ lookupKey }` | `requireTenant({ roles: owner, admin })`. Do not use for anonymous pricing. |
| FeatureGate | **GET** | `/api/fusarium/launchpad/entitlements` | — | `{ featureGate, creditBalance, … }` — nav may show locked modules. |
| Billing state | **GET** | `/api/fusarium/launchpad/billing/state` | — | Tenant subscription row; webhook is source of truth. |
| Payout posture (ops) | **GET** | `/api/fusarium/launchpad/billing/payouts` | — | Booleans only. Owner/admin. |

**Lookup keys (whitelist — entire catalog):**

`fus_launchpad_launch_pass` · `fus_launchpad_core_monthly` · `fus_launchpad_core_annual` · `fus_launchpad_ops_monthly` · `fus_launchpad_ops_annual` · `fus_launchpad_origin_monthly` · `fus_launchpad_origin_annual` · `fus_launchpad_partner_monthly` · `fus_launchpad_partner_annual` · `fus_launchpad_credits_100` · `fus_launchpad_credits_500` · `fus_launchpad_credits_2000` · `fus_launchpad_advisory_15` · `fus_launchpad_advisory_30` · `fus_launchpad_advisory_60` · `fus_launchpad_advisory_90`

Success URL already set: `/fusarium/launchpad/welcome?session_id={CHECKOUT_SESSION_ID}`. Cancel: `/fusarium/launchpad/pricing`.

---

## Other Cursor-owned routes (already on this branch; this pass hardened)

| Area | Routes |
|---|---|
| Stripe webhook | `POST /api/fusarium/launchpad/stripe/webhook` — tenant grants **or** `launchpad_pending_purchases` when `lp_source=public_pricing` and no `lp_tenant_id`. Kinds: plan / pass / credits / advisory. |
| DocuSign | `GET/POST /signatures` · `GET/PATCH /signatures/:id` · `POST /signatures/:id/remind` · `GET /signatures/signers` · `GET /signatures/oauth` · `GET /signatures/oauth/callback` · `POST /signatures/webhook` |
| Cal.com | `GET/POST /advisory/booking` · `POST /advisory/webhook` — no fake slots; 503 if unconfigured. Service client guarded **before** insert. |
| AI / KMS | `GET/POST /ai/connections` · `POST /ai/complete` · `GET /ai/ledger` — envelope decrypt is service-role + tenant predicate; 503 `kms_unconfigured` without master key. |
| Collectors | `POST /radar/ingest` + `scripts/launchpad/run-nightly-collectors.ts` (task `Mycosoft-LaunchpadCollectors`). Alerts now written on fit-match and amendments. |
| Entitlements | `GET /entitlements` FeatureGate. |
| Workbook | `GET/PATCH /workbook` — accepts `walkthrough:<walkthroughId>:<stepId>` as well as the 21 product-tour ids. |
| Dashboard / ASA | `GET /dashboard` per-panel `unavailable`; `GET /asa/indicators` 503 if either query fails (no fake zeros). |
| Security flags | `GET /settings/security` uses `isLaunchpadEnabled()` (`1` **or** `true`). |
| OAuth state | `GET /signatures/oauth` fails closed without `LAUNCHPAD_OAUTH_STATE_SECRET` ∥ KMS master ∥ `NEXTAUTH_SECRET`. |

---

## Migration to apply

`supabase/migrations/20260814010000_launchpad_pending_purchases.sql`

Service-role only. No authenticated SELECT (claim is server-side).

---

## Env (names)

`LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED` · `LAUNCHPAD_ENABLED` · `STRIPE_SECRET_KEY` · `STRIPE_LAUNCHPAD_WEBHOOK_SECRET` · `LAUNCHPAD_KMS_MASTER_KEY` · `LAUNCHPAD_KMS_MASTER_KEY_ID` · DocuSign / Cal.com names in `LAUNCHPAD_ENV_BLUE_GREEN_TEMPLATE_AUG12_2026.md`.

Prod workspace flag stays **off** until Morgan. Storefront flag is a **separate** Morgan flip.

---

## Stripe account posture (2026-08-13, no secrets)

Live key present. `charges_enabled=false`, `payouts_enabled=false`, `details_submitted=false`. **Do not tell Morgan money reaches the bank tonight** until Dashboard onboarding clears. Re-run `npx tsx scripts/launchpad/report-stripe-payouts.ts`.

## Still not code (honest)

- Counsel: terms / refund / auto-renewal before charging strangers.
- Stripe Dashboard: identity + bank → `payouts_enabled`.
- Cal.com account + event types (Morgan).
- DocuSign customer OAuth client secret if still empty.
- Signed Local Agent installers, PreVeil/Exostar OAuth, transactional email, operator analytics.

---

*Mycosoft, LLC is pursuing CMMC Level 2 (Self-Assessment); nothing here claims achieved compliance.*
