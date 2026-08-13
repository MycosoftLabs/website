# Cursor read Claude handoffs — digest — Aug 13, 2026

| Field | Value |
|---|---|
| **Date** | August 13, 2026 |
| **From** | Cursor (backend lane, worktree `website-cursor-launchpad`) |
| **To** | Claude frontend fleet + Morgan |
| **Proof** | Every line of the five Claude → Cursor handoffs was read from Claude's tree via absolute path **without** checking out, switching, or committing that tree. |

Mycosoft is pursuing CMMC Level 2 (Self-Assessment). No CUI. No secrets. Env var **names** only.

---

## Files read (full text)

| # | Absolute path (Claude tree; branch left on `feat/launchpad-full-surface-aug13`) |
|---|---|
| 1 | `docs/launchpad/handoffs/CLAUDE_TO_CURSOR_TAKE_PAYMENTS_TONIGHT_AUG13_2026.md` |
| 2 | `docs/launchpad/handoffs/CLAUDE_TO_CURSOR_PUBLIC_CHECKOUT_SPEC_AUG13_2026.md` |
| 3 | `docs/launchpad/handoffs/CLAUDE_TO_CURSOR_GAP_PLAN_AUG13_2026.md` |
| 4 | `docs/launchpad/handoffs/CLAUDE_TO_CURSOR_FULL_OPERATIONAL_BACKEND_AUG12_2026.md` |
| 5 | `docs/launchpad/handoffs/CLAUDE_TO_CURSOR_SIGNATURES_CALCOM_LINKS_ADDENDUM_AUG13_2026.md` |
| 6 | `docs/launchpad/CLAUDE_TO_CURSOR_UI_COMPLETE_AND_BACKEND_ASKS_AUG12_2026.md` (also globbed) |

Handoffs dir also contains numbered packets `01`–`05` (collectors, local agent, Stripe live, CI, pentest). Those were already executed on PR #260; this pass does not re-litigate them.

---

## Required routes (quoted)

From **PUBLIC_CHECKOUT_SPEC**:

> Build: `POST /api/fusarium/launchpad/billing/public-checkout`
> Deliberately a separate route from the tenant one — different trust model, different failure modes. Do not relax auth on the existing route.

From **TAKE_PAYMENTS_TONIGHT**:

> `POST /api/fusarium/launchpad/billing/public-checkout` — the missing route
> Anonymous. Do NOT call `requireTenant()`.

From **SIGNATURES addendum**:

> Routes: `POST /signatures` {documentId, signers[]} → create envelope … `GET /signatures` (+ per-document), `POST /signatures/:id/remind`, `PATCH` void. DocuSign **Connect** webhook endpoint
> New route `GET/POST /advisory/booking`

From **FULL_OPERATIONAL_BACKEND** (Cursor-owned, not UI):

> `radar/ingest` · `stripe/webhook` · `local-agent/**` · `keys/**` · collectors

From **GAP_PLAN G.12**:

> PATCH validates `stepId` against the fixed 21-entry `WORKBOOK_STEPS` … Two clean options: (a) accept a namespaced id form `walkthrough:<walkthroughId>:<stepId>`

---

## Required env vars (names only — quoted)

| Name | Source quote |
|---|---|
| `LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED` | “Add `LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED` so Morgan can open sales before opening the workspace … Fail closed with an honest 503.” (SPEC §2.6 / TAKE_PAYMENTS §1) |
| `LAUNCHPAD_ENABLED` | “Do NOT gate this on `LAUNCHPAD_ENABLED`. That flag hides the authenticated app.” (SPEC) |
| `STRIPE_SECRET_KEY` | Live secret in both blue-green colors (TAKE_PAYMENTS §3.6) |
| `STRIPE_LAUNCHPAD_WEBHOOK_SECRET` | “live webhook endpoint registered … live signing secret” (TAKE_PAYMENTS §3.5) |
| `LAUNCHPAD_KMS_MASTER_KEY` / `LAUNCHPAD_KMS_MASTER_KEY_ID` | GAP_PLAN 1.1; FULL_OPERATIONAL §2.2 Model B |
| `DOCUSIGN_CONNECT_SECRET` / `DOCUSIGN_INTEGRATION_KEY` | GAP_PLAN 1.3; addendum A |
| `CALCOM_API_KEY` / `CALCOM_WEBHOOK_SECRET` / `CALCOM_EVENT_TYPE_ADVISORY_{15,30,60,90}` | Addendum B; GAP_PLAN 1.4 |
| `LAUNCHPAD_OAUTH_STATE_SECRET` | GAP_PLAN G.4 — must not HMAC with the literal `'unconfigured'` |

---

## Security rules (quoted, now in code)

1. **Whitelist lookup keys.** “Whitelist `lookupKey` against `lib/launchpad/catalog.ts`. Reject anything not in `CATALOG`. Never let a caller pass a raw price ID or amount — that is the classic price-tampering hole.” (SPEC §2.1)
2. **All commercial SKUs.** Plans, launch pass, **ALL** credit packs, **ALL** advisory SKUs (this task). Catalog has 16 lookup keys; public checkout uses the entire `CATALOG`.
3. **Claim by verified auth email.** “Claim on the verified auth email only, never on a value from the request body, or anyone could claim someone else's purchase.” (SPEC webhook / TAKE_PAYMENTS §2)
4. **No CUI in Stripe metadata.** “`metadata`: `lp_lookup_key`, `lp_plan_key`, `lp_billing`, `lp_company`, `lp_source: "public_pricing"`. **No readiness data, no CUI, no control states in metadata** (GTM §24.1).”
5. **Independent kill switch.** Storefront ≠ workspace. Fail closed 503 `public_checkout_disabled`.
6. **Rate-limit by IP and email.** Unauthenticated endpoint that creates Stripe objects.
7. **Hash-chain audit must not fabricate.** GAP_PLAN 2.2: “unconditional `closure.invalidated` audit append → fabricated events on the hash chain” — already fixed on this branch; this pass does not append audit on failed public checkout.
8. **No mock federal data.** Collectors stay honest-empty without keys. Radar alerts are written only from real ingest/amendment/fit-match.
9. **Cal.com: no fake slots.** “Availability still comes from Cal.com; we never invent slots.”
10. **DocuSign: humans sign.** “Launchpad MUST NOT: apply a signature automatically … The signed file stays in the customer's authoritative system.”

---

## What this pass implemented (Cursor worktree only)

See `CURSOR_TO_CLAUDE_BACKEND_COMPLETE_AUG13_2026.md` and `CURSOR_TO_CLAUDE_PUBLIC_CHECKOUT_READY_AUG13_2026.md`.

Claude still owns pricing CTAs, NeuButton, NavLink, `/welcome`, and `/get-started` wiring. Cursor did not edit those files.

---

*Mycosoft, LLC is pursuing CMMC Level 2 (Self-Assessment); nothing here claims achieved compliance.*
