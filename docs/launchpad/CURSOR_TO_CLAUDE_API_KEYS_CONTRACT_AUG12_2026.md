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
| **Lane** | Cursor owns tables/RLS/hash/create-revoke/auth-on-ingest-agent. Claude owns polished Settings UI + visual system. |

---

## 1. What Claude can wire now

Call the BFF from the authenticated Launchpad app shell (session cookies). No service role on the client.

| UI action | Call |
|---|---|
| List keys | `GET /api/fusarium/launchpad/keys` |
| Create key (show plaintext **once**) | `POST /api/fusarium/launchpad/keys` body `{ "name": string, "scopes": ("ingest"\|"agent"\|"read"\|"admin")[] }` |
| Revoke key | `DELETE /api/fusarium/launchpad/keys?id=<uuid>` |

**Cursor shipped a minimal stub** at `/app/launchpad/settings/keys`. Claude may replace/polish it (nav link, confirm revoke, empty states, copy) — **do not** invent mock keys or change hash/RPC semantics.

---

## 2. Auth (management routes)

- `requireTenant()` session auth
- Create/revoke: roles `owner` \| `admin`, `write: true`
- List: any active member (metadata only — never `key_hash`)

---

## 3. Response shapes (honest)

**GET 200**

```json
{
  "keys": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "name": "SAM collector",
      "keyPrefix": "lp_abcdefghij",
      "scopes": ["ingest"],
      "createdAt": "ISO",
      "revokedAt": null,
      "lastUsedAt": null,
      "createdBy": "uuid|null"
    }
  ],
  "scopes": ["ingest", "agent", "read", "admin"],
  "note": "Hashes are never returned. Create returns plaintext once."
}
```

Empty array when none — **not** fake rows.

**POST 200** — includes `plaintextKey` **once** + `warning`.

**DELETE 200** — `{ "ok": true, "id": "…", "revoked": true }`.

---

## 4. Hard rules for Claude UI

1. Never display or store a reconstructed full key after create modal closes  
2. No mock keys / fake prefixes  
3. Do not call service role from the browser  
4. Do not flip `LAUNCHPAD_ENABLED` in sandbox/prod  
5. Keep `/security/compliance` untouched  
