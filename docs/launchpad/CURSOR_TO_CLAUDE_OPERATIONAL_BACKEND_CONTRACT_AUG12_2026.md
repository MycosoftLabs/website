# Cursor → Claude: Operational backend contract — Aug 12, 2026

| Field | Value |
|---|---|
| **Date** | August 12, 2026 |
| **From** | Cursor (Launchpad operational backend) |
| **To** | Claude (pages, glass UI, wiring) |
| **Branch / PR** | `feat/launchpad-backend-aug12` · [PR #260](https://github.com/MycosoftLabs/website/pull/260) |
| **Migration** | `supabase/migrations/20260812210000_launchpad_operational_backend.sql` |
| **Lane** | Cursor = schema, RLS, BFFs, envelope, metering. **Claude** = visual system + page polish. Do not restyle Cursor's BFF contracts. |
| **Flag** | `LAUNCHPAD_ENABLED` stays **0** in sandbox/prod. Local `1` is OK. |

Authority: Morgan authorized Cursor to build Launchpad backend. Default custody model is **B — envelope encryption** (env master key fallback until AWS KMS is provisioned). BYO is on **every tier including Launch Pass**. SF-86 stays out. Scanners stay Local Agent only.

---

## 1. Auth (all session BFFs)

Same as API-keys contract: `requireTenant()` → 404 `launchpad_disabled` / 401 `auth_required` / 403 `tenant_required` / 409 `tenant_selection_required` / 403 `read_export_mode`. `tenant_id` never from the body.

Entitlement failures:

| HTTP | `code` | Extra |
|---|---|---|
| 403 | `entitlement_required` | `capability`, `planKey`, `upgrade: { planKey, lookupKeys }` |
| 403 | `cap_exceeded` | `used`, `limit`, `upgrade` |
| 402 | `insufficient_credits` | managed AI only |
| 409 | `boundary_blocked` | DLP hit; payload not stored |
| 503 | `kms_unconfigured` | BYO store attempted without `LAUNCHPAD_KMS_KEY` |

Empty lists are honest (`[]` + `note`). **No mock federal/opportunity/compliance data.**

---

## 2. New and extended routes

Base: `/api/fusarium/launchpad`

### Ten orphan tables (now have BFFs)

| UI page (Claude) | Call | Shape |
|---|---|---|
| Training | `GET/POST/PATCH /training` | `{ assignments: [{ id, person_name, person_email, course, assigned_at, completed_at, expires_at, certificate_ref }] }` — `course` is title or URL, never hosted content |
| Tasks / TaskRail | `GET/POST/PATCH /tasks` | `{ tasks, blockers }` status `open\|in_progress\|done\|dropped` |
| Resources | `GET /resources` | `{ cards: [{ id, vendor, offering, category, card, last_verified_at }] }` global seed |
| Origin Graph | `GET/POST /origin-graph` | `{ parts, lineCount, lineLimit, domesticContent }` POST body: `assembly, partNumber, description, quantity, unitCost, manufacturer, supplier, countryOfOrigin, prototypeOnly` → `{ id, flags }` |
| Proposals | `GET/POST/PATCH /proposals` · `GET /proposals/:id` | `{ workspaces }` / `{ workspace }` status includes `submitted_by_customer` (customer-recorded) |
| Partner Mesh | `GET /partner-mesh` · `PATCH` profile · `POST` consent or `{ revokeId }` | `{ profile, consents, meshEnabled }` — **no data flow without consent** |
| Document templates | `GET /documents/templates` | `{ templates, excluded: ['sf-86','e-QIP','NBIS'] }` |
| Registrations | `GET/POST /company/registrations` | kinds include `sam,uei,cage,portal,formation,clerky,ein_path,pulley` — **never password or DUNS** |
| Capabilities | `GET/PATCH /company/capabilities` | whitelist fields: `capabilities, target_agencies, naics, psc, exclusions, set_asides, facility_notes` |

### Dual meter + BYO keys (WP-1)

| UI | Call | Shape |
|---|---|---|
| Settings → AI connections | `GET /ai/connections` | `{ connections, providers, byoAvailableOnEveryTier: true, kms }` — **no ciphertext** |
| Connect BYO | `POST /ai/connections` `{ provider, apiKey }` | `{ id, mode: 'byo', displayPrefix, kmsBackend }` key shown never again |
| Cursor | `POST /ai/connections` `{ provider: 'cursor' }` | `{ mode: 'mcp' }` — no inference API; use tenant API key scope `read` for MCP |
| Revoke | `DELETE /ai/connections?id=` | zeros ciphertext columns |
| Credit meter | `GET /ai/complete` | `{ creditBalance, monthlyAllotment, byoAiKey, recent, governance }` |
| Complete | `POST /ai/complete` `{ taskType, system, user, provider? }` | `{ text, byoKey, creditsCharged, provider, model, firewallFlags }` |
| Cost ledger | `GET /ai/ledger` | `{ entries, byoCalls, managedCreditsCharged }` BYO rows have `credits_charged: 0` |

**Meter rule:** Managed AI = credits (reserve-then-settle). BYO = **0 credits**, still pay full subscription. Failed managed calls refund the reservation.

**KMS:** `LAUNCHPAD_KMS_KEY` = 32-byte base64 in gitignored env (current). `LAUNCHPAD_KMS_ARN` is the AWS KMS target and is **not provisioned** — if set, encrypt fails closed until wired. Trust copy draft: `docs/launchpad/TRUST_PAGE_COPY_DRAFT_AUG12_2026.md` — polish that; do not silently keep “never stores secret values” once BYO ships.

### Parity / operational

| UI | Call |
|---|---|
| Dashboard (12 panels, 4 independent indicators) | `GET /dashboard` |
| Scope | `GET/PATCH /readiness/scope` |
| SSP | `GET/POST /readiness/ssp` — always `status: draft` |
| Reports (5 types) | `GET/POST /reports` `{ type: remediation_plan\|cmmc_l2_self_assessment\|sprs_score\|poam\|supply_chain }` |
| Approve document (human) | `PATCH /documents` `{ id, status: customer_review\|approved\|superseded }` |
| Tier-1 | `GET/POST /tier1` kinds: `awareness_training, role_training, screening, access_agreement, termination, incident_report, tabletop` |
| Closure board | `GET/POST /closure` waves 1–5; `{ invalidateId, reason }` to self-invalidate |
| Enclave Bridge | `GET/POST /enclave` metadata only — OAuth not wired this pass |
| Formation | `GET /company/formation` |
| Clearance readiness | `GET/PATCH /company/clearance-readiness` — disclaimer required; SF-86 blocked; FOCI/export → counsel task |
| Opportunity detail | `GET /radar/opportunities/:id` |
| Local Agent list | `GET /local-agent` (enroll/results already existed; **binary remaining**) |
| Advisory | `GET/POST /advisory` request form (no calendar yet) |
| Data boundary | `GET/POST /settings/data-boundary` POST `{ text, filename }` → 409 + quarantine if `CUI//` or key-shaped |
| Export | `GET /settings/export` · `POST` `{ confirm: tenantName }` queues deletion request |
| Security snapshot | `GET /settings/security` |

---

## 3. Entitlements (catalog.ts is the only pricing source)

`byoAiKey: true` on **every** `PlanKey` including `launch_pass_30d`. Caps: proposal workspaces, BOM lines, local-agent devices, opportunity watches — breach returns `cap_exceeded` + upgrade lookup keys, not a bare 403.

---

## 4. Honesty / wiring notes for Claude

- Four dashboard indicators stay independent. Do not blend into one “status”.
- Safe vocabulary from `lib/launchpad/constants.ts`. Never “CMMC compliant”.
- Resource cards: no logos, no “official partner”, no “use this and you are compliant”. Compensation disclosure is on `card.compensation_disclosure`.
- Local Agent / red-team / network scanners: **do not** add cloud telemetry UI. Cloud shows sanitized results only.
- Empty states: show the `note` string from the BFF.
- Apply migration `20260812210000` on the Launchpad Supabase project before wiring pages that hit new tables (`tier1`, `closure`, `enclave`, `ai_connections`, `ai_cost_ledger`, `quarantine`, `clearance_readiness`).

---

## 5. Remaining (not this commit)

| WP | Status |
|---|---|
| WP-2 collectors (live SAM/DSIP/Grants nightly + shared enrichment) | Partial — SAM client exists; ingest is still operator-driven; no mock awards |
| WP-3 Local Agent binary / installers | Remaining — enroll/results/list contracts exist |
| WP-8 OAuth for PreVeil/Exostar | Remaining — metadata BFF only |
| WP-9 UI panels | Claude — BFF `GET /dashboard` is ready |
| WP-12 live Stripe + `LAUNCHPAD_ENABLED` on | Remaining — flag stays off in prod/sandbox |

**Do not apply** a competing draft `20260813120000_launchpad_ai_connections_tier1.sql` if it appears locally — it uses different column names (`key_ciphertext`). Canonical schema is `20260812210000_launchpad_operational_backend.sql` (`ciphertext`, `wrapped_dek`, …).

---

*Mycosoft is pursuing CMMC Level 2 (Self-Assessment); it is not assessed compliant.*
