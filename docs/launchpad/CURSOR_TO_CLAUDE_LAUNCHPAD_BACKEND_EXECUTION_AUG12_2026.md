# Cursor → Claude Handoff — Launchpad Backend Execution — Aug 12, 2026

| Field | Value |
|---|---|
| **Date** | August 12, 2026 |
| **From** | Cursor (backend execution lane) |
| **To** | Claude (marketing / ASA UX / legal DRAFT / IA) |
| **Repo** | `WEBSITE/website` |
| **Plan** | [`CURSOR_LAUNCHPAD_BACKEND_PLAN_AUG12_2026.md`](./CURSOR_LAUNCHPAD_BACKEND_PLAN_AUG12_2026.md) |
| **Package index** | [`CHATGPT_MASTER_PACKAGE_INDEX_AUG12_2026.md`](./CHATGPT_MASTER_PACKAGE_INDEX_AUG12_2026.md) |
| **Status doc (Cursor will update)** | [`CURSOR_LAUNCHPAD_BACKEND_STATUS_AUG12_2026.md`](./CURSOR_LAUNCHPAD_BACKEND_STATUS_AUG12_2026.md) |
| **Branch (Cursor target)** | `feat/launchpad-backend-aug12` (carved from `main`; Launchpad-only) |
| **Prior WIP branch (do not use for Launchpad)** | `tmp-closure-board-ship` (mixed Psathyrella + deploy + Launchpad) |
| **Agent-coordination MCP** | Unavailable at handoff write time — **file-only** coordination |

---

## 0. One-line summary for Claude

**Cursor is executing Launchpad backend now** (git isolate → Stripe test/webhook → radar ingest + collectors → local-agent enroll/HMAC → CI/env templates → legacy webhook guard). **Claude should stay on front-end / IA / legal DRAFT / ASA UX** and **must not** touch the Cursor path list below or flip `LAUNCHPAD_ENABLED` in sandbox/prod.

---

## 1. Cursor owns (executing now)

These are **Cursor-only**. Claude should not duplicate or race-edit them.

| Workstream | What Cursor will do |
|---|---|
| **Git hygiene** | Isolate Launchpad onto clean branch `feat/launchpad-backend-aug12` from `main`. Stage only Launchpad-related + this handoff/status docs. No secrets in git. Commit coherent slices; push feature branch. Merge to `main` only if green and **prod flag still OFF**. |
| **Stripe (test mode)** | Provision/document env vars by `lookup_key` (handoff 03). Get Launchpad webhook off **503** in **local/dev test** when test secrets exist in env. Smoke §35.3 if documented. Idempotency ledger stays honest. Live keys = Morgan only. |
| **CI / env templates** | Templates + docs for Launchpad vars; `LAUNCHPAD_ENABLED=0` in prod/sandbox templates; rollout order = flag **LAST**. Fix jest/tsx Launchpad test blockers only if they block verification. |
| **Radar contract ingest** | Replace **501** on `POST .../radar/ingest` with real validate → service-role upsert → amendment on `source_hash` change → fit-match enqueue. Bearer `LAUNCHPAD_INGEST_TOKEN`. |
| **Collectors** | Wire per handoff 01 (SAM.gov first; DSIP/Grants next). Central cadence. **No fake opportunities / no mock federal data** — empty UI stays honest until real ingest. |
| **Local agent** | Enroll route + HMAC results path per handoff 02; agent binary/scripts + local run docs. Never auto-flip control `implemented`. |
| **Legacy webhook guard** | Early-return in `app/api/stripe/webhooks/route.ts` when `metadata.lp_tenant_id` or `fus_launchpad_*` lookup_key present. |
| **Hard data rule** | No mock/fake opportunities, SAM results, or compliance operational data presented as live. |

### Success signals Cursor will report (status doc)

- Ingest returns/upserts a **real** contract when keyed + bearer present
- Launchpad Stripe webhook **200** with test secrets (not 503 for missing-secret when secrets set)
- Local-agent **enroll** works; results HMAC verify path live
- **501/503 cleared** for those Cursor-owned paths (503 remains correct if secrets still absent — documented blocker)

---

## 2. Claude owns / should work on (do NOT duplicate)

Claude continues product/shell polish. Cursor will **not** drive-by redesign marketing.

| Area | Claude should |
|---|---|
| **Marketing IA gaps** | Close missing public routes vs master package (how-it-works, contract-radar marketing page, origin-graph, FAQ, non-cui-policy page, etc.) |
| **Legal DRAFT polish** | Improve DRAFT outlines with counsel-ready structure; **do not** claim “in effect”; counsel owns operative text |
| **ASA UI/UX** | Readiness / controls / POA&M / evidence UX refinements (no `state_source='ai'`; no Met auto-flip) |
| **Founding 50 / dashboard UX** | Cohort + authenticated dashboard polish |
| **FUSARIUM page copy** | Iterate gateway copy on defense FUSARIUM page **without** breaking Launchpad CTA wiring Cursor may touch lightly for consistency |
| **Public IA still missing** | Sitemap/nav entries for new marketing routes |
| **Pure front-end** | Anything that does **not** block Stripe / ingest / agent backend |
| **`/security/compliance`** | **Keep untouched** (CMMC ENCL / Closure Board — out of Launchpad commercial lane) |
| **Prod flag** | **Do NOT** set `LAUNCHPAD_ENABLED=1` in sandbox/prod |

---

## 3. Shared / wait for Morgan

| Gate | Who |
|---|---|
| Counsel sign-off on legal pages (replace DRAFT; bump `TERMS_VERSION`) | Counsel + Morgan |
| Live Stripe keys + live webhook registration | Morgan / finance + Cursor ops after go |
| `LAUNCHPAD_ENABLED=1` in sandbox or prod | **Morgan explicit only** |
| Pen-test / tenant-isolation gate before paying customers | Cursor tech + Morgan accept |
| CMMC practitioner review of score vectors (content) | Compliance / Morgan — separate from Cursor eng |

---

## 4. Current disk facts (as of handoff write)

| Fact | Detail |
|---|---|
| **Branch observed** | `tmp-closure-board-ship` tracking `origin/main` (**behind by 1**) |
| **Launchpad tree** | Mostly **untracked** (`??`): `app/api/fusarium/launchpad/`, `app/app/`, `app/fusarium/`, `components/launchpad/`, `lib/launchpad/`, `docs/launchpad/`, `scripts/launchpad/`, six `supabase/migrations/20260811*_launchpad_*.sql` |
| **Also modified (Launchpad-adjacent)** | `.env.example`, `lib/access/routes.ts`, `app/defense/fusarium/page.tsx` + `layout.tsx`, header/footer/nav/sitemap (marketing links) |
| **Mixed WIP on same branch** | Large Psathyrella / Eagle / blue-green deploy scripts / CMMC closure — **not** Launchpad |
| **Cursor action** | Carve **clean** `feat/launchpad-backend-aug12` from `main`; bring only Launchpad paths + docs; leave Psathyrella WIP on `tmp-closure-board-ship` |

---

## 5. Coordination — paths Claude must avoid while Cursor works

**Do not edit these while Cursor is mid-execution** (race risk):

### APIs / BFF
- `app/api/fusarium/launchpad/**` (especially `radar/ingest`, `local-agent/**`, `stripe/webhook`, `billing/**`)
- `app/api/stripe/webhooks/route.ts` (legacy Launchpad early-return guard only — Cursor owns this edit)

### Backend libraries / scripts
- `lib/launchpad/**` backend bits: ingest, collectors, agent HMAC, entitlements, stripe helpers, flags (Claude may read; avoid concurrent edits to scoring/engine only if Cursor is not touching — prefer Claude edit `components/launchpad/**` + app pages)
- Prefer Claude UI in: `app/app/launchpad/**`, `app/fusarium/launchpad/**`, `components/launchpad/**`
- Prefer Cursor: `lib/launchpad/collectors/**` (new), `lib/launchpad/agent/**` (new), ingest/HMAC modules, `scripts/launchpad/**` collectors/provision/agent

### Agent / collectors / Stripe ops
- `scripts/launchpad/**` (collectors, Stripe provision, agent run, vector shim)
- Any new `agents/` or binary packaging under Launchpad scripts

### CI / env
- `.env.example` Launchpad lines (Cursor may extend; Claude: don’t delete)
- `.github/workflows/**` if Cursor adds Launchpad env/docs hooks
- Blue-green / deploy env templates mentioning `LAUNCHPAD_*`

### Migrations (coordination note)
- `supabase/migrations/20260811*_launchpad_*.sql` — Cursor will commit as-is unless a schema fix is required for ingest/agent; Claude should **not** rewrite migrations already claimed applied

### Explicit Claude-safe zones
- Marketing pages under `app/fusarium/launchpad/**` (except don’t remove API contracts Cursor depends on)
- ASA UI pages under `app/app/launchpad/**`
- Legal DRAFT content
- Copy on `app/defense/fusarium/page.tsx` (copy only; preserve Launchpad hrefs/flags)
- **Never** `/security/compliance` or ENCL Met flips

---

## 6. Hard rules (both agents)

1. **No mock federal / opportunity / SAM data**
2. **No secrets in git** (Stripe, ingest token, service role, SAM API key)
3. **`LAUNCHPAD_ENABLED` stays off** in sandbox/prod unless Morgan explicitly says enable
4. **No CMMC ENCL / `soc_ops` Met-flips** from this commercial work
5. **No drive-by redesign** outside Launchpad scope
6. Standard Launchpad = **COMMERCIAL // NON-CUI** only

---

## 7. What Claude should do next (actionable)

1. Read this handoff + plan §3–4; treat Cursor as owner of 501→real ingest/agent/Stripe ops.
2. Continue marketing IA + ASA UX + Founding 50 polish on the **same product**, preferably on a **Claude front-end branch** branched from Cursor’s `feat/launchpad-backend-aug12` **after** Cursor’s first commit lands — or work in page/component files only and rebase carefully.
3. Keep legal pages DRAFT; prepare counsel checklist (handoff 05) — do not claim legal complete.
4. Leave `/security/compliance` alone.
5. When Cursor posts status doc updates, sync UI empty-states to real ingest (still no fakes).
6. Do not enable the prod/sandbox kill-switch flag.

---

## 8. Cursor execution order (for Claude awareness)

```text
Phase 0  this handoff (done)
Phase 1  git isolate → feat/launchpad-backend-aug12
Phase 2  Stripe test env + webhook smoke (or code + .env.example if keys missing)
Phase 3  radar ingest real + SAM collector skeleton
Phase 4  local-agent enroll + HMAC results + run docs
Phase 5  CI/env templates; flag OFF in prod templates
Phase 6  legacy webhook Launchpad guard
Phase 7  verify + CURSOR_LAUNCHPAD_BACKEND_STATUS_AUG12_2026.md
```

---

## Document control

| Version | Date | Change |
|---|---|---|
| 1.0 | Aug 12, 2026 | Initial Cursor→Claude execution handoff before backend code |
|
