# ChatGPT Master Package Index — Aug 12, 2026

| Field | Value |
|---|---|
| **Date** | August 12, 2026 |
| **Source package** | `C:\Users\Owner1\Downloads\FUSARIUM_Launchpad_Master_Package_v1.0` |
| **Package prepared** | August 10, 2026 (per README / GTM plan) |
| **File count (recursive)** | **10** |
| **Scope of this index** | Inventory + backend-affecting requirements/constraints (collectors, Local Assurance Agent, Stripe, CI/secure SDLC, legal, security, CMMC boundary, non-CUI) |
| **Classification of source** | UNCLASSIFIED // PROPRIETARY // BUSINESS PLANNING (per GTM plan); commercial non-CUI product design |

---

## Package overview

The package defines **FUSARIUM Launchpad**: a commercial, multi-tenant, **non-CUI** Defense Contractor Readiness & Opportunity OS under the FUSARIUM brand—separate schemas/data plane from FUSARIUM ops / defense MINDEX / CREP. Standard service stores metadata, hashes, references, drafts, and sanitized results only; customer-controlled systems remain authoritative for protected evidence. CMMC score/POA&M logic must be **deterministic and test-driven** (never LLM-as-score-engine). Stripe + server-side entitlements gate features. Professional legal/CMMC/privacy/finance/claims review is required before public launch.

---

## File inventory (10)

### 1. README.md

| | |
|---|---|
| **Title** | FUSARIUM Launchpad Master Package v1.0 |
| **Path** | `C:\Users\Owner1\Downloads\FUSARIUM_Launchpad_Master_Package_v1.0\README.md` |
| **Size** | 2,283 bytes |

**Backend-relevant summary:** Lists all package deliverables and states the **critical boundary**: standard commercial product is a **non-CUI readiness workspace**—no certification, independent assessment, default CUI storage, signing/affirming for customers, clearance sponsorship, or guarantees of eligibility/awards/funding. Launchpad may store approved metadata, workflow state, evidence references, optional hashes, and customer attestations; customer enclaves/local systems remain systems of record. Requires versioned regulatory-content service (source, effective date, last-verified, reviewer, supersession) and counsel/CMMC practitioner/privacy-security/finance/marketing review before launch.

---

### 2. FUSARIUM_Launchpad_GTM_Master_Plan_v1.0.md

| | |
|---|---|
| **Title** | FUSARIUM Launchpad — End-to-End Product Architecture, Pricing, Security Boundary, and Go-to-Market Master Plan (v1.0) |
| **Path** | `C:\Users\Owner1\Downloads\FUSARIUM_Launchpad_Master_Package_v1.0\FUSARIUM_Launchpad_GTM_Master_Plan_v1.0.md` |
| **Size** | 163,097 bytes |
| **Doc number** | MYCO-FUS-LAUNCHPAD-GTM-2026-001 |

**Backend-relevant summary:** Canonical 38-section machine-readable master plan for architecture and implementation. **Services:** separate FastAPI Launchpad gateway with identity/tenant, entitlements-billing (Stripe), regulatory-content, readiness/score, evidence-index, document-factory, contract-radar, proposal, origin-graph, resource-graph, local-agent-broker, enclave-bridge, partner-mesh, audit, notifications—backed by dedicated PostgreSQL schemas, Redis/queues, non-CUI object storage, Qdrant for approved embeddings; **no** writes into `fusarium_ops`, defense MINDEX, or CREP without explicit customer-authorized export. **Collectors (Contract Radar):** official sources (SAM.gov, DSIP, Grants.gov, DIU, DARPA, NSPIRES, NSF/Research.gov, etc.) with `fetch_new/updated/detail`, normalize, validate, source_hash, amendment events; central ingest once, cheap tenant matching, credit-metered deep enrichment. **Local Assurance Agent:** signed read-only collectors; no remote shell/credential harvest; cloud gets minimized structured results only; Wazuh sanitized health only. **Stripe:** verified webhooks, idempotency, entitlement state machine with grace/read-export (no destructive lockout on first failed payment); no readiness/CUI in Stripe metadata. **CMMC/non-CUI:** COMMERCIAL // NON-CUI WORKSPACE; block CUI/classified/export-controlled/secrets/raw logs; upload DLP + quarantine + prompt firewall; deterministic weighted score + POA&M (never LLM); versioned rule packs. **CI/security:** SDLC gates (threat model, tenant-isolation + data-boundary tests, dependency/container scan, SBOM, staging synthetic data), immutable audit, release approval/rollback; QA suites for score, boundary, Stripe, AI, Radar, Origin Graph, local agent.

---

### 3. FUSARIUM_Launchpad_GTM_Master_Plan_v1.0.docx

| | |
|---|---|
| **Title** | FUSARIUM Launchpad — End-to-End Product Architecture, Pricing, Security Boundary, and Go-to-Market Master Plan (v1.0) — formatted Word twin |
| **Path** | `C:\Users\Owner1\Downloads\FUSARIUM_Launchpad_Master_Package_v1.0\FUSARIUM_Launchpad_GTM_Master_Plan_v1.0.docx` |
| **Size** | 154,621 bytes |

**Backend-relevant summary:** Formatted ~82-page management twin of the Markdown master plan (same product, security, legal-boundary, pricing, and execution content). Backend implementers should treat the **`.md` as the revision-control source** and the `.docx` as human/executive distribution; requirements for collectors, agent, Stripe, tenancy/RLS, non-CUI enforcement, and CMMC score engines are identical to the Markdown file. Do not implement from marketing claims in the Word file without mapping to the versioned regulatory-content and claims-library constraints. SHA256 integrity listed in `SHA256SUMS.txt`.

---

### 4. FUSARIUM_Launchpad_Pricing_Unit_Economics_v1.0.xlsx

| | |
|---|---|
| **Title** | FUSARIUM Launchpad Pricing & Unit Economics Model v1.0 |
| **Path** | `C:\Users\Owner1\Downloads\FUSARIUM_Launchpad_Master_Package_v1.0\FUSARIUM_Launchpad_Pricing_Unit_Economics_v1.0.xlsx` |
| **Size** | 17,998 bytes |
| **Sheets** | Assumptions, Plans, Unit Economics, Cohort Revenue, AI Cost Model, Advisory, Stripe SKUs, Sensitivity, Executive Dashboard |

**Backend-relevant summary:** Formula-driven pricing and margin model that drives **entitlement limits and cost ledgers**. Plans encode user seats, AI credits/mo, opportunity watches, proposal workspaces, local-agent device caps, BOM line limits, Contract Radar frequency (weekly vs daily), and Origin Graph / Partner Mesh flags—backend must enforce these server-side. Stripe fee assumptions and AI credit reserve ($0.06/credit planning) imply billing reconciliation and an **AI actual/reserved cost ledger**. Stripe SKUs sheet aligns lookup keys with `stripe_product_catalog.json`. Advisory SKUs (15/30/60/90 min) need checkout + scheduling integration. Founding cohort ($397 × 50) and contribution-margin guardrails affect grace/credit throttling and support SLAs, not CUI storage.

---

### 5. FUSARIUM_Launchpad_AI_Handoff_Prompt_Pack_v1.0.md

| | |
|---|---|
| **Title** | FUSARIUM Launchpad AI Handoff Prompt Pack v1.0 |
| **Path** | `C:\Users\Owner1\Downloads\FUSARIUM_Launchpad_Master_Package_v1.0\FUSARIUM_Launchpad_AI_Handoff_Prompt_Pack_v1.0.md` |
| **Size** | 9,310 bytes |

**Backend-relevant summary:** Executable build prompts for Cursor/Codex/Claude/Perplexity. **Master prompt** mandates separate commercial multi-tenant non-CUI workspace; no commingle with FUSARIUM ops/defense MINDEX; tenant isolation at DB+API; Partner Mesh only after affirmative opt-in; build order A–O ending in analytics/export/delete/audit; DoD requires code+tests+migrations+UI+docs+monitoring (no placeholder operational data outside demo). **Stripe prompt:** env-specific price IDs, signature verification, idempotency table, payment state machine, credit ledger, daily reconciliation, replay tests. **Local Agent prompt:** read-only, signed policy/releases, kill switch, raw data stays local. **Collectors/research:** enrich normalized opportunities with citations; reuse central enrichment; never bid/submit. **Document factory / regulatory review:** DRAFT-only, no MET/compliance claims; CMMC rule pack from official sources with deterministic test vectors. Definition of done binds CI/QA to phase completion.

---

### 6. stripe_product_catalog.json

| | |
|---|---|
| **Title** | Stripe Product Catalog (catalog_version 1.0) |
| **Path** | `C:\Users\Owner1\Downloads\FUSARIUM_Launchpad_Master_Package_v1.0\stripe_product_catalog.json` |
| **Size** | 5,107 bytes |
| **Effective** | 2026-08-10 |

**Backend-relevant summary:** Implementation-ready USD catalog: Founding Launch Pass one-time $397 (`founding_pass_30d`, cohort 50, no auto-renew unless explicit); Core $149/mo / $1,490/yr; Contractor Ops $299/$2,990; Origin Graph $499/$4,990; Partner Mesh Pro $999/$9,990; credit packs 100/500/2000; advisory 15/30/60/90. Metadata maps to entitlement plan keys and included credits only—**no readiness or protected data**. Lists required webhook events (checkout, customer, subscription, invoice, charge, payment_intent) and implementation requirements: verify signatures, persist event ID + payload hash, idempotent/replay-safe processing, server-side entitlements, daily reconciliation, explicit pass renewal selection. Tax code present for founding pass; Founding Pass description reiterates non-CUI / no certification / no proposal submission.

---

### 7. entitlements_matrix.yaml

| | |
|---|---|
| **Title** | Launchpad Plan & Module Entitlements Matrix v1.0 |
| **Path** | `C:\Users\Owner1\Downloads\FUSARIUM_Launchpad_Master_Package_v1.0\entitlements_matrix.yaml` |
| **Size** | 2,213 bytes |

**Backend-relevant summary:** Machine config for feature gates: `founding_pass_30d`, `core`, `contractor_ops`, `origin_graph`, `partner_mesh_pro`. Caps cover users, AI credits, readiness/evidence/document/training/resource flags, Contract Radar frequency and watch counts, proposal workspaces, **local_agent_devices** (0→25→100→500), enclave_bridge, origin_graph + BOM limits (5k/25k), partner_mesh/sandbox, api_access, clinic cadence. Backend entitlement service must derive limits from verified Stripe state (not client claims) and enforce at API/middleware. Higher tiers unlock collectors intensity (daily radar), agent fleet size, and Partner Mesh API—still under non-CUI / separate-consent rules from the master plan.

---

### 8. data_classification_policy.yaml

| | |
|---|---|
| **Title** | Launchpad Data Classification Policy v1.0 (COMMERCIAL // NON-CUI WORKSPACE) |
| **Path** | `C:\Users\Owner1\Downloads\FUSARIUM_Launchpad_Master_Package_v1.0\data_classification_policy.yaml` |
| **Size** | 2,249 bytes |
| **Effective** | 2026-08-10 |

**Backend-relevant summary:** Enforceable classification baseline for product data plane. Default: `standard_service_is_non_cui`, customer controls authoritative evidence, **no AI training on tenant data**. Classes: `public` (allowed), `customer_non_cui` (allowed with purpose/policy), `customer_restricted` (encryption + role limits; AI denied by default—EIN, FOCI/clearance facts, etc.), `cui`/`classified`/`export_controlled_technical_data`/`credentials_and_secrets` blocked (quarantine/incident), `raw_security_telemetry` false by default (keep local; sanitized structured results only—aligns Local Agent). Controls require persistent banner, onboarding ack, upload interceptor/DLP, quarantine, prompt firewall, per-object labels, immutable blocked-event audit, export/deletion, no Partner Mesh sharing without opt-in. Prohibited examples include passwords/keys, SSN/SF-86, raw PCAPs, full SIEM logs, CUI screenshots.

---

### 9. implementation_backlog.csv

| | |
|---|---|
| **Title** | Launchpad Implementation Backlog (137 tasks) |
| **Path** | `C:\Users\Owner1\Downloads\FUSARIUM_Launchpad_Master_Package_v1.0\implementation_backlog.csv` |
| **Size** | 29,351 bytes |
| **Rows** | LP-001 … LP-137 (all Status: Not Started as of package) |

**Backend-relevant summary:** Prioritized engineering/legal/ops backlog spanning Governance, Identity & Tenancy, Billing, Security & Data Boundary, Onboarding, ASA Workspace, Evidence & Documents, **Contract Radar collectors** (LP-080–086 SAM/DSIP/Grants/DIU/DARPA/NSPIRES/NSF + dedupe/amendment/fit/health), Proposal, Origin Graph, Resource Graph, Enclave Bridge, **Local Agent** (threat model, enrollment, Windows/Linux collectors, Wazuh adapter, signed updates), Partner Mesh, GTM, Success, Analytics. P0 14-day items include tenant IDs, MFA, RBAC, RLS, API tenant middleware, Stripe products/checkout/webhooks/idempotency/state machine/entitlements, non-CUI banner/upload quarantine/labels/prompt firewall, score engine + rule pack + test vectors. Legal/security tasks (ToS, privacy, non-CUI policy, DLP incident workflow, immutable audit, pen test, SBOM) gate launch. Acceptance criteria repeatedly require implemented + tested + documented + monitored + approved—binds CI and release gates.

---

### 10. SHA256SUMS.txt

| | |
|---|---|
| **Title** | Package Integrity Manifest (SHA-256) |
| **Path** | `C:\Users\Owner1\Downloads\FUSARIUM_Launchpad_Master_Package_v1.0\SHA256SUMS.txt` |
| **Size** | 906 bytes |

**Backend-relevant summary:** Integrity hashes for the nine content deliverables (excludes this sums file itself). Use before import into CI/CD or artifact registries to verify untampered catalogs (Stripe JSON, entitlements YAML, classification policy, backlog, GTM plan). Supports secure SDLC / release provenance expectations in §30 of the master plan. Does not define product behavior beyond supply-chain integrity of the package.

| File | SHA-256 (prefix) |
|---|---|
| `FUSARIUM_Launchpad_GTM_Master_Plan_v1.0.docx` | `a566f154…` |
| `FUSARIUM_Launchpad_GTM_Master_Plan_v1.0.md` | `ab68bc78…` |
| `FUSARIUM_Launchpad_Pricing_Unit_Economics_v1.0.xlsx` | `2dace1ec…` |
| `FUSARIUM_Launchpad_AI_Handoff_Prompt_Pack_v1.0.md` | `be633a5f…` |
| `stripe_product_catalog.json` | `36ed13fa…` |
| `entitlements_matrix.yaml` | `46429755…` |
| `data_classification_policy.yaml` | `9c86fa85…` |
| `implementation_backlog.csv` | `a7878be9…` |
| `README.md` | `2d63e766…` |

---

## Cross-cutting backend constraints (all files)

| Theme | Constraint |
|---|---|
| **Non-CUI / CMMC boundary** | Standard SaaS = COMMERCIAL // NON-CUI; no default CUI/classified/export-controlled/secrets/raw telemetry; customer systems authoritative; Launchpad = metadata/hashes/refs/drafts/sanitized results |
| **Score engine** | Deterministic weighted CMMC score + POA&M; versioned official rule packs; LLM never writes score/MET |
| **Collectors** | Official public sources only; central normalize/dedupe/hash; amendment diffs; tenant fit with reasons/disqualifiers; deep research credit-metered |
| **Local Agent** | Signed, read-only, no shell, local raw data, broker validates/replay-protects sanitized results |
| **Stripe** | Catalog + webhooks + idempotency + server entitlements + grace/read-export; no protected data in metadata |
| **Tenancy / security** | Separate Launchpad schemas; RLS; tenant from auth; MFA; prompt firewall; DLP/quarantine; immutable audit |
| **Legal / claims** | No certify/guarantee/sign/submit/clearance sponsorship; counsel + practitioner review; claims library |
| **CI / assurance** | Phase complete only with tests (score, boundary, Stripe, AI, Radar, agent), scans, monitoring, rollback |

---

## Directory tree

```text
FUSARIUM_Launchpad_Master_Package_v1.0/
├── README.md
├── FUSARIUM_Launchpad_GTM_Master_Plan_v1.0.md
├── FUSARIUM_Launchpad_GTM_Master_Plan_v1.0.docx
├── FUSARIUM_Launchpad_Pricing_Unit_Economics_v1.0.xlsx
├── FUSARIUM_Launchpad_AI_Handoff_Prompt_Pack_v1.0.md
├── stripe_product_catalog.json
├── entitlements_matrix.yaml
├── data_classification_policy.yaml
├── implementation_backlog.csv
└── SHA256SUMS.txt
```

No subdirectories; all 10 files are at package root.

---

*Index generated August 12, 2026 from recursive inventory of the v1.0 Master Package. Source package remains authoritative; revalidate CMMC/federal rules before public release.*
