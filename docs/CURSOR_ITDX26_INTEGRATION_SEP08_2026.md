# CURSOR ITDX26 Integration — 08 Sep 2026 (updated 09 Sep 2026)

**Date:** 08–09 Sep 2026  
**Status:** Local Codex worktree only — no Sandbox cutover  
**Worktree:** `WEBSITE/website-itdx-codex-v13` (`cursor/itdx-codex-v13-connect-20260909`)  
**Handoff:** `C:\Users\Owner1\Downloads\Mycosoft_ITDX26_v1.3.0_Complete_Demo\Mycosoft_ITDX26_v1.3.0\handoff`

## Root cause (white screens)

Port **3010 was serving the dirty MAIN tree** `WEBSITE/website`, not the Codex-connected ITDX worktree. On that process `/fusarium/itdx` is not the v1.3 application (307 into generic Fusarium login or a non-ITDX slug), `/api/fusarium/itdx` 404s, and `/defense/fusarium/itdx` 404s. Morgan’s blank pages were the **wrong Next app**, not a missing CSS height.

A second, expected gate: Python `127.0.0.1:8765` returns **403** without `Authorization: Bearer $ITDX_BACKEND_TOKEN`. Unauthenticated health 403 is correct. The Fusarium bridge already forwards the token after owner auth (`app/api/fusarium/itdx/bridge/[...path]/route.ts`).

## Earth Sim fly-to / layers

Codex v1.3 connect rewired Intel Feed **ITDX** to shared `useReplay()` + `itdx-fictional-replay*` sources. The earlier Fort Stewart `/api/itdx/overlay` paint (amber tracks, corridors, `itdx-v13-*`) was dropped. The left panel only had a master overlay toggle, so layer chrome did not change the globe.

**Fix (this session):**

- Serve `website-itdx-codex-v13` on **3010** via Hidden `npm run dev:next-only`. Do not reset the dirty main tree; just do not bind it to 3010 during ITDX rehearsal.
- Bridge trims `ITDX_BACKEND_URL` / `ITDX_BACKEND_TOKEN` and still sends `Authorization: Bearer`.
- Map adapter filters GeoJSON by kind, logs `{ synthetic: true, live: false, source, featureCount, kinds, center, bounds, timestamp }`.
- Opening the overlay **flies to the authored replay bbox** (`BOUNDS` ≈ 0°N, 0°E — this v1.3 pack’s scenario AO, not Fort Stewart).
- Left-panel toggles: overlay, assets, pathways, uncertainty, boundary, corridor. Selecting a demo asset flies to it.
- Bootstrap no longer crashes if `documents` is missing (`data.documents.length` on undefined).

Keep **MYCA LIVE | ITDX** split. Real CREP stays. Overlay `live: false`.

## Restore main website on 3010 later

1. Stop the Codex Next process bound to 3010.
2. From `WEBSITE/website` (the dirty main tree — do not reset it): Hidden `npm run dev:next-only`.

## Files changed (09 Sep 2026)

- `lib/itdx/replay-store.ts` — per-layer visibility + select-to-focus
- `lib/itdx/map-layer.mjs` + `.d.mts` — kind filter, receive log, `focus` / `focusAsset`
- `components/itdx/ITDXReplayLayer.tsx` — apply layers, auto fly-to
- `components/fusarium/itdx/itdx-earth-left-panel.tsx` — layer toggles + Focus demo
- `components/itdx/ITDXApplication.tsx` — safe bootstrap document count
- `components/itdx/ITDXReplayDock.tsx` / `ITDXWorkspace.tsx` — null-safe reads
- `app/api/fusarium/itdx/bridge/[...path]/route.ts` — trim env before Bearer forward
- `itdx/integration/test_map_layer.mjs` — layer filter test
- `itdx/integration/browser_itdx_tabs.mjs` — local owner tab rehearsal (no secrets in output)

## Verify

```powershell
# From website-itdx-codex-v13
node --test itdx/integration/test_map_layer.mjs
node itdx/integration/browser_itdx_tabs.mjs
```

Owner login: `morgan@mycosoft.org` (password from env only). No FOUO / exercise PDF bytes in public git.

## Local full-system E2E — 09 Sep 2026

**Publish:** none. **Sandbox/187 rebuild:** none.

FormSpace pack served on **8766** (`python itdx/formspace/run.py serve --port 8766` from the FormSpace download). Fusarium Next on **3010** is `website-itdx-codex-v13` only. ITDX service stays on **8765** with Bearer.

### Root cause of remaining white iframes

Site-wide `next.config.js` sent `X-Frame-Options: DENY` and `frame-ancestors 'none'` on every path, including `/api/fusarium/itdx/bridge/*`. The bridge returned 200 HTML; the browser refused to frame it. Override on the bridge path only: `SAMEORIGIN` + `frame-ancestors 'self'`. Homepage framing stays denied.

### Bind matrix (this rehearsal)

| Surface | URL | Result | Bind |
|---|---|---|---|
| FormSpace HTML | `http://127.0.0.1:8766/formspace.html` | PASS | loopback desktop launcher |
| FormSpace atlas | `http://127.0.0.1:8766/api/form-atlas` | PASS | 41 forms / 1706 states / 1600 observations (recorded synthetic) |
| FormSpace run | `http://127.0.0.1:8766/api/formspace` | PASS | `BUNDLED_RECORDED_RUN` |
| ITDX unauth | `http://127.0.0.1:8765/api/health` | PASS | 403 without Bearer |
| ITDX Bearer | `http://127.0.0.1:8765/api/health` | PASS | 200, v1.3.0 authenticated-service |
| Fusarium ITDX tabs | `http://localhost:3010/fusarium/itdx` | PASS | owner `morgan@mycosoft.org`; iframe now paints lab / documents / Form Space / Borda |
| Earth Sim ITDX | `http://localhost:3010/fusarium/earth-simulator` | CONDITIONAL | `LAYER_ATTACHED`, layer toggles, Focus demo / UNIT 01; **base map tiles** showed “Map data not yet available” |
| NLM | `http://192.168.0.188:8001/api/nlm/health` | UNQUALIFIED | reachable, `model_loaded=false` |
| MYCA / AVANI | `http://192.168.0.188:8001/api/avani/health` | UNQUALIFIED | reachable; not 7-role Task 8 |
| MINDEX | `http://192.168.0.189:8000/health` | PASS | real 189:8000 |
| Shared Fusarium | `/fusarium`, threat-assessment, data-fusion | PASS | no crash; no mock fill |

### Verdict

- **Local integration:** GO for the isolated worktree (with NLM/AVANI unqualified and Earth base tiles caveated).
- **Sandbox / production deploy:** **NO-GO**. No GitHub publish. 187 still needs private `ITDX_BACKEND_*`, FormSpace 8766-or-merged service, NAS mount, and FOUO exercise PDFs out of public git.

### Extra files this pass

- `lib/itdx/gateway.mjs` — FormSpace allowlist + `isFormspacePath`
- `app/api/fusarium/itdx/bridge/[...path]/route.ts` — FormSpace paths → `FORMSPACE_BACKEND_URL` (8766)
- `components/itdx/ITDXApplication.tsx` — `/formspace.html`; iframe no longer gated on CONNECTED
- `next.config.js` — bridge-only frame allow
- `itdx/app/web/formspace.html|css|js` — copied from the 09 Sep FormSpace pack
- `itdx/integration/e2e_contracts.mjs` + `browser_itdx_tabs.mjs` — honest iframe text checks

## 09 Sep 2026 — cards, Evidence 200, MYCA/Task 8 consumer

**Publish:** none. **Sandbox/187:** none. Overlay remains `synthetic: true`, `live: false`.

Evidence chip 404 was `/api/run?id=itdx-bulldog-demo` on 8765 (bootstrap `runs=[]`). Chip now reads `GET /api/fusarium/itdx/evidence` which stays **200** for the local Fort Stewart replay and dataset `demo-11`.

Task 8 UI consumes live MAS per-role results when a sibling `agent-builder` publishes any of `MAS_TASK8_PATHS`. Until then: source=`mas_governor` (real `POST /api/avani/evaluate`) or `local_avani` (FormSpace recorded gates). **No seven green badges** unless MAS returns ≥7 `bound:true` roles.

### Replayable proofs

```powershell
cd WEBSITE/website-itdx-codex-v13
node --test itdx/integration/test_run_narration.mjs itdx/integration/test_map_layer.mjs
node itdx/integration/proof_suite.mjs
```

### PROVEN / UNQUALIFIED (09 Sep 2026, local only)

| Claim | Status | Replay |
|---|---|---|
| FormSpace 8766 recorded run + model SHA | **PROVEN** | `GET http://127.0.0.1:8766/api/formspace` → `origin=BUNDLED_RECORDED_RUN`, SHA `1d3fe486…` |
| ITDX 8765 Bearer health | **PROVEN** | `GET http://127.0.0.1:8765/api/health` + Bearer → 200 v1.3.0 |
| Evidence chip (no `/api/run` 404) | **PROVEN** | `GET /api/fusarium/itdx/evidence?runId=itdx-bulldog-demo` → 200 after owner auth; 401 unauth (not 404) |
| Earth Sim land AO Fort Stewart | **PROVEN** | `replay-core` `31.8697,-81.6072`; panel `data-testid=itdx-ao-place` |
| Explanation cards (8, clock-coupled) | **PROVEN** | Walkthrough + Earth ITDX panel `data-testid=itdx-explanation-cards` |
| MYCA consciousness | **PROVEN** | `GET 192.168.0.188:8001/api/myca/health` → conscious |
| AVANI governor evaluate | **PROVEN** | `POST /api/avani/evaluate` → 200 (advisory envelope) |
| MAS `/api/avani/status` | **UNQUALIFIED** | 404. Canonical: `/api/avani/health`. Website `/api/avani/status` aliases health. |
| Task 8 seven-role / per-role MAS | **UNQUALIFIED** | `GET /api/avani/task8` (and siblings) 404 until agent-builder publishes. UI shows 0 roles, not seven greens. |
| NLM `model_loaded` | **UNQUALIFIED** | `GET /api/nlm/health` `model_loaded=false`; checkpoints `count=0`; `/api/nlm/load` not called |
| Official 1–5 injects | **UNQUALIFIED / NOT_SUPPLIED** | Proof asserts `NOT_SUPPLIED`; not invented |
| MINDEX 189 health | **PROVEN** | `GET 192.168.0.189:8000/health` 200 |
| MINDEX species rows | **PROVEN empty-state** | `/api/species` 404/0 rows — no fake taxonomy |
| Weka 14/14 | **PROVEN** (offline kit) | Existing receipt; kit not rewritten this session |
| Fielded COP / Army approved | **NOT CLAIMED** | **Army-demo-rigorous** local rehearsal only. **Not** a fielded-COP. |

### Files this pass

- `lib/itdx/run-narration.mjs` + `task8-client.mjs`
- `app/api/fusarium/itdx/evidence/route.ts`
- `app/api/fusarium/itdx/task8/route.ts` — probe MAS Task 8, else labeled governor/local
- `app/api/fusarium/itdx/run-state/route.ts`
- `components/itdx/ITDXExplanationCards.tsx` + `ITDXTask8Panel.tsx`
- Earth left panel + Walkthrough tab mount both
- `itdx/integration/test_run_narration.mjs` + `proof_suite.mjs`

## 09 Sep 2026 — truth / deception on the Earth Sim map

**Publish:** none. **Sandbox/187:** none. Overlay remains `synthetic: true`, `live: false`. Class-p is **not** a geo radius.

Each replay asset now carries a replayable **P(truth)** / **P(unsupported)** from an explicit fusion:

`P(truth) = σ(Σ w_i logit(s_i) / Σ w_i)` over **BOUND** channels that have a numeric score.

UNQUALIFIED and NOT_SUPPLIED channels are **excluded** — they are never scored as 0. The geometry/math channel is always BOUND and is **not** zeroed when NLM `model_loaded=false`.

### Geometry (always)

Haversine vs synthetic truth, uncertainty-circle hold/fail, freshness, corridor violation, missingness, declared bias (vehicle-02 after sample 40), neighbor circle agreement. Good vs bad data flags: `stale`, `contradicted`, `out_of_corridor`, `missingness`, `bias`.

### MAS / NLM (honest binds)

| Channel | Bind | Score |
|---|---|---|
| NLM pattern | MAS `POST /api/nlm/predict` always called | UNQUALIFIED while predict is the untrained stub (even if `/health` says `model_loaded=true`) — math unchanged |
| Authority / Task 8 | Sibling `35796f25` paths `MAS_TASK8_PATHS` | Roles listed when present; no invented seven-agent chorus |
| Weather | `GET /api/earthlive/weather` | NOT_SUPPLIED unless lat/lon is the Fort Stewart AO (current EarthLive default is Seattle) |
| Physics | `POST /api/physics/diffusion` | NOT_SUPPLIED when PhysicsNeMo unavailable |
| Earth-2 / CREP | status probed | NOT_SUPPLIED when unreachable / degraded |
| Biology, chemistry, economics, biometry, military equipment, officer, persona, information | no agent score on the slice | NOT_SUPPLIED |
| Coercion / confusion / counterintel / deception | no CI signal in this synthetic pack | **NOT_SUPPLIED** (not inferred from bias) |

Map halo + badge show P(truth). ITDX panel (`data-testid=itdx-truth-panel`) lists channels, weights, formula, and who decided (`agent_id/role`).

### Replay

```powershell
cd WEBSITE/website-itdx-codex-v13
node --test itdx/integration/test_truth_fusion.mjs itdx/integration/test_map_layer.mjs
node itdx/integration/proof_suite.mjs
```

| Claim | Status | Replay |
|---|---|---|
| Geometry P(truth) on every asset | **PROVEN** | `snapshot(i).assets[*].p_truth` is a number; vehicle@80 < unit@8 |
| Bad-data flags | **PROVEN** | vehicle bias after 40; air stale (70 s delay); sensor missingness |
| NLM does not zero math | **PROVEN** | UNQUALIFIED NLM channel leaves geometry P(truth) unchanged |
| Map halo / badge | **PROVEN** | `itdx-fictional-replay-halo` + `badge` include `%` |
| Deception / CI | **NOT_SUPPLIED** | No coercion/confusion/counterintel signal invented |
| Fielded COP / Army approved | **NOT CLAIMED** | Army-demo-rigorous local rehearsal only |
