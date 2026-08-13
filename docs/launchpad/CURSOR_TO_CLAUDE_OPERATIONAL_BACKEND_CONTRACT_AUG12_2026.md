# Cursor → Claude: Operational backend contract — Aug 12, 2026

| Field | Value |
|---|---|
| **Date** | August 12, 2026 |
| **From** | Cursor (Launchpad operational backend) |
| **To** | Claude 15-agent frontend fleet |
| **Branch / PR** | `feat/launchpad-backend-aug12` · [PR #260](https://github.com/MycosoftLabs/website/pull/260) |
| **Lane** | Cursor = schema/RLS, BFFs under `app/api/fusarium/launchpad/**`, `lib/launchpad/**`, envelope, metering, migrations. **Claude** = `app/app/launchpad/**` pages/components. Do not restyle BFF contracts. Cursor will not edit Claude UI files. |
| **Flag** | `LAUNCHPAD_ENABLED` stays **off** in sandbox/prod. |

Authority: Morgan — Cursor stays in the backend lane. Claude already applied the live AI-connections envelope schema. **Do not re-apply Cursor draft `20260812210000_launchpad_operational_backend.sql`.** It was never applied and would collide with Claude’s bytea columns.

Mycosoft is pursuing CMMC Level 2 (Self-Assessment); it is not assessed compliant. No mock data. No secrets in git.

---

## 0. Schema verified on prod (`hnevnsxnhfibhbsipqvz`) — 2026-08-12

| Object | Status | Do not |
|---|---|---|
| `launchpad_ai_connections` | **Live** — `key_ciphertext bytea`, `key_dek_wrapped bytea`, `key_kms_key_id`, `key_last4`, `label`. Unique `(tenant_id, provider, mode)`. Mode check **`managed\|byo\|mcp`**. Status `active\|revoked\|error\|pending_verification`. | Recreate with text `ciphertext/nonce/tag`. |
| Authenticated SELECT of ciphertext / wrapped DEK | **Revoked** (column grants). Service role only. | Select those columns from the session client. |
| `launchpad_ai_cost_ledger` | **Live** — `byo_key`, `credits_charged`, `actual_cost_cents`, `reserved_cost_cents`, `task`. Authenticated **SELECT only**; INSERT is service_role. | Insert from session client. |
| `launchpad_tier1_records` | **Live** — `person`, `category`, `status` (`open\|done\|expired`). Categories: `training\|screening\|access_agreement\|termination\|tabletop\|incident_readiness\|dibnet`. | Write `person_name` / `kind`. |
| Demo tenant | **Partner Mesh Pro**, **1200 credits**. FeatureGate from billing. No `demo_unlock` column. | Add a `demo_unlock` override. |
| Credit RPCs | Applied `launchpad_reserve_credits` / `launchpad_settle_credits` / `launchpad_refund_reservation` (MCP `launchpad_ops_extend_aug12`). `launchpad_spend_credits` already existed. | Duplicate RPC names. |
| Ops tables | Applied MCP `launchpad_ops_tables_aug12`: closure, enclave refs, clearance, quarantine, calendar, roles, radar alerts, BOM replacements, workbook progress + resource/template seeds. | Recreate those tables. |

**Canonical live AI-connections migration:** Claude `20260813031155` / `launchpad_ai_connections_tier1`. Cursor extend-only after that.

---

## 1. Auth (all session BFFs)

`requireTenant()` → 404 `launchpad_disabled` / 401 `auth_required` / 403 `tenant_required` / 409 `tenant_selection_required` / 403 `read_export_mode`. `tenant_id` never from the body.

| HTTP | `code` | When |
|---|---|---|
| 403 | `entitlement_required` | `capability`, `planKey`, `upgrade: { planKey, lookupKeys }` |
| 403 | `cap_exceeded` | `used`, `limit`, `upgrade` |
| 402 | `insufficient_credits` | managed AI only |
| 409 | `boundary_blocked` | DLP hit; payload not stored |
| 503 | `kms_unconfigured` | BYO store without `LAUNCHPAD_KMS_MASTER_KEY` (or ARN set while AWS wrap is unprovisioned) |

Empty lists are honest (`[]` + `note`).

---

## 2. KMS readiness contract (Claude asked; Cursor wired)

**Honest name:** application envelope with an env master key. **Not AWS KMS** until `LAUNCHPAD_KMS_ARN` is provisioned.

| Env (gitignored `.env.local` only) | Meaning |
|---|---|
| `LAUNCHPAD_KMS_MASTER_KEY` | **64 hex chars** = 32-byte AES-256 master. Generated locally if missing. **Never commit. Never log.** |
| `LAUNCHPAD_KMS_MASTER_KEY_ID` | Identifier written to `key_kms_key_id`. Default `env-master-v1`. |
| `LAUNCHPAD_KMS_KEY` | Legacy alias: 32-byte **standard base64**. Still accepted. |
| `LAUNCHPAD_KMS_ARN` | AWS KMS target. **Not provisioned.** If set, encrypt **fails closed**. |

Envelope: random DEK per secret → AES-256-GCM encrypt provider key → wrap DEK with master (AES-256-GCM) → store JSON blobs in `key_ciphertext` / `key_dek_wrapped` bytea. Decrypt in-request via service role only.

Placeholders (no values) live in `.env.example`. Names only in this public repo.

Trust carve-out for counsel: `docs/launchpad/TRUST_PAGE_COPY_DRAFT_AUG12_2026.md`. **Do not rewrite the public trust page** until counsel signs off.

---

## 3. Routes Claude’s fleet should hit

Base: `/api/fusarium/launchpad`

### AI / FeatureGate / billing

| UI | Call | Shape / notes |
|---|---|---|
| Settings → AI connections | `GET /ai/connections` | `{ connections, providers, byoAvailableOnEveryTier, custody, kms, costLedger }` — **no ciphertext**. `displayPrefix` is `…{key_last4}`. |
| Connect BYO | `POST /ai/connections` `{ provider, mode: 'byo', apiKey, label? }` | `{ id, mode: 'byo', displayPrefix, kmsBackend, masterKeyId }` — plaintext **once**, never returned later. |
| Managed | `POST /ai/connections` `{ provider, mode: 'managed', label? }` | `{ id, mode: 'managed' }` — no key fields. |
| Cursor MCP | `POST /ai/connections` `{ provider: 'cursor' }` or `{ mode: 'mcp' }` | `{ mode: 'mcp' }` — no inference key; mint a Launchpad API key under Settings → API keys. |
| Revoke | `PATCH /ai/connections` `{ id, action: 'revoke' }` **or** `DELETE /ai/connections?id=` | Zeros bytea via service role. |
| Credit meter | `GET /ai/complete` | `{ creditBalance, monthlyAllotment, byoAiKey, recent, governance }` |
| Complete | `POST /ai/complete` `{ taskType, system, user, provider? }` | `{ text, byoKey, creditsCharged, provider, model, firewallFlags }` |
| Cost ledger | `GET /ai/ledger` | `{ entries, byoCalls, managedCreditsCharged }` BYO rows `credits_charged: 0` |
| FeatureGate | `GET /entitlements` | `{ featureGate, creditBalance, byoAiKey: true, lockedVisible: true }` — nav may show locked modules; writes still 403 until the plan includes them. |
| Billing state | `GET /billing/state` | `{ subscription, derived, featureGate, creditBalance, lockedVisible }` |
| Checkout (plans + advisory) | `POST /billing/checkout` `{ lookupKey }` | Stripe-hosted; webhook grants entitlements. Advisory lookup keys: `fus_launchpad_advisory_15\|30\|60\|90`. |
| Advisory request | `GET/POST /advisory` | Request form until calendar is wired. |

**Meter rule:** Managed AI = credits (reserve-then-settle). BYO = **0 credits**, still pay full subscription. Failed managed calls refund the reservation.

### Readiness / documents / reports

| UI | Call |
|---|---|
| Dashboard (12 panels, 4 independent measurements) | `GET /dashboard` → `measurements` (do **not** blend into one status) |
| Scope | `GET/PATCH /readiness/scope` |
| Controls | `GET/PATCH /readiness/controls` |
| Score | `GET /readiness/score` |
| SSP | `GET/POST /readiness/ssp` — always `status: draft` |
| POA&M | `GET/POST /readiness/poam` |
| Tier-1 (canonical) | `GET/POST /tier1` and `GET/POST /readiness/tier1` — body `person` / `category` (aliases `personName`/`kind` accepted). Categories listed in §0. |
| Reports | `GET/POST /reports` `{ type }` — DRAFT worksheets; never invent Met. Types include remediation, CMMC L2 self-assessment, SPRS, POA&M, supply chain, NIST 800-171, SBIR/STTR, EAR/ITAR, FOCI, NISP, OM, FedRAMP pointer. |
| Documents | `GET/POST /documents` · `PATCH` `{ id, status: customer_review\|approved\|superseded }` |
| Templates | `GET /documents/templates` `{ templates, excluded: ['sf-86','e-QIP','NBIS'] }` |

### Company / contractor / graph / mesh

| UI | Call |
|---|---|
| Training | `GET/POST/PATCH /training` |
| Tasks | `GET/POST/PATCH /tasks` |
| Resources | `GET /resources` |
| Origin Graph | `GET/POST /origin-graph` · `GET/POST /origin/bom` · `POST /origin-graph/replacements` — flags include `prc_origin` (review flag, not auto-exclude) |
| Proposals | `GET/POST/PATCH /proposals` · `GET /proposals/:id` |
| Partner Mesh | `GET /partner-mesh` · `PATCH` profile · `POST` consent or `{ revokeId }` |
| Registrations | `GET/POST /company/registrations` · `GET/POST /registrations` |
| Capabilities | `GET/PATCH /company/capabilities` |
| Formation | `GET /company/formation` |
| Clearance readiness | `GET/PATCH /company/clearance-readiness` — disclaimer required; SF-86 blocked |
| Closure board | `GET/POST /closure` waves 1–5; `{ invalidateId, reason }` |
| Enclave Bridge | `GET/POST /enclave` · `GET /enclave/playbooks` — metadata only; OAuth not wired |
| Workbook | `GET/PATCH /workbook` |
| Education / glossary | `GET /education/definitions` |
| Calendar / roles | `GET/POST /contractor/calendar` · `GET/POST /contractor/roles` |
| Radar | `GET /radar/opportunities` · `GET /radar/opportunities/:id` · `GET /radar/rank` · `GET/PATCH /radar/alerts` · `POST /radar/ingest` (operator) |
| Local Agent | `GET /local-agent` · `GET /local-agent/devices` · `POST /local-agent/enroll` · `POST /local-agent/results` · `GET /local-agent/findings` — binary: `services/launchpad-myca-harness`; cloud shows sanitized results only. `GET /tasks` accepts Bearer `lp_…` (read). Agents never flip `implemented`. |
| Modules | `GET /modules` |
| ASA indicators | `GET /asa/indicators` |
| Data boundary | `GET/POST /settings/data-boundary` |
| Export | `GET /settings/export` · `POST` `{ confirm: tenantName }` |
| Security snapshot | `GET /settings/security` |
| Tenant | `GET /tenant` |
| Company | `GET/PATCH /company` |
| API keys (hashed) | `GET/POST /keys` · `DELETE /keys/:id` — different storage class from BYO envelope keys |
| Audit | `GET /audit` |
| Onboarding | `GET/POST /onboarding` |
| Waitlist | `POST /waitlist` (public) |

---

## 4. Honesty / wiring notes

- Four dashboard measurements stay independent. Do not render “96/110 = Conditional”.
- Safe vocabulary from `lib/launchpad/constants.ts`. Never “CMMC compliant”.
- Resource cards: no logos, no “official partner”, no “use this and you are compliant”.
- Locked features stay **visible** in nav (`lockedVisible: true`); writes 403 `entitlement_required`.
- Local Agent / scanners: **do not** add cloud telemetry UI.
- Empty states: show the `note` string from the BFF.

---

## 5. Collision notes (resolved this pass)

| Collision | Resolution |
|---|---|
| Cursor draft `20260812210000` text envelope vs live bytea | **Live bytea wins.** BFFs write `key_ciphertext` / `key_dek_wrapped` only. **Do not apply 12210000.** |
| `demo_unlock` vs billing FeatureGate | No column. Demo is already Partner Mesh Pro + 1200 credits. |
| Tier-1 `person_name`/`kind` vs live `person`/`category` | BFF maps aliases; writes live columns. |
| Cost ledger `actual_cost` vs `actual_cost_cents` | Cents columns; service_role insert. |
| GET selecting `display_prefix` / `kms_backend` | Those columns **do not exist**. Public select is `key_last4` / `label` / `key_kms_key_id`. |
| Claude connections route returning 501 for BYO | Cursor wired POST BYO (plaintext once) + service-role bytea store. |
| Dual-schema writes (text + bytea) | Stopped. Would 500 on prod. |

---

## 6. Remaining (not this pass)

| WP | Status |
|---|---|
| WP-2 collectors (nightly SAM/DSIP/Grants) | Partial — SAM client exists; ingest is operator-driven |
| WP-3 Local Agent binary / installers | **Shipped** — `services/launchpad-myca-harness` (local MYCA orchestrator). Contract: `CURSOR_TO_CLAUDE_MYCA_LOCAL_HARNESS_AUG13_2026.md`. Signed OS installers still later. |
| WP-8 OAuth for PreVeil/Exostar | Remaining — metadata BFF only |
| WP-9 UI panels | **Claude fleet** — BFF `GET /dashboard` is ready |
| WP-12 live Stripe + `LAUNCHPAD_ENABLED` on | Remaining — flag stays off in prod/sandbox |

---

*Mycosoft is pursuing CMMC Level 2 (Self-Assessment); it is not assessed compliant.*
