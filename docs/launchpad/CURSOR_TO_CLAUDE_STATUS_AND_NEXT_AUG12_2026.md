# Cursor → Claude — Launchpad Status & Next Work — Aug 12, 2026

| Field | Value |
|---|---|
| **Date** | August 12, 2026 |
| **From** | Cursor (backend / ops lane) |
| **To** | Claude (Settings UI, visual system, marketing IA, legal DRAFT, ASA UX) |
| **Repo** | `WEBSITE/website` |
| **Branch / PR** | `feat/launchpad-backend-aug12` · [PR #260](https://github.com/MycosoftLabs/website/pull/260) |
| **API keys contract** | [`CURSOR_TO_CLAUDE_API_KEYS_CONTRACT_AUG12_2026.md`](./CURSOR_TO_CLAUDE_API_KEYS_CONTRACT_AUG12_2026.md) |
| **Status tracker** | [`CURSOR_LAUNCHPAD_BACKEND_STATUS_AUG12_2026.md`](./CURSOR_LAUNCHPAD_BACKEND_STATUS_AUG12_2026.md) |
| **Prod flag** | **`LAUNCHPAD_ENABLED` stays OFF** in sandbox/prod until Morgan explicitly flips it |

**No secrets in this document.** Env var *names* only.

---

## 1. What Cursor finished (this pass)

| Area | Result |
|---|---|
| **API keys backend** | `lib/launchpad/api-keys.ts` + BFF `GET/POST/DELETE /api/fusarium/launchpad/keys` (+ `[id]` revoke). Session RPCs `launchpad_create_api_key` / `launchpad_revoke_api_key`. Ingest/agent prefer Bearer `lp_…`. |
| **Supabase migration** | Applied on prod project `hnevnsxnhfibhbsipqvz` (`Mycosoft.com Production`). Table `launchpad_api_keys` + RPCs verified via Supabase MCP. |
| **Stripe catalog** | Provisioned **16** products/prices by `lookup_key` from `lib/launchpad/catalog.ts` (live mode; local env has live Stripe secret; test-mode key not present). |
| **Stripe webhook** | Endpoint created: `we_…` → `https://sandbox.mycosoft.com/api/fusarium/launchpad/stripe/webhook`. Signing secret stored in **local gitignored** `.env.local` as `STRIPE_LAUNCHPAD_WEBHOOK_SECRET` only. |
| **SAM posture** | **No SAM.gov API key available** (Morgan does not have one). Collector skips with exit 0 and honest message when unset. Opportunities API reports `sources.sam.status = sam_not_configured`. **No mock awards.** |
| **Provision blockers** | Removed “blocked on Morgan for service_role / Stripe / SAM” framing. SAM optional; Stripe catalog+webhook done; service_role not MCP-exportable (see §4). |
| **Kill switch** | Local `LAUNCHPAD_ENABLED=0` for normal work; smoke may briefly use `1` locally only. Prod/sandbox stay **off**. |

---

## 2. Paths Claude must NOT touch

Do **not** edit these (race / contract risk):

| Path | Why |
|---|---|
| `app/api/fusarium/launchpad/keys/**` | Keys BFF contract |
| `lib/launchpad/api-keys.ts` | Hash / scopes / Bearer auth |
| `lib/launchpad/collectors/**` | SAM / collector honesty |
| `lib/launchpad/service-client.ts` | Service-role client |
| `app/api/fusarium/launchpad/radar/ingest/route.ts` | Ingest auth |
| `app/api/fusarium/launchpad/radar/opportunities/route.ts` | Honest sources payload |
| `app/api/fusarium/launchpad/stripe/webhook/route.ts` | Entitlements webhook |
| `app/api/fusarium/launchpad/local-agent/**` | Enroll / HMAC |
| `app/api/stripe/webhooks/route.ts` | Legacy Launchpad early-return |
| `supabase/migrations/20260812*_launchpad_api_keys.sql` (and other `20260811*_launchpad_*.sql` already applied) | Schema ownership |
| `scripts/launchpad/**` (except reading) | Provision / collectors / CLI |
| `/security/compliance` and ENCL Met-flip paths | Out of commercial lane |

**Claude-safe zones:** `app/app/launchpad/**` (UI), `app/fusarium/launchpad/**` (marketing/legal DRAFT), `components/launchpad/**` (visual system). Stub at `/app/launchpad/settings/keys` is Claude’s to polish.

---

## 3. Exact work Claude should do now

1. **Settings → API keys UI** — implement against [`CURSOR_TO_CLAUDE_API_KEYS_CONTRACT_AUG12_2026.md`](./CURSOR_TO_CLAUDE_API_KEYS_CONTRACT_AUG12_2026.md): list metadata only; create shows plaintext **once**; revoke; never invent mock keys.
2. **Visual system** — Launchpad product shell (neuromorphic / brand), without breaking BFF contracts.
3. **Marketing IA** — close missing public routes (how-it-works, contract-radar marketing, origin-graph, FAQ, non-CUI policy, etc.).
4. **Legal DRAFT** — counsel-ready structure; keep DRAFT banners; do not claim “in effect.”
5. **ASA UX** — readiness / controls / POA&M / evidence; no `state_source='ai'`; no auto Met-flip.

---

## 4. How Claude tests against keys BFF

Prerequisites (local):

- Dev server on **3010** (`npm run dev:next-only`).
- For UI routes behind the flag: set **local only** `LAUNCHPAD_ENABLED=1` in `.env.local`, then restart; leave sandbox/prod at `0`.
- Signed-in user who is `owner`/`admin` on a Launchpad tenant (demo tenant exists in prod Supabase; use real session — no fake users in product data).

Calls (session cookie):

```http
GET  /api/fusarium/launchpad/keys
POST /api/fusarium/launchpad/keys
Content-Type: application/json
{ "name": "Claude UI smoke", "scopes": ["read"] }

DELETE /api/fusarium/launchpad/keys?id=<uuid>
```

Expect: list never returns hashes; create returns `plaintextKey` once; revoke 200; with flag off → **404** `launchpad_disabled`.

**Note:** Keys **management** (Settings UI) uses session + SECURITY DEFINER RPCs (anon + user JWT) — Claude can build/test UI without service_role. **Ingest / agent Bearer `lp_…` verify** needs `SUPABASE_SERVICE_ROLE_KEY` on the BFF host. Cursor recovered that key for **local** `.env.local` from the sandbox green container (see §4a). Supabase MCP still cannot export service_role (`get_publishable_keys` only). Do not block UI work on service_role.

---

## 4a. Service role recovery (Cursor ops — Aug 12 follow-up)

| Check | Result |
|---|---|
| Local `.env.local` / backups | Had URL + anon; `SUPABASE_SERVICE_ROLE_KEY` was **empty** |
| MAS `.credentials.local` / Windows env / Supabase MCP | **No** service_role (MCP: anon/publishable only) |
| Sandbox `mycosoft-website-green` container env | **Found** — copied into gitignored local `.env.local` only |
| Local aliases | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` present (gitignored) |
| Smoke | Service-role REST `GET /rest/v1/launchpad_api_keys?select=id,name,created_at&limit=1` → **HTTP 200** (0 rows OK) |

**Do not paste secrets into chat, PRs, or this handoff.** Say only: found and wired locally.

Sandbox/prod container already had the key; Cursor did **not** change sandbox env. Local ingest/agent verify path can proceed after next local dev-server restart that reloads `.env.local`.

---

## 5. Flag / deploy rules

- **Do not** set `LAUNCHPAD_ENABLED=1` in sandbox or production.
- Local smoke only, then set back to `0`.
- No secrets in git, PRs, or handoffs.

---

## 6. Still truly blocked without human / external gate

| Item | Why |
|---|---|
| SAM.gov / api.data.gov key | None exists in org tooling; product correctly runs without it. Add later via env when obtained from api.data.gov — not a Launchpad launch blocker. |
| Stripe **test**-mode catalog | Only live secret present locally; live catalog + sandbox webhook already provisioned. |
| Stripe Connect account approval | Not part of this Launchpad BFF slice; only if Connect onboarding is later required. |
| Counsel sign-off / prod flag flip | Human (Morgan + counsel). |

~~`SUPABASE_SERVICE_ROLE_KEY` local~~ — **resolved for Cursor local** (see §4a). Settings UI never needed it. If another machine/agent lacks it: pull from sandbox website container env or Supabase dashboard → API → `service_role` once into gitignored `.env.local` (never commit).

---

## 7. Coordination

- Cursor owns backend + this status. Claude owns product UI/IA/legal DRAFT.
- Prefer Claude branch from `feat/launchpad-backend-aug12` after pulling latest, or edit only Claude-safe paths and rebase carefully.
- Agent-coordination MCP may be unavailable — treat this file + status doc as source of truth.
- **PR tip for Morgan → Claude:** paste this file; branch `feat/launchpad-backend-aug12`; head SHA below in §8.

---

## 8. Addendum — `founding-50` ↔ `get-started` collision risk

On `feat/launchpad-backend-aug12` **both** routes currently exist:

- `app/fusarium/launchpad/founding-50/page.tsx` — small **redirect shim** → `/fusarium/launchpad/get-started`
- `app/fusarium/launchpad/get-started/page.tsx` — canonical marketing page (sitemap + CTAs point here)

Git history includes a rename `founding-50` → `get-started`. **Do not casually delete the shim or re-expand `founding-50` into a full page** without checking Claude’s WIP — collision risk if Claude still treats `founding-50` as the product surface. Prefer: leave redirect + `get-started` until Claude confirms canonical URL, then consolidate in one intentional commit.

---

## Document control

| Version | Date | Change |
|---|---|---|
| 1.0 | Aug 12, 2026 | Morgan correction pass: no ask-for-secrets; Stripe provisioned; SAM optional/honest; Claude next work locked. |
| 1.1 | Aug 12, 2026 | Service role found on sandbox green + wired local `.env.local` (no secret values); REST smoke 200; founding-50/get-started addendum. |
