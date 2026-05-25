# Codex Handoff: Earth Simulator Fungal Layers, Startup Camera, and Filter Stability

Date: 2026-05-23

## Stage Acceptance Snapshot (2026-05-23 23:11 PDT)

User accepted this stage as "good enough" to move on, with known issues remaining.

Accepted status at this checkpoint:

- Earth Simulator is improved but not perfect.
- Movement-time base-layer blinking behavior was identified as visually bad and removed.
- Bathymetry/topography/satellite interaction was patched to reduce land blanking behavior:
  - bathymetry land mask hides when bathymetry is off
  - mask/bathymetry insertion order re-asserted against topography/satellite
  - goal: bathymetry clips ocean only and should not black out land overlays
- Work is now shifting to the next blocker:
  - Nature and Events icons blinking/disappearing in local Earth Simulator

## Live (origin/main) vs Local: Nature/Event Icon Behavior Delta

This section captures the concrete code-level difference between live baseline (`origin/main`) and current local branch that explains icon blink/disappear behavior.

### Baseline used as "live GitHub code"

- File compared:
  - `app/dashboard/crep/CREPDashboardClient.tsx`
- Baseline source:
  - `origin/main:app/dashboard/crep/CREPDashboardClient.tsx`
- Local source:
  - working tree version on `codex/myca-website-security-boundary`

### Key finding

Local branch introduced movement-gated DOM marker rendering for Earth Simulator:

- Local has:
  - `isMapAnimationActive` state set on `movestart` and cleared on `moveend`
  - `shouldRenderDomMarkers = !(earthStrictPerfMode && isMapAnimationActive)`
  - Event/Device/Fungal marker JSX wrapped with `shouldRenderDomMarkers`
- `origin/main` does **not** include this movement-gating path.
- Result: on local, marker components can unmount/remount during map movement, perceived as blinking/disappearing. On live baseline, they remain mounted more continuously.

### Specific render paths impacted locally

In local `CREPDashboardClient.tsx`, these are explicitly guarded by `shouldRenderDomMarkers`:

- Event marker list render (`renderedEventsForMap.map(...)`)
- Device marker render block
- Fungal marker list render (`renderedFungalObservationsForMap.map(...)`)
- Selected fungal standalone marker fallback

In `origin/main`, equivalent blocks do not use movement-state gating and therefore do not intentionally hide during movement.

### Important note

A separate movement-time **layer visibility throttler** (MapLibre `setLayoutProperty(..., "none")` during motion) was removed in this stage because it caused visual blinking without meaningful FPS gain. That removal addresses base-layer blinking, but Nature/Event DOM icon persistence still needs dedicated handling.

## Repo, Path, Branch

- Repo path: `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website`
- Branch: `codex/myca-website-security-boundary`
- Current HEAD observed during handoff: `e71830e8f4d082d7187d82cb49bb391f3b6e650c`
- Local preview URL: `http://localhost:3010/natureos/earth-simulator`
- Related local audit docs outside this repo root:
  - `D:\Users\admin2\Desktop\MYCOSOFT\CODE\EARTH_SIMULATOR_RECOVERY_2026-05-21.md`
  - `D:\Users\admin2\Desktop\MYCOSOFT\CODE\EARTH_SIMULATOR_UNSTABLE_LAYERS_2026-05-21.md`
  - `D:\Users\admin2\Desktop\MYCOSOFT\CODE\EARTH_SIMULATOR_ASSET_AUDIT_2026-05-21.md`
- Related local plan outside this repo root:
  - `C:\Users\Owner1\.cursor\plans\three-stream_gap_plan_edc7b3af.plan.md`

## Current Goal

Stabilize the canonical Earth Simulator at `/natureos/earth-simulator` so it can be safely pushed and later deployed. The immediate blocker is first-load map startup: the simulator currently still flashes or lands on a tiny z0 globe instead of opening at the same United States / North America camera as the US fly-to button. After that, continue with persistent Nature and Events icons, filter stability, and full visual QA.

The required first-load behavior is:

- All non-base data filters start off.
- Base map context starts on every time:
  - satellite imagery
  - ocean bathymetry
  - land topology/topography
- Startup camera must match the US fly-to target:
  - center `[-98.5, 39.8]`
  - zoom `3`
  - globe projection
  - no tiny z0 globe first-paint flash
- AM and EcM fungi filters must render the SPUN-style fungal atlas directly on the Earth Simulator globe/map, not in an iframe and not as a second map.
- AM and EcM should activate at 35% opacity by default, with an opacity control available.

## What Is Already Completed or Partially Completed

- AM and EcM fungal layers were reportedly close to visually correct at `/natureos/earth-simulator?filters=off&lat=32.83&lng=-117.05&zoom=10.4&fresh=...` before the PC restart and branch/worktree confusion.
- AM and EcM are integrated as Earth Simulator fungal filters, not intended to be a separate iframe/map.
- A fungal opacity control exists in the Nature tab:
  - label: `AM / ECM OPACITY`
  - default: `35%`
  - quick values: `35`, `55`, `75`, `100`
- Fungal layer opacity values in `CREPDashboardClient.tsx` were adjusted so AM and EcM default to `0.35`.
- Base context opacity was adjusted in `CREPDashboardClient.tsx`:
  - `satImagery: 1`
  - `bathymetry: 0.45`
  - `topography: 0.55`
- `CREP_DEFAULT_CENTER` is set to `[-98.5, 39.8]`.
- `CREP_DEFAULT_ZOOM` is set to `3`.
- `components/ui/map.tsx` was patched to add an Earth Simulator route-level fallback camera:
  - route check: `window.location.pathname.includes("/natureos/earth-simulator")`
  - fallback center: `[-98.5, 39.8]`
  - fallback zoom: `3`
  - `jumpToInitialCamera()` helper used during startup retries
- The user still sees z0 tiny globe after reload, so this startup camera fix is not yet confirmed working.

## Files Touched or Investigated

Earth Simulator / map files touched:

- `app/dashboard/crep/CREPDashboardClient.tsx`
  - default camera constants
  - filter-off/base context layer behavior
  - fungal layer opacity/defaults
  - MapComponent startup props
  - ProposalOverlays render guard
  - startup camera enforcement effects
- `components/ui/map.tsx`
  - route-level Earth Simulator camera fallback
  - initial camera confirmation/retry logic
- `components/crep/layers/fungal-atlas-layer.tsx`
  - fungal atlas visual layer behavior
- `app/api/crep/fungal-atlas/tiles/[layer]/[z]/[x]/[y]/route.ts`
  - fungal atlas tile endpoint

Earth Simulator files previously touched by earlier work and must be audited before push:

- `components/crep/layers/proposal-overlays.tsx`
- `components/crep/layers/v3-overlays.tsx`
- `components/crep/layers/realistic-cloud-layer.tsx`
- `components/crep/layers/mojave-preserve-layer.tsx`
- `components/crep/layers/mapbox-3d-buildings.tsx`
- `components/crep/layers/photorealistic-3d-tiles.tsx`
- `components/crep/markers/fungal-marker.tsx`
- `components/crep/crep-error-boundary.tsx`
- `app/api/natureos/global-events/route.ts`
- `contexts/crep-context.tsx`
- `app/apps/earth-simulator/page.tsx`
- `components/dashboard/natureos-dashboard.tsx`
- `lib/crep/fungal-atlas.ts`
- `lib/crep/lod-policy.ts`

Files created in earlier fungal/SPUN attempts that may exist and must be reviewed before keeping or deleting:

- `lib/crep/snapshot-cache.ts`
- `lib/crep/predictive-raster.ts`
- `lib/crep/spun-tiles.ts`
- `lib/crep/spun-data.ts`
- `app/api/crep/fungal-atlas/global-image/route.ts`
- `app/api/crep/fungal-atlas/spun-tile/[layer]/[z]/[x]/[y]/route.ts`
- `scripts/bake-spun-rasters.mjs`
- `scripts/crop-spun-figures.mjs`
- `public/data/spun/`

Current `git status --short` at handoff included Earth Simulator changes plus unrelated Cursor/voice changes. Do not assume every dirty file belongs to Earth Simulator.

## Commands and Tests Already Run

Recent repo/context commands:

```powershell
git branch --show-current
git rev-parse HEAD
git status --short
Get-ChildItem -Path docs -Force | Select-Object -First 40 -ExpandProperty Name
Select-String -Path app\dashboard\crep\CREPDashboardClient.tsx -Pattern "CREP_DEFAULT_CENTER|CREP_DEFAULT_ZOOM|FUNGA_LAYER_OPACITY|startupMapCenter|startupMapZoom|onCreate|onLoad|ProposalOverlays|PROPOSAL_OVERLAY_LAYER_IDS" -Context 2,4
Select-String -Path components\ui\map.tsx -Pattern "const initialCenter|confirmInitialCamera|applyInitialCamera|forceRevealId|new maplibregl.Map|center: initialCenter|zoom: initialZoom" -Context 3,5
Get-Content -Path components\ui\map.tsx -TotalCount 380
```

Browser/user visual tests already performed:

- Verified AM fungi and EcM fungi are visible at San Diego test URL before the restart:
  - `http://localhost:3010/natureos/earth-simulator?filters=off&lat=32.83&lng=-117.05&zoom=10.4&fresh=...`
- User confirmed AM and EcM looked basically correct after many iterations.
- User confirmed satellite imagery, topology, and bathymetry need better blending with the fungal atlas.
- User confirmed after PC restart/current reload:
  - Earth Simulator still opens on a tiny z0 globe.
  - Base imagery is not visible until AM or EcM is toggled.
  - It should open over North America like the US fly-to button.

Useful screenshot artifacts currently untracked:

- `screenshots/fungal-atlas-am-z10-spun4.png`
- `screenshots/fungal-atlas-ecm-z10-spun4.png`
- `screenshots/fungal-atlas-mycelium-z10-spun4.png`
- `screenshots/fungal-atlas-earth-simulator.png`
- `screenshots/fungal-marker-mushroom-dot.png`
- `screenshots/earth-simulator-audit-final.png`
- `screenshots/earth-simulator-audit-live.png`
- `screenshots/earth-simulator-filter-categories-collapsible.png`

## Known Errors, Warnings, and Failing Checks

Runtime/browser errors previously reported:

- `ChunkLoadError: Loading chunk _app-pages-browser_node_modules_next_dist_client_dev_noop-turbopack-hmr_js failed`
- `Error: Style is not done loading.`
  - seen from `WaypointSystem.tsx`
  - seen from `components/crep/layers/v3-overlays.tsx`
- `TypeError: Cannot read properties of undefined (reading 'getImage')`
  - seen from `components/crep/layers/proposal-overlays.tsx`
- `TypeError: Failed to fetch`
  - seen from `components/crep/earth2/alert-panel.tsx`
  - seen from deck.gl `Tile3DLayer._loadTileset`
- Controls and filter buttons freeze after repeated toggles.
- Event and Nature icons flicker/blink/disappear immediately after loading and during zoom/move.
- Event layers that used to work now blink on/off or disappear.
- Moving assets need persistent viewport behavior:
  - planes
  - vessels/AIS
  - satellites
  - events such as earthquakes, fires, storms, lightning
- Base context startup is currently wrong:
  - z0 tiny globe persists on reload
  - bathymetry/topology/satellite do not always appear until fungal layers are toggled
- Potential stale compiled/HMR state after PC restart and Cursor branch/worktree work. Verify the active dev server is running this repo/branch before debugging further.

Known UI/data issues still open:

- Nature and Events icons need to persist instead of disappearing.
- Species icons should be small colored dots/icons, not glass-only white icons.
- Fungi icons should use a mushroom symbol and be visually distinct.
- Every map asset/filter should have a visible filter location in Nature, Infra, or Events Intel Feed.
- Right panel data-layer controls should not duplicate left Intel Feed controls once left controls are functional.
- Infra and Nature panels must be scrollable and properly categorized.
- Cameras need robust video playback and widget refresh without full-page refresh.
- Buoys counter can show data while icons are not visible.
- Airports/seaports filters may have no data or broken data wiring.
- Bathymetry/topology/satellite need correct layer order and ocean/land blending.
- All broken layers should stay off until individually verified.
- Earth2 backend is not running and all Earth2 UI/backend calls should stay off.

## Open Decisions

- Do not push or deploy until the startup camera and base context visually pass, unless the user explicitly accepts a checkpoint push despite known failures.
- Decide whether to keep, stage, or delete earlier SPUN/predictive raster helper files after validating the actual fungal tile pipeline.
- Decide whether untracked screenshot artifacts should be kept as evidence, moved to an audit folder, or deleted.
- Decide whether to clear stale Next.js build output only if the active dev server is definitely stale. Coordinate with Cursor if it is managing the server.
- Decide final data source strategy for AM/EcM:
  - Current goal is real local/NAS/MINDEX-backed fungal atlas data, not iframe and not fake/mock/generated hallucination.
  - SPUN style should be matched visually, but production should use Mycosoft-owned map rendering and local data.

## Constraints, User Preferences, and Do-Not-Touch Areas

Hard constraints:

- Do not touch Cursor/MICA/voice-system files unless the user explicitly changes scope.
- Do not run destructive git commands such as `git reset --hard` or broad `git checkout --` over dirty files.
- Do not revert or overwrite unrelated Cursor/user changes.
- Do not deploy Earth Simulator edits until they work perfectly or the user explicitly asks for a checkpoint push/deploy.
- Do not implement the SPUN atlas as an iframe or a separate second map.
- Do not use fake/mock/hallucinated fungal data.
- Do not let broken layers start on by default while debugging.

Current do-not-touch dirty files from Cursor/MICA/voice work:

- `.env.example`
- `.gitignore`
- `app/agent/page.tsx`
- `app/api/test-voice/audit/route.ts`
- `app/api/test-voice/voice-stack/start/route.ts`
- `app/api/test-voice/voice-stack/status/route.ts`
- `app/docs/ai/deterministic-vs-stochastic/page.tsx`
- `app/test-voice/VoiceTestPageClient.tsx`
- `components/voice/VoiceSystemAuditPanel.tsx`
- `lib/voice/personaplex-client.ts`
- `lib/voice/gpu-voice-profile.ts`
- `tsconfig.tsbuildinfo`

User preferences:

- Work fast, make changes directly, and visually test in the in-app browser.
- Verify the real local browser state, not only code.
- Keep all filters off for debugging unless testing a specific layer.
- Start by proving AM/EcM fungal atlas works perfectly.
- After fungal layer validation, fix Nature and Events icon persistence/flicker.
- Preserve the Earth Simulator app chrome/top bars and normal globe/map, do not create a separate view.
- Use exact local/NAS source data and integrate through MINDEX/Supabase long-term.

Important source references supplied by user:

- SPUN atlas:
  - `https://www.spun.earth/underground-atlas/mycorrhizal-biodiversity?gad_source=1&gad_campaignid=22524648645&gbraid=0AAAAA9rKQOOpcNepg9Oan335x87c9h7JJ&gclid=Cj0KCQjwiJvQBhCYARIsAMjts3I4S157vDA4MrPjywb0ubZveS2kIKFn7GaCZi1Qx7i0zIx5-XRnX98aAu7QEALw_wcB`
- SPUN richness maps GitHub:
  - `https://github.com/SocietyProtectionUndergroundNetworks/richness_maps`
- GlobalFungi:
  - `https://globalfungi.com/`
- GlobalAMFungi:
  - `https://globalamfungi.com/`
- GSMc sampling map:
  - `https://gsmc-fungi.github.io/sampling_map/`
- Local fungal data:
  - `C:\Users\Owner1\Downloads\fungaldata-global`
- NAS fungal data:
  - `https://192.168.0.105/drive/shared-drives/MINDEX/CREP%20RAW%20DATA/FUNGI/globalfungi.com`

SPUN technical requirements supplied by user:

- Native resolution: `1 km2 (30 arc seconds)`
- Spatial extent: global
- Masked areas:
  - non-vegetated landcover from remote sensing datasets
  - rock, ice, desert habitats
  - highly urban/built-up landcover
- Units:
  - predicted richness: species / 100 m2
  - predicted endemism: rarity-weighted richness, normalized 0-10
  - uncertainty: coefficient of variation
  - model extrapolation: percent
- Sources:
  - GlobalFungi
  - GlobalAMFungi
  - Global Soil Mycobiome consortium
  - Protected Planet

## Next Concrete Steps

1. Verify the active dev server is running `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website` on branch `codex/myca-website-security-boundary`. Do not restart if Cursor is managing the server unless the user explicitly asks.
2. Focus next on Nature/Event icon persistence (primary blocker now):
   - remove any remaining movement-phase unmounting for Event/Device/Fungal DOM markers
   - keep markers mounted through pan/zoom; update position/data without hide/show churn
   - align local behavior with `origin/main` baseline where markers are not motion-gated
3. After icon persistence fix, run targeted visual QA:
   - refresh behavior (no immediate disappear)
   - pan/zoom behavior (no blink)
   - toggle behavior (no freeze/no duplicate popups)
4. Continue startup/base context hardening as secondary track:
   - confirm `MapComponent` receives center `[-98.5, 39.8]` and zoom `3`
   - confirm `window.__crep_map.getCenter()` and `getZoom()` match after reload
   - if still z0, inspect whether stale compiled output or a different map component path is active
5. Make base context always visible under `filters=off` and plain `/natureos/earth-simulator`:
   - `satImagery`
   - `bathymetry`
   - `topography`
   - verify they are enabled in React layer state and visible on map immediately
6. Visually verify AM and EcM after the camera fix:
   - AM alone at 35%
   - EcM alone at 35%
   - opacity 35/55/75/100
   - with base context on
   - San Diego zoom and US/North America zoom
7. Only after startup/base/fungal/icon persistence pass, stage only Earth Simulator files. Do not stage MICA/voice files or unrelated artifacts.
8. Run a filter-by-filter visual audit:
   - all filters off baseline
   - base context layers
   - fungal layers
   - Nature filters
   - Infrastructure filters
   - Events filters
   - repeated toggles to catch freezes

## Context Checkpoint — May 23, 2026 (Late Night)

### What was changed in this pass (Earth Simulator only)

- `app/dashboard/crep/CREPDashboardClient.tsx`
  - Changed default filter parsing so `filters` defaults to ON unless explicitly `off`.
  - Reworked startup fallback behavior for `visibleEvents` when `mapBounds` is null/invalid:
    - use ranked fallback set instead of returning empty cached set.
  - Added anti-empty fallbacks for `visibleFungalObservations` and `visibleEvents`:
    - if recompute path returns empty but source set is non-empty, use ranked fallback.
  - Forced DOM marker rendering to remain enabled during debugging:
    - `shouldRenderDomMarkers = true`.
  - Added animation-phase stabilization:
    - while `isMapAnimationActive`, return stable cached Nature/Event marker sets.
  - Added Earth-only startup focus enforcement:
    - keep base map + event workflow active.
    - explicitly turn off fungal-atlas overlays and infra/device default toggles.
  - Added satellite-off clamp in Earth startup focus:
    - all `satelliteFilter.show*` fields set to `false`.
  - Added Earth-only periodic enforcement for core Nature/Event ground filters ON.

### Runtime issue encountered and fixed during this pass

- `ChunkLoadError` on `localhost:3010` (stale Next chunks/runtime mismatch).
  - Fixed by killing port `3010`, clearing `.next`, restarting `npm run dev:next-only`, and validating server `200`.

### Current observed status at handoff point

- Nature/Event persistence is still not fully solved in user validation:
  - user still reports show-then-disappear behavior.
- Scope correction applied:
  - user clarified only Nature + Events are flickering.
  - infrastructure flicker is not the active bug target.

### Exact next step for new context

1. Keep work strictly in `CREPDashboardClient.tsx`.
2. Instrument only Nature/Event render pipeline with in-app debug counters:
   - `globalEvents.length`
   - `typeFilteredEvents.length`
   - `visibleEvents.length`
   - `renderedEventsForMap.length`
   - `visibleFungalObservations.length`
3. Add one temporary hard lock mode on Earth route:
   - bypass viewport culling for Nature/Event (ranked cap only) to prove persistence.
4. Once persistence is verified visually, reintroduce viewport culling with hysteresis.

## Reactivation Prompt for Fresh Codex

Paste this into a new Codex chat:

```text
Continue the Earth Simulator stabilization work in:
D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website

Branch:
codex/myca-website-security-boundary

Read this handoff first:
D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\2026-05-23-earth-simulator-handoff.md

Do not touch Cursor/MICA/voice files:
.env.example
.gitignore
app/agent/page.tsx
app/api/test-voice/audit/route.ts
app/api/test-voice/voice-stack/start/route.ts
app/api/test-voice/voice-stack/status/route.ts
app/docs/ai/deterministic-vs-stochastic/page.tsx
app/test-voice/VoiceTestPageClient.tsx
components/voice/VoiceSystemAuditPanel.tsx
lib/voice/personaplex-client.ts
lib/voice/gpu-voice-profile.ts
tsconfig.tsbuildinfo

Current immediate bug:
/natureos/earth-simulator still reloads to a tiny z0 globe. It must load immediately at the same camera as the US fly-to button: center [-98.5, 39.8], zoom 3, over North America, globe projection. Base context must be on at startup: satellite imagery, bathymetry, topology/topography. All non-base data filters should be off while debugging. AM and EcM fungal layers should work at 35% opacity and render directly on the Earth Simulator map/globe, not as an iframe or second map.

Use the in-app browser to visually verify every change at:
http://localhost:3010/natureos/earth-simulator

After the startup/base/fungal state is visibly correct, continue with the next blocker: Nature and Events icons flicker/disappear after refresh and during map movement. Do not push or deploy until the visual state passes, unless explicitly told to make a checkpoint push.
```

## Regression Lock Notes (May 23, 2026 PM)

### Space-weather icon suppression (May 23, 2026 late PM)

- Space weather and Sun-Earth impact are now treated as overlay-only in Earth Simulator:
  - Removed from event icon ingestion path (`/api/natureos/global-events` mapping) so they do not render as marker icons.
  - Added explicit suppression for: `solar_flare`, `geomagnetic_storm`, `aurora`, `cme`, `solar_wind`, `sun_earth_impact`, `sun-earth-impact`, `radiation_belt`.
- Added coordinate guard to reject null-island defaults (`0,0`) for icon events.
- Added event-store purge for suppressed types so old yellow Atlantic icon artifacts are removed on refresh and do not reappear from cached in-memory state.
- Intended visualization behavior:
  - Aurora / geomagnetic / sun-earth activity should be represented by globe overlay layers (NOAA/NASA style layers), not by point icons.
  - Only geospatial hazard events with valid Earth coordinates should render as event markers.

### Event toggle stability + independence (May 23, 2026 late PM)

- Fixed event-type cross-bleed caused by fallback logic in visible-event selection:
  - Removed global fallback paths that reintroduced unrelated event types when a specific toggle reduced in-viewport results.
  - Removed stale-cache fallback that could keep old event sets visible after filter changes.
- Added diversity-aware event selection under LOD cap:
  - Event marker cap now samples across event buckets (earthquake, wildfire, storms, lightning, floods, tornadoes, volcanoes, etc.) instead of allowing one type to dominate the entire cap.
  - Prevents "earthquakes on = fires disappear" behavior under high event density.
- Improved rapid-click responsiveness on event toggles:
  - Event toggle state updates now run in `startTransition` to avoid control lock-ups when users click quickly.

### New fixes applied

- Earth-route marker click regression fixed in `components/ui/map.tsx`.
  - Cause: marker content was portaled into `data-earth-marker-root`, but click handlers were still attached only to MapLibre's internal marker element.
  - Fix: attach click/mouseenter/mouseleave listeners directly to the Earth portal root so Nature/Event markers open their widgets again.
- AM/EcM toggle no longer force-clears aircraft source data in fungal isolation path.
  - Cause: `isolateFungaMapLayers()` always cleared `crep-live-aircraft`.
  - Fix: stop clearing `crep-live-aircraft` and keep `crep-live-aircraft*` layers visible in fungal isolation pass.
- Nature marker count no longer changes due to unrelated layer toggles (e.g., railways).
  - Cause: fallback branch depended on `assetIsolationMode` in kingdom default case.
  - Fix: remove `assetIsolationMode` coupling from Nature kingdom default path so infrastructure toggles cannot change Nature icon population.

### Regression checklist (must pass before claiming done)

1. Load `/natureos/earth-simulator` and wait 10s:
   - Nature + Event markers remain visible (no disappear-after-refresh).
2. Toggle `AM Fungi Distribution`:
   - Aircraft layers remain present if they were on before the toggle.
3. Click Nature marker:
   - Species widget popup opens.
4. Click Event marker:
   - Event widget popup opens.
5. Toggle unrelated infra layer (e.g., railways):
   - Nature marker count does not jump because of that toggle.

### Production first-load rules (May 24, 2026)

- **Filters ON at refresh** on Earth Simulator: all species, events, movers (aircraft/vessels/satellites with `showActive`), buoys/ports/military/airports layer toggles, telecom/broadcast/public-safety layers, infra line toggles (cables/rails/TX).
- **Infra icons LOD:** point/symbol infra (plants, substations, cell towers, static ports/DCs, etc.) use `minzoom: 7` via `lib/crep/production-first-load.ts` + `INFRA_POINT_ICON_MIN_ZOOM` in `lod-policy.ts`. **Line layers** (submarine cables, railways, transmission) paint at globe zoom when toggles are on.
- **Removed** fungi-only lightweight Earth startup (`startsInLightweightEarthMode` + mount `useEffect` that disabled filters/layers).
- **`loadPermanentInfra()`** now runs on Earth Simulator (cables/rails/TX load on refresh).
- **Live movers:** `setIsStreaming(true)` on Earth mount; direct source-sync effect pushes aircraft/vessels/**static satellites** even when SGP4 animation stays off for FPS.
- **Space weather** remains default OFF (unchanged — not in production ON list).

### Production audit (May 24, 2026)

Full refresh audit doc: [`docs/EARTH_SIMULATOR_CREP_PRODUCTION_AUDIT_MAY24_2026.md`](../EARTH_SIMULATOR_CREP_PRODUCTION_AUDIT_MAY24_2026.md)

**Critical fix:** `app/api/mindex/proxy/[source]/route.ts` — when MINDEX returns 0 aircraft/vessels/satellites, fall back to OEI live routes (planes/ships were empty on refresh before this).

**Top latency risks:** `substations-us.geojson` (11 MB), `transmission-lines-us-major.geojson` (13 MB), `/api/crep/fungal` without bbox (>60 s). **Cell towers global** requires `bbox=` query param (400 without it — expected).

### Current user-reported follow-up still open

- Nature observations appear concentrated around LA/San Diego and need broader national spread in viewport logic.
- Planes appear visible by default in the current user session and should be verified against intended default filter state before final sign-off.
