# Tenant API Keys and Secrets — Aug 12, 2026

| Field | Value |
|---|---|
| **Date** | August 12, 2026 |
| **Status** | Implemented on `feat/launchpad-backend-aug12` |
| **Product** | FUSARIUM Launchpad (commercial, multi-tenant, non-CUI) |
| **Related** | Migration `20260812120000_launchpad_api_keys.sql`, `lib/launchpad/api-keys.ts` |
| **UI contract** | [`CURSOR_TO_CLAUDE_API_KEYS_CONTRACT_AUG12_2026.md`](./CURSOR_TO_CLAUDE_API_KEYS_CONTRACT_AUG12_2026.md) |

---

## 1. Platform vs tenant secrets

| Secret | Where it lives | Notes |
|---|---|---|
| Supabase URL + anon + **service_role** | Platform env (`.env.local` / CI / blue-green) | Paste **service_role** from Supabase Dashboard → Project Settings → API. Agents **cannot invent** this value. Never ship to the browser. |
| Stripe secret key | Platform env | `sk_test_…` first; live only after Morgan + counsel |
| Stripe **Launchpad webhook signing secret** | Platform env (`STRIPE_LAUNCHPAD_WEBHOOK_SECRET`) | Created when the Launchpad webhook endpoint is registered (`scripts/launchpad/provision-platform-secrets.ps1` or Stripe Dashboard). Separate from legacy `STRIPE_WEBHOOK_SECRET`. |
| SAM.gov / api.data.gov key | Platform env (`SAM_API_KEY`) | Optional tenant override later; not in DB |
| **Tenant ingest / agent / read API keys** | **Supabase** `launchpad_api_keys` | Per-company; SHA-256 at rest; plaintext **once** on create |
| **Tenant agent enroll secrets** | **Supabase** `launchpad_agent_credentials` (+ `launchpad_local_agents` hashes) | Enroll secret shown once; results prefer Bearer `lp_…` (scope `agent`) |
| `LAUNCHPAD_INGEST_TOKEN` / `LAUNCHPAD_AGENT_ROOT_SECRET` | Platform env | **Deprecated break-glass** for first bootstrap / emergency only |
| `LAUNCHPAD_ENABLED` | Platform env | Stays **0** in sandbox/prod until Morgan explicit go |

**Why Stripe secrets are not in Postgres:** live payment keys and webhook secrets belong in env/KMS. `launchpad_platform_secrets_meta` stores **names and configured flags only** — never values.

---

## 2. Schema

### `launchpad_api_keys`

- `id`, `tenant_id`, `name`, `key_prefix`, `key_hash` (SHA-256 hex of `lp_…`), `scopes[]` (`ingest` \| `agent` \| `read` \| `admin`), `created_by`, `created_at`, `revoked_at`, `last_used_at`
- RLS: members **SELECT** metadata columns only (column grants hide `key_hash`)
- Mutations: RPCs only

### RPCs

- `launchpad_create_api_key(tenant_id, name, scopes[])` → returns `plaintext_key` **once**; appends hash-chained audit `api_key.created`
- `launchpad_revoke_api_key(key_id)` → sets `revoked_at`; audit `api_key.revoked`

### `launchpad_agent_credentials`

- `tenant_id`, `agent_id`, `enroll_secret_hash`, `status`, `created_at`, `revoked_at`
- Members see metadata only (no hash)

---

## 3. How a new company gets keys

1. **Platform once (Morgan / ops)**  
   - Run `.\scripts\launchpad\provision-platform-secrets.ps1`  
   - Paste Supabase URL, anon, **service_role** from dashboard  
   - Set `STRIPE_SECRET_KEY` (test); script registers webhook → writes `STRIPE_LAUNCHPAD_WEBHOOK_SECRET`  
   - Apply migration `20260812120000_launchpad_api_keys.sql` (and prior Launchpad migrations) to the Supabase project  
   - Keep `LAUNCHPAD_ENABLED=0` in sandbox/prod; local may be `1` for smoke

2. **Company #1 tenant**  
   - Sign in (Supabase Auth) → Launchpad onboarding → `launchpad_create_tenant` RPC (owner membership)

3. **Create tenant API keys** (pick one)  
   - UI stub: `/app/launchpad/settings/keys` (Claude polishes)  
   - API: `POST /api/fusarium/launchpad/keys` `{ "name", "scopes": ["ingest"] }` (owner/admin)  
   - CLI: `npx tsx scripts/launchpad/create-tenant-api-key.ts --tenant <slug-or-uuid> --name "SAM ingest" --scopes ingest`

4. **Use keys**  
   - Ingest: `Authorization: Bearer lp_…` → `POST /api/fusarium/launchpad/radar/ingest`  
   - Agent results: same with scope `agent` + header `X-LP-Agent-Id`  
   - Optional HMAC path if `LAUNCHPAD_AGENT_ROOT_SECRET` is set (deprecated)

5. **Enroll agent**  
   - `POST /api/fusarium/launchpad/local-agent/enroll` or `npx tsx scripts/launchpad/enroll-agent.ts --tenant …`

---

## 4. Rotation

1. Create a new key with the same scopes  
2. Update collectors / agents to the new plaintext  
3. `DELETE /api/fusarium/launchpad/keys?id=…` or `DELETE .../keys/<uuid>` on the old key  
4. Audit trail records create + revoke (payload hashed only)

---

## 5. Auth map

| Surface | Primary | Break-glass |
|---|---|---|
| Session ASA / BFF | `requireTenant()` + Supabase cookie | — |
| Radar ingest | Bearer `lp_…` scope `ingest` | `LAUNCHPAD_INGEST_TOKEN` |
| Agent results | Bearer `lp_…` scope `agent` + `X-LP-Agent-Id` | HMAC + `LAUNCHPAD_AGENT_ROOT_SECRET` |
| Stripe webhook | `STRIPE_LAUNCHPAD_WEBHOOK_SECRET` | — |

---

## 6. Lane split

- **Cursor:** tables, RLS, hash, BFF, ingest/agent auth, Stripe tooling, provision scripts  
- **Claude:** Settings → API keys UI polish + Launchpad visual system (no mock keys; no hash/RPC changes)

---

## 7. Hard rules

- Never commit real secrets  
- Hash at rest; plaintext once  
- No mock federal / opportunity data  
- `LAUNCHPAD_ENABLED` off in prod until Morgan  
- Service role never in client bundles  
