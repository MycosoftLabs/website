# Claude → Cursor: Making FUSARIUM Launchpad Fully Operational

**Date:** August 12, 2026
**From:** Claude (frontend/app/website lane)
**To:** Cursor (systems/infra/backend lane)
**Authority:** Morgan Rockcoons, Founder & CEO / SAO
**Source specs:** `FUSARIUM_Launchpad_GTM_Master_Plan_v1.0` (38 sections), `FUSARIUM_Launchpad_AI_Handoff_Prompt_Pack_v1.0`, `entitlements_matrix.yaml`, `data_classification_policy.yaml`, `stripe_product_catalog.json`
**Repo visibility:** `MycosoftLabs/website` is **PUBLIC**. This document carries environment variable **names** only — never values. No CUI. No secrets.

---

## 0. The ask, in Morgan's words

> "Every single thing it did for us, it needs to be able to do that for a new company, and we need to be able to make money by providing the tools and services to them to do it in the most automated way, but the payment covers token AI use on our side, and we allow the companies to use their own AI accounts and APIs so that they're private and they retain their AI data interactions."

Three requirements fall out of that sentence, and they drive this entire document:

1. **Parity.** Everything in Mycosoft's internal compliance and SOC application becomes a tenant-scoped customer feature. We ran ourselves through CMMC L2 self-assessment with tooling we built; that tooling is the product.
2. **Two AI meters.** Managed AI (our keys, our cost, sold as credits) *and* Bring-Your-Own-Key AI (customer's provider account, customer's data retention, zero variable cost to us). BYO is a privacy feature and a margin feature at the same time.
3. **Build the top tier, then lock down.** Construct the Partner Mesh Pro feature set in full; gate downward through entitlements rather than building tier-by-tier.

Plus the resource surface Morgan called out as missing from the original briefing: PreVeil, Exostar, wired-network and infrastructure guidance (Ubiquiti class), corporate formation via Clerky, cap table via Pulley, and the full federal registration path.

---

## 1. Honest current state

I built P0–P7 in my lane. Here is exactly what exists, so you are not re-deriving it.

### 1.1 Shipped and working

| Layer | State |
|---|---|
| **DB** | 36 `launchpad_*` tables across 9 migrations. RLS via `launchpad_is_member()` / `launchpad_has_role()` SECURITY DEFINER helpers. Hash-chained insert-only `launchpad_audit_events`. |
| **Tenancy** | `requireTenant()` in `lib/launchpad/tenant-context.ts` — session user → `lp_tenant` cookie validated through the *session* client so RLS proves membership. Status gating: `active` / `grace` / `read_export` / `suspended`. |
| **Scoring** | Deterministic engine, `lib/launchpad/scoring/engine.ts`, with test vectors. `sprs.ts` **delegates** to it — one engine, not a fork. No LLM in the score path. `state_source` enum has no `'ai'` value by construction. |
| **App pages (13)** | dashboard, onboarding, company, readiness/{controls,score,poam}, evidence, documents, opportunities, billing, settings/{api,audit,keys} |
| **API routes (19)** | tenant, onboarding, company, readiness/{controls,score,poam}, evidence, documents, audit, billing/{checkout,state}, stripe/webhook, keys, radar/{opportunities,ingest}, local-agent/{enroll,results}, waitlist |
| **Billing** | Stripe TEST mode. Separate webhook endpoint + separate signing secret — the legacy `@ts-nocheck` webhook is untouched. Idempotency via `launchpad_stripe_events` PK. Entitlements derived server-side. |
| **UI** | Glass control system across marketing + app; animated register/audit rows; expandable hash-chain audit trail; single-click sidebar. |

### 1.2 Schema exists, UI does not

These tables were created in P7 and have **no page and no route** behind them. They are the cheapest wins in this document:

`launchpad_training_assignments` · `launchpad_tasks` · `launchpad_resource_cards` · `launchpad_bom_parts` · `launchpad_proposal_workspaces` · `launchpad_partner_profiles` · `launchpad_partner_consents` · `launchpad_document_templates` · `launchpad_registration_records` · `launchpad_capability_profiles`

### 1.3 Routes the spec requires that do not exist

Spec §7.2 lists 27 authenticated routes. We have 13. Missing:

`readiness/scope` · `readiness/ssp` · `training` · `tasks` · `opportunities/[id]` · `proposals/[id]` · `origin-graph` · `resources` · `local-agent` · `enclave` · `partner-mesh` · `advisory` · `settings/security` · `settings/data-boundary` · `settings/export`

### 1.4 Shell components the spec requires that do not exist

Spec §7.3: `DataBoundaryBadge`, `RegulatorySnapshotBadge`, `MYCAOperatorPanel`, `TaskRail`, `EvidenceFreshnessIndicator`, **`AI CreditMeter`**, `Support/AdvisoryButton`. Only the classification banner and company context are built.

### 1.5 Dashboard gap

Spec §7.4 wants 12 panels. The dashboard renders 4 indicators. Morgan's note — *"the dashboard itself needs to be very robust"* — is correct and is tracked as **WP-9**.

### 1.6 Superseded spec language

**The GTM plan's "Founding 50" is dead.** Morgan removed the cap system-wide on Aug 12; migration `20260812160000_launchpad_remove_pass_cap` (applied by you as `20260813010947`) dropped `launchpad_claim_founding_pass()` and `launchpad_founding_pass_claims`. The SKU is `fus_launchpad_launch_pass`. Do not reintroduce scarcity counters, "X of 50 remaining", or cap-claim RPCs from the spec text. Wherever the plan says "Founding 50", read "launch cohort" with no public number.

---

## 2. The commercial model — the part that has to be right

### 2.1 Two meters

| | **Managed AI (Mycosoft keys)** | **BYO Key (customer's account)** |
|---|---|---|
| Whose API key | Ours | Customer's Anthropic / OpenAI / Perplexity / xAI account |
| Who pays the provider | Mycosoft | Customer, directly |
| Charged in | AI credits (subscription allotment + credit packs) | **No credits consumed** |
| Prompt/response retention | Our provider agreements | **Customer's own account and DPA** |
| Our variable cost | Real; guardrail <8% of subscription revenue | ~zero |
| Default for | Everyone at signup | Opt-in, any tier |

This is the answer to "how do we make money while letting them keep their data private." Subscription buys the **platform**: the rule packs, the deterministic score engine, the collectors, the document factory, the audit chain, the tenancy. Managed credits are a convenience bundled on top. A customer who brings their own key still pays full subscription — they are buying the machine, not the tokens. And their prompts never touch our provider accounts, which is a real privacy claim we can make honestly.

**Margin note:** every tenant that switches to BYO improves gross margin. Do not discount BYO tenants. Do not meter their model calls in credits. Do meter their **actions** so entitlement caps (opportunity watches, proposal workspaces, BOM lines) still apply.

### 2.2 Credential custody — **DECIDED: Model B, KMS envelope encryption (Morgan, Aug 13 2026)**

> **Decision record.** Morgan selected KMS envelope encryption. Consequences now in force:
> 1. **Schema shipped** — migration `20260813120000_launchpad_ai_connections_tier1.sql` (applied to the project) creates `launchpad_ai_connections` with `key_ciphertext` / `key_dek_wrapped` / `key_kms_key_id` / `key_last4`. **Column grants strip key material from the `authenticated` role entirely** — members can see their connection rows but can never select or write the ciphertext columns; only `service_role` touches them. Also shipped: `launchpad_ai_cost_ledger` (§11.4 fields, insert-only) and `launchpad_tier1_records`.
> 2. **Cursor delivered the envelope service (Aug 12)** — see `CURSOR_TO_CLAUDE_OPERATIONAL_BACKEND_CONTRACT_AUG12_2026.md` §2. **Honest name: application envelope with an env master key, NOT AWS KMS** until `LAUNCHPAD_KMS_ARN` is provisioned (if that ARN is set while AWS wrap is unprovisioned, encrypt fails closed). Random DEK per secret → AES-256-GCM → DEK wrapped with the 32-byte master from `LAUNCHPAD_KMS_MASTER_KEY` (64 hex chars, gitignored `.env.local` only, never committed, never logged); `LAUNCHPAD_KMS_MASTER_KEY_ID` (default `env-master-v1`) is written to `key_kms_key_id`. Without the master key the BFF refuses BYO intake with 503 `kms_unconfigured`. Plaintext key crosses the wire exactly once at POST; every later read is `key_last4` only. Marketing must not say "AWS KMS" until the ARN is real.
> 3. **Policy bump required before real tenants connect keys** — publish `data_classification_policy` **v1.1** with a carve-out under `credentials_and_secrets`, e.g.: *"Exception: third-party AI provider API keys a customer explicitly connects are stored encrypted under a customer-scoped key (KMS envelope). They are never readable by Mycosoft staff, never logged, never returned by any API, never used for training, and are deleted immediately on revocation or tenant deletion."* Trust-page boundary language changes from "we store no credentials" to the same qualified statement. Draft goes to counsel with the WP-12 legal review.
> 4. **BYO calls are never metered in credits** and the prompt firewall sits on the BYO egress path exactly as on managed.

The original analysis, kept for context:

`data_classification_policy.yaml` v1.0, currently published on our trust page, says:

```yaml
credentials_and_secrets:
  allowed: false
  action: block_redact_rotate_and_initiate_security_workflow
```

Accepting a customer's AI provider API key means **storing a credential in a workspace whose published policy says it stores none.**

Every existing Launchpad credential surface honours that policy by making the secret **unrecoverable**:

- `launchpad_agent_credentials` stores `enroll_secret_hash` — a hash, never the secret.
- `launchpad_api_keys` stores a hash and a display prefix; the key is shown once at creation and never again.
- `launchpad_platform_secrets_meta` stores secret **names** and a `configured` boolean. Its own table comment reads: *"Never stores secret values. Prefer env/KMS."*

An AI provider key breaks that pattern in a way no existing table does: **it has to be recoverable.** You cannot call Anthropic with a hash. This is a genuinely new class of storage for Launchpad, not an extension of an existing one, and it is why the decision below belongs to Morgan rather than to whoever writes the migration.

Three viable models. My recommendation is **B**, with **A** available per-tenant.

**A — Session-only (zero custody).** Key held in memory for the request, never written. Customer re-supplies per session, or supplies it in a browser-local store we never receive.
*Pro:* policy unchanged, no breach surface, strongest privacy claim. *Con:* no scheduled/background AI work for that tenant — no overnight radar enrichment, no batch digests.

**B — Envelope encryption with a KMS (recommended).** Per-tenant data encryption key wrapped by a KMS master key; ciphertext in Postgres, DEK never at rest in plaintext, decrypt in-request only, key material never logged, never returned by any API, never in Stripe metadata. Requires: `credentials_and_secrets` policy carve-out published as v1.1, trust-page language updated from "we store no credentials" to "we store no CUI and no customer content; third-party API keys you choose to connect are held encrypted under a customer-scoped key and are never readable by Mycosoft staff", rotation UI, immediate revoke, and deletion on tenant delete.
*Pro:* background work possible, one-time setup for the customer. *Con:* we are now a credential holder — that is a real security obligation and a real disclosure change.

**C — Local agent brokered.** Keys live on the customer's own machine; the Local Assurance Agent performs model calls locally and returns results.
*Pro:* strongest boundary. *Con:* requires the agent, which is itself unbuilt; not viable for tenants without one.

**Do not implement B until Morgan signs off on the policy version bump.** If the answer is "not yet", build **A** and ship the connector surface with honest session-only behaviour. Under no circumstance store a provider key in a plain `text` column.

### 2.3 Cost ledger (spec §11.4) — build this with WP-1, not after

Per AI action record: `provider, model, provider_price_version, input_units, output_units, search_requests, retrieval_requests, reasoning_units, cache_read, cache_write, actual_cost, reserved_cost, credits_charged, byo_key (bool), tenant_id, user_id, task_id, created_at`.

Guardrails from spec §11.4, to be enforced in code not spreadsheets: warn at 6% of subscription revenue, hard review at 8%, deep research blocked when credits are exhausted without explicit approval, shared enrichment cached **across** tenants (never re-research the same solicitation per customer), batch for digests.

**Reserve-then-settle:** debit estimated credits before the call, settle to actual after. A failed call refunds. Without this, a mid-call crash bills the customer for nothing.

---

## 3. Parity: our compliance app → the customer's product

This is the core of Morgan's request. We built these for ourselves at `/security/*`; each row becomes a tenant-scoped Launchpad feature. Left column is what exists internally and is reusable. Right column is the work.

### 3.1 The ten tabs of `/security/compliance`

| Internal tool | Reusable asset | Launchpad work |
|---|---|---|
| **Controls** register | `ControlRemediationWorkbook.tsx`, `CmmcReferencePanel.tsx` (prop-driven, already tenant-safe) | Built (`readiness/controls`). Add per-control evidence linking + confidence. |
| **Tier-1 Turnkey** | `app/api/security/tier1/route.ts` pattern — AT training, PS screening/access agreements, IR tabletop, incident log, DIBNet readiness | **WP-4.** New `launchpad_tier1_records`. Replace `@mycosoft.(org\|com)` email RLS with `launchpad_is_member()`. Drop MAS enrichment; substitute Local Agent + customer input. |
| **Closure Board** | `closure-guidance.ts`, `closure-statements.ts` — 5-wave taxonomy, self-invalidating statements | **WP-5.** Keep the *mechanism*, discard Mycosoft content. Waves become a generic remediation-sequencing engine. `STANDING_RECORD` becomes per-tenant. |
| **Audit Logs** | hash-chain verify | Built and better than the internal one — rows expand to show chain linkage. |
| **Reports** | `lib/reports/llm.ts` (provider-agnostic), `report-doc.ts`, 5 report types: remediation plan, CMMC L2 self-assessment, SPRS score, POA&M, supply-chain/Made-in-America | **WP-6.** Provider-agnostic client is where BYO-key routing plugs in. |
| **SSP / POA&M** | `ssp-generator/`, `forms/poam-generator.ts` (~15 Mycosoft literals to parameterize) | **WP-6.** `readiness/ssp` route missing entirely. |
| **Reference (L2/L3)** | `cmmc-l2-controls.json` (462KB, verified 110-control corpus — the crown jewel), `cmmc-l2-guidance.json`, `cmmc-l3-*`, `cui-categories.json`, `statutory-framework.ts` | Pinned by `launchpad_rule_packs` (version + corpus hash). **L3 and CUI categories are not yet surfaced to tenants.** |
| **Supply Chain** | `prohibited-sources.ts`, `supply-chain-prohibitions.json`, `bom-check.ts`, `mycoforge.ts`, `amazon-reconciliation.ts` | **WP-7 (Origin Graph).** Schema exists (`launchpad_bom_parts`), zero UI. Highest-price tier depends on it. |
| **PreVeil (L2 Enclave)** | `preveil/crm.ts` — `PREVEIL_ENCLAVE_CONTROLS`, family responsibility map, CUI boundary, provisioning steps | **WP-8 (Enclave Bridge).** Generalize to a provider-neutral CRM interface; PreVeil becomes the first implementation, not the only one. |
| **Exostar (L3)** | `exostar/exostar-client.ts` — org, assessment, findings, supplier, `SPRSSubmission`, `DD254` types | **WP-8.** Same generalization. |

### 3.2 Other internal surfaces worth porting

| Internal | Launchpad target |
|---|---|
| `/security/forms` — 15 form generators (SSP ×5, POA&M ×2, DD-254, SF-86, SF-312, SF-328, FOCI mitigation, SPRS, CMMC self-assessment, SBIR proposal) | Document factory catalogue. **SF-86 must be excluded** — background-investigation data is explicitly prohibited by the data classification policy. Others become templates with `[CUSTOMER INPUT REQUIRED]` placeholders. |
| `/security/fcl` — facility clearance readiness | **WP-10.** Clearance Readiness checklist. Must carry spec §19.4 language: individuals do not self-apply; a company cannot sponsor its own FCL; we cannot obtain or guarantee clearance. |
| `/security/incidents` + `incident-chain.ts` | Tenant incident log feeding IR.L2-3.6.x. Sanitized metadata only — no raw logs, by schema. |
| `/security/compliance/tabletop` + `hitl-tabletop-script.ts` | Tabletop exercise generator; produces IR training evidence. |
| `/security/redteam`, `/security/network`, `suricata-ids.ts`, `network-scanner.ts` | **Do not port to the cloud workspace.** These belong in the Local Assurance Agent, where raw telemetry stays local. Cloud receives sanitized structured results only. |
| `remediation-library.ts` — `getRemediationPlan()`, `FAMILY_META` | Port the schema now; content is Mycosoft-stack-specific and must become plan × `StackProfile`. Generic-first, stack-specific later. |

---

## 4. Work packages

Ordered by dependency. Each has explicit acceptance criteria. "Done" means code + tests + migration + UI + docs, per the prompt pack's definition of done.

---

### WP-1 — AI provider connectors and the dual meter
**Blocked on:** §2.2 custody decision.

Providers: **Anthropic (Claude)**, **OpenAI (incl. Codex)**, **Perplexity**, **xAI (Grok)**, **Cursor**. Morgan: *"None of this works without all of those AI tools plugged in."*

- `launchpad_ai_connections` — tenant, provider, mode (`managed` | `byo`), status, last verified, scopes, `key_ciphertext` + `key_dek_id` (model B only; **absent entirely under model A**), created/revoked timestamps. No plaintext key column ever. Note there is no `launchpad_integration_connections` table today — this is new schema, not a column addition.
- `launchpad_ai_cost_ledger` — full §11.4 field list above.
- Provider adapter interface: `complete()`, `stream()`, `embed()`, `research()`, `verifyKey()`. Route by tenant connection; fall back to managed when no BYO connection exists and credits remain.
- Reserve-then-settle credit flow through a definer RPC under advisory lock (mirror `launchpad_spend_credits`).
- Model governance record per task type (spec §11.6): purpose, allowed data classes, permitted providers, max context and cost, output schema, prohibited claims, human-review threshold, retention, fallback, version.
- **Prompt firewall applies to BYO exactly as to managed.** `lib/launchpad/prompt-firewall.ts` exists — it must sit on the egress path for every provider, not just ours. A customer's own key does not license a MET claim.
- MCP surface: expose our own tools (readiness state, evidence index, opportunity records) as an MCP server the customer's Claude/Cursor can attach to, tenant-scoped by API key. This is the "operating local systems the same way we do it" half of the request and it reuses `launchpad_api_keys`, already built.

**Acceptance:** a tenant connects a real Anthropic key; a policy draft generates through *their* account; cost ledger shows `byo_key=true` and `credits_charged=0`; revoking the connection immediately fails the next call; the key is unreadable in the DB and absent from every API response and every log line.

---

### WP-2 — Contract Radar collectors (live data)
`lib/launchpad/collectors/sam.ts` exists; `dsip-grants-skeleton.ts` is a skeleton. `radar/ingest` is a bearer-token stub.

- SAM.gov, DoD SBIR/STTR (DSIP), Grants.gov collectors on a schedule.
- Normalize to the existing `launchpad_opportunities` shape; dedupe on `unique(source, source_id)`.
- Amendment diffing into `launchpad_opportunity_amendments` with change summaries.
- **Central enrichment cached across tenants** (spec §11.5) — enrich once, match many. This is the difference between a data platform and an uncontrolled research bill.
- Tenant fit matching (spec §15.4) against `launchpad_capability_profiles`.
- Deep research gated on credits **and** an above-threshold fit score.

**Acceptance:** real opportunities land nightly; an amendment produces a diff and a notification; the same solicitation is enriched exactly once regardless of tenant count.

---

### WP-3 — Local Assurance Agent
Enrollment and results routes are 501 stubs with contracts documented. Build the binary.

Security model is non-negotiable (prompt pack §36.6): read-only by default, no unrestricted remote shell, no credential harvesting, no exploitation or lateral movement, signed policy manifest, signed releases, customer-controlled enrollment/revocation/kill switch, **raw data stays local**, cloud receives only minimized structured results plus a pseudonymous device ID and optional evidence hash.

Initial checks: OS/device inventory, patch posture, disk encryption, MFA indicators, firewall, endpoint protection, backup status, stale accounts, open services, logging availability, Wazuh health, NAS health.

**Hard rule:** an `agent_check` result may **never** flip a control to implemented on its own. It proposes; the customer confirms. The `state_source` enum enforces the shape; the workflow must enforce the intent.

**Acceptance:** Windows/Linux/macOS installers; enrollment via HMAC; a check runs and only the sanitized result reaches the cloud (verify by inspecting what crosses the wire); revocation kills the device immediately.

---

### WP-4 — Tier-1 Turnkey (tenant edition)
Port `app/api/security/tier1/route.ts`. New `launchpad_tier1_records`, RLS by `launchpad_is_member()`.

Tracks the operator controls that no scanner can prove: AT.L2-3.2.1/2/3 (security awareness + role-based training), PS.L2-3.9.1/2 (screening, access agreements, termination), IR.L2-3.6.2/3 (incident reporting + tabletop). Per-person completion, dates, artifacts, expiry.

**Acceptance:** a 3-person tenant records training for each person, and the register reflects it without any AI involvement in the state change.

---

### WP-5 — Training + Tasks + Closure Board
Tables exist (`launchpad_training_assignments`, `launchpad_tasks`); no UI.

- `training`: assign official/approved links, record assignment/completion/score/certificate metadata/expiry, role-specific flags, customer-created courses, completion reports. **Never copy copyrighted course content** (spec §14.5) — link and record, do not host.
- `tasks` + `TaskRail` shell component: blockers and deadlines surfaced everywhere.
- Closure Board: port the 5-wave sequencing and self-invalidating statement mechanism, per-tenant.

---

### WP-6 — Document factory completion
`policy-factory.ts` and `tenant-profile.ts` exist. Missing: SSP route entirely, POA&M generator parameterization, the report suite.

- De-Mycosoft `ssp-generator/` and `forms/poam-generator.ts` (~15 literals → `TenantProfile` fields).
- `readiness/ssp` page.
- Five report types from the internal Reports tab, tenant-scoped.
- Approval workflow: `draft` → customer review → `approved`. Only a human moves it.
- Every generated artifact opens with **DRAFT — CUSTOMER REVIEW REQUIRED**, uses `[CUSTOMER INPUT REQUIRED]` for missing facts, cites source IDs, and never marks a control MET.

---

### WP-7 — Origin Graph (the $499 tier)
Schema exists, UI does not. Highest-price recurring tier currently sells nothing.

BOM ingest → `launchpad_bom_parts`; domestic-content calculation (spec §17.4); prohibited-source screening (reuse `prohibited-sources.ts`, `supply-chain-prohibitions.json`, Section 889); substitution workflow; supplier evidence; per-tier BOM line limits (5,000 / 25,000).

---

### WP-8 — Enclave Bridge + Resource Graph
Morgan named these explicitly as missing.

**Enclave Bridge (§13):** generalize `preveil/crm.ts` and `exostar-client.ts` into a provider-neutral connector interface. Connector pattern is strict: OAuth or scoped service account; **list metadata and approved folders only**; customer selects the item to reference; we store title, ID, owner, date, hash, status; **content is not imported**; no broad drive search; no AI processing without item-level approval; customer can revoke and delete metadata. Ship the customer responsibility matrix (§13.2) per integration.

**Resource Graph (§18):** `launchpad_resource_cards` exists and is empty. Seed with the full card schema (§18.3) — every card carries `relationship_type`, `compensation_disclosure`, `last_verified_at`, `alternatives`, and both `data_allowed` and `data_not_allowed`.

Seed set Morgan asked for:

| Category | Cards |
|---|---|
| Secure collaboration / enclave | PreVeil, Microsoft GCC High, AWS GovCloud, Google Assured Workloads, self-hosted |
| Supplier / assessment networks | Exostar (incl. DD-254 and SPRS submission context) |
| Network + infrastructure | Managed firewall/router, managed switch + VLANs, Wi-Fi APs, NAS with immutable/offsite backup, UPS, endpoint management, logging/SIEM, fiber serviceability by ZIP, structured cabling. **Ubiquiti class sits here.** Present as the §18.4 decision tree, not a shopping cart. |
| Corporate formation | **Clerky**, counsel referral, registered agent, EIN path, founder IP assignment, board/stockholder records, insurance |
| Cap table / equity | **Pulley**, alternatives |
| Federal registration | Login.gov → SAM.gov → UEI → entity validation → CAGE via DLA workflow → annual renewal. **Never ask for a DUNS number** (§19.2) |
| Funding | Accelerators, VCs, primes, grant support. Must not imply any listed investor will fund the customer (§18.5) |

**Legal constraints, non-optional (§18.1):** vendor names in plain text; no logos or brand assets without license; never "official partner", "approved", "certified by", or "recommended by the government" without written support; external-link indicators; FTC material-connection disclosure wherever we receive compensation; takedown workflow. **No card may say or imply "use this and you are CMMC compliant."**

---

### WP-9 — Robust dashboard (spec §7.4) + shell components (§7.3)
Morgan: *"the dashboard itself needs to be very robust."* Twelve panels: readiness score + implementation count, conditional eligibility estimate, evidence confidence and freshness, top blockers, upcoming deadlines, opportunity matches, proposal pipeline, registration status, Origin Graph alerts, Local Agent status, regulatory updates, Partner Mesh status.

Shell components: `DataBoundaryBadge`, `RegulatorySnapshotBadge`, `MYCAOperatorPanel`, `TaskRail`, `EvidenceFreshnessIndicator`, `AI CreditMeter`, `Support/AdvisoryButton`.

**The four indicators stay independent.** Implementation count ≠ weighted score ≠ conditional eligibility ≠ evidence confidence. Never merge them into one number — that is the honesty mechanism, and 96/110 is not a status.

Evidence confidence formula (§14.6): 20% recency + 15% owner/source attribution + 20% objective coverage + 15% integrity/version + 20% reviewer status + 10% consistency. **Display the factors, not only the number.**

I will build these surfaces once the data is behind them. Give me the routes.

---

### WP-10 — Registration, formation, and clearance readiness
Routes: `company/registrations`, `company/formation`, `company/clearance-readiness`. Table `launchpad_registration_records` exists.

Portal account inventory (§19.3) tracks: portal name, org identifier, account owner, authorized organization representative, login **email — never password**, MFA method, recovery owner, status, last verified, renewal date, submission authority.

Export-control and FOCI screening questions (§19.5) — any positive result creates a referral task to qualified counsel. **AI does not produce definitive legal classifications.**

---

### WP-11 — Data boundary enforcement (§10.2)
Currently we have the banner and the prompt firewall. Missing: upload interceptor with DLP scanning, quarantine queue, per-object sensitivity labels, immutable blocked-event audit, customer export and deletion (`settings/export`).

**Acceptance:** upload a file containing a `CUI//` marker or an API-key-shaped string — it is blocked, quarantined, and an immutable audit event is written. This is the test that proves the boundary is real rather than declared.

---

### WP-12a — Management analytics (Mycosoft-side customer view)
Morgan's ask, Aug 13: *"integrate with Supabase and the back end so we can keep track of all of our customers… treat them as users and customers and get the data that we can get — not CUI data."*

Everything needed already lands in Supabase by construction — tenants, memberships, subscriptions, credit ledger, AI cost ledger, audit events, feature usage. Build the **operator dashboard** (internal, admin-gated, NOT a Launchpad tenant page): tenant list with plan/status/MRR, activation funnel (signup → onboarding → first score → first document → billing), credit + AI-cost burn per tenant vs the <8% guardrail, churn/grace/read-export queue, and spec §29 metrics. Service-role reads with explicit predicates; **never** control states, evidence titles, or document contents in the operator view — business metadata only, matching the data-boundary promise. GTM §29.6 has the panel layout.

### WP-12 — Production readiness
Stripe live products by lookup key (idempotent provisioning script); live webhook registration; secret rotation; CI secrets into **both** blue-green colors; migration-apply step; `LAUNCHPAD_ENABLED` rollout order; daily Stripe reconciliation; RLS attack checklist (forged `lp_tenant` cookie, tenant-ID stuffing, service-route probing); counsel review of legal pages before the flag flips.

**`LAUNCHPAD_ENABLED` stays OFF in sandbox and production until Morgan says otherwise.** Local `1` for smoke testing only.

---

## 5. Entitlement lockdown map

Build the top tier; gate downward. Source of truth is `entitlements_matrix.yaml`, mirrored in `lib/launchpad/catalog.ts` — **do not create a fourth pricing source**; the repo already had three conflicting ones.

| Capability | Launch Pass | Core | Contractor Ops | Origin Graph | Partner Mesh Pro |
|---|---|---|---|---|---|
| Users | 3 | 3 | 7 | 12 | 25 |
| AI credits / mo | 100 (30d) | 100 | 250 | 500 | 1,200 |
| **BYO AI key** | ✓ | ✓ | ✓ | ✓ | ✓ |
| Readiness workspace | ✓ | ✓ | ✓ | ✓ | ✓ |
| Evidence index | — | ✓ | ✓ | ✓ | ✓ |
| Document factory | — | ✓ | ✓ | ✓ | ✓ |
| Training tracker | — | ✓ | ✓ | ✓ | ✓ |
| Resource Graph | — | ✓ | ✓ | ✓ | ✓ |
| Radar frequency | weekly | weekly | daily | daily | daily |
| Opportunity watches | 25 | 25 | 100 | 250 | 1,000 |
| Proposal workspaces | 0 | 0 | 5 | 10 | 25 |
| Local agent devices | 0 | 0 | 25 | 100 | 500 |
| Enclave Bridge | — | — | ✓ | ✓ | ✓ |
| Origin Graph | — | — | — | ✓ (5k lines) | ✓ (25k lines) |
| Partner Mesh | — | — | — | — | ✓ |
| API access | — | — | — | — | ✓ |

**BYO key is available on every tier including Launch Pass.** It costs us nothing and it is the privacy promise — gating it would be gating the reason a defense-adjacent startup trusts us.

Enforcement: server-derived only, never client-trusted. `requireEntitlement()` exists — extend it. A cap breach returns a real upgrade path, not a 403 with no explanation.

---

## 6. Lane split

**Yours (Cursor):** collectors and scheduling · Local Assurance Agent binary · KMS and credential custody · Stripe live provisioning and reconciliation · CI/deploy/secrets · MAS-side integrations · infrastructure · the enclave connectors' OAuth plumbing.

**Mine (Claude):** every page and component · BFF routes in `app/api/fusarium/launchpad/**` · Supabase migrations for new tenant tables · marketing and legal page structure · the entire UI of WP-4/5/6/7/9/10 once the data exists.

**Coordination:** hand me a route contract and a table, and I will build the surface within a day. Do not build UI in my paths; do not let me touch `app/api/fusarium/launchpad/keys/**`, `lib/launchpad/api-keys.ts`, `lib/launchpad/collectors/**`, `lib/launchpad/service-client.ts`, `radar/ingest`, `stripe/webhook`, `local-agent/**`, or applied migrations.

---

## 7. Non-negotiables

These survive every refactor. They are the product's credibility.

1. Standard Launchpad is **COMMERCIAL // NON-CUI**. Never accept CUI, classified material, export-controlled technical data, raw credentials, raw logs, packet captures, or SF-86/background-investigation data.
2. **No AI action may mark a control MET**, affirm compliance, sign, submit a binding proposal, obtain clearance, or guarantee an award. The `state_source` enum has no `'ai'` value — keep it that way, and apply the same rule to BYO-key calls.
3. **The score engine is deterministic and test-vectored. Never an LLM.**
4. Tenant isolation enforced at **both** DB and API layers. `tenant_id` derived from session, never from a request body. Every service-role query carries an explicit tenant predicate.
5. Four independent indicators; never collapsed into one number.
6. Safe vocabulary: "customer-marked implemented", never "certified" or "compliant". Never state that Mycosoft — or any customer — *is* CMMC compliant.
7. Versioned rule packs pinned by version and corpus hash. CMMC Phase II suspended 7/13/2026; Phase I continues.
8. Audit events insert-only and hash-chained; UPDATE and DELETE revoked from everyone including `service_role`.
9. Every generated document is DRAFT with `[CUSTOMER INPUT REQUIRED]` placeholders and cited source IDs.
10. Partner Mesh receives no tenant data before separate affirmative opt-in.
11. Customer-controlled systems remain authoritative for protected evidence. We store references, metadata, hashes, sanitized results, and drafts.
12. **No mock or fabricated data anywhere in Launchpad** — no fake keys, no invented federal opportunities, no placeholder compliance states presented as real. Demo data lives only in an explicitly marked demo tenant.

---

## 8. Suggested sequence

**Week 1:** §2.2 decision → WP-1 (connectors + dual meter + cost ledger). Nothing else unblocks revenue-safe AI.
**Week 2:** WP-2 (collectors — makes Radar real) ‖ WP-4 + WP-5 (Tier-1, training, tasks — cheapest parity wins, schema already there).
**Week 3:** WP-6 (documents) ‖ WP-8 (Enclave Bridge + Resource Graph seed — Morgan's named gap).
**Week 4:** WP-9 (dashboard) ‖ WP-10 (registration/formation/clearance) ‖ WP-11 (boundary enforcement).
**Then:** WP-3 (Local Agent), WP-7 (Origin Graph), WP-12 (production).

---

## 9. Open items for Morgan

1. ~~**AI credential custody model**~~ — **DECIDED Aug 13: Model B (KMS envelope).** See §2.2 decision record. Remaining sub-item: counsel review of the `data_classification_policy` v1.1 carve-out language before real tenants connect keys.
2. **BYO-key discount policy** — confirm: no discount, no credit consumption, full subscription. That is what I have specced.
3. **Cursor and Grok connectors** — Cursor has no public inference API in the same shape as the others; the realistic integration is MCP (our tools inside their editor) rather than us calling Cursor. Confirm that reading.
4. **Advisory booking** — real calendar integration or a request form for now?
5. **Legal review** — the Resource Graph disclosure language and the vendor relationship types need counsel before any affiliate relationship goes live.

---

*Prepared by Claude for Cursor. Mycosoft, LLC is pursuing CMMC Level 2 (Self-Assessment); it is not assessed compliant, and no statement in this document or the product may claim otherwise.*
