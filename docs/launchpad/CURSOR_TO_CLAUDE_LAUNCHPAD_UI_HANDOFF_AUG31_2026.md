# Cursor → Claude: Launchpad UI handoff — Aug 31, 2026

| Field | Value |
|---|---|
| **Date** | August 31, 2026 |
| **Status** | Backend lane ready for UI iteration |
| **From** | Cursor (backend / billing / operator APIs) |
| **To** | Claude (front-end UI polish on marketing + `/app/launchpad`) |
| **Repo** | `WEBSITE/website` |
| **Identity** | **Morgan Rockcoons** (`morgan@mycosoft.org`) — CEO / CTO / COO / SAO. **RJ Ricasata** is CFO, not COO. |

No secrets. No CUI. Mycosoft is **pursuing** CMMC Level 2 (Self-Assessment) — do not say the company is CMMC compliant. Launchpad is **commercial / non-CUI**.

This replaces the Aug 12–13 “keep flags off / waitlist is the door” counsel. Morgan ordered one Stripe buy path, immediate post-pay login, his master workspace, and an operator view.

---

## What is live in code (this pass)

### Canonical URLs

| What | URL |
|---|---|
| Marketing | `/fusarium/launchpad` |
| Pricing | `/fusarium/launchpad/pricing` |
| **Buy (only payment door)** | `/fusarium/launchpad/checkout` |
| Legacy waitlist URL | `/fusarium/launchpad/get-started` → **server redirect** to checkout (keeps `?plan=&billing=&item=`) |
| Founding-50 leftover | `/fusarium/launchpad/founding-50` → checkout |
| Post-pay | `/fusarium/launchpad/welcome?session_id={CHECKOUT_SESSION_ID}` |
| After activate | `/app/launchpad/onboarding` |
| App index | `/app/launchpad` → `/app/launchpad/dashboard` |
| The tool | `/app/launchpad/dashboard` |
| Operator | `/app/launchpad/admin` |
| Morgan login | `/login?redirectTo=/app/launchpad/dashboard` |

There is still **no** `/fusarium/launchpad/success`.

### Flags (request-time server env; fail closed unless set)

| Flag | Meaning | Local (`.env.local`) |
|---|---|---|
| `LAUNCHPAD_ENABLED` | Authenticated app + BFF. Off → 404. | `1` |
| `LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED` | Anonymous Stripe checkout. Unset → 503. | `1` |
| `NEXT_PUBLIC_LAUNCHPAD_WAITLIST_MODE` | Leftover waitlist **copy** only. Default **off**. | `0` |

Marketing pages stay public even when the workspace flag is off.

### Seeded master workspace

`npx tsx scripts/launchpad/seed-morgan-admin.ts` granted **Partner Mesh Pro** to the existing `morgan@mycosoft.org` auth user.

- Tenant id: `6cf9763c-1b75-43bf-b986-26cecfa260ab`
- Plan: `partner_mesh_pro` via lookup `fus_launchpad_partner_monthly`
- User was **not** newly created

Morgan still needs a **Supabase session** as that email. Site `super_admin` does **not** silently own every tenant.

---

## Ownership split (do not cross)

### Cursor owns (ask Cursor; do not reinvent)

- Stripe public checkout, webhook, activate, entitlements, grants
- `LAUNCHPAD_*` flags and blue-green / sandbox env
- Operator APIs under `/api/fusarium/launchpad/admin/*`
- SAM collector + radar ingest
- AI router, KMS envelope, MYCA fallback
- Deploy, Cloudflare purge, Docker slot cutover
- Seed / lookup-key verification scripts

### Claude owns (this is your lane)

- Marketing visual polish (hero, pricing cards, checkout intake UI, welcome states)
- Authenticated workspace UX: empty states, onboarding copy, FeatureGate plates, nav density
- Operator page UX (`/app/launchpad/admin`) — layout, filters, mobile
- Honest empty / error / unconfigured states — **never mock data**
- Hand backend asks back to Cursor in a dated `CLAUDE_TO_CURSOR_*_AUG31_2026.md` (or later date) under `docs/launchpad/`

### Shared rules

- No mock / fake / sample tenant rows
- No hardcoded secrets
- No CUI in this stack
- Do not flip RJ to COO
- Do not edit website pages Morgan did not ask for outside Launchpad
- Do not `docker compose up` on sandbox (kills the live green slot / tunnel)

---

## APIs Claude may call (UI only)

Prefix all paths with `/api/fusarium/launchpad`.

### Public / buyer

| When | Method | Route | Notes |
|---|---|---|---|
| Start pay | **POST** | `/billing/public-checkout` | `{ lookupKey, email, company? }` → `{ url }` or 503 |
| Confirm session | **GET** | `/billing/session/:id` or public-checkout `?session_id=` | Read-only. Grants nothing. |
| Activate | **POST** | `/billing/activate` | `{ session_id }`. If the current session email matches Stripe, `loggedIn: true` and `lp_tenant` is set. Existing other-email: `loggedIn: false`, `magicLinkSent: true`. |
| Publishable key | **GET** | `/billing/publishable-key` | Live/test pk only — never log it in docs. |

Welcome already consumes activate. If you restyle welcome, keep: never claim “you’re in” when `loggedIn` is false; show the emailed-link sentence when `magicLinkSent` is true.

### Authenticated workspace (session + membership + `LAUNCHPAD_ENABLED`)

| When | Method | Route |
|---|---|---|
| Who am I / tenant | **GET** | `/tenant` → `{ state, tenant?, isOperator, acceptance }` |
| Pick tenant | **POST** | `/tenant` `{ tenantId }` |
| Dashboard BFF | **GET** | `/dashboard` |
| Entitlements | **GET** | `/entitlements` |
| Billing state | **GET** | `/billing/state` |
| In-app upgrade | **POST** | `/billing/checkout` `{ lookupKey }` |
| **Stripe portal** | **POST** | `/billing/portal` → `{ url }` (Launchpad customer, **not** NatureOS `/api/stripe/portal`) |
| AI complete | **POST** | `/ai/complete` |
| Radar / readiness / etc. | existing BFFs | Honest empty if no rows |

`GET /tenant` now includes `isOperator`. TenantGate shows **Operator** nav for `morgan@mycosoft.org` / `admin@mycosoft.org` and allows `/app/launchpad/admin` even before a tenant exists.

### Operator only (session email allowlist)

| Method | Route | Body / result |
|---|---|---|
| GET | `/admin/tenants` | Commercial rollup: name, owner email, plan, Stripe ids, member count |
| GET | `/admin/health` | Supabase / MINDEX / MAS probes, flags, SAM / Cal.com / DocuSign honesty |
| GET | `/admin/activity` | Latest audit events + pending purchases |
| POST | `/admin/grant` | `{ tenantId, lookupKey }` |
| POST | `/admin/revoke` | `{ tenantId, lookupKey }` — cancels matching plan row, does not delete data |
| POST | `/admin/switch-tenant` | `{ tenantId }` — upserts **admin** membership for that tenant only + `lp_tenant` cookie |
| POST | `/admin/radar` | Runs real SAM collector; `{ skipped: true, reason: "sam_not_configured" }` if no key |

403 `operator_required` for everyone else. Do not treat site `super_admin` as a Launchpad god-mode.

---

## Catalog lookup keys (do not invent SKUs)

`fus_launchpad_launch_pass` · `fus_launchpad_core_monthly` · `fus_launchpad_core_annual` · `fus_launchpad_ops_monthly` · `fus_launchpad_ops_annual` · `fus_launchpad_origin_monthly` · `fus_launchpad_origin_annual` · `fus_launchpad_partner_monthly` · `fus_launchpad_partner_annual` · `fus_launchpad_credits_100` · `fus_launchpad_credits_500` · `fus_launchpad_credits_2000` · `fus_launchpad_advisory_15` · `fus_launchpad_advisory_30` · `fus_launchpad_advisory_60` · `fus_launchpad_advisory_90`

Prices resolve at runtime by Stripe `lookup_key`.

---

## Honest gaps (render these; do not fake)

| Area | Truth |
|---|---|
| Contract Radar | Empty until `SAM_API_KEY` / `DATA_GOV_API_KEY` and an ingest run. Operator button is wired. |
| Cal.com advisory | 503 / `calcom_unconfigured` until booking base + event types are set. |
| DocuSign | Unconfigured until OAuth/JWT env is present. |
| Legal | Terms / AUP still **DRAFT** until counsel. Do not claim counsel-cleared. |
| KMS / BYO AI | Envelope decrypt 503 without `LAUNCHPAD_KMS_MASTER_KEY`. |
| Managed AI | If no BYO/managed key, router tries real **MYCA** `POST {MAS}/api/myca/chat`. If MAS is down, `no_provider` / `mas_unreachable` — never a fake completion. |
| Email | Supabase Auth sends magic links. There is no second Launchpad mailer. |
| Stripe portal | Needs a `stripe_customer_id` on the tenant subscription (real checkout). Seeded Partner Mesh has no Stripe customer until Morgan pays or you attach one. |
| Prod flags | Code is ready. Sandbox/prod Docker still needs `LAUNCHPAD_ENABLED=1` and `LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED=1` on the **serving slot**. Blue-green: never stop green until the candidate returns HTTP 200. Do not `docker compose up`. |

---

## How Claude hands work back to Cursor

Create `docs/launchpad/CLAUDE_TO_CURSOR_<TOPIC>_MMM<DD>_2026.md` with:

1. What UI landed (routes + components)
2. Exact API contract you need changed (method, path, request, expected JSON)
3. What you already verified in the browser (localhost:3010)
4. What you did **not** touch (billing, webhook, deploy)

Cursor will implement the API, keep this split, and return a dated reply.

Suggested first UI pass:

1. Checkout + welcome (post-pay, magic-link copy)
2. Onboarding → dashboard empty states that say “not set up yet” with a real next action
3. Operator table density / mobile
4. FeatureGate plates that sell the next SKU via `/billing/checkout`, not waitlist

---

## Local verify

```text
http://localhost:3010/fusarium/launchpad
http://localhost:3010/fusarium/launchpad/checkout
http://localhost:3010/login?redirectTo=/app/launchpad/dashboard
http://localhost:3010/app/launchpad/admin
```

Dev server: `npm run dev:next-only` on **3010** only (external terminal). After `.env.local` flag changes, restart 3010.

---

## Related

- Prior API catalog: `CURSOR_TO_CLAUDE_BACKEND_COMPLETE_AUG13_2026.md` (flags/waitlist guidance in that doc is **superseded**)
- Sandbox serving path: MAS `docs/WEBSITE_SANDBOX_RESILIENCE_ARMED_AUG31_2026.md`
- Seed: `scripts/launchpad/seed-morgan-admin.ts`
