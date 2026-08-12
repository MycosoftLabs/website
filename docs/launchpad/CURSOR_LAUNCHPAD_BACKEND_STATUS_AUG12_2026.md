# Cursor Launchpad Backend Status — Aug 12, 2026

| Field | Value |
|---|---|
| **Date** | August 12, 2026 |
| **Branch** | `feat/launchpad-backend-aug12` |
| **Handoff to Claude** | [`CURSOR_TO_CLAUDE_LAUNCHPAD_BACKEND_EXECUTION_AUG12_2026.md`](./CURSOR_TO_CLAUDE_LAUNCHPAD_BACKEND_EXECUTION_AUG12_2026.md) |
| **Plan** | [`CURSOR_LAUNCHPAD_BACKEND_PLAN_AUG12_2026.md`](./CURSOR_LAUNCHPAD_BACKEND_PLAN_AUG12_2026.md) |
| **Tenant keys** | [`TENANT_API_KEYS_AND_SECRETS_AUG12_2026.md`](./TENANT_API_KEYS_AND_SECRETS_AUG12_2026.md) |
| **Status** | **In Progress** — backend + **tenant API key system** implemented; apply migration + paste platform secrets locally |

---

## Done this execution

| Item | Result |
|---|---|
| Claude handoff written first | Done (file-only; agent-coordination MCP unavailable) |
| Git isolate onto `feat/launchpad-backend-aug12` from `origin/main` | Done — Launchpad-only carve; Psathyrella WIP left in stashes on prior branch |
| Radar ingest 501 → real upsert/amendment/fit-match | Done — `lib/launchpad/radar/*` + ingest route |
| SAM collector + runner | Done — requires `SAM_API_KEY`; refuses inventing rows |
| DSIP/Grants skeletons | Done — throw until official APIs wired |
| Local-agent enroll | Done — `POST .../local-agent/enroll` |
| Local-agent HMAC results | Done — 501 cleared; replay window + schema boundary |
| Agent runbook + runner script | Done — `docs/launchpad/LOCAL_ASSURANCE_AGENT_RUNBOOK_AUG12_2026.md` |
| Stripe catalog provision script | Done — `scripts/launchpad/provision-stripe-catalog.ts` (test key) |
| Legacy webhook Launchpad guard | Done — early-return on `lp_tenant_id` / `fus_launchpad_*` |
| Blue-green env template | Done — flag OFF documented |
| Counsel/pen-test checklist prep | Done — not legal complete |
| Score vectors | **15/15 PASS** via `tsx scripts/launchpad/run-score-vectors.ts` |
| `TERMS_VERSION` moved out of route export | Fixed Next route type error |
| Tenant API keys (tables + RLS + hash + RPCs) | Done — `20260812120000_launchpad_api_keys.sql` (do not duplicate) |
| Keys BFF | Done — `GET/POST/DELETE /api/fusarium/launchpad/keys` (+ `DELETE .../keys/[id]`) |
| Ingest/agent Bearer `lp_` auth | Done — preferred over deprecated env break-glass |
| API keys contract for Claude Settings UI | Done — [`CURSOR_TO_CLAUDE_API_KEYS_CONTRACT_AUG12_2026.md`](./CURSOR_TO_CLAUDE_API_KEYS_CONTRACT_AUG12_2026.md) |
| Settings → API keys polished UI | **Claude lane** — Cursor will not build it |
| **Tenant API keys (Supabase)** | Done — migration `20260812120000_launchpad_api_keys.sql`, RPCs create/revoke, `lib/launchpad/api-keys.ts` |
| **Ingest auth → DB keys** | Done — Bearer `lp_…` scope `ingest`; env token = break-glass only |
| **Agent results → DB keys** | Done — Bearer `lp_…` scope `agent` + `X-LP-Agent-Id`; HMAC root = break-glass |
| **Keys API + minimal UI** | Done — `/api/fusarium/launchpad/keys`, `/app/launchpad/settings/keys` |
| **Provision tooling** | Done — `provision-platform-secrets.ps1`, `create-tenant-api-key.ts`, `enroll-agent.ts` |

---

## Blockers (ops — secrets are *created*, not requested as magic)

Morgan’s directive: env secrets **do not exist until provisioned**. Use tooling:

1. `.\scripts\launchpad\provision-platform-secrets.ps1` — placeholders + Stripe webhook secret creation  
2. Paste **Supabase service_role** from dashboard (cannot invent)  
3. Apply SQL migration `20260812120000_launchpad_api_keys.sql`  
4. `npx tsx scripts/launchpad/create-tenant-api-key.ts --tenant <slug> --scopes ingest`

| Var | Role |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Platform — paste from dashboard |
| `STRIPE_SECRET_KEY` | Platform — from Stripe; enables webhook script |
| `STRIPE_LAUNCHPAD_WEBHOOK_SECRET` | Platform — **created** by provision script / Stripe |
| Tenant `lp_…` keys | **Supabase** — created via RPC/CLI/UI |
| `LAUNCHPAD_INGEST_TOKEN` / `LAUNCHPAD_AGENT_ROOT_SECRET` | Deprecated break-glass only |
| `SAM_API_KEY` | Platform collector — optional until radar runs |
| `LAUNCHPAD_ENABLED` | Keep **0** in sandbox/prod |

---

## Verify matrix (code-level)

| Check | Expected |
|---|---|
| Flag off | `/app/launchpad` + BFFs → **404** |
| Ingest no bearer | **401** |
| Ingest with `lp_…` (scope ingest) + service role | upsert real records only |
| Ingest with deprecated env token | still works (break-glass) |
| Webhook without Launchpad secret | **503** (honest) |
| Agent results Bearer `lp_…` + agent id | **200** when tenant matches |
| Agent results bad HMAC (root path) | **401** |
| Keys GET | metadata only (prefix/name/scopes) — no hashes |
| Keys POST | plaintext once |
| No mock opportunities | empty UI until official ingest |

---

## What Claude should do next

1. Marketing IA gaps / ASA UX / Founding 50 / legal DRAFT polish  
2. **Optional:** polish `/app/launchpad/settings/keys` UX + nav link (do not change auth/hash semantics; no mock keys)  
3. Avoid Cursor paths listed in the handoff  
4. Do **not** flip `LAUNCHPAD_ENABLED` in sandbox/prod  
5. Keep `/security/compliance` untouched  

---

## Bootstrap company #1 (Morgan)

1. Provision platform secrets (script + Supabase dashboard paste)  
2. Apply Launchpad migrations including `20260812120000_launchpad_api_keys.sql`  
3. Local `LAUNCHPAD_ENABLED=1` only for smoke  
4. Sign in → onboarding → create tenant  
5. Create ingest (+ agent) API keys via settings UI or CLI  
6. Point collector at Bearer `lp_…`  
7. Prod/sandbox flag stays **0** until gates clear  

---

## Commits / PR

- Branch: `feat/launchpad-backend-aug12`  
- Prior: `1e83f9a4` — feat(launchpad): backend ingest, agent HMAC, Stripe tooling, legacy webhook guard  
- PR: https://github.com/MycosoftLabs/website/pull/260  
- Merge to `main` only when green and prod flag still OFF.
