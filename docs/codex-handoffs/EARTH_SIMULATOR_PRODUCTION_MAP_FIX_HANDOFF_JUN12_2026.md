# Earth Simulator Production Map Fix Handoff - June 12, 2026

## Current Situation

Earth Simulator is not production-ready.

The local route is:

```text
http://localhost:3010/natureos/earth-simulator
```

The user has repeatedly tested the in-app browser on `3010` and provided screenshots showing:

- First refresh does not immediately show the expected infrastructure, power, species, event, camera, civic, air sensor, POE, border, vessel, plane, and biodiversity hotspot data.
- Data slowly appears after roughly 30 seconds, which is wrong for permanent data.
- Power infrastructure is far below the visual and data density expected from OpenGridWorks.
- Infrastructure is unevenly US-biased and does not paint properly in Mexico/Canada/Tijuana.
- Planes/vessels remain at zero even when filters are enabled.
- Biodiversity Hotspots is enabled but does not visibly render at broad zoom.
- Controls freeze or become unclickable after data and cameras paint, while the map itself may still pan/zoom.
- Eagle Eye thumbnails are not reliably showing six live video previews.
- Clicking some camera markers freezes controls or opens broken/full-player streams even when the thumbnail works.
- Some camera positions are wrong, especially Caltrans/SR75 examples.
- Device telemetry for the three connected devices is missing or showing off incorrectly.

Do not deploy these changes live until the local `3010` route passes browser QA.

## Hard User Constraints

- Scope is `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website`.
- Earth Simulator is priority. Do not work on SINE.
- Do not touch or kill the `3004` dev server.
- Avoid killing/restarting PIDs unless absolutely necessary and explicitly safe.
- Use the in-app browser for QA.
- Do not make architecture changes.
- Do not remove data to hide lag.
- Do not remove San Diego data or degrade San Diego behavior.
- Data must be present first. Latency can be optimized after.
- No mock data.
- MINDEX should route through real `/api/mindex/proxy/*`.
- Empty compounds/genetics/publications are acceptable until ETL fills them.
- Do not change visual/function behavior without approval.
- First-load species default should be fungi-focused:
  - Fungi on.
  - EcM fungi remains the first layer.
  - AM fungi off by default.
  - Other species groups off by default.
  - All other non-species data that should be on remains on.
- Eagle Eye behavior must stay as six live viewport video previews.
- Cameras that are unavailable should visibly show unavailable/offline without freezing controls.

## Current Working Tree Warning

The worktree is very dirty. Many files are already modified, including API routes, camera routes, map layers, device routes, MINDEX routes, CREP UI, and data seeds. Do not assume every change was made in this continuation.

Recent `git status --short` showed many modified files, including:

- `app/dashboard/crep/CREPDashboardClient.tsx`
- `components/crep/layers/v3-overlays.tsx`
- `lib/crep/earth-simulator-boot.ts`
- `components/crep/eagle-eye/*`
- `components/crep/layers/eagle-eye-overlay.tsx`
- `components/crep/layers/eia-im3-overlays.tsx`
- `components/crep/panels/infrastructure-stats-panel.tsx`
- `lib/crep/static-infra-loader.ts`
- `lib/crep/metro-infra-layer-bridge.ts`
- `lib/crep/use-viewport-eagle-prefetch.ts`
- `app/api/mindex/proxy/[source]/route.ts`
- `app/api/earth-simulator/devices/route.ts`
- `app/api/natureos/devices/telemetry/route.ts`
- `app/api/eagle/*`
- `public/data/crep/*`

There are also many untracked `.codex-dev-server-3010.*` logs, screenshots, artifacts, and docs.

Before editing, inspect the relevant file and preserve other agents' work.

## What Was Already Changed And Partially Verified

### 1. Fungi-focused default

Files:

- `app/dashboard/crep/CREPDashboardClient.tsx`
- `lib/crep/earth-simulator-boot.ts`

The first-load species filter was changed so fungi is the active species focus and other species buckets are off by default. EcM remains on and AM is off by default.

Browser QA after this change showed:

- Fungi active.
- Plants, birds, mammals, reptiles/amphibians, fish/marine, and insects/arachnids inactive.
- Mycelium Heat off.
- AM Fungi off.
- EcM Fungi on.

This matches the user's later instruction.

### 2. Intel Feed and right panel z-index protection

File:

- `app/dashboard/crep/CREPDashboardClient.tsx`

The Intel Feed and right panel were raised above map markers:

- Left Intel Feed panel: `z-[90]`
- Right panel: `z-[90]`
- Fly-to panel: `z-[95]`

Browser QA verified `elementFromPoint` inside the Intel Feed returned panel text, not a marker, so the marker-over-panel bleed was fixed locally.

### 3. Eagle Eye thumbnail partial proof

Browser QA found that Hotel Del North, Hotel Del South, and a Caltrans thumbnail video advanced in the Eagle Eye grid.

However, only three `<video>` elements were mounted when six are required. The full camera player still needs audit because the user saw Hotel Del thumbnail preview working but full player broken.

Do not call cameras fixed.

### 4. TypeScript status

After the fungi-default and z-index changes, this passed:

```powershell
npx.cmd tsc --noEmit --pretty false --project tsconfig.json --incremental false
```

This was before the pending first-paint gate fix described below. Re-run after any edit.

## Highest Priority Root Cause: First-Paint Data Gates

The user is correct that restrictions intended for latency/domain management are now hiding data. The main offender is `earthSimDeferredDataReady`.

File:

- `app/dashboard/crep/CREPDashboardClient.tsx`

Current relevant lines from `rg`:

```text
7842: const [earthSimDeferredDataReady, setEarthSimDeferredDataReady] = useState(() => !isEarthSimulatorPath());
9359: const liveEntityPumpInFlightRef = useRef(false);
9364: if (isEarthSimulatorRoute && !earthSimDeferredDataReady) return;
10760: (!earthSimDeferredDataReady || isMapAnimationActive || mapInteractionActiveRef.current);
10978: if (isEarthSimulatorRoute && !earthSimDeferredDataReady) return
11147: const allowEarthLiveNatureFallback = !isEarthSimulatorRoute || earthSimDeferredDataReady;
11634: if (isEarthSimulatorRoute && !earthSimDeferredDataReady && !forceNatureFetch && !cityLevelNatureFetch) return;
11745: const allowEarthLiveNatureFallback = !isEarthSimulatorRoute || earthSimDeferredDataReady;
13641: !earthStrictPerfMode || (earthSimDeferredDataReady && !isMapAnimationActive);
14164: shouldMountRightPanelContent && (!isEarthSimulatorRoute || earthSimDeferredDataReady || rightPanelOpen);
14278: (earthSimDesktopOverlayBudget && earthSimDeferredDataReady && earthProjectDetailsReady && earthProjectViewportReady);
14289: const liveAuxiliaryLayersReady = !isEarthSimulatorRoute || (proposalOverlayAssetsReady && earthSimDeferredDataReady);
14308: (!isEarthSimulatorRoute || (earthSimDeferredDataReady && !isMapAnimationActive));
22444-22475: V3Overlays event, route, pollution, military, movement, biodiversity booleans gated by earthSimDeferredDataReady.
22485: SunEarthImpactLayer gated by earthSimDeferredDataReady.
```

Current delay logic was seen as:

```tsx
const delayMs =
  earthSimViewportPerfClass === "phone" ? 55_000 :
  earthSimViewportPerfClass === "tablet" ? 45_000 :
  35_000;
```

This exactly explains the user's screenshots: the map looks empty at refresh and then data appears about 30 seconds later.

## Immediate Fix Required

The next agent should not add more data until the first-paint gates are fixed.

### Required behavior

On first refresh, permanent and user-enabled data must paint immediately:

- Fungi-focused nature data.
- EcM layer.
- Permanent infrastructure.
- Power plants.
- Data centers.
- Batteries/BESS.
- Nuclear, solar, wind, gas, hydro, geothermal, storage, coal, oil, biomass, other plants.
- Substations.
- Transmission and sub-transmission lines.
- Sea/submarine cables.
- Buoys.
- AirNow/AQI sensors.
- Hospitals, libraries, fire, police, civic icons.
- Ports of entry and border data.
- Military perimeters as exact polygons.
- Events.
- Biodiversity hotspots.
- Live movers when filters are enabled.
- Eagle Eye six preview slots for current viewport cameras.

### Patch direction

Do not just keep hiding data. Split the concept into:

- `firstPaintDataReady`: should be true almost immediately for permanent layers and user-enabled data.
- `heavyEffectsReady`: can remain delayed for expensive animation, particles, video prewarm, nonessential decoration, or global offscreen work.

If a quick minimal patch is needed first:

1. Reduce `earthSimDeferredDataReady` delay from 35/45/55 seconds to roughly 0.5 to 2 seconds.
2. Remove `earthSimDeferredDataReady` from live movers.
3. Remove `earthSimDeferredDataReady` from V3 event and biodiversity booleans.
4. Remove `earthSimDeferredDataReady` from infrastructure and stats readiness paths that are supposed to show first paint.
5. Keep viewport/LOD culling. Do not render offscreen features forever.

Suggested minimal delay:

```tsx
const delayMs =
  earthSimViewportPerfClass === "phone" ? 2_500 :
  earthSimViewportPerfClass === "tablet" ? 1_750 :
  750;
```

Better production-quality fix:

```tsx
const earthSimFirstPaintDataReady = !isEarthSimulatorRoute || !auditAllOffMode && !assetIsolationMode;
const earthSimHeavyEffectsReady = !isEarthSimulatorRoute || earthSimDeferredDataReady;
```

Then route each consumer correctly:

- First-paint data uses `earthSimFirstPaintDataReady`.
- Heavy video/effects/particle-only work uses `earthSimHeavyEffectsReady`.

## Live Movers Are Currently Blocked

Symptom:

- User enabled all vessel and plane filters.
- Top bar still showed `Planes: 0`, `Boats: 0`, `Sats: 0`.
- No live movers painted.

Cause:

`app/dashboard/crep/CREPDashboardClient.tsx` line around `9364`:

```tsx
if (isEarthSimulatorRoute && !earthSimDeferredDataReady) return;
```

This blocks the independent live entity pump at startup. Server logs showed aircraft route activity earlier, so the client side gate is a strong suspect.

Required fix:

- Remove this gate from the live entity pump.
- Keep existing `document.hidden`, `auditAllOffMode`, `assetIsolationMode`, layer-enabled, and in-flight guards.
- Dispatch/verify `crep:mover-pump-request` when filters are toggled on.

QA:

```js
window.dispatchEvent(new Event("crep:mover-pump-request"))
```

Then verify after a few seconds:

- `Planes` count nonzero when aviation filter is on.
- Vessels/boats nonzero when vessel filters are on and source has results.
- No UI freeze while the pump fetches.

## Biodiversity Hotspots Are Hidden At Broad Zoom

File:

- `components/crep/layers/v3-overlays.tsx`

Current line:

```text
373: const BIODIVERSITY_HOTSPOT_MIN_ZOOM = 5
```

Layer visibility:

```text
1020: flip("crep-biodiversity-heat", !!enabled.biodiversity && zoom >= BIODIVERSITY_HOTSPOT_MIN_ZOOM)
1223: if (zoom < BIODIVERSITY_HOTSPOT_MIN_ZOOM) ...
```

This explains why the Biodiversity Hotspots button is on at US flyover zoom but no hotspot layer is visible.

Required fix:

- Lower `BIODIVERSITY_HOTSPOT_MIN_ZOOM` to `3` or introduce a broad-zoom aggregated hotspot source.
- User expects broad flyover visibility at roughly z3 and local enrichment as zoom increases.

QA:

- At US flyover z3, Biodiversity Hotspots button on should visibly render a hotspot/heat layer.
- At San Diego/LA zoom, hotspots should refine and not erase fungi.

## V3Overlays Event/Biodiversity Gates

File:

- `app/dashboard/crep/CREPDashboardClient.tsx`

Current V3 overlays are mounted only when:

```tsx
(!isEarthSimulatorRoute || viewportDataPrefetchReady)
```

Inside that, many layer flags are gated by:

```tsx
(!isEarthSimulatorRoute || earthSimDeferredDataReady)
```

Examples:

```tsx
earthquakes
volcanoes
wildfires
storms
floods
lightning
tornadoes
biodiversity
aviationRoutes
shipRoutes
fishing
containers
vehicles
drones
oilGas
militaryAir
militaryNavy
```

Required fix:

- Events and biodiversity must not wait 35 seconds.
- Live route overlays that the user manually enabled should not wait 35 seconds.
- Infrastructure/power-related overlays should not wait 35 seconds.
- Keep request throttling and viewport bounding, but do not hide enabled layers on first paint.

## Infrastructure Is Not Production-Ready

User expectation:

Earth Simulator should show OpenGridWorks-level infrastructure at first refresh and viewport flyover:

- Global power plants.
- Data centers.
- Internet exchanges where available.
- High-voltage and lower-voltage transmission.
- Sub-transmission.
- Substations.
- Batteries/BESS.
- Nuclear, solar, wind, offshore wind, gas, hydro, pumped storage, geothermal, biomass, oil, coal, other.
- Proper shapes and sizes by capacity.
- Clean level-of-detail behavior.
- Canada, Mexico, Tijuana, and the rest of the planet, not only United States.
- Viewport statistics in the MYCA panel and the INFRA tab while moving.

Current observed app behavior:

- At first refresh, power infrastructure is often missing or very sparse.
- Some lines show, but power/data-center icons do not match expected density.
- Infra tab can show `0 plants | 0 GW`.
- Submarine cable count may show, while plants/substations/lines show zero.
- Tijuana/Mexico/Canada are missing or underpainted.
- San Diego/Chula Vista still lacks many smaller lines, power stations, substations, data centers, and detailed grid styling.

Files to inspect:

- `components/crep/layers/eia-im3-overlays.tsx`
- `components/crep/panels/infrastructure-stats-panel.tsx`
- `lib/crep/static-infra-loader.ts`
- `lib/crep/metro-infra-layer-bridge.ts`
- `app/api/crep/infra/*`
- `app/dashboard/crep/CREPDashboardClient.tsx`
- `components/crep/layers/power-plant-bubbles.tsx`
- `components/crep/layers/datacenter-diamonds.tsx`

Potential gating suspects:

- `EARTH_PROJECT_DETAIL_DELAY_MS`
- `EARTH_SIM_ASSET_READY_DELAY_MS`
- `EARTH_SIM_INFRA_READY_DELAY_MS`
- `earthSimDesktopOverlayBudget`
- `earthOverlayAssetsReady`
- `proposalOverlayAssetsReady`
- `liveAuxiliaryLayersReady`
- Any US-only bounding/seed fallback in `static-infra-loader` or bridge code.

Important current diff clues:

`app/dashboard/crep/CREPDashboardClient.tsx` has been changed to:

```tsx
const EARTH_PROJECT_DETAIL_DELAY_MS = 1_500;
const EARTH_SIM_INFRA_READY_DELAY_MS = 750;
```

But:

```tsx
const EARTH_SIM_ASSET_READY_DELAY_MS = 25_000;
```

still exists and may still be delaying assets. Audit every downstream gate.

Required fix:

- Permanent infra should be available on first paint at z3-z5.
- The rendering cap should be viewport/LOD based, not country based.
- Mexico and Canada must not be filtered out.
- INFRA tab counts must derive from the current viewport rendered/loaded infra, not a stale/empty collection.
- MYCA analysis must report infra stats as the map moves.

QA:

At US/North America flyover:

- Power plant/data center symbols visibly present across US, Canada, Mexico, Caribbean where data exists.
- INFRA tab count nonzero.
- Plant/GW stats nonzero.
- Substations and tx lines nonzero.

At San Diego/Tijuana:

- Local power stations, BESS, substations, sub-transmission, data centers, ports of entry, border infrastructure visible.
- Tijuana side has infrastructure, not just US Caltrans cameras.

## Species/Nature Data Problems

Current user expectation:

- At startup broad view, fungi-focused data should show across the country, not only San Diego/LA.
- On zoom into San Diego, fungi density should increase, not collapse.
- All-species mode must never suppress fungi.
- Fungal data should be maximum at local zoom.
- Species should load for every major city and viewport, then scale by LOD.

Current observed behavior:

- At refresh, only low counts and sparse species.
- After delay, nature data appears in some areas.
- San Diego/LA historically had good density, but now San Diego local zoom can look sparse.
- The user saw mostly non-fungi when all species were on and almost no fungi, which is unacceptable.

Files:

- `app/dashboard/crep/CREPDashboardClient.tsx`
- `lib/crep/earth-simulator-boot.ts`
- `/api/mindex/proxy/species` through `app/api/mindex/proxy/[source]/route.ts`
- MINDEX data pipeline is being worked on by Cursor, but frontend must handle real data and empty categories gracefully.

Current diff clue:

`CREPDashboardClient.tsx` has new helper functions:

- `extractMindexSpeciesRows`
- `normalizeSpeciesRowToFungalObservation`

It also has sampling changes intended to protect a minimum fungi share when multiple species buckets are active.

Required fix:

- Do not rely on delayed fallback to reveal species.
- Remove/soften nature fetch gates tied to `earthSimDeferredDataReady` where they hide first paint.
- Keep viewport fetch bounded and abortable.
- Keep first load fungi-only as requested.
- Ensure zooming triggers immediate viewport species refresh.
- Make iNat/GBIF/MINDEX failures non-blocking.
- If live upstream rate-limits, use last-known/cached real data, not mock data.

QA:

- z3 US view shows fungi-focused records broadly.
- z10 San Diego quickly shows dense fungi.
- z10 LA/Las Vegas/SF/NYC should also show records if data exists.
- Fungi button on should not be visually drowned out by other species.

## Device Telemetry Is Not Fixed

Current user expectation:

- Three physical devices have not changed and should show on/connected if live.
- If offline/stale, icons should visibly show offline status, previously red.
- Telemetry widgets should show live/last-seen honestly.

Current issue:

- Devices appear off at reset.
- Live telemetry missing for Mushroom One, Hyphae One, and Psathyrella.
- MQTT/MINDEX/device routes need backend audit.

Existing backend handoff:

```text
docs/codex-handoffs/EARTH_SIMULATOR_DEVICE_BACKEND_CURSOR_HANDOFF_JUN12_2026.md
```

Important current diff concern:

`CREPDashboardClient.tsx` currently shows seed device status changes from `connected` to `offline` for:

- Mushroom 1
- Hyphae 1
- Psathyrella Aquatic MycoBrain Buoy

This conflicts with the user's expectation if these are default seed states before live telemetry resolves.

Required fix:

- Do not default the physical devices to offline unless telemetry confirms stale/offline.
- Use `connected`/last-known at reset, then downgrade to red/offline only when backend proves stale.
- Backend must confirm MQTT/MINDEX route status.
- Frontend should never block controls while telemetry is loading.

QA:

- Device icons visible immediately.
- Correct connected/offline color.
- Widget opens.
- Telemetry/last-seen renders.
- No freeze after device icon pulse.

## Camera And Eagle Eye Problems

Current user expectation:

- Eagle Eye opens six live players based on current viewport.
- Thumbnails are live videos, not static images.
- Full camera player should open quickly and play real advancing video.
- If provider/backend says unavailable, icon should visually indicate that before click.
- Unavailable camera should never freeze controls.
- Do not remove cameras to avoid fixing them.

Current observed issues:

- Eagle Eye sometimes empty.
- In one QA pass, only three `<video>` elements mounted, not six.
- Hotel Del thumbnail advanced live, but full player still broke for user.
- Tijuana/San Ysidro camera click froze controls.
- Caltrans cameras show temporary unavailable too often.
- Caltrans SR75 at Palm Avenue/Imperial Beach appears misplaced; user expected SR75 Strand/Coronado area.
- Fremont/Skyline/NVDOT/EarthCam/YouTube/Surfline sources have unresolved reliability/location gaps.

Files:

- `components/crep/eagle-eye/EagleEyeThumbnailGrid.tsx`
- `components/crep/eagle-eye/VideoWallWidget.tsx`
- `components/crep/eagle-eye/eagle-live-stream.tsx`
- `components/crep/layers/eagle-eye-overlay.tsx`
- `lib/crep/use-viewport-eagle-prefetch.ts`
- `lib/crep/eagle-viewport-sources.ts`
- `lib/crep/eagle-camera-normalize.ts`
- `lib/crep/eagle-camera-map-icon.ts`
- `lib/crep/caltrans-hls-resolve.ts`
- `app/api/eagle/sources/route.ts`
- `app/api/eagle/stream/[sourceId]/route.ts`
- `app/api/eagle/hls-proxy/route.ts`
- `app/api/eagle/cam-image/route.ts`
- `app/api/eagle/cam-snapshot/route.ts`
- `app/api/eagle/connectors/public-webcams/route.ts`
- `app/api/eagle/connectors/state-dot-cctv/route.ts`
- `app/api/oei/cctv/route.ts`

Required fix:

- Restore six viewport live previews.
- Keep preview players lightweight but live.
- Full player must share the same working stream resolver path as preview where possible.
- Provider failures should be converted to a status, not repeated UI freeze or broken image loops.
- Camera health should be efficient and backend-informed.
- Camera icons should visually show bad feeds, for example red blink/offline badge, without hammering providers.
- Validate coordinates for camera seeds, especially Caltrans SR75 and border cameras.

QA:

For each camera class:

- Preview has `<video>`.
- `currentTime` advances over 2-5 seconds.
- Full widget opens.
- Full widget `currentTime` advances.
- Close button works.
- Map controls remain clickable.
- Broken/unavailable state is shown without retry storm.

Provider classes to audit:

- Caltrans
- EarthCam
- HDOnTap
- Skyline
- YouTube live
- NYCTMC/NYS DOT
- NVDOT
- HPWREN
- Surfline
- Windy/border cameras
- Public webcams seed sources

## Control Freezing

Current behavior:

- Map can sometimes still move, but controls, hover cards, MYCA analysis, camera thumbnails, close buttons, and marker clicks stop responding.
- Freezes correlate with data painting and camera rendering.

Likely causes:

- Delayed data gates cause a large burst after 35 seconds.
- Live video previews/full players may mount too much work at once.
- Marker hover/click handlers may be blocked by overlay z-index or pointer capture.
- Repeated fetch retries or provider errors may be hammering the main thread.
- V3 overlays and infra painting may be too synchronous.
- Some right-panel/content gates remount large trees.

Do not solve this by hiding data.

Required approach:

1. Remove 35-second paint bursts.
2. Let first-paint data render in smaller viewport-bounded batches.
3. Keep event handlers always mounted and responsive.
4. Defer only nonessential animation/effects, not data presence.
5. Use requestIdleCallback/requestAnimationFrame/chunking for large marker/source updates.
6. Ensure video preview mounting is capped to six, not unbounded.
7. Ensure offscreen viewport data is released/removed from map sources.

QA:

- Fresh reload.
- Wait 5 seconds, 30 seconds, 2 minutes.
- Pan and zoom.
- Click layer toggles.
- Click markers.
- Hover markers.
- Open/close camera widget.
- Open/close right panel.
- Switch Nature/Infra/Events/Devices tabs.
- No frozen controls.

## Right Panel / Map-Globe Buttons

Earlier user reported:

- Right side panel not showing.
- Map/globe buttons not working.

Potential relevant gate:

```tsx
const shouldMountRightPanelContent = !isEarthSimulatorRoute || rightPanelOpen;
```

and:

```tsx
shouldMountRightPanelContent && (!isEarthSimulatorRoute || earthSimDeferredDataReady || rightPanelOpen)
```

Required fix:

- Control shells should never depend on delayed data readiness.
- Right panel tabs/buttons must always be clickable.
- Content can show loading/unavailable states, but controls must not disappear or freeze.

## Military Bases And Civic Icons

Earlier user reported:

- Military bases were rendering as ovals/circles instead of exact perimeters.
- Libraries, police, fire, hospitals should use actual icons, not generic colored dots.
- San Ysidro/Tijuana POE data, pedestrian crossing data, International Boundary water transfer flow rates, and border camera data were missing.

Required fix:

- Military bases must render exact polygons/perimeters.
- Civic markers must use intended sprite/icons.
- POE/border widgets and flow rates must come back.
- Data should paint on both US and Mexico sides.

Likely files:

- `components/crep/layers/sdtj-coverage-layer.tsx`
- `components/crep/layers/tijuana-estuary-layer.tsx`
- `components/crep/layers/project-nyc-dc-layer.tsx`
- `components/crep/layers/proposal-overlays.tsx`
- `components/crep/layers/mojave-preserve-layer.tsx`
- `components/crep/panels/MycaViewportPanel.tsx`
- civic/viewport prefetch hooks.

## Satellite Imagery

Earlier user reported satellite imagery turning off during zoom changes.

Required fix:

- Do not gate base imagery by data readiness.
- Satellite/topology/bathymetry should survive zoom.
- Layer toggles should not reset base imagery.

QA:

- Reload.
- Zoom from z3 to z12 and back.
- Satellite imagery remains visible and does not flicker off.

## Terminal Noise / Dev Churn

Known logs observed earlier:

- `luma.gl: This version of luma.gl has already been initialized`
- Fungal quick MINDEX viewport fetch soft timeout after 3500ms.
- iNat `429` responses.
- Fast Refresh full reload messages after edits.
- Slow first compiles for PMTiles and API routes.

Required fix:

- Remove retry storms and repeated noisy console logs from normal runtime.
- Keep provider failures summarized.
- Dev logs should not trigger continuous Fast Refresh churn.
- Do not hide real errors; downgrade expected upstream failures into structured status.

## Suggested Immediate Patch Order

1. Patch first-paint readiness.
   - Reduce or split `earthSimDeferredDataReady`.
   - Remove it from live movers, events, biodiversity, infra stats, and permanent data.

2. Patch Biodiversity Hotspots broad zoom.
   - `BIODIVERSITY_HOTSPOT_MIN_ZOOM = 3`.

3. Patch live movers.
   - Remove startup defer gate.
   - Confirm manual filter toggles dispatch pump request and update top bar.

4. Patch infrastructure readiness/stats.
   - Ensure power plants, data centers, substations, tx/subtx lines, and stats load at first paint.
   - Ensure global viewport behavior, not US-only.

5. Patch device default status.
   - Do not default all three physical devices to offline.
   - Show stale/offline only after real telemetry status.

6. Patch Eagle Eye six previews.
   - Restore six live video previews.
   - Make full player use same working stream where preview works.
   - Prevent click/freeze.

7. Camera coordinate/provider audit.
   - Fix SR75/Caltrans misplaced camera.
   - Audit unavailable provider paths.
   - Add icon health indicator.

8. Control freeze QA.
   - Soak test 2 minutes after load.
   - Test hover, click, close, panel tabs, map/globe buttons, filters.

## Browser QA Checklist

Use the in-app browser on local `3010`.

Do not use route reachability as proof.

### First refresh, US/North America z3

Expected within 5 seconds:

- Fungi-focused records visible.
- EcM layer visible.
- Events count nonzero if active events exist.
- Biodiversity Hotspots visible if toggle on.
- Power plants/data centers/substations/transmission lines visible.
- Canada and Mexico show infrastructure where data exists.
- Buoys and air sensors start populating.
- INFRA tab stats nonzero.
- No controls frozen.

### San Diego z10-z12

Expected:

- Dense fungi local data.
- Power stations, BESS, substations, tx/subtx lines, data centers.
- POE/border data.
- Civic icons.
- Military exact polygons.
- Eagle Eye six live previews.
- Camera click opens player without freeze.

### Tijuana/San Ysidro

Expected:

- Mexico-side cameras and infrastructure visible.
- POE/border widgets.
- Flow/sensor data if available.
- Tijuana/San Ysidro camera click does not freeze.

### LA, Las Vegas, SF, NYC

Expected:

- Species/fungi presence at viewport.
- Local civic/infra/cameras where sources exist.
- No San Diego-only special behavior.

### Interaction soak

Run for at least 2 minutes:

- Pan.
- Zoom.
- Hover.
- Click markers.
- Toggle filters.
- Open/close right panel.
- Switch Intel Feed tabs.
- Open/close camera widget.
- Confirm no frozen controls.

## Production Deployment Status

Do not deploy yet.

Current blockers:

- First-paint data gates still hide required data.
- Infrastructure not visually/statistically at OpenGridWorks-level.
- Planes/vessels not proven.
- Biodiversity hotspot broad visibility not fixed.
- Control freeze still reproducible by user.
- Eagle Eye six live previews not restored/proven.
- Full camera player not proven across providers.
- Device telemetry not fixed.
- Camera coordinates/provider health not audited.

## Paste-Ready Continuation Prompt

```text
Continue Earth Simulator only in D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website. Read docs/codex-handoffs/EARTH_SIMULATOR_PRODUCTION_MAP_FIX_HANDOFF_JUN12_2026.md first. Do not deploy. Do not touch/kill 3004. Use local 3010 and the in-app browser for QA. The immediate priority is to remove first-paint data gates that hide required layers: earthSimDeferredDataReady currently delays events, biodiversity, live movers, nature fetches, infra readiness, and V3 overlays by 35-55 seconds. Data must be present on load; optimize latency afterward with viewport/LOD culling, not by hiding data. Preserve fungi-only first-load species focus with EcM on and AM off. Restore infra/power/data-center/stats first paint like OpenGridWorks globally, including Mexico/Canada/Tijuana. Restore planes/vessels when filters are on. Restore Biodiversity Hotspots at broad zoom. Fix controls freezing. Restore Eagle Eye six live video previews and full camera player reliability. Verify with tsc and real in-app browser QA before any deployment.
```
