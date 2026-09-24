# FormSpace HTTP 500 Fix — September 24, 2026

**Date:** September 24, 2026 (PT)
**Status:** Code complete; live verification recorded below
**Requested by:** Morgan (CEO) — explicit website permission for `/ai/formspace`
**Related:** `docs/FORMSPACE_NLM_SHIP_OUTCOME_SEP23_2026.md`, `docs/BLUE_GREEN_NEVER_502_SOLE_OWNER_SEP23_2026.md`

---

## Symptom

On the live site (`mycosoft.com/ai/formspace`, Sandbox 187, container `mycosoft-website-green`, image `production-latest` @ `d1d94bd3`) the Graphs and Experiments tabs failed, and anything that depended on a fresh run (Evidence, Memory) never showed results. `POST /api/formspace/graph` and `POST /api/formspace/experiment` returned **HTTP 500 with an empty body** on both origin (`187:3000`) and public.

## Root cause

Container logs (`docker logs mycosoft-website-green`):

```
Error: EACCES: permission denied, mkdir '/app/.data/formspace'
    at .next/server/app/api/formspace/graph/route.js
    at .next/server/app/api/formspace/experiment/route.js
```

1. **Unwritable data directory.** `lib/formspace/engine.ts` wrote evidence to `process.cwd()/.data/formspace`. In the production image the server runs as `nextjs` (uid 1001) while `/app` is owned by root, so `mkdirSync` threw. `appendEvidence()` had no guard, so the throw escaped the route handler as an empty 500.
2. **MAS never used for compute in prod.** The BFF only called MAS `/api/formspace/{graph,experiment,evidence}` when `FORMSPACE_PREFER_MAS=1`, which was not set in production, so every run hit the broken local write path even though MAS 188 serves a working FormSpace engine.
3. **No route-level error handling.** Any unexpected throw produced an empty-body 500 that the UI could only show as a generic failure.

## Fix

| Area | Change |
|------|--------|
| `lib/formspace/engine.ts` | Storage resolved once: `FORMSPACE_DATA_DIR` → `/app/.data/formspace` → OS temp → in-process. Every read/write is guarded (atomic temp-file + rename); nothing throws. Evidence rows record `storage` mode. `recordEvidence()` mirrors MAS results into the durable log. |
| `lib/formspace/server.ts` | `formspacePrefersMas()` — MAS is preferred by default (opt out with `FORMSPACE_PREFER_MAS=0`). `formspaceErrorResponse()` returns JSON `{ ok:false, status:"engine_error", message }` with 503 instead of an empty 500. |
| `app/api/formspace/graph` | MAS first (`/api/formspace/graph`, then `/api/nlm/formspace/graph`), evidence mirrored; local engine fallback; JSON on any error. |
| `app/api/formspace/experiment` | MAS first with user header; evidence + signed-in memory mirrored; local fallback; JSON on any error. |
| `app/api/formspace/evidence` | Merges durable website log with MAS log, de-duplicated by graph/experiment id, newest first. |
| `app/api/formspace/{health,memory}` | Outer try/catch → JSON error responses. |
| `Dockerfile.production` | Creates `/app/.data/formspace` owned by `nextjs` and sets `FORMSPACE_DATA_DIR`. |
| Sandbox 187 runtime | Host volume `/opt/mycosoft/data/formspace` (uid 1001) mounted at `/app/.data/formspace` so evidence and memory survive blue-green swaps. |

No mock data was added. Demo charts remain the published catalog fixtures, labeled **Demo / catalog**. Unknown charts return `ok:false, status:"no_data"` (HTTP 200) and the UI shows an empty state.

## Persistence model

- **Compute:** MAS 188 `/api/formspace/*` (in-memory evidence on MAS).
- **Durable evidence:** website data dir (host volume on 187).
- **Signed-in memory:** MAS FormSpace memory → MAS 6-layer memory (`/api/memory/remember`, Postgres on MINDEX 189) → website data dir.
- If no directory is writable, the engine keeps evidence in-process and says so in the API `note`; it never 500s.

## New-user explanations (UI)

- New `components/formspace/FormSpaceIntro.tsx` at the top of the page: **What FormSpace is**, **What it's for**, **How it relates to NLM** (NLM = signal-state and scenario models that learn from signals, not words; not a chat or text model), **Without an account** vs **Signed in**, and **Your first run** (4 steps).
- Every workspace tab now opens with **What this tab does / How to use it / access level** (`TAB_GUIDE` in `FormSpaceWorkspace.tsx`).
- Header links use `GlassButton` (black/white clear glass). Status line no longer references model-host names.
- Evidence and Memory show explicit error states on fetch failure; Evidence gains a Refresh control.

## Local verification (dev server 3010)

| Route | Result |
|-------|--------|
| `GET /ai/formspace` | 200 (intro + tab guide present) |
| `GET /api/formspace/{health,demo,atlas,evidence,memory}` | 200 JSON |
| `POST /api/formspace/graph` (demo chart) | 200 `ok:true`, MAS-computed |
| `POST /api/formspace/experiment` (demo chart) | 200 `ok:true` |
| `POST /api/formspace/graph` (unknown chart) | 200 `ok:false, no_data` |
| `POST /api/formspace/graph` (no chart_id) | 400 JSON |
| `POST /api/formspace/{atlas,memory}` logged out | 401 JSON |

## Live verification

Recorded after the blue-green cutover (see follow-up section appended at ship time).
