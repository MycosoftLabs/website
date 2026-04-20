# CREP Work Log — April 19, 2026

Single-day session covering the CREP dashboard's v2/v3 buildout,
production regressions, OpenGridWorks-parity infrastructure, and
Mycosoft-device filter integration. Morgan-driven, full commit trail.

## Session context

Started from Morgan's report that the CREP map at `mycosoft.com/
dashboard/crep` was "missing lots of v2/v3 stuff" and layers weren't
rendering. Live Chrome inspection (both prod + localhost:3010)
revealed multiple compounding bugs that all had to land in order
before individual layers could be built. Ended with:

- 4 critical rendering bugs diagnosed + fixed
- 2 new ETL pipelines (transmission full + data-centers global)
- 28 previously-orphan layer toggles wired end-to-end
- 6 Mycosoft device filters wired to existing per-type widgets
- Comprehensive audit of every layer in the registry
- Session now paused on Morgan's greenlight for the final prod push

---

## Critical bugs found + fixed

### 1. `fa456dac` — MapLibre invalid paint expression → cell-tower layer silently rejected

Paint spec had **two zoom-based interpolates nested inside a `case`**:

```js
// INVALID — MapLibre rejects whole layer
"circle-radius": [
  "case",
  ["boolean", ["feature-state", "hover"], false],
  ["interpolate", ["linear"], ["zoom"], ...],
  ["interpolate", ["linear"], ["zoom"], ...],
]
```

MapLibre's validator requires **one** zoom interpolate per expression.
Layer registration silently failed. Cell towers never painted.

**Fix**: `interpolate` at top level with feature-state `case` inside
each stop value. Applied to both `crep-celltowers-global-circle` + legacy
`crep-celltowers-circle`.

### 2. `19d2bfd6` — Aircraft/vessel/satellite positions all pinned at `[0, 0]`

`/api/oei/flightradar24` and `aisstream` return entities with **flat
top-level `lat` + `lng`**, not nested under `location`. The deckEntities
useMemo + lastKnownRef sync looked only at:

```js
entity.location.longitude ?? entity.location.coordinates?.[0] ?? 0
```

Every extraction fell through to `?? 0`, pinning 2000+ planes + 50k+
vessels + 1500+ satellites at null-island off West Africa.

**Fix**: 3 extraction sites (deckEntities, aircraft sync, vessel sync,
satellite sync) now prefer `entity.lat`/`entity.lng` before falling
back to nested schemas.

### 3. `(local)` — Carto basemap 503 → `load` event never fires → no CREP layers

Carto's `basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json`
returns **HTTP 503 on first request ~25% of the time**, succeeds on
retry. MapLibre retries the style fetch automatically but the `load`
event already fired (or didn't fire cleanly) on the aborted first
attempt. Result: `onLoad` callback never executes → no `crep-*` layers
added → everything downstream is empty even though data pumps run.

**Fix**: `components/ui/map.tsx` now polls `map.areTilesLoaded()` +
style layer count every 500 ms; when basemap is ready (>=40 layers +
tiles loaded), fires `onLoad` manually with an idempotent guard.

### 4. `(local)` — Stale-closure widgets: clicks never opened for boats/planes/sats

`MapComponent.onLoad` callback captured `filteredAircraft` /
`filteredVessels` / `filteredSatellites` in a closure **at the moment
the map loaded** — when all three arrays were still empty. Click handler's
`.find(...)` against the empty array always returned undefined; widget
lookup never matched → no side-panel opened on click. Morgan: "boats
finally visible but no widgets working for them".

**Fix**: new useEffect syncs each array to `window.__crep_aircraft` /
`__crep_vessels` / `__crep_satellites` on every state change; click
handlers now read from `window.*` refs instead of closure captures.

---

## New data pipelines (ETL scripts + workflows)

### Cell towers (shipped earlier this week, baseline for this session)

Already landing when the session started. Baseline = 41 MB PMTiles of
615k Taiwan + US cell towers. Render path stable.

### Full US transmission lines — ALL voltages

Morgan: "in san diego there is massive missing infra powerlines you
missed all the smaller transmission lines like suncres and jamacha".

Existing `transmission-lines-us-major.geojson` was HIFLD ≥345 kV only
(22,760 segments). San Diego had **22 lines total, all ≥500 kV** — local
69/115/138/230 kV feeders (Jamacha, Miguel, South Bay tie lines) were
absent.

Shipped:
- `scripts/etl/crep/fetch-transmission-full.mjs` — HIFLD FeatureServer
  (5 candidate URLs) + OSM `power=line` (20° bbox shards, 3 Overpass
  endpoint fallbacks) + MINDEX `power_grid` layer. Streams output to
  `public/data/crep/transmission-lines-us-full.geojson`.
- `scripts/etl/crep/gen-transmission-pmtiles.sh` — tippecanoe with
  drop-densest + coalesce + shared-border dedup.
- `INFRA_LAYERS.transmissionFull` registry entry.
- New render layer `crep-txlines-full-line` — voltage-graduated color
  (grey<100 kV → orange 100-230 → pink 230-345 → blue 345-500 →
  cyan ≥500 kV → white ≥765 kV) with zoom-scaled width.
- Layer toggle `txLinesFull` (enabled by default).

Status: code in place, awaiting tile generation. Cursor is running
the ETL in parallel.

### Global data centers

Morgan: "square glowing data centers seen on opengridworks needs to
be added to crep in full globally".

Existing static bundle had 44 hyperscale DCs. Target: ~5-7k globally.

Shipped:
- `scripts/etl/crep/fetch-datacenters-global.mjs` — OSM Overpass
  (`man_made=data_center` + `telecom=data_center`, 30° tile shards) +
  PeeringDB Facilities (`/api/fac?limit=5000`, no key needed) + MINDEX
  `data_centers` layer. Dedupes at 11 m grid; rank prefers PeeringDB
  (richest fields) > OSM > MINDEX.
- `scripts/etl/crep/gen-datacenter-pmtiles.sh` — cluster-maxzoom 9.
- `INFRA_LAYERS.dataCentersGlobal` registry entry.
- New render layers `crep-dcs-global-glow` (blurred violet halo) +
  `crep-dcs-global-dot` (core dot with white ring) — OpenGridWorks
  glowing-square aesthetic.
- Click → `window.__crep_selectAsset` with device fields.
- Layer toggle `dataCentersG` (enabled by default).

Status: Cursor confirmed data-centers PMTiles built (~3 MB).

### Railway live trains

Morgan: "no live rail data widgets for movement of trains or trollyes".

Amtrak's public JSON feed now **AES-encrypted** (anti-scraping). Direct
requests return ciphertext.

Shipped:
- `/api/oei/railway-live` proxy swapped to **`api-v3.amtraker.com/v3/
  trains`** (community aggregator that decrypts Amtrak) + **MBTA
  GTFS-RT** (`cdn.mbta.com/realtime/VehiclePositions.json`, free, no key,
  Boston Green Line trolleys / subway / commuter).
- Response normalized to unified `{id, trainNum, name, operator, lat,
  lng, heading, speed, state, status, timestamp}` shape.
- Rose-colored square dots on the map (visually distinct from aircraft
  amber / vessel teal / cell tower neon green).
- Click → `__crep_selectAsset` with operator + speed + heading.
- Poll every 30 s when toggle enabled.

Status: shipped to prod (`b9da33cb` → `e4b1ff68` cache-bust → live).

### Mycosoft-devices filter set

Morgan: "Mushroom 1, Hyphae 1, Sporebase, MycoNode, Alarm & Psathyrella
(buoys) shown on map none are out there yet but filters must exists as
all have mycobrain inside".

Shipped:
- 6 new layer toggles in CREP registry (`devMushroom1`, `devHyphae1`,
  `sporebase` updated, `devMycoNode`, `devAlarm`, `devPsathyrella`).
- Unified `crep-mycosoft-devices` MapLibre source (empty until devices
  register).
- Per-type color-coded glow + core circle layers via `match` expression
  on `device_type` property.
- Click handler parses `device_type` from feature OR falls back to ID
  prefix regex (`mushroom1-*`, `hyphae1-*`, etc). Dispatches
  `window.__crep_openDeviceWidget(payload)` for the type-specific widget
  (existing components under `components/crep/devices/`) + fallback
  to `__crep_selectAsset` for generic panel.
- Data pump useEffect fetches `/api/crep/mycosoft-devices` every 30 s,
  filters features by enabled device_type set via `map.setFilter`.
- New API route `app/api/crep/mycosoft-devices/route.ts` proxies MINDEX
  `/api/mindex/proxy/devices`, infers device_type from ID prefix, returns
  `by_type` summary.

Status: local only (commit `3d85277c`); awaiting greenlight to push.

### V3Overlays component (28 orphan layers)

Morgan: "wire every single one up now fix all of that".

New `components/crep/layers/v3-overlays.tsx` mounts alongside
ProposalOverlays. Adds source + render layer + click handler for every
previously-orphan layer toggle:

- **Events** (poll 60 s from `/api/oei/{kind}`): earthquakes, volcanoes,
  wildfires, storms, lightning, tornadoes. Each a colored circle dot.
- **Facilities** (OSM Overpass bbox, zoom ≥ 5): hospitals, fireStations,
  universities.
- **Pollution** (OSM industrial tags, zoom ≥ 6): oilGas, methaneSources,
  metalOutput, waterPollution.
- **Heatmaps** (empty source, awaiting upstream): population,
  humanMovement, events_human, signalHeatmap.
- **Military sub-types** (derived live from `__crep_aircraft` /
  `__crep_vessels` every 30 s): militaryAir (callsign regex
  RCH/REACH/DUKE/AWACS/etc), militaryNavy (AIS operator navy/coast
  guard/USCG/USN), militaryDrones (callsign FORTE/RANGER/PREDATOR/
  REAPER/GLOBAL HAWK), tanks (empty — no dedicated source).
- **Transport sub-types** (empty, awaiting specific feeds): fishing,
  containers, vehicles, drones.
- **Trajectories** (empty line layers, awaiting trail emitter):
  aviationRoutes, shipRoutes.
- **Biodiversity** (GBIF occurrence search, zoom ≥ 3): biodiversity
  heatmap green → yellow → red.

Every toggle flip calls `setLayoutProperty("visibility", ...)` — no
layer stays dormant. Fail-isolated: unreachable upstream = empty source,
but the layer is still in the style and toggle works.

---

## New GH Actions workflows

### `.github/workflows/gen-cell-tower-tiles.yml`
Runs weekly Sunday 06:00 UTC (manual dispatch available). Ubuntu
runner + apt-installed tippecanoe + go-pmtiles. Uses `OPENCELLID_KEY`
secret. Opens PR with refreshed `cell-towers-global.{geojson,pmtiles}`.

### `.github/workflows/gen-infra-tiles.yml` (NEW today)
Runs monthly (1st of month 07:00 UTC) + workflow_dispatch. Same runner
setup. Runs transmission-full + data-centers-global ETLs. Opens PR with
all four artifacts (`transmission-lines-us-full.*`, `data-centers-global.*`).
Inputs: `include_transmission`, `include_datacenters`, `include_osm`
toggles.

---

## UX / polish fixes

### `00f6801d` — "N new events on map" toast removed

Morgan: "popup that says new events on map needs to never show up
again its useless make new events render live no notification of that
needed unless they are in viewport they can blink a few times when
first show up".

Deleted the amber toast above the map. `newEventIds` React state
preserved — it still drives the `isNew={newEventIds.has(event.id)}`
prop on event marker components (visual blink on first appearance
stays). The toast was redundant with the visual cue.

### `00f6801d` / `abe7f45e` — Bathymetry / Topography no-overlap + quality upgrade

Morgan: "bythemery cannot overlap land toplogy thats wrong" + "modify
those bathymetry topology to show the highest quality newest ones in
their respective areas".

- **Bathymetry**: swapped from GEBCO WMS (combined ocean+land relief)
  to two-tier **EMODnet 2024 primary + ESRI World Ocean Base fallback**.
  EMODnet gets 25 m resolution over Europe / North Atlantic / coastal;
  ESRI (built on GEBCO 2022) covers global. `raster-saturation 0.25`
  mutes land tones so the AWS hillshade dominates on land.
- **Topography**: kept AWS Terrain Tiles (Mapzen terrarium, 30 m global
  DEM). State-of-the-art free open source. Updated comment notes
  Copernicus GLO-30 + MapTiler Terrain-RGB as key-required upgrade paths.

### `ac155dc8` — GIBS imagery flash fix

Morgan: "all satellite images are blinking on and off all eonet viirs
modis landsat airs all blinking".

`GibsBaseLayers` useEffect dep array contained an object literal
(`enabledLayers: { modis, viirs, landsat, airs }`) that re-referenced
every parent render. Effect re-fired → cleanup function removed every
GIBS layer → body re-added them → repeat many times/second. Fixed by
destructuring into primitive flags and listing those as deps; removed
the sledgehammer "remove all layers" cleanup from the main effect —
true unmount cleanup is now a separate useEffect keyed on `map`.
Same pattern applied to `CrepGibsEoOverlays`.

### Hardcoded Satellite Imagery (HD)

Morgan: "need google earth maps level high detail images of the zoomed
in satelite iamges as live as possible for all map".

Added `satImagery` layer toggle (off by default) + render path using
**ESRI World Imagery** (`services.arcgisonline.com/arcgis/rest/services/
World_Imagery/MapServer/tile/{z}/{y}/{x}`). Free, no key, z0-19
coverage. Placed above basemap but below all point markers. Switches
on via "Satellite Imagery (HD)" in Environment category.

---

## API endpoints added / changed

| Endpoint | Status | Purpose |
|---|---|---|
| `/api/crep/tiles/[...tile]` | shipped earlier | fs-streaming fallback for PMTiles that Next.js's default static handler failed on (41 MB cell-towers-global.pmtiles). Supports HTTP Range. |
| `/api/oei/railway-live` | shipped today | Amtraker (decrypted Amtrak) + MBTA GTFS-RT |
| `/api/oei/drone-no-fly` | shipped today (empty) | OpenAIP (needs key) + FAA UAS (URLs 400, pending) + MINDEX |
| `/api/crep/mycosoft-devices` | shipped today | MINDEX proxy with device-type inference |

---

## Layer registry — final state

| Category | Layers (*) | Render |
|---|---|---|
| environment | fungi, biodiversity, weather, buoys, bathymetry, topography, satImagery, earth2* (6) | partially |
| devices | mycobrain, devMushroom1, devHyphae1, sporebase, devMycoNode, devAlarm, devPsathyrella, partners, smartfence | via `crep-mycosoft-devices` |
| events | earthquakes, volcanoes, wildfires, storms, solar, lightning, tornadoes, auroraOverlay, sunEarthImpact | via V3Overlays + AuroraOverlay + SunEarthImpactLayer |
| infrastructure | aviation, aviationRoutes, ships, shipRoutes, fishing, containers, vehicles, drones, satellites, ports, radar, railwayTracks, railwayTrains, droneNoFly, orbitalDebris, debrisCloud | aircraft/vessels/sats via live pump; others via ProposalOverlays + V3Overlays |
| military | militaryBases, militaryAir, militaryNavy, tanks, militaryDrones | militaryBases via live pump; sub-types via V3Overlays (derived) |
| pollution | factories, methaneSources, oilGas, powerPlants, metalOutput, waterPollution, powerPlantsG, factoriesG, txLinesGlobal, txLinesFull | static bundle + V3Overlays + ProposalOverlays |
| telecom | submarineCables, dataCenters, cellTowers, radioStations, signalHeatmap, cellTowersG, dataCentersG | static bundle + PMTiles + ProposalOverlays + V3Overlays |
| facilities | hospitals, fireStations, universities | V3Overlays (OSM) |
| human | population, humanMovement, events_human | V3Overlays (heatmap, empty) |

(*) Total = 65+ toggles; 100% have a rendering path in the style now.
Previously-orphan toggles pre-session: 28. Now: 0.

---

## Commits by sha (today)

Local main progression (starting from `325d9351`):

| sha | what |
|---|---|
| `6538c814` | cell-tower dot radius floor 0.8 → 2 px (retina visibility) |
| `fa456dac` | **cell-tower paint expression valid (nested zoom-interpolate fix)** |
| `19d2bfd6` | **aircraft/vessel/satellite null-island fix (flat lat/lng extraction)** |
| `6e5c927d` | v3 batch — bathymetry / railway / live trains / drone-no-fly (cancelled, superseded) |
| `f2dcb1f8` | toggle on/off handlers for v3 layers (cancelled, superseded) |
| `fd190dcc` | land-topography split from bathymetry (AWS Terrain Tiles hillshade) |
| `ac155dc8` | **GIBS blink fix** + HD ESRI satellite + train click widget + drone-no-fly default-on |
| `e132358d` | cache-bust railway-live + drone-no-fly routes (first attempt) |
| `c0732390` | Dockerfile comment bump cache-bust (first attempt) |
| `64c237f3` | Amtrak + FAA upstream URL candidates |
| `b9da33cb` | **railway-live via Amtraker + MBTA GTFS-RT (working data)** |
| `e4b1ff68` | second Dockerfile cache-bust (routes finally deploy) |
| `28a493a4` | **transmission FULL ETL + data-centers global ETL + widget stale-closure fix** |
| `abe7f45e` | bathymetry ≠ topography overlap (switch to ESRI Ocean Base) |
| `00f6801d` | kill new-events toast + upgrade bathymetry to EMODnet 2024 primary |
| `3d85277c` | **Mycosoft device filters (6 types) + click → widget routing** |
| `7c35388e` | **V3Overlays — all 28 orphan layers wired** |

`7c35388e` is HEAD of local main. Not pushed to origin yet. `e4b1ff68`
is the last commit on origin/main (3 deploys behind).

---

## Files touched

### New
- `app/api/oei/railway-live/route.ts`
- `app/api/oei/drone-no-fly/route.ts`
- `app/api/crep/mycosoft-devices/route.ts`
- `app/api/crep/tiles/[...tile]/route.ts` (earlier today)
- `components/crep/layers/v3-overlays.tsx`
- `scripts/etl/crep/fetch-transmission-full.mjs`
- `scripts/etl/crep/gen-transmission-pmtiles.sh`
- `scripts/etl/crep/fetch-datacenters-global.mjs`
- `scripts/etl/crep/gen-datacenter-pmtiles.sh`
- `.github/workflows/gen-infra-tiles.yml`
- `docs/CREP_APR19_WORK_LOG.md` (this file)

### Modified
- `app/dashboard/crep/CREPDashboardClient.tsx` — load-race, stale-closure,
  new toggles, render blocks, V3Overlays mount, device pump
- `components/crep/layers/proposal-overlays.tsx` — bathymetry / topography
  / satImagery / railway / live trains / drone no-fly + toggle on/off
- `components/crep/layers/gibs-base-layers.tsx` — anti-blink fix
- `components/crep/earth2/gibs-eo-overlays.tsx` — anti-blink fix
- `components/ui/map.tsx` — 503 retry + onLoad fallback poller
- `lib/crep/static-infra-loader.ts` — transmissionFull + dataCentersGlobal
  registry entries
- `Dockerfile.production` — cache-bust comments

---

## Still pending (deferred by scope)

- **Drone no-fly zones upstream**: FAA ArcGIS URLs returning 400. Need
  current canonical endpoint OR set `OPENAIP_API_KEY` secret (free at
  openaip.net) for global airspace.
- **CCTV + webcams layer**: not yet built. Candidate sources: Insecam,
  EarthCam, Windy Webcams API.
- **Transmission full PMTiles**: Cursor generating. Pending PR + merge.
- **Data centers global PMTiles**: built by Cursor (~3 MB); pending PR.
- **West coast AIS coverage**: Morgan reports no vessels on west coast
  after null-island fix. Needs investigation (aisstream bbox / viewport
  / rate-limit).
- **Trajectory trails for aircraft/vessels**: empty line sources ready;
  needs emitter that writes LineStrings per tracked id from lastKnownRef.
- **Heatmap data sources**: population (Kontur or WorldPop), humanMovement
  (aggregated mobility), events_human (gatherings feed), signalHeatmap
  (cell-tower density pre-aggregated from PMTiles).
- **Tanks layer**: no dedicated OSM / open source; needs MINDEX.
- **Device-specific feeds**: fishing (Global Fishing Watch — API key
  needed), containers (AIS vessel_type filter), vehicles, drones
  (thedronemap.com — commercial, no public API).
- **Widget integration for non-InfraAsset types**: each V3Overlays click
  currently opens the generic InfraAsset panel. Per-layer specialized
  widgets (like the device widgets) are a later pass.

---

## Decisions + rationale

- **Hold prod pushes**: Morgan requested a pause mid-session after
  several rapid-fire deploys revealed Docker BuildKit cache issues.
  Current local main (`7c35388e`) has 6 commits ahead of origin that
  require his greenlight. Safe to push when he's done testing locally.
- **Don't decrypt Amtrak JSON ourselves**: reverse-engineering Amtrak's
  AES feed would add crypto complexity + maintenance (they rotate keys).
  `api-v3.amtraker.com` community aggregator handles it at zero cost.
- **MapComponent load-race poll is defensive, not a fix**: the real
  fix would be to forcibly retry the MapLibre style load on 503. This
  gets us to "works reliably" without patching MapLibre itself.
- **V3Overlays is monolithic** vs one-component-per-layer: at this
  density (28 layers), one component with a consistent add/visibility/
  fetch pattern is easier to maintain + debug than 28 separate files.
  Per-layer specialization can come later.

---

## How to verify locally

```powershell
cd C:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website
git log --oneline -10   # confirm local HEAD 7c35388e
npm run dev             # or `preview_start`; dev server on :3010
```

Open `http://localhost:3010/dashboard/crep` → hard reload → verify:

1. Map paints basemap + boundaries (no 503 blocker)
2. Counters at top populate (`Planes: 2000+`, `Boats: 50000+`)
3. Aircraft / vessel / satellite dots render at real positions
4. Clicking a plane/boat/sat opens the side panel widget
5. Right-panel toggles exist for every layer in the full list
6. Turning a toggle off/on makes the layer disappear/reappear
7. Console log: `[V3Overlays] sources + layers attached` (confirms
   orphan-layer wiring)
8. Mycosoft device filters visible under Devices category

For transmission-full / data-centers-global: trigger
`Gen Infra Tiles` workflow from Actions UI; merge the PR when it opens;
the two additional layers will auto-light-up on the next deploy.

---

_Generated Apr 19, 2026 — Claude Opus 4.7 (1M context)._
