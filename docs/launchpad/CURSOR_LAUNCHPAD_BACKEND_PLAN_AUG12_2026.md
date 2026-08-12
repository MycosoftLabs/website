# Cursor Launchpad Backend Plan — Aug 12, 2026

| Field | Value |
|---|---|
| **Date** | August 12, 2026 |
| **Status** | **In Progress** — Cursor executing backend (see [`CURSOR_LAUNCHPAD_BACKEND_STATUS_AUG12_2026.md`](./CURSOR_LAUNCHPAD_BACKEND_STATUS_AUG12_2026.md)); handoff [`CURSOR_TO_CLAUDE_LAUNCHPAD_BACKEND_EXECUTION_AUG12_2026.md`](./CURSOR_TO_CLAUDE_LAUNCHPAD_BACKEND_EXECUTION_AUG12_2026.md) |
| **Author** | Cursor (planning pass for Morgan) |
| **Product** | FUSARIUM Launchpad (commercial, multi-tenant, non-CUI) |
| **Website repo** | `WEBSITE/website` |
| **Branch observed** | `tmp-closure-board-ship` (tracks `origin/main`, **behind by 1**) |
| **Related handoffs** | `docs/launchpad/handoffs/01`–`05` |
| **Guideline package** | `FUSARIUM_Launchpad_Master_Package_v1.0` (Aug 10, 2026) |

---

## 1. Executive summary

Claude delivered a **substantial front-end / product shell** for FUSARIUM Launchpad on disk: `lib/launchpad/**`, marketing under `/fusarium/launchpad`, authenticated ASA workspace under `/app/launchpad`, BFF routes under `/api/fusarium/launchpad`, six Supabase migration files, score engine + vectors, Stripe checkout/webhook **code**, kill-switch flags, and Cursor-owned handoff docs 01–05.

**Cursor owns the handoff package Claude deliberately left unfinished:** Contract Radar collectors + ingest runtime, Local Assurance Agent binary + HMAC enrollment/results, Stripe account provisioning (test → live via `lookup_key`), CI/blue-green env + rollout (`LAUNCHPAD_ENABLED` last), pen-test / legal gate, and the legacy webhook guard.

**Honest gap vs chat claims:** Nearly all Launchpad work is **uncommitted / untracked** on a non-Launchpad branch mixed with Psathyrella and other WIP. Handoffs claim migrations are “already applied” to prod Supabase `hnevnsxnhfibhbsipqvz` — that remote claim is **not verified from this machine** in this planning pass. Radar ingest and local-agent results are **501 stubs**. Stripe webhook returns **503 until secrets exist**. Opportunities UI honestly says **no sources connected**. Local-agent **enroll** route is **missing**. Marketing page set is **partial** vs the master-plan IA. Prod flag must stay **off** until Morgan + counsel gates clear.

This document is **plan only**. Do not implement collectors/agent/Stripe live cutover from this file alone.

---

## 2. Source inventory

### 2.1 ChatGPT master package (every document read)

Path: `C:\Users\Owner1\Downloads\FUSARIUM_Launchpad_Master_Package_v1.0`

| File | Role |
|---|---|
| `README.md` | Package index; non-CUI critical boundary; required professional reviews |
| `FUSARIUM_Launchpad_GTM_Master_Plan_v1.0.md` | 38-section machine-readable master plan (architecture, claims, radar, agent, Stripe, QA §35, roadmap §31, immediate checklist §37) |
| `FUSARIUM_Launchpad_GTM_Master_Plan_v1.0.docx` | Same content, formatted management copy (integrity via SHA256SUMS; not re-parsed as duplicate narrative) |
| `FUSARIUM_Launchpad_AI_Handoff_Prompt_Pack_v1.0.md` | Cursor/Codex/Claude/Perplexity build prompts (§36.1–36.7) |
| `FUSARIUM_Launchpad_Pricing_Unit_Economics_v1.0.xlsx` | Sheets: Assumptions, Plans, Unit Economics, Cohort Revenue, AI Cost Model, Advisory, Stripe SKUs, Sensitivity, Executive Dashboard |
| `stripe_product_catalog.json` | 16 lookup_key SKUs + webhook event list + implementation requirements |
| `entitlements_matrix.yaml` | Plan entitlements (founding_pass_30d → partner_mesh_pro) |
| `data_classification_policy.yaml` | COMMERCIAL // NON-CUI classes; blocked CUI/classified/credentials/raw telemetry |
| `implementation_backlog.csv` | 137 tasks LP-001–LP-137 (P0/P1/P2 × 14/30/90-day) |
| `SHA256SUMS.txt` | Package integrity manifest |

### 2.2 Claude Cursor handoffs (all five, one-line each)

Directory: `docs/launchpad/handoffs/` (only these five markdown files; no other handoff files present)

| # | File | One-line |
|---|---|---|
| 01 | `01-contract-radar-collectors.md` | Cursor builds collectors/scheduling/amendment/fit-match; Claude left schema + **501** ingest contract + honest empty UI |
| 02 | `02-local-assurance-agent.md` | Cursor builds signed read-only agent + enroll/HMAC intake; Claude left schema + **501** results stub; never AI→implemented |
| 03 | `03-stripe-live-provisioning.md` | Cursor provisions Stripe products/secrets/CI; Claude left lookup_key catalog + checkout + separate webhook code (503 until secrets) |
| 04 | `04-ci-deploy.md` | Cursor lands blue-green env + rollout order; `LAUNCHPAD_ENABLED` flip last; notes jest/tsc pre-existing breakage |
| 05 | `05-pentest-legal.md` | Cursor + counsel: RLS attack checklist, legacy webhook early-return guard, DRAFT legal pages block public flag-on |

### 2.3 Other launchpad docs under `docs/launchpad/`

- **Package index (repo):** [`CHATGPT_MASTER_PACKAGE_INDEX_AUG12_2026.md`](./CHATGPT_MASTER_PACKAGE_INDEX_AUG12_2026.md) — dated inventory of the ChatGPT master package (paths, sizes, backend-relevant constraints). Prefer this over re-walking `Downloads\FUSARIUM_Launchpad_Master_Package_v1.0` when scoping collectors / agent / Stripe / CI.
- Handoffs: `handoffs/01`–`05` (see §2.2). No separate Claude status/checklist README was present. This plan file is the first dated Cursor ownership plan in that tree. **No `docs/launchpad/README` existed** — per instructions, none was created.

---

## 3. Verified Claude status table

Verification method: filesystem + route/file spot-checks on Aug 12, 2026.  
**Git:** Launchpad trees are almost entirely `??` untracked; `.env.example` modified; `app/defense/fusarium/page.tsx` modified (tracked). Branch `tmp-closure-board-ship`.

Phase labels **P0–P7** below map Claude’s delivered surface (inferred from handoffs + on-disk layout), not a Claude-authored phase doc (none found on disk).

| Area | Claude claim (handoffs / structure) | On-disk | Verdict |
|---|---|---|---|
| **P0 — Foundation** (flags, constants, catalog, prompt firewall, access routes) | Kill switch + non-CUI constants + lookup_key catalog | `lib/launchpad/flags.ts`, `constants.ts` (`PROHIBITED_CLAIMS`), `catalog.ts` (16 lookup keys), `prompt-firewall.ts`; `.env.example` has `LAUNCHPAD_ENABLED=0`, waitlist mode, ingest token, Launchpad webhook secret; `lib/access/routes.ts` public + auth prefixes | **PASS** (code present; still uncommitted) |
| **P1 — Tenancy / RLS** | Migrations + `requireTenant()` + app layout 404 when flag off | 6× `supabase/migrations/20260811*.sql`; `tenant-context.ts`; `app/app/launchpad/layout.tsx` calls `notFound()` when disabled; `scripts/launchpad/rls-selftest.sql` | **PARTIAL** — files PASS; **prod apply claim UNVERIFIED** here; not in git |
| **P2 — Billing** | Checkout + separate webhook + entitlements DB | `billing/checkout`, `billing/state`, `stripe/webhook` (full handler; **503** if secrets missing); `entitlements.ts`; founding-pass RPC referenced | **PARTIAL** — code PASS; Stripe products/secrets/CI **MISSING**; live/test acceptance not run |
| **P3 — ASA / score** | Controls, score, POA&M, deterministic engine, vectors | `readiness/controls|score|poam` APIs + pages; `scoring/engine.ts` + `__tests__/vectors.test.ts`; `run-score-vectors.ts` shim | **PASS** (engine/UI present; practitioner review still required for go-live) |
| **P4 — Evidence / docs / onboarding** | Evidence index, document factory, onboarding, company | Pages + BFFs for evidence, documents, onboarding, company, audit; `docs/policy-factory.ts` | **PARTIAL** — core CRUD/UI present; master-plan depth (SSP, training, export/delete, upload quarantine) incomplete vs §31 |
| **P5 — Marketing / legal DRAFT** | Public Launchpad pages + DRAFT legal | `/fusarium/launchpad`, pricing, founding-50, trust, legal terms/privacy/aup | **PARTIAL** — missing several master-plan routes (how-it-works, contract-radar, origin-graph, faq, non-cui-policy page, etc.); DRAFT legal OK for now |
| **P6 — Contract Radar** | Schema + ingest contract + UI | Migration `…90300_launchpad_radar.sql`; ingest **501**; opportunities page: “No opportunity sources are connected yet.” | **PARTIAL** — stubs only; collectors **MISSING** |
| **P7 — Local agent + FUSARIUM gateway** | Schema + results contract; defense page rebuild | Migration `…90400_launchpad_mesh_agent.sql`; results **501**; **no** `local-agent/enroll` route; `app/defense/fusarium/page.tsx` has Launchpad CTA/gateway | **PARTIAL** — page PASS; agent binary/enroll/HMAC **MISSING** |
| **FUSARIUM page rebuild** | Gateway into Launchpad | `app/defense/fusarium/page.tsx` + layout modified; Launchpad hrefs present | **PASS** (content exists; mixed with other WIP on branch) |
| **Migrations (6 files)** | Applied to prod + committed | Files exist untracked; commit **MISSING**; remote apply **UNVERIFIED** in this pass | **PARTIAL** |
| **Billing test-mode** | Ready for Cursor to provision | Code ready; products/secrets/webhook registration **not** evidenced on disk | **MISSING** (ops) |
| **Radar collectors** | Cursor lane | Not present; 501 stub only | **MISSING** |
| **Commit / branch hygiene** | Implied shippable | Untracked Launchpad tree on `tmp-closure-board-ship` mixed with unrelated Psathyrella/deploy WIP | **MISSING** (shipping hygiene) |

### Spot-check acceptance claims

| Claim | Result |
|---|---|
| Kill-switch pattern (`LAUNCHPAD_ENABLED` server-side, not `NEXT_PUBLIC_`) | **PASS** — documented in `flags.ts`; app layout 404s when off |
| `state_source` has no `'ai'` | **PASS** — check `in ('customer', 'agent_check')` in ASA migration; controls PATCH hard-sets `'customer'` |
| Opportunities not fake federal rows | **PASS** — empty-state copy, no mock opportunities |
| Separate Launchpad Stripe webhook | **PASS** (route exists); secrets gate → **503** |
| Legacy webhook Launchpad guard | **MISSING** — no `lp_tenant_id` / `fus_launchpad_*` early-return found |
| Enroll API for local agent | **MISSING** |
| `LAUNCHPAD_*` in `.env.example` | **PASS** |

---

## 4. Cursor workstreams (ordered, with dependencies)

```text
[0 Git hygiene] ──► [1 Stripe test secrets] ──► [2 CI/blue-green env]
         │                      │                        │
         │                      ▼                        ▼
         │              [3 Webhook E2E test] ◄── rollout dry-run (flag OFF)
         │
         ├──► [4 Radar: implement ingest + SAM collector] ──► DSIP/Grants ──► fit-match
         │
         ├──► [5 Agent: enroll API + HMAC results] ──► binary/check packs/signing
         │
         ├──► [6 Legacy webhook guard]
         │
         └──► [7 Pen-test checklist + counsel legal gate] ──► Morgan go ──► LAUNCHPAD_ENABLED=1
```

### WS0 — Git / branch hygiene (blocker for everything else)

- **Owner:** Cursor  
- **Depends on:** Morgan approval to carve a clean Launchpad branch from current untracked tree  
- **Do:** Isolate Launchpad paths from Psathyrella/deploy WIP; recommend `feat/fusarium-launchpad` (or similar); do **not** force-push main. Commit/push only when Morgan asks.  
- **Done when:** Launchpad files are reviewable on a dedicated branch without unrelated churn.

### WS1 — Contract Radar collectors / ingest

- **Owner:** Cursor (handoff 01; backlog LP-079–LP-093)  
- **Depends on:** WS0; `LAUNCHPAD_INGEST_TOKEN` in env; service-role; migrations present in target DB  
- **Build order:**  
  1. Replace ingest **501** with validate → service-role upsert `(source, source_id)` → amendment on `source_hash` change → enqueue fit-match.  
  2. SAM.gov collector first (api.data.gov key — env only, never commit).  
  3. DSIP + Grants.gov (P0 LP-081/082).  
  4. Central cadence (never per-tenant scans — master plan § Executive Decision #6 / handoff §11.5 economics).  
  5. `matchTenants()` with reasons/disqualifiers — **never** “% chance of winning.”  
  6. Enrichment credit-metered + opportunity-level cache.  
- **Tests:** Spec §35.5 (dedupe, amendment, timezone, cancel, hash, stale, disqualifier).  
- **90-day:** DIU/DARPA/NSPIRES/NSF (LP-083–086).

### WS2 — Local Assurance Agent binary + HMAC

- **Owner:** Cursor (handoff 02; LP-117–LP-122)  
- **Depends on:** WS0; enroll + results API; device caps from entitlements  
- **Build order:**  
  1. `POST .../local-agent/enroll` (owner/admin, mint token once, store hash).  
  2. Implement results HMAC (`X-LP-Agent-Id` / Timestamp / Signature, ±300s, replay reject); **tenant_id from agent row only**.  
  3. Agent binary: read-only check pack; signed releases + signed policy manifests; customer kill switch.  
  4. Cloud payload minimized — no raw logs/configs/captures columns (schema is the boundary).  
  5. UI may set `state_source='agent_check'` but **never** auto-flip `implemented`.  
- **Tests:** Spec §35.7.

### WS3 — Stripe secrets provisioning (test → live)

- **Owner:** Cursor + Morgan for live sign-off (handoff 03; LP-021–LP-026)  
- **Depends on:** WS0; counsel path for live; finance for live keys  
- **Build order:**  
  1. Idempotent script from `stripe_product_catalog.json` / `catalog.ts` by **lookup_key** (no hard-coded price IDs).  
  2. Register Launchpad webhook endpoint; store `STRIPE_LAUNCHPAD_WEBHOOK_SECRET` (separate from legacy).  
  3. Set test keys + service role in local + both blue-green colors.  
  4. Run §35.3 acceptance in **test mode**.  
  5. Live cutover only after Morgan + counsel: swap keys, re-register live webhook, CI secrets, then flag (WS4).  
- **Alert:** founding-pass oversell → `refund_required: true`.

### WS4 — CI + blue-green env + rollout

- **Owner:** Cursor (handoff 04)  
- **Depends on:** WS3 test secrets at minimum; migrations applied in lockstep with files  
- **Env (both colors, server-side):**  
  `LAUNCHPAD_ENABLED=0` (flip **last**), `NEXT_PUBLIC_LAUNCHPAD_WAITLIST_MODE=1` until counsel clears, Stripe keys, `STRIPE_LAUNCHPAD_WEBHOOK_SECRET`, `LAUNCHPAD_INGEST_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY` as required for waitlist/webhook.  
- **Rollout:** green env → deploy → smoke (marketing 200, `/app/launchpad` 404 with flag off) → flag on green only for non-company test account → blue-green cutover per existing scripts → **prod flag stays OFF** until gates in §7.  
- **Known pre-existing (do not block Launchpad falsely):** jest runtime mismatch; unrelated `tsc` errors; Launchpad vectors via `tsx scripts/launchpad/run-score-vectors.ts`.

### WS5 — Pen-test / legal gate + legacy webhook guard

- **Owner:** Cursor (tech) + counsel (legal) (handoff 05)  
- **Depends on:** RLS selftest green; billing test-mode; marketing claims freeze  
- **Tech:**  
  - Re-run / extend attack checklist (forged `lp_tenant`, ID stuffing, service-route probing, state_source injection, insert-only tables, entitlement caps, middleware).  
  - **Add** early-return in legacy `app/api/stripe/webhooks/route.ts` when `metadata.lp_tenant_id` or `fus_launchpad_*` lookup_key present (belt-and-suspenders).  
- **Legal:** Replace DRAFT legal outlines with counsel text; bump `TERMS_VERSION`; reviews: government-contracting counsel, CMMC practitioner on score package, privacy, marketing claims.

### WS6 — Backend gaps Claude left (cross-cutting)

| Gap | Action |
|---|---|
| Webhook **503** until secrets | Expected; close via WS3 |
| Waitlist needs service role | Provision `SUPABASE_SERVICE_ROLE_KEY` in env (never commit) |
| Opportunities “no sources” | Honest until WS1 collectors land — **do not** invent sample federal rows |
| Missing enroll route | WS2 |
| Missing legacy webhook guard | WS5 |
| Incomplete marketing IA vs master plan | Out of Cursor backend scope unless Morgan explicitly expands; do not drive-by redesign |
| Uncommitted tree | WS0 |

---

## 5. Safety / CMMC / commercial boundary rules (must not violate)

From master package README, GTM §§1/10/21, `data_classification_policy.yaml`, AI handoff non-negotiables, and workspace CUI RoB:

1. **Standard Launchpad = COMMERCIAL // NON-CUI SaaS.** No CUI, classified, export-controlled technical data, raw credentials, raw logs, packet captures, SF-86 material in the standard product.
2. **Customer-controlled systems remain authoritative** for protected evidence; Launchpad stores references, metadata, hashes, drafts, attestations.
3. **No prohibited claims:** no Mycosoft certification, guaranteed CMMC/DoD approval, award/clearance guarantees; enforce `PROHIBITED_CLAIMS` + prompt firewall.
4. **No AI path to MET/implemented** — score engine is deterministic; `state_source` forbids `'ai'`.
5. **Kill switch:** `LAUNCHPAD_ENABLED` server-side; marketing may stay public; authenticated app + BFFs 404 when off.
6. **Legal pages remain DRAFT** until counsel replaces them; waitlist mode default until cleared.
7. **No mock / fake operational opportunity or compliance data** presented as live federal or customer truth. Demo/synthetic must be labeled (`DEMO_BANNER`).
8. **Do not Met-flip Mycosoft’s own CMMC ENCL / `soc_ops` controls** from Launchpad commercial work. Separate compliance evidence path (PreVeil / ENCL).
9. **Partner Mesh:** no tenant data sharing without separate affirmative opt-in.
10. **Secrets:** Stripe, ingest token, service role, SAM API keys — env/CI secrets only; never in plan, commits, or docs.
11. **Separate tenancy:** Launchpad data must not silently enter FUSARIUM intel, MINDEX defense compartments, CREP, or Partner Mesh.

---

## 6. Website permission note

Morgan authorized **Launchpad backend + integration work** via this planning request and the Claude→Cursor handoff package.

- Stay within **launchpad / handoff scope**: collectors, agent, Stripe ops, CI/env/rollout, pen-test/legal gate, related BFF completion, migration/RLS verification, legacy webhook guard.
- **Do not** drive-by marketing redesign, hero/video swaps, or unrelated site changes.
- Touching `app/defense/fusarium/*` only as needed for Launchpad gateway consistency already started — no broader defense redesign.
- Broader website permission rule still applies outside this scoped authorization.

---

## 7. Phased execution checklist

| Phase | Work | Owner | Go-live gate |
|---|---|---|---|
| A | Branch hygiene; inventory commit recommendation | Cursor / Morgan approve | Clean Launchpad branch exists |
| B | Stripe **test** products + webhook secret + local E2E §35.3 | Cursor | Test checkout grants via webhook only |
| C | Blue-green env vars both colors; flag remains 0 | Cursor | Marketing 200; app 404 with flag off |
| D | Re-verify migrations on target Supabase + `rls-selftest.sql` | Cursor | All RLS rows PASS |
| E | Implement ingest + SAM collector; fit-match MVP | Cursor | §35.5 subset green; UI shows real rows only when ingested |
| F | Enroll + HMAC results; agent threat model + Win MVP | Cursor | §35.7 subset green |
| G | Legacy webhook Launchpad early-return | Cursor | Mis-scoped event cannot write `profiles.subscription_tier` |
| H | Pen-test checklist + findings triage | Cursor | Zero critical tenant-isolation findings |
| I | Counsel replaces DRAFT legal; bump terms version | Counsel / Morgan | Terms “in effect” |
| J | CMMC practitioner review of score vectors package | Compliance / Morgan | Signed content review |
| K | Marketing claims pass | Morgan / counsel | Claims library approved |
| L | Stripe **live** keys + CI secrets + $0-tax live smoke | Cursor / Morgan | Live webhook idempotent |
| M | Design partners / support ready | Morgan / ops | Launch acceptance §35.8 subset |
| N | `LAUNCHPAD_ENABLED=1` in prod | **Morgan only** | Explicit go after I–M |

---

## 8. Out of scope

- Enabling Launchpad in production without Morgan’s explicit go.
- Met-flipping CMMC ENCL / `soc_ops.compliance_controls` from this commercial track.
- Origin Graph, Partner Mesh runtime, proposal submission automation (30/90-day backlog — after P0 radar/agent/billing ops).
- Fixing repo-wide jest/tsc debt except where it blocks Launchpad verification (prefer `run-score-vectors.ts` shim).
- Recreating or inventing federal opportunity rows for demos.
- Drive-by website marketing redesign.
- Committing/pushing unless Morgan requests (recommendation only in §9).

---

## 9. First 3 concrete Cursor tasks (after plan approval)

1. **WS0 — Branch & inventory:** With Morgan’s OK, create a dedicated Launchpad branch from a clean base; stage only Launchpad paths (`lib/launchpad`, `app/fusarium/launchpad`, `app/app/launchpad`, `app/api/fusarium/launchpad`, `components/launchpad`, `docs/launchpad`, `scripts/launchpad`, `supabase/migrations/20260811*`, `.env.example` Launchpad lines, and the intentional `app/defense/fusarium` gateway edits). Do not commit until Morgan says commit. Document remote migration verification command list.

2. **WS3 test-mode Stripe:** Idempotent provision of catalog lookup_keys in Stripe **test**; register Launchpad webhook; set local/CI secrets (no values in git); run §35.3 smoke (duplicate event, checkout-without-webhook grants nothing, payment grants plan).

3. **WS1 ingest implementation (no fake data):** Replace radar ingest 501 with real upsert/amendment pipeline behind `LAUNCHPAD_INGEST_TOKEN`; add SAM.gov collector skeleton + scheduler hook; keep opportunities empty-state until the first successful official ingest.

---

## 10. Recommendation (not an action)

When Morgan is ready: **“ready to branch”** — isolate Launchpad onto `feat/fusarium-launchpad` (name TBD), then commit/push as a separate Morgan-requested step. Do not mix with `tmp-closure-board-ship` Psathyrella/deploy WIP.

---

## Document control

| Version | Date | Change |
|---|---|---|
| 1.0 | Aug 12, 2026 | Initial Cursor backend ownership plan after full handoff + master-package read + on-disk verification |
| 1.1 | Aug 12, 2026 | Source inventory: link to `CHATGPT_MASTER_PACKAGE_INDEX_AUG12_2026.md` |
