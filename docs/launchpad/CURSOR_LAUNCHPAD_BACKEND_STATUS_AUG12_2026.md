# Cursor Launchpad Backend Status — Aug 12, 2026

| Field | Value |
|---|---|
| **Date** | August 12, 2026 |
| **Branch** | `feat/launchpad-backend-aug12` |
| **Handoff to Claude** | [`CURSOR_TO_CLAUDE_LAUNCHPAD_BACKEND_EXECUTION_AUG12_2026.md`](./CURSOR_TO_CLAUDE_LAUNCHPAD_BACKEND_EXECUTION_AUG12_2026.md) |
| **API keys contract** | [`CURSOR_TO_CLAUDE_API_KEYS_CONTRACT_AUG12_2026.md`](./CURSOR_TO_CLAUDE_API_KEYS_CONTRACT_AUG12_2026.md) |
| **Tenant keys inventory** | [`TENANT_API_KEYS_AND_SECRETS_AUG12_2026.md`](./TENANT_API_KEYS_AND_SECRETS_AUG12_2026.md) |
| **Plan** | [`CURSOR_LAUNCHPAD_BACKEND_PLAN_AUG12_2026.md`](./CURSOR_LAUNCHPAD_BACKEND_PLAN_AUG12_2026.md) |
| **PR** | https://github.com/MycosoftLabs/website/pull/260 |
| **Status** | **Backend ready** — API keys migration applied to prod Supabase; provision script fixed; ops secrets still on Morgan |

---

## Bugfix this pass (Aug 12 afternoon)

| Issue | Root cause | Fix |
|---|---|---|
| API-key / provision sub-agent stop | `scripts/launchpad/provision-platform-secrets.ps1` used Unicode em-dashes / arrows; **PowerShell 5.x parse failure** | Rewrote script **ASCII-only**; form body concat safe |
| Keys BFF TS (prior) | Discriminated-union `.error` under `strictNullChecks: false` | Already on branch: `d3a6f7b8` |
| Local kill switch | `.env.local` had `LAUNCHPAD_ENABLED=1` | Reset to **0** (not committed) |

---

## Done (Cursor backend lane)

| Item | Result |
|---|---|
| Radar ingest / collectors / local-agent / Stripe tooling / legacy webhook guard | Done |
| Score vectors | **15/15 PASS** (`npx tsx scripts/launchpad/run-score-vectors.ts`) |
| API keys unit smoke | mint/hash/scopes/Bearer parse PASS (+ new jest file) |
| Tenant API keys migration | **Applied to prod** `hnevnsxnhfibhbsipqvz` (tables + RPCs verified) |
| `lib/launchpad/api-keys.ts` + keys BFF | Done |
| Ingest + agent Bearer `lp_` | Done |
| Provision CLI | `create-tenant-api-key.ts`, **fixed** `provision-platform-secrets.ps1`, `enroll-agent.ts` |
| Settings keys page | Stub only — **Claude owns polish** (do not collide) |
| Legacy webhook Launchpad early-return | Verified in `app/api/stripe/webhooks/route.ts` |
| Agent enroll | `POST .../local-agent/enroll` present |
| CI (PR #260) | Lint/TypeCheck, Unit Tests, Build & Push, CodeQL Analyze **pass**; flaky standalone "CodeQL" app check may still show fail |
| `LAUNCHPAD_ENABLED` | Keep **0** in sandbox/prod |

---

## Blockers (Morgan / ops)

1. Paste **`SUPABASE_SERVICE_ROLE_KEY`** into local `.env.local` (and blue/green) from Supabase dashboard — cannot invent
2. Provide **`sk_test_…`** Stripe key for catalog/webhook smoke (current local key is **live**; scripts correctly refuse without `ALLOW_STRIPE_LIVE_PROVISION=1`)
3. Optional: `SAM_API_KEY` for live SAM collector runs
4. Register Launchpad webhook + store `STRIPE_LAUNCHPAD_WEBHOOK_SECRET` once test key available:
   `.\scripts\launchpad\provision-platform-secrets.ps1`
5. Do **not** flip prod/sandbox `LAUNCHPAD_ENABLED` until counsel + Morgan go

---

## What Claude should do next

1. Wire **Settings → API keys** against the contract (plaintext-once; list = prefix/metadata only)
2. Own Launchpad product design / visual system — Cursor will not collide on Settings polish
3. Stay out of `app/api/fusarium/launchpad/keys/**`, `lib/launchpad/api-keys.ts`, API-keys migration
4. Do **not** flip prod/sandbox `LAUNCHPAD_ENABLED`
5. Keep `/security/compliance` untouched

---

## Commits / PR

- Branch: `feat/launchpad-backend-aug12`
- PR: https://github.com/MycosoftLabs/website/pull/260
- Prior: `d3a6f7b8` — keys BFF TS fix
- This push: provision script ASCII fix, api-keys audit soft-fail, api-keys unit tests, status update; **prod migration applied via Supabase MCP**
