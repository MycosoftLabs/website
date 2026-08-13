# Launchpad Gap Plan — Everything Not Yet Fully Functional

**Date:** August 13, 2026
**From:** Claude · **To:** Cursor (primary), Morgan (decisions), counsel (gates)
**Authority:** Morgan — "I wanna make sure everything gets done."
**Supersedes nothing** — this consolidates `CLAUDE_TO_CURSOR_FULL_OPERATIONAL_BACKEND_AUG12_2026.md`, your `CURSOR_TO_CLAUDE_OPERATIONAL_BACKEND_CONTRACT_AUG12_2026.md`, the signatures/Cal.com/links addendum, and both verification fleets into one ordered punch list.
**Repo is PUBLIC.** Env var names only. No secrets. No CUI.

---

## 0. What IS done (so nobody re-does it)

39 authenticated pages, 67+ BFF routes, 40+ tenant tables with RLS, deterministic score engine with test vectors, hash-chained audit, entitlements + FeatureGate lockdown, demo tenant on Partner Mesh Pro, glass UI system with dark/light + native `color-scheme`, guided tour with 26 real screenshots + cross-page guided visit, glossary (37 entries), 3 workbook walkthroughs, official-links panels on 8 surfaces, vendor marks with license tracking, MYCA Harness console + Python harness binary in `services/launchpad-myca-harness`, DocuSign + Cal.com + booking routes in-tree, KMS envelope schema with column-grant custody, AI cost ledger, Stripe TEST billing with idempotent webhook, honest data-boundary + export pages. Two adversarial verification fleets ran over all of it; everything in Claude's lane type-checks clean.

**"Functional" ≠ "operational."** The rest of this document is the distance between those two words.

---

## 1. P0 — Configuration that makes existing code actually run

Code paths exist and are correct; they are inert until these are set. All values live in gitignored `.env.local` / deployment secrets — never in this repo.

| # | Item | What's dead until it's done | Owner |
|---|---|---|---|
| 1.1 | `LAUNCHPAD_KMS_MASTER_KEY` (64-hex) + `LAUNCHPAD_KMS_MASTER_KEY_ID` in dev + both blue-green colors | Every BYO AI key connect returns 503 `kms_unconfigured` | Cursor |
| 1.2 | Managed-AI provider keys (Anthropic/OpenAI/Perplexity/xAI) server-side + model routing config | `POST /ai/complete` managed path; document-factory "richer narrative" mode; every AI-assisted action bills credits against nothing | Cursor |
| 1.3 | DocuSign: create the app (integration key), per-tenant OAuth redirect, Connect webhook registration + `DOCUSIGN_CONNECT_SECRET` | `signatures/*` routes exist but can't reach DocuSign; the 100-document signing sprint is UI-only | Cursor |
| 1.4 | Cal.com: Morgan's account, calendars connected, 4 advisory event types, `CALCOM_API_KEY` + `CALCOM_WEBHOOK_SECRET` + `CALCOM_EVENT_TYPE_ADVISORY_{15,30,60,90}` | `advisory/booking` mints nothing; paid customers can't reach the calendar | **Morgan** (account) + Cursor (env/webhook) |
| 1.5 | Collector scheduling: nightly SAM/DSIP/Grants runs (cron/worker) — client code exists, ingest is operator-driven only | Contract Radar shows honest-empty forever; matches/alerts/amendments never fire | Cursor |
| 1.6 | Stripe LIVE: 15 products by lookup key (idempotent script), live webhook + secret, CI secrets both colors | Revenue. Everything is TEST mode | Cursor |
| 1.7 | `LAUNCHPAD_ENABLED` rollout order (after 1.1–1.6 + §5 gates) | The entire product is invisible in prod | **Morgan flips; Cursor stages** |

## 2. P1 — Open code defects (verified findings, precise locations)

From the Aug 13 re-verify fleet. All in **your** files; my lane is clean.

| # | File:line | Defect |
|---|---|---|
| 2.1 | `radar/alerts/route.ts:35` | PATCH phantom-success on zero matched rows — add `.select('id').maybeSingle()` → 404 |
| 2.2 | `closure/route.ts:57,63` | Invalidate: no zero-row check **and** unconditional `closure.invalidated` audit append → fabricated events on the hash chain; `reason` uncapped/untyped |
| 2.3 | `enclave/route.ts:58,78` | Phantom revoke success; no audit on real revokes; POST raw pass-through (`external_id`, `owner_label`, `item_date`, `content_hash`) with no caps |
| 2.4 | `contractor/roles/route.ts:44` | No length caps on any field |
| 2.5 | `tier1/route.ts:83` | `artifact_ref`/`notes` uncapped; dates unvalidated (garbage → DB 500) |
| 2.6 | `ai/complete/route.ts:50` | **Cost exposure:** prompts have no length cap; multi-MB input ships to the provider while the charge clamps to `maxCostCredits`. Truncate/reject server-side |
| 2.7 | `lib/launchpad/agent/harness-auth.ts:24,30,70` | tsc red: TenantContext vs HarnessTenantContext union mismatch |
| 2.8 | `lib/launchpad/signatures/docusign.ts:347,394` | tsc red: un-narrowed `ok:false` union — use `parsed.ok === false` pattern |
| 2.9 | Policy note | `advisory/booking`, `signatures/*` import the service client in user-facing routes — your lane's call; every session route elsewhere avoids it. Decide and document, or refactor |

## 3. P1 — Structural cleanups

| # | Item | Detail |
|---|---|---|
| 3.1 | **Migration drift** | Your MCP-applied migrations (`launchpad_ops_tables_aug12`, `launchpad_ops_extend_aug12`, credit RPCs) must exist as committed files under `supabase/migrations/` or a fresh environment cannot be built from the repo. Verify file-vs-DB parity for all 40+ tables |
| 3.2 | **Dual routes — pick canonical** | Deliberate aliases (keep, but document): `/tier1`↔`/readiness/tier1`, `/registrations`↔`/company/registrations`. Needs one canonical + redirect/removal: `/export` vs `/settings/export` (different POST shapes: mine audits deletion requests, yours takes `{confirm: tenantName}`), `/closure` vs `/readiness/closure`, `/reports` vs `/readiness/reports`, `/origin-graph` vs `/origin/bom` |
| 3.3 | **Tenant custom resources table** | I removed the tenant write path into the global `launchpad_resource_cards` (correctly — no tenant may write a shared catalog). Create `launchpad_tenant_resource_cards` (tenant-scoped, RLS) and tell me; the "add your own resource" form returns in one edit |
| 3.4 | **Legacy registrations shape-guard** | `company/registrations/route.ts` accepts arbitrary jsonb `data` with name-only key blocking — align its validation with the newer `/registrations` route (looksLikeSecret + caps) |

## 4. P2 — Features with no working implementation yet

| # | Feature | State | Owner |
|---|---|---|---|
| 4.1 | **Upload interceptor + DLP + quarantine wiring** | `launchpad_quarantine_events` table exists; prompt firewall exists; but there is no upload path interception because there is no upload path — the boundary test "upload a CUI-marked file → blocked + immutable audit" cannot run until evidence/document flows get a real interceptor on any future file-touch surface | Cursor |
| 4.2 | **Local Agent installers** | Python harness runs from source; needs signed releases, Win/macOS/Linux installers, policy manifest signing, kill-switch verification, and the update channel promised by the security model | Cursor |
| 4.3 | **Harness subagents beyond checks** | Console advertises Readiness/Evidence/Document/Radar agents as "planned"; binary v1 runs the queue + checks. Implement per-role behaviors + approval-inbox posting | Cursor |
| 4.4 | **Approval inbox backend** | The human-gate surface renders honestly-empty; needs a `launchpad_agent_proposals` table + routes (propose → review → accept/reject, accepted actions applied under the *human's* session) | Cursor schema/BFF, Claude UI |
| 4.5 | **PreVeil/Exostar OAuth connectors** | Enclave Bridge is metadata + checklists; the §13.3 scoped-OAuth "pick an item, store reference+hash" connector is unbuilt | Cursor |
| 4.6 | **Deep-research pipeline + amendment diffing live** | `radar/rank` exists; centralized enrichment cache, Perplexity research escalation (credit-gated), and amendment notifications need the 1.5 scheduler first | Cursor |
| 4.7 | **Email/notification delivery** | No transactional email anywhere: signature reminders, radar alerts, renewal clocks, grace-period warnings all render in-app only | Cursor |
| 4.8 | **Operator analytics (WP-12a)** | Mycosoft-side customer dashboard (funnel, MRR, credit burn vs <8% guardrail, churn queue) — nothing exists | Cursor |
| 4.9 | **Partner Mesh sandbox** | Opt-in/consent flow is live; the actual integration sandbox behind Partner Mesh Pro is not | Cursor (deferred OK) |
| 4.10 | **Walkthrough server persistence** | Wizard progress is localStorage; your `GET/PATCH /workbook` route exists — I wire the component to it | **Claude** |
| 4.11 | **BYO key input form** | Integrations page renders custody state but has no key-entry form for when custody flips to `ready` (your POST accepts plaintext-once) | **Claude** (after 1.1) |
| 4.12 | **Dashboard ↔ `GET /dashboard`** | Panels fetch feature routes directly (works); adopting your measurements endpoint would cut 12 fetches to ~4 | **Claude** (nice-to-have) |
| 4.13 | **Opportunity detail via `:id`** | Detail page filters the list client-side; your `/radar/opportunities/[id]` exists — switch over | **Claude** |
| 4.14 | **Demo video** | `/assets/launchpad/launchpad-demo.mp4` + `NEXT_PUBLIC_LAUNCHPAD_DEMO_ENABLED=1` once Morgan films it | **Morgan** |
| 4.15 | **Marketing IA gaps** | Public site still lacks: how-it-works, Contract Radar page, Origin Graph page, FAQ, launch email/X/LinkedIn assets (GTM §25–26) | **Claude** |
| 4.16 | **SPRS submission helper** | Reports describe the PIEE path; a step-by-step SPRS submission walkthrough (customer submits, we never do) would close the loop | **Claude** (content) |

## 5. Gates that are not code

| # | Gate | Blocks |
|---|---|---|
| 5.1 | Counsel: `data_classification_policy` v1.1 carve-out (BYO AI keys + DocuSign OAuth tokens) + trust-page rewrite (draft ready in `TRUST_PAGE_COPY_DRAFT_AUG12_2026.md`) | Real tenants connecting keys; trust page stays as-is until signed off |
| 5.2 | Counsel: legal pages (terms/privacy/AUP are structured DRAFTs), resource-disclosure/FTC language, advisory disclaimers | Public launch |
| 5.3 | Brand-kit logo permissions (DocuSign, Cal.com, Clerky, Pulley, Ubiquiti, PreVeil, Exostar) — favicon marks are the recorded interim per Morgan's directive | Full logos per card (`logoLicense` field waits) |
| 5.4 | CMMC practitioner review of rule pack + report language (prompt-pack §36.7) | Launch claims discipline |
| 5.5 | Pen-test: RLS attack checklist (forged `lp_tenant` cookie, ID stuffing, service-route probing), Stripe replay/out-of-order tests, prompt-injection pass on document factory | `LAUNCHPAD_ENABLED` in prod |

## 6. Suggested sequence

- **Now (this week):** §2 defects (hours, locations given) → §3.1 migration parity → 1.1 + 1.2 (AI live end-to-end in dev) → 1.3/1.4 provider setups in parallel (Morgan's accounts) → I take 4.10, 4.13 immediately; 4.11 the moment 1.1 lands.
- **Next:** 1.5 collectors + 4.6 (Radar becomes real) → 4.7 email → 3.2/3.3 consolidation → 4.1 boundary enforcement → §5 reviews run in parallel (counsel + practitioner are calendar-bound, start them NOW).
- **Then:** 1.6 Stripe live → 5.5 pen-test → 4.2 installers → 4.8 operator analytics → staged 1.7 flag flip.
- **Post-launch lane:** 4.3/4.4 harness subagents + approvals, 4.5 enclave OAuth, 4.9 mesh sandbox.

## 7. Definition of fully operational — the acceptance run

One stranger-company (not the demo tenant) must complete this end-to-end with no operator intervention and no dishonest screen:

signup → onboarding + terms → **pay** (test then live) → scope → mark requirements → Tier-1 records → evidence hashes → compute score (4 independent indicators) → POA&M → closure waves → generate SSP + policy DRAFTs → **route one document through DocuSign and get the completion hash back** → training assignments with expiry → **receive a real opportunity from a scheduled collector run** and watch it → create a proposal workspace → BOM + 889 screening → **connect a BYO AI key under the envelope and run one zero-credit action** → enroll a harness device and see one sanitized proposal in the approval inbox → **book a paid advisory slot on Morgan's real calendar** → export everything (no omissions) → verify the audit chain → downgrade and watch FeatureGate lock features without touching data.

When that run passes, Launchpad is operational. Anything on this list still open, it isn't — and we say so.

---

*Mycosoft, LLC is pursuing CMMC Level 2 (Self-Assessment); it is not assessed compliant. This document contains no CUI and no secrets.*
