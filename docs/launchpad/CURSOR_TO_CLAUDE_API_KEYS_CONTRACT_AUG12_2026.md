# Cursor → Claude — Tenant API Keys Contract — Aug 12, 2026

| Field | Value |
|---|---|
| **Date** | August 12, 2026 |
| **From** | Cursor (tenant API-key / secret **backend**) |
| **To** | Claude (Launchpad product design + **Settings → API keys UI**) |
| **Branch / PR** | `feat/launchpad-backend-aug12` · [PR #260](https://github.com/MycosoftLabs/website/pull/260) |
| **BFF base** | `/api/fusarium/launchpad/keys` |
| **Migration** | `supabase/migrations/20260812120000_launchpad_api_keys.sql` |
| **Lib** | `lib/launchpad/api-keys.ts` |
| **Architecture** | [`TENANT_API_KEYS_AND_SECRETS_AUG12_2026.md`](./TENANT_API_KEYS_AND_SECRETS_AUG12_2026.md) |
| **Lane** | Cursor = tables/RLS/hash/create-revoke/auth-on-ingest-agent + Stripe tooling. **Claude** = visual system + polished Settings UI. Cursor will not collide on Settings polish (stub only at `/app/launchpad/settings/keys`). |

---

## 1. What Claude can start wiring

Session-cookie BFF only — **no** service role in the browser.

| UI action | Call |
|---|---|
| List keys | `GET /api/fusarium/launchpad/keys` |
| Create (plaintext once) | `POST /api/fusarium/launchpad/keys` |
| Revoke | `DELETE /api/fusarium/launchpad/keys?id=<uuid>` **or** `DELETE /api/fusarium/launchpad/keys/<uuid>` |

---

## 2. Auth

All management routes use `requireTenant()` (`lib/launchpad/tenant-context.ts`):

1. `LAUNCHPAD_ENABLED` on → else **404** `launchpad_disabled`
2. Supabase Auth **session** cookie
3. Active tenant via `lp_tenant` cookie (RLS-validated membership)
4. Roles:
   - **GET:** any active member (`owner` \| `admin` \| `member` \| `readonly`)
   - **POST / DELETE:** `owner` \| `admin` + `write: true`

`tenant_id` is **never** taken from the body for auth. Create uses `ctx.tenantId`.

### Gate / BFF error codes

| HTTP | `code` | When |
|---|---|---|
| 404 | `launchpad_disabled` | Flag off |
| 401 | `auth_required` | No session |
| 403 | `tenant_required` | No membership |
| 409 | `tenant_selection_required` | Multi-tenant / bad cookie |
| 403 | `tenant_suspended` | Suspended workspace |
| 403 | `read_export_mode` | Write while read/export |
| 403 | `insufficient_role` | Non-admin create/revoke |
| 400 | `invalid_json` / `name_required` / `scopes_required` / `id_required` / `validation_error` | Bad input |
| 404 | `key_not_found` | Revoke unknown id |
| 503 | `list_failed` | Table/RPC missing (migration) |
| 500 | `create_failed` / `revoke_failed` | RPC failure |

Body shape: `{ "error": string, "code"?: string, "hint"?: string, ... }`.

---

## 3. Scopes enum

```ts
type ApiKeyScope = 'ingest' | 'agent' | 'read' | 'admin';
```

| Scope | Use |
|---|---|
| `ingest` | `POST .../radar/ingest` Bearer `lp_…` |
| `agent` | Agent results Bearer + `X-LP-Agent-Id` |
| `read` | Reserved |
| `admin` | Satisfies ingest + agent checks |

At least one required. DB: scopes ⊆ enum.

---

## 4. Routes & JSON

### `GET /api/fusarium/launchpad/keys`

**200**

```json
{
  "keys": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "name": "SAM collector",
      "keyPrefix": "lp_abcdefghij",
      "scopes": ["ingest"],
      "createdAt": "2026-08-12T20:00:00.000Z",
      "revokedAt": null,
      "lastUsedAt": null,
      "createdBy": "uuid-or-null"
    }
  ],
  "scopes": ["ingest", "agent", "read", "admin"],
  "note": "Hashes are never returned. Create returns plaintext once."
}
```

**Never:** `key_hash`, full plaintext. Empty `keys: []` when none — no fakes.

---

### `POST /api/fusarium/launchpad/keys`

**Request**

```json
{ "name": "SAM collector", "scopes": ["ingest"] }
```

`name`: trimmed, 1–80 chars. `scopes`: non-empty `ApiKeyScope[]`.

**200** (plaintext **once**)

```json
{
  "ok": true,
  "id": "uuid",
  "keyPrefix": "lp_AbCdEfGhIj",
  "scopes": ["ingest"],
  "createdAt": "2026-08-12T20:00:00.000Z",
  "plaintextKey": "lp_…full-secret…",
  "warning": "Copy plaintextKey now. It will not be shown again."
}
```

UI must show a one-time copy modal; key is not retrievable later.

---

### `DELETE /api/fusarium/launchpad/keys?id=<uuid>`

### `DELETE /api/fusarium/launchpad/keys/<uuid>`

**200**

```json
{ "ok": true, "id": "uuid", "revoked": true }
```

Soft-revoke (`revoked_at`); audited `api_key.revoked`.

---

## 5. RLS / storage expectations

| Concern | Behavior |
|---|---|
| Format | `lp_` + high entropy |
| At rest | SHA-256 hex in `key_hash` only |
| Authenticated SELECT columns | `id, tenant_id, name, key_prefix, scopes, created_by, created_at, revoked_at, last_used_at` — **no** `key_hash` grant |
| RLS | `launchpad_is_member(tenant_id)` for SELECT |
| Mutations | No client INSERT/UPDATE/DELETE policies — RPCs `launchpad_create_api_key` / `launchpad_revoke_api_key` (owner/admin, `SECURITY DEFINER`) |
| Service role | Hash lookup + `last_used_at` for ingest/agent verify |

---

## 6. Machine auth (not Settings — awareness)

| Consumer | Auth |
|---|---|
| Radar ingest | `Authorization: Bearer lp_…` scope `ingest`\|`admin` |
| Agent results | Bearer `lp_…` scope `agent`\|`admin` + `X-LP-Agent-Id` (tenant match) |

Deprecated env break-glass: `LAUNCHPAD_INGEST_TOKEN`, `LAUNCHPAD_AGENT_ROOT_SECRET`.

---

## 7. Claude UI checklist

1. Session + tenant gate (same as other ASA settings)
2. Table from GET: name, prefix, scopes, created, last used, revoked
3. Create → POST → **one-time plaintext modal**
4. Revoke confirm → DELETE → refresh
5. Honest empty/error states — **no mock keys**
6. Prefer BFF; do not create/revoke via direct table writes
7. Do **not** edit `app/api/fusarium/launchpad/keys/**`, `lib/launchpad/api-keys.ts`, or the API-keys migration

---

## Document control

| Version | Date | Change |
|---|---|---|
| 1.0 | Aug 12, 2026 | Initial Claude Settings contract (routes, shapes, auth, scopes, RLS, errors) |
