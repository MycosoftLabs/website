# Cursor → Claude: Gap Plan Status — Aug 13, 2026

| Field | Value |
|---|---|
| **Date** | August 13, 2026 |
| **From** | Cursor (backend lane) |
| **To** | Claude frontend fleet + Morgan |
| **Branch / PR** | `feat/launchpad-backend-aug12` · [PR #260](https://github.com/MycosoftLabs/website/pull/260) |
| **HEAD SHA** | `fa29be3300c7cfb74dbb3baf0cdf1e489b323621` |
| **Plans** | `handoffs/CLAUDE_TO_CURSOR_GAP_PLAN_AUG13_2026.md` + signatures/Cal.com addendum |
| **Prod flag** | `LAUNCHPAD_ENABLED` stays **off** in sandbox/prod. Local only is `1`. |

Mycosoft is pursuing CMMC Level 2 (Self-Assessment); it is not assessed compliant. No CUI. No secrets in git. No mock SAM opportunities.

---

## P0 configuration

| # | Item | Status | Notes |
|---|---|---|---|
| 1.1 | `LAUNCHPAD_KMS_MASTER_KEY` + `_ID` | **Done (local)** | Gitignored `.env.local`. `kmsBackendStatus().backend = env_master`. BYO connect is not `kms_unconfigured` locally. **Not copied to sandbox/prod colors.** |
| 1.2 | Managed-AI keys | **Done (local)** | Wired to existing website env: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `XAI_API_KEY`, `PERPLEXITY_API_KEY` (+ `LAUNCHPAD_*` aliases). All four present locally. Router fallback is anthropic → openai → xai → perplexity. |
| 1.3 | DocuSign app + Connect | **Partial** | `DOCUSIGN_INTEGRATION_KEY` is set. `DOCUSIGN_SECRET_KEY` is **empty** (OAuth client secret still missing — DocuSign MCP auth timed out). Local `DOCUSIGN_CONNECT_SECRET` / `DOCUSIGN_CONNECT_HMAC_KEY` generated in `.env.local`. Connect URL to register in DocuSign: `https://<host>/api/fusarium/launchpad/signatures/webhook`. RSA JWT path still empty; platform send stays off (`LAUNCHPAD_DOCUSIGN_PLATFORM_SEND` unset). |
| 1.4 | Cal.com | **Blocked on Morgan** | No `CALCOM_*` values in any credentials file. Empty placeholders appended locally. Dashboard steps below. |
| 1.5 | Collector scheduling | **Done** | `scripts/launchpad/run-nightly-collectors.ts` + Windows task `Mycosoft-LaunchpadCollectors` daily 02:15. SAM/DSIP/Grants honest-empty when keys unset (verified this run). No mock awards. |
| 1.6 | Stripe live lookup keys | **Done** | Live mode **16/16** including `fus_launchpad_launch_pass`. Verify script: `npx tsx scripts/launchpad/verify-stripe-lookup-keys.ts`. |
| 1.7 | `LAUNCHPAD_ENABLED` | **Local only** | `.env.local` is `1`. Prod/sandbox **not** flipped. |

---

## Nine code defects

| # | File | Fix |
|---|---|---|
| 2.1 | `radar/alerts/route.ts` | PATCH `.select('id').maybeSingle()` → **404** on zero rows |
| 2.2 | `closure/route.ts` | Invalidate requires typed/capped `reason`; zero-row → **404**; audit appends **only** after a real update. Hash chain is never written for a fabricated event |
| 2.3 | `enclave/route.ts` | Revoke 404 + audit on real revoke; caps on `external_id`/`owner_label`; ISO date + SHA-256 hash validation |
| 2.4 | `contractor/roles/route.ts` | Caps: name/title 200, email 320, scope 500 |
| 2.5 | `tier1/route.ts` | Caps + ISO date validation (garbage dates → **400**, not DB 500) |
| 2.6 | `ai/complete/route.ts` + `ai/router.ts` | Prompt size capped from governance `maxContextTokens`; oversize → **413 `prompt_too_large`**, provider not called, credits not under-charged |
| 2.7 | `lib/launchpad/agent/harness-auth.ts` | Returns `{ error: session.error }` so TenantContext is not mixed with HarnessTenantContext |
| 2.8 | `lib/launchpad/signatures/docusign.ts` | `ctx.ok === false` narrowing on create/resend/void |
| 2.9 | Policy | Documented, not refactored: `signatures/*` and `advisory/booking` use the service client **only** to decrypt OAuth tokens / mark credits redeemed (column grants hide ciphertext; authenticated cannot UPDATE credits). Session client still owns list/create under RLS |

Also aligned `/company/registrations` with `looksLikeSecret` + caps (item 3.4).

---

## Migrations captured (fresh env can rebuild)

Committed / added under `supabase/migrations/` (no conflicting rewrite of `20260812210000`):

| File | What |
|---|---|
| `20260812210000_launchpad_operational_backend.sql` | Credit RPCs + ops tables (already commented as MCP `launchpad_ops_*`) |
| `20260812223000_launchpad_full_product.sql` | Full-product tables previously MCP-only |
| `20260813120000_launchpad_ai_connections_tier1.sql` | BYO envelope columns + Tier-1 |
| `20260813220000_launchpad_signatures_calcom.sql` | Signatures + advisory (already on prod as `launchpad_signatures_calcom`) |
| `20260813240000_launchpad_tenant_resources_proposals.sql` | **New:** `launchpad_tenant_resource_cards` + `launchpad_agent_proposals` (applied on prod `hnevnsxnhfibhbsipqvz`) |

Prod Launchpad table count at capture: 54 `launchpad_*` tables. Credit RPCs present: `launchpad_reserve_credits`, `launchpad_settle_credits`, `launchpad_spend_credits`, `launchpad_refund_reservation`.

---

## Dual routes (3.2) — canonical map

See `lib/launchpad/route-aliases.ts`.

**Keep as aliases:** `/tier1` ↔ `/readiness/tier1`; `/registrations` (canonical, shape-guard) vs `/company/registrations` (legacy).

**Do not merge** (different POST shapes): `/export` vs `/settings/export`; `/closure` (mutating) vs `/readiness/closure` (read-only board); `/reports` vs `/readiness/reports`; `/origin-graph` vs `/origin/bom`.

---

## Extra Cursor items landed this pass

- Tenant custom resources: `POST /resources` writes `launchpad_tenant_resource_cards` only (Claude can restore the add-resource form).
- Approval inbox BFF: `GET/POST/PATCH /local-agent/proposals`. Accept does **not** flip controls.
- Upload interceptor helper: `interceptUpload()` in `lib/launchpad/boundary/dlp.ts` for any future file-touch surface. There is still no upload path — the CUI-file boundary test cannot run yet.

---

## Still Cursor / later (not this PR)

| Item | Why open |
|---|---|
| 4.2 Local Agent installers | Signed Win/macOS/Linux releases + update channel |
| 4.3 Harness subagent behaviors | Binary still queue + checks; role agents planned |
| 4.5 PreVeil/Exostar OAuth | Enclave remains metadata + checklists |
| 4.6 Deep-research / amendment live | Scheduler exists; Perplexity escalation needs SAM data first |
| 4.7 Transactional email | No provider wired |
| 4.8 Operator analytics | Not started |
| 4.9 Partner Mesh sandbox | Deferred OK |
| DocuSign customer OAuth live | Needs `DOCUSIGN_SECRET_KEY` from the DocuSign app |
| Connect webhook registration | Needs DocuSign admin: HMAC = local `DOCUSIGN_CONNECT_SECRET`, URL above |
| Prod `LAUNCHPAD_ENABLED` | Morgan explicit “go live” only |

---

## What Morgan still must do

1. **Cal.com (account + calendars)** — Cursor found no `CALCOM_*` secrets anywhere.
   1. Create / sign in at [cal.com](https://cal.com).
   2. Connect Google/Outlook (and any other) calendars so busy-blocking is real.
   3. Create four event types: advisory 15 / 30 / 60 / 90 with buffers and daily caps (GTM §28.4).
   4. Copy API key → gitignored `CALCOM_API_KEY`.
   5. Set event type IDs → `CALCOM_EVENT_TYPE_ADVISORY_{15,30,60,90}`.
   6. Add webhook to `/api/fusarium/launchpad/advisory/webhook` with signing secret → `CALCOM_WEBHOOK_SECRET`.
2. **DocuSign Integration Key secret** — paste `DOCUSIGN_SECRET_KEY` into `.env.local` (and later both deploy colors). Then register Connect HMAC using the generated `DOCUSIGN_CONNECT_SECRET`.
3. **Counsel** — `data_classification_policy` v1.1 carve-out (BYO keys + DocuSign OAuth tokens); legal pages; trust-page rewrite (`TRUST_PAGE_COPY_DRAFT_AUG12_2026.md`).
4. **Demo video** — `/assets/launchpad/launchpad-demo.mp4` + `NEXT_PUBLIC_LAUNCHPAD_DEMO_ENABLED=1` after filming.
5. **Do not say “go live”** until 1.3 OAuth secret, 1.4 Cal.com, §5 gates, and a stranger-company acceptance run exist.

Claude lane (untouched here): walkthrough persistence (4.10), BYO key form (4.11), opportunity `:id` page (4.13).

---

*Mycosoft, LLC is pursuing CMMC Level 2 (Self-Assessment); nothing here claims achieved compliance.*
