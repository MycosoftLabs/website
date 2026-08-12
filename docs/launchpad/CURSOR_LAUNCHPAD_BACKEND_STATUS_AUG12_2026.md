# Cursor Launchpad Backend Status — Aug 12, 2026

| Field | Value |
|---|---|
| **Date** | August 12, 2026 |
| **Branch** | `feat/launchpad-backend-aug12` |
| **Handoff to Claude** | [`CURSOR_TO_CLAUDE_LAUNCHPAD_BACKEND_EXECUTION_AUG12_2026.md`](./CURSOR_TO_CLAUDE_LAUNCHPAD_BACKEND_EXECUTION_AUG12_2026.md) |
| **API keys contract** | [`CURSOR_TO_CLAUDE_API_KEYS_CONTRACT_AUG12_2026.md`](./CURSOR_TO_CLAUDE_API_KEYS_CONTRACT_AUG12_2026.md) |
| **Tenant keys inventory** | [`TENANT_API_KEYS_AND_SECRETS_AUG12_2026.md`](./TENANT_API_KEYS_AND_SECRETS_AUG12_2026.md) |
| **Plan** | [`CURSOR_LAUNCHPAD_BACKEND_PLAN_AUG12_2026.md`](./CURSOR_LAUNCHPAD_BACKEND_PLAN_AUG12_2026.md) |
| **Status** | **In Progress** — backend + tenant API key system ready for Claude UI; apply migration + platform secrets locally |

---

## Done this execution

| Item | Result |
|---|---|
| Claude handoff written first | Done |
| Git isolate `feat/launchpad-backend-aug12` | Done |
| Radar ingest / collectors / local-agent / Stripe tooling / legacy webhook guard | Done (prior commit `1e83f9a4`) |
| Score vectors | **15/15 PASS** |
| Tenant API keys migration (hash + RLS + RPCs) | Done — `20260812120000_launchpad_api_keys.sql` (**do not duplicate**) |
| `lib/launchpad/api-keys.ts` | Done — mint/verify/list/create/revoke |
| Keys BFF | Done — `GET/POST /api/fusarium/launchpad/keys`, `DELETE ?id=` and `DELETE .../keys/[id]` |
| Ingest + agent Bearer `lp_` auth | Done — env tokens deprecated break-glass |
| Claude Settings contract | Done — contract doc |
| Provision CLI | Done — `create-tenant-api-key.ts`, `provision-platform-secrets.ps1`, `enroll-agent.ts` |
| Settings keys page | **Stub only** at `/app/launchpad/settings/keys` — **Claude owns polished UI / visual system** |

---

## Blockers (ops)

1. Apply `20260812120000_launchpad_api_keys.sql`
2. Paste `SUPABASE_SERVICE_ROLE_KEY` (dashboard)
3. Optional: `.\scripts\launchpad\provision-platform-secrets.ps1`
4. Keep `LAUNCHPAD_ENABLED=0` in sandbox/prod

---

## What Claude should do next

1. Wire **Settings → API keys** against [`CURSOR_TO_CLAUDE_API_KEYS_CONTRACT_AUG12_2026.md`](./CURSOR_TO_CLAUDE_API_KEYS_CONTRACT_AUG12_2026.md) (plaintext-once; list = prefix/metadata only)
2. Own Launchpad product design / visual system — Cursor will not collide on Settings polish
3. Stay out of `app/api/fusarium/launchpad/keys/**`, `lib/launchpad/api-keys.ts`, API-keys migration
4. Do **not** flip prod/sandbox `LAUNCHPAD_ENABLED`
5. Keep `/security/compliance` untouched

---

## Commits / PR

- Branch: `feat/launchpad-backend-aug12`
- PR: https://github.com/MycosoftLabs/website/pull/260
- Prior: `1e83f9a4` — ingest, agent HMAC, Stripe tooling
- This push: tenant API keys backend + BFF + Claude contract
