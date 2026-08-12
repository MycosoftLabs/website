# Cursor Launchpad Backend Status — Aug 12, 2026

| Field | Value |
|---|---|
| **Date** | August 12, 2026 |
| **Branch** | `feat/launchpad-backend-aug12` |
| **Primary Claude handoff** | [`CURSOR_TO_CLAUDE_STATUS_AND_NEXT_AUG12_2026.md`](./CURSOR_TO_CLAUDE_STATUS_AND_NEXT_AUG12_2026.md) |
| **API keys contract** | [`CURSOR_TO_CLAUDE_API_KEYS_CONTRACT_AUG12_2026.md`](./CURSOR_TO_CLAUDE_API_KEYS_CONTRACT_AUG12_2026.md) |
| **Tenant keys inventory** | [`TENANT_API_KEYS_AND_SECRETS_AUG12_2026.md`](./TENANT_API_KEYS_AND_SECRETS_AUG12_2026.md) |
| **Plan** | [`CURSOR_LAUNCHPAD_BACKEND_PLAN_AUG12_2026.md`](./CURSOR_LAUNCHPAD_BACKEND_PLAN_AUG12_2026.md) |
| **PR** | https://github.com/MycosoftLabs/website/pull/260 |
| **Status** | **Backend ready for Claude UI** — migration applied; Stripe catalog+webhook provisioned; SAM optional/honest skip; **not** blocked on Morgan for secrets |

---

## Done (Cursor backend lane)

| Item | Result |
|---|---|
| Radar ingest / collectors / local-agent / Stripe tooling / legacy webhook guard | Done |
| Score vectors | **15/15 PASS** |
| API keys unit smoke | mint/hash/scopes/Bearer parse |
| Tenant API keys migration | **Applied** prod `hnevnsxnhfibhbsipqvz` (tables + RPCs via Supabase MCP) |
| Keys BFF | Session RPC create/list/revoke |
| Ingest + agent Bearer `lp_` | Code path ready (runtime needs `SUPABASE_SERVICE_ROLE_KEY` on host for verify — not MCP-exportable) |
| Stripe catalog | **16 SKUs** created by lookup_key |
| Stripe Launchpad webhook | Registered on sandbox HTTPS URL; secret in local `.env.local` only |
| SAM | Optional; collector exits 0 when unset; opportunities API exposes `sam_not_configured` |
| Settings keys page | Stub only — **Claude owns polish** |
| `LAUNCHPAD_ENABLED` | Keep **0** in sandbox/prod |

---

## Not blocked on Morgan

| Former “blocker” | Resolution |
|---|---|
| Paste service_role | Schema via MCP. Keys UI via session RPCs. Service_role remains a **runtime host env** gap if missing locally — do not ask Morgan in chat; use dashboard/machine env when available. |
| Stripe keys / catalog / webhook | Provisioned with existing Stripe access (live mode). |
| SAM_API_KEY | **Not required.** Honest empty / skip. Document how to add later. |

---

## Remaining technical gaps (no human ask)

1. Local `.env.local` may still lack `SUPABASE_SERVICE_ROLE_KEY` (MCP cannot export it) → ingest `lp_` verify and webhook DB writes return 503 until host env has it.
2. Stripe test-mode catalog not dual-provisioned (no `sk_test` in env).
3. Prod/sandbox kill switch remains off by design.

---

## What Claude should do next

See [`CURSOR_TO_CLAUDE_STATUS_AND_NEXT_AUG12_2026.md`](./CURSOR_TO_CLAUDE_STATUS_AND_NEXT_AUG12_2026.md): Settings→API keys UI, visual system, marketing IA, legal DRAFT, ASA UX. Stay out of Cursor paths listed there. Do **not** flip prod/sandbox `LAUNCHPAD_ENABLED`.

---

## Commits / PR

- Branch: `feat/launchpad-backend-aug12`
- PR: https://github.com/MycosoftLabs/website/pull/260
