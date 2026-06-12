# Earth Simulator — Fable 5 Continuation Handoff (June 12, 2026)

> Successor to `EARTH_SIMULATOR_PRODUCTION_MAP_FIX_HANDOFF_JUN12_2026.md`.
> Written by Claude (Fable 5) after picking up that handoff in a **remote cloud session**.
> Read this first. It corrects several assumptions in the prior handoff and tells you
> exactly what is already done, what is verified, and what is left.

---

## 0. CRITICAL CONTEXT: where this work happened, and why the preview was grayed out

The prior session ran in a **Claude Code remote/cloud container**, NOT on the Windows
workstation. This matters:

- Working dir was `/home/user/website` on Linux, a **fresh clone**, with **no `.env`**
  (no MAPBOX/MAPTILER/SUPABASE/AISSTREAM/OPENAQ/etc. secrets) and no `node_modules`
  until `npm ci` was run.
- The dev server (`npm run dev`, port 3010) came up on the **container's** localhost,
  which is a different machine from the workstation. The desktop app's **Ctrl+P preview
  attaches to the workstation's `localhost:3010`**, so it stayed grayed out — there was
  nothing local to attach to.
- The cloud container has **no browser / computer-use tool**, and with no secrets the map
  has no tile key or data backend, so visual QA was impossible there.

**Implication for you:** continue this **locally** (or in a Codex local session) where the
code, secrets, and a real browser live. There the Ctrl+P preview on `3010` will work and
you can do the visual QA the original handoff demands.

### The other big correction
The prior handoff was written against an **uncommitted local working tree**. Its central
variable — `earthSimDeferredDataReady` (the "35–55 second gate" it calls the highest-priority
root cause) — **does not exist in the committed code** on any branch. Neither do its helper
functions (`extractMindexSpeciesRows`, `normalizeSpeciesRowToFungalObservation`) nor its cited
line numbers (7842, 9359, 10760, …). That work was never committed/pushed; it lives only on
the workstation disk.

If you still have those local edits on the workstation, **`git stash` or commit them to a
scratch branch before checking out the branch below**, or you will lose them.

---

## 1. Branch, PR, and how to continue

- **Work branch:** `claude/sweet-hawking-954std`
- **Base branch (where it merges):** `codex/myca-website-security-boundary` (committed baseline `e109948`)
- **PR:** https://github.com/MycosoftLabs/website/pull/187 (DRAFT — do not deploy)
- The PR is intentionally tiny: **3 files, +5 / −5**. (It briefly targeted `main`, which made
  it show 46 files / +27k lines because `e109948` has diverged far from `main` and carries
  unrelated SINE work; the base was corrected to `codex/myca-website-security-boundary`.)

### Local continuation steps
```bash
# 0. SAVE any uncommitted local (Codex) work first — it is NOT in the cloud branch:
git stash            # or: git checkout -b scratch/local-codex-wip && git commit -am wip

# 1. Get the cloud fix:
git fetch origin
git checkout claude/sweet-hawking-954std   # 3-file, 5-line Earth Simulator first-paint fix

# 2. Run it where secrets + browser exist:
npm install          # if needed
npm run dev          # already configured for port 3010
# -> Ctrl+P preview now works; open http://localhost:3010/natureos/earth-simulator
```
If you prefer to keep your own local branch, the change is only 5 constants (Section 2) —
apply them by hand.

---

## 2. What was changed in this PR (committed + pushed, CI-green)

All five are numeric-constant changes that cut Earth Simulator first-paint delays and broaden
biodiversity visibility. Every affected fetch stays viewport-bounded, throttled, and abortable,
so earlier paint does NOT cause a request burst.

| File | Constant | Before → After | Effect |
|---|---|---|---|
| `app/dashboard/crep/CREPDashboardClient.tsx:808` | `EARTH_SIM_ASSET_READY_DELAY_MS` | 25_000 → **2_500** | Air/AQI/buoy viewport sensor prefetch (`mycaAssetsReady` gate). This is the "data appears ~30s after refresh" symptom. |
| `app/dashboard/crep/CREPDashboardClient.tsx:807` | `EARTH_PROJECT_DETAIL_DELAY_MS` | 15_000 → **1_500** | Oyster (San Diego) / Mojave project-detail overlays. |
| `app/dashboard/crep/CREPDashboardClient.tsx:809` | `EARTH_SIM_INFRA_READY_DELAY_MS` | 1_000 → **750** | Permanent infrastructure loader start. |
| `lib/crep/earth-simulator-boot.ts:275` | `EARTH_SIM_LIVE_STREAM_DELAY_MS` | 2_500 → **1_200** | Live plane/vessel/satellite pump start (`isStreaming` gate). |
| `components/crep/layers/v3-overlays.tsx:280` | `BIODIVERSITY_HOTSPOT_MIN_ZOOM` | 5 → **3** | Biodiversity hotspots render at broad US/continent flyover, not only city zoom. |

### Verified in the cloud container
- `npx tsc --noEmit --pretty false --project tsconfig.json --incremental false`:
  **no errors in any changed file**. (4 PRE-EXISTING errors remain in
  `components/search/fluid/FluidSearchCanvas.tsx` — `Cannot find name 'focusedId'` — which are
  identical on `main`, unrelated to Earth Simulator, and NOT in scope. `next.config.js` has
  `typescript.ignoreBuildErrors:true` + `eslint.ignoreDuringBuilds:true`, so they don't block a build.)
- Dev server boots clean (`Ready in 2.2s`). `GET /natureos/earth-simulator` → **HTTP 200**.
- `GET /api/crep/biodiversity-hotspots?bbox=-125,24,-66,50` → **200** with live GBIF features
  (`source_counts.gbif:20, preload:5294`) — confirms the lowered min-zoom now has data to show.
- CI on PR #187: **Lint & Type Check ✓, Unit Tests ✓, CodeQL JS/Python/Actions ✓.**

---

## 3. Things the prior handoff flagged that are ALREADY CORRECT in committed code

Do not "fix" these — verify them, then move on. (Several were Codex's local-only regressions.)

1. **Fungi-only first load** — already committed. `lib/crep/earth-simulator-boot.ts`
   `EARTH_SIM_FUNGI_ONLY_GROUND_FILTER` (~L224-252): `showFungi:true, showEcmFungi:true,
   showAmFungi:false`, all other species buckets `false`. Applied at
   `CREPDashboardClient.tsx` (~L9398) via `EARTH_SIM_STAGED_BOOT && isEarthSimulatorPath()`.
2. **Device default status = `connected`** — already committed. Mushroom 1, Hyphae 1,
   Psathyrella all seed `status:"connected"` (`CREPDashboardClient.tsx` ~L1541/1559/1577). The
   "devices default to offline" worry was a local-only Codex edit, not in this branch.
3. **Live-mover pump wiring** — already correct. Toggling aviation/ships/sats dispatches
   `crep:mover-pump-request` (`CREPDashboardClient.tsx` L8645/8652/11852/11867/11879); the
   listener (L9275) runs `pumpLive`. The only startup gate is `isStreaming` (now 1.2s). There is
   NO 35s client gate here.

---

## 4. Map of remaining gates/thresholds (exact file:line) for the heavier work

These are the real mechanisms in the committed code. Tune/QA them **locally with a browser**.

### 4.1 Startup readiness gates — `app/dashboard/crep/CREPDashboardClient.tsx`
- `mycaAssetsReady` — state L13894; effect L13895-13906 (timer uses `EARTH_SIM_ASSET_READY_DELAY_MS`).
  Gates `viewportSensorPrefetch` (L13932 → air/AQI/buoy from `/api/crep/viewport-sensors`).
- `earthProjectDetailsReady` — state L13916; effect L13917-13925 (uses `EARTH_PROJECT_DETAIL_DELAY_MS`).
  Gates `canRenderEarthProjectDetails` (L13926 → Oyster/Mojave detail overlays).
- `earthOverlayAssetsReady` — L13927 = `!isEarthSimulatorRoute || !assetIsolationMode`. Gates the
  big infra overlay block at **L21329-21346**: ports, radar, radioStations, powerPlantsG, factories,
  orbitalDebris, debrisCloud, txLinesGlobal, cellTowersG, railwayTracks, railwayTrains, droneNoFly, cctv.
- `eagleEyeAssetsReady` — L13928 = `!auditAllOffMode && !isEmbeddedEarthquakeSearch && !assetIsolationMode`.
  Gates `viewportEaglePrefetch` (L13931).
- `isStreaming` — state L7574; set true after `EARTH_SIM_LIVE_STREAM_DELAY_MS` at L8548. Hard guard
  on the live mover pump at L9030-9035.
- Permanent infra start — L20375-20391: on Earth Sim, waits `EARTH_SIM_INFRA_READY_DELAY_MS` then
  only starts `loadPermanentInfra()` once `mapInteractionActiveRef.current` is false (retries every 2.5s
  while the user is interacting). If infra looks slow to appear, this idle-gate is the suspect.

### 4.2 Live mover pump — `CREPDashboardClient.tsx`
- `pumpLive` defined L9037; initial staggered timers `[900, 3000, 7000, 15000]` at L9254; 45s poll
  interval L9262; fetches aircraft (L9126 `/api/mindex/proxy/aircraft`), vessels (L9169 `/api/oei/aisstream`),
  satellites (L9215 `/api/oei/satellites`). Top-bar `Planes/Boats/Sats` counts come from this pump's results.

### 4.3 Zoom thresholds
- `components/crep/layers/v3-overlays.tsx`: `BIODIVERSITY_HOTSPOT_MIN_ZOOM` L280 (now 3),
  `FACILITY_ICON_MIN_ZOOM` L281 (9), `FACILITY_OSM_FETCH_MIN_ZOOM` L282 (10). Biodiversity clear-below-min
  logic L1118-1123; fetch L1124-1136 (`/api/crep/biodiversity-hotspots`).
- `lib/crep/lod-policy.ts`: `INFRA_POINT_ICON_MIN_ZOOM` (5), `DATA_CENTER_MIN_ZOOM` (5.5),
  `POWER_PLANT_MIN_ZOOM` (5), `DATA_CENTER_LABEL_MIN_ZOOM` (12), `TELECOM_DETAIL_MIN_ZOOM` (5),
  `RAILWAY_MIN_ZOOM` (5).
- `components/crep/layers/eia-im3-overlays.tsx`: EIA/IM3 plant + data-center min/label zooms (L90,92,106,121,136,151,203,217).

### 4.4 Files for the unfinished items (from the prior handoff, still valid)
- **Infrastructure density (OpenGridWorks parity, incl. Mexico/Canada/Tijuana):**
  `components/crep/layers/eia-im3-overlays.tsx`, `components/crep/panels/infrastructure-stats-panel.tsx`,
  `lib/crep/static-infra-loader.ts`, `lib/crep/metro-infra-layer-bridge.ts`, `app/api/crep/infra/*`,
  `components/crep/layers/power-plant-bubbles.tsx`, `components/crep/layers/datacenter-diamonds.tsx`.
  Check for any US-only bbox/seed fallback in the loader/bridge.
- **Eagle Eye six live previews + full player:** `components/crep/eagle-eye/*`,
  `components/crep/layers/eagle-eye-overlay.tsx`, `lib/crep/use-viewport-eagle-prefetch.ts`,
  `lib/crep/eagle-viewport-sources.ts`, `lib/crep/eagle-camera-normalize.ts`,
  `lib/crep/caltrans-hls-resolve.ts`, `app/api/eagle/*`, `app/api/oei/cctv/route.ts`.
- **Civic icons / military polygons / POE-border:** `components/crep/layers/sdtj-coverage-layer.tsx`,
  `tijuana-estuary-layer.tsx`, `project-nyc-dc-layer.tsx`, `proposal-overlays.tsx`,
  `mojave-preserve-layer.tsx`, `components/crep/panels/MycaViewportPanel.tsx`.
- **Device telemetry backend:** see `docs/codex-handoffs/EARTH_SIMULATOR_DEVICE_BACKEND_CURSOR_HANDOFF_JUN12_2026.md`.

---

## 5. Remaining production blockers (require local browser QA — NOT done in cloud)

1. Infrastructure not yet OpenGridWorks-density; verify Mexico/Canada/Tijuana paint.
2. Eagle Eye six live previews + full-player reliability across providers.
3. Camera coordinate/provider audit (Caltrans SR75 placement, Tijuana/San Ysidro click-freeze).
4. Control-freeze soak test (pan/zoom/hover/click/toggle for 2+ min).
5. Confirm planes/vessels counts go non-zero with filters on (now that pump starts at 1.2s).
6. Confirm biodiversity hotspots actually render at z3 flyover (data is present; verify visually).
7. Device telemetry honesty (connected vs stale/offline) once backend confirms MQTT/MINDEX.

QA checklist from the prior handoff (US z3, San Diego z10-12, Tijuana/San Ysidro, LA/Vegas/SF/NYC,
2-min interaction soak) still applies verbatim. Use the in-app browser on local `3010`.
Do not use route reachability as proof.

---

## 6. Hard user constraints (unchanged — carry forward)

- Scope: `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website`. Earth Simulator only — do NOT work on SINE.
- Do NOT touch/kill the `3004` dev server. Avoid killing PIDs unless explicitly safe.
- No architecture changes. No mock data. Do not remove data to hide lag — data present first, optimize latency after.
- Do not remove or degrade San Diego data.
- First-load species: Fungi on, EcM on, AM off, other species off; other non-species "on" layers stay on.
- Eagle Eye = six live viewport video previews. Unavailable cameras must show offline without freezing controls.
- MINDEX routes through real `/api/mindex/proxy/*`. Empty compounds/genetics/publications OK until ETL fills them.
- Do NOT deploy until local `3010` browser QA passes.

---

## 7. Paste-ready continuation prompt (for a fresh local Codex/Fable session)

```text
Continue Earth Simulator ONLY, locally in D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website.
Read docs/codex-handoffs/EARTH_SIMULATOR_FABLE5_CONTINUATION_HANDOFF_JUN12_2026.md FIRST, then the
prior EARTH_SIMULATOR_PRODUCTION_MAP_FIX_HANDOFF_JUN12_2026.md for the QA checklist.

Before anything: if you have uncommitted local edits, git stash or commit them to a scratch branch so
they are not lost. Then `git fetch origin && git checkout claude/sweet-hawking-954std` (PR #187, base
codex/myca-website-security-boundary) which contains the committed first-paint fix (5 constants in 3 files).

Do NOT deploy. Do NOT touch/kill 3004. Use local 3010 + the in-app browser (Ctrl+P preview) for QA —
route reachability is not proof. No architecture changes, no mock data, do not remove data to hide lag.
Preserve fungi-only first load (Fungi on, EcM on, AM off, others off).

NOTE: the variable `earthSimDeferredDataReady` from the older handoff does NOT exist in committed code;
the real gates are mycaAssetsReady / earthProjectDetailsReady / earthOverlayAssetsReady / eagleEyeAssetsReady
/ isStreaming and the *_DELAY_MS constants — see Section 4 of the new handoff for exact file:line refs.

Then proceed through the remaining blockers in priority order: (1) verify first-paint timing + biodiversity
at z3 + planes/vessels counts now paint quickly; (2) bring infrastructure to OpenGridWorks density globally
incl. Mexico/Canada/Tijuana with viewport/LOD culling (not country filtering) and INFRA-tab/MYCA viewport
stats; (3) restore Eagle Eye six live previews and reliable full player; (4) audit camera coordinates/provider
health (Caltrans SR75, Tijuana/San Ysidro freeze); (5) civic icons + exact military polygons + POE/border;
(6) device telemetry honesty; (7) control-freeze soak. Verify with tsc and real in-app browser QA before any
deploy.
```
