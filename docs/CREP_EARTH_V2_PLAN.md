# CREP Earth v2 — Implementation Plan

**Branch:** `crep/earth-v2` (to be cut after prod stabilises + Option B lands)
**Status:** Planning · Apr 18, 2026 · **Rev 1.1** (rolled in ChatGPT architecture audit findings)
**Owner:** Morgan / Claude
**Scope:** Replace CREP's MapLibre + deck.gl transparent-globe with Cesium as the canonical 3D Earth engine. Fix satellite ingestion. Add real terrain, bathymetry, undersea, and volcano layers. Backend-proxy AIS. Unified layer registry. **Rev 1.1 additions:** STAC/COG/Zarr catalog, CelesTrak 2h cadence, browser compression/isolation stack, WebAssembly SIMD decoders.

---

## 1. Executive summary

The CREP dashboard currently renders a **transparent textured sphere with overlays stapled on top** using MapLibre's globe projection (`{ type: "globe" }`) + deck.gl MapboxOverlay for live entities. The brief is not to patch this — it's to replace the renderer.

**Three things change:**

1. **Cesium becomes the canonical 3D engine for CREP Earth.** The existing MapLibre stack stays for flat-mode 2D fallback + embedded widgets only.
2. **Layers are driven by a typed registry** (`lib/geo/layerRegistry.ts`), not scattered across 6,500 lines of `CREPDashboardClient.tsx`.
3. **Data ingest is fixed as a data problem.** Satellites = backend CelesTrak GROUP fanout with explicit loaded/filtered/rendered counts. AIS = backend WebSocket proxy with bbox subscription. Imagery = NASA GIBS WMTS. Terrain = Cesium World Bathymetry → World Terrain → self-hosted GEBCO/ETOPO (in that fallback order).

**What does not change:**
- The broader CREP product — top-bar, side panels, widgets, tracker popups, MINDEX integration, sun-earth correlation, MYCA/MINDEX data ingestion, iNat 300M backfill, everything downstream of the globe.
- Existing OEI routes stay. Layer registry pulls from the same endpoints.
- Existing 2D flat-mode for tablet operators who prefer it.

---

## 2. Non-negotiables (surface these in every PR review)

| | |
|---|---|
| **Opaque Earth in Real mode** | Globe must not be globally transparent in normal mode. Ever. |
| **Ocean is a real surface** | Rendered over bathymetry, not a fake transparent shell |
| **No fabricated submarine tracks** | Submarines = public/static/historical/reference layers only. No covert asset inference. No hidden military positions derived from nearby data. |
| **Satellite counts debuggable** | Must expose `loaded / deduped / propagated / rendered / filtered-by-viewport / filtered-by-altitude / hidden-by-clustering`. It must be impossible for the UI to silently cap at ~27 again. |
| **AIS backend-only** | aisstream.io `wss://stream.aisstream.io/v0/stream` expects server-side consumption. Never expose the API key to browser. Bbox subscription throttled server-side. |
| **No dead legacy globe code in prod path** | MapLibre globe-mode and the existing transparent sphere are removed, not parallel-wired behind a flag, once v2 is default. |
| **Source attribution intact** | Every layer carries its attribution string in the registry entry. |
| **Secrets server-side** | Cesium ion token, AIS API key, Space-Track creds — all in env, never shipped to browser. |

---

## 3. Current state audit (grounded in repo — Apr 18, 2026)

### 3.1 What's already there
- **Cesium dep installed**: `cesium@^1.115.0` in `package.json`
- **Cesium Workers + Widgets bundled**: `public/cesium/{Widgets,Workers}` (served via `next.config.*` copy pattern)
- **An existing Cesium component**: `components/earth-simulator/cesium-globe.tsx`
  - Uses `Cesium.Ion.defaultAccessToken = undefined` → no ion features
  - Used by the observation portal + fluid search widgets, not CREP dashboard
- **resium not installed** — we'll go raw Cesium via React hooks (avoids react-18-concurrent pitfalls)

### 3.2 What CREP currently uses (to be replaced)
- **MapLibre globe**: `MapComponent` with `projection={projectionMode === "globe" ? { type: "globe" } : { type: "mercator" }}` at `app/dashboard/crep/CREPDashboardClient.tsx:4815`
- **deck.gl overlay**: `ScatterplotLayer`, `PathLayer`, `IconLayer` via `MapboxOverlay` pattern for live entities (aircraft, vessels, satellites)
- **Three.js**: `components/earth-simulator/*` — currently a separate experience, not CREP
- **Transparent-globe source**: the MapLibre globe projection over the carto basemap style gives the see-through look when paired with semi-transparent overlays

### 3.3 Known current bugs surfaced by the brief

| Symptom | Root-cause candidate | Phase that fixes it |
|---|---|---|
| "Only 27 satellites visible" | Legacy TLE parsing in `lib/crep/registries/satellite-registry.ts` uses `gp.php?GROUP=active&FORMAT=tle` which maxes at text-format parsing; the `filteredSatellites` memo in `CREPDashboardClient.tsx` clamps at zoom<2 | Phase 5 |
| Transparent globe looks "glassy" | MapLibre globe projection is not physically-based; `raster-opacity` on basemap + overlay blending compounds | Phase 2 |
| No bathymetry | No terrain provider wired anywhere | Phase 3 |
| Undersea features / volcanoes missing | No dataset ingested | Phase 7 |
| AIS direct in browser | `components/crep/vessel-tracker-widget.tsx` fetches `/api/oei/aisstream` which in turn uses an internal WebSocket proxy — this is OK. But the live CREP layer uses the direct fetch path with no viewport scoping, firehose-style. | Phase 6 |

### 3.4 What must keep working
- Top-bar entity counters (Planes, Boats, Sats, Nature)
- Left panel (Nature Data / Infra / Events)
- Right panel (Mission Control, Live Tracking, Stats)
- All tracker widgets (flight, vessel, satellite trackers with SVG sprites)
- MYCA/MINDEX integration + ingestion writes
- Sun↔Earth correlation layer (already modular, wired via `components/crep/layers/sun-earth-impact-layer.tsx`)
- iNaturalist nature observations with GBIF enrichment
- Military base perimeters + public reference data
- Submarine cable whole-line selection (`lib/crep/infra-highlight.ts` — stays as-is, retargeted at Cesium entities)

---

## 4. Target architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│  CREPDashboardClient.tsx (trimmed: delegates engine to <CesiumEarth/>)│
│  ├─ Top bar / counters                                                │
│  ├─ Left panel (nature/infra/events) — unchanged                       │
│  ├─ Right panel (mission/stats) — unchanged                            │
│  └─ <EarthScene engine="cesium" mode="real_earth" />  ← NEW            │
│        │                                                               │
│        ├─ Cesium Viewer instance                                       │
│        ├─ Terrain provider (World Bathy → World Terrain → self-hosted) │
│        ├─ Imagery provider stack (GIBS WMTS + base imagery)            │
│        ├─ Live entity providers (satellites, aircraft, vessels, buoys) │
│        └─ Reference layers (volcanoes, undersea features, bases, etc.) │
│                                                                        │
│  <LayerSidebar />  ← reads from lib/geo/layerRegistry                  │
│  <BaseModeSwitcher />  ← REAL_EARTH | TOPOGRAPHY | BATHYMETRY         │
│  <DiagnosticsPanel />  ← satellite counts, AIS status, per-layer health│
└───────────────────────────────────────────────────────────────────────┘

                  ┌───────────────────────────────────────┐
                  │       lib/geo/layerRegistry.ts        │
                  │  typed metadata for every layer       │
                  │  {id, label, category, provider,      │
                  │   supportedModes, timeEnabled, ...}   │
                  └───────────────────────────────────────┘
                                    │
            ┌───────────────────────┼─────────────────────────────────┐
            ▼                       ▼                                 ▼
  lib/geo/providers/        lib/geo/terrain/                  lib/geo/live/
  ├─ imagery-gibs.ts        ├─ bathymetry.ts (ion→GEBCO)       ├─ satellites/
  ├─ imagery-xyz.ts         ├─ terrain-self-hosted.ts           ├─ ais/
  ├─ vector-geojson.ts      └─ clipping.ts (local cutaway)      ├─ aircraft/
  ├─ czml-orbital.ts                                             └─ buoys/
  ├─ wms-generic.ts         app/api/crep/ais/ws/  ← backend WS  proxy
  ├─ tiles-3d.ts            app/api/crep/satellites/groups/ ← GROUP fanout
  └─ raster-overlay.ts
```

---

## 5. Phased implementation

Each phase is a self-contained commit on `crep/earth-v2`. All 10 ship together as one PR to main.

### Phase 1 — Audit (no code changes; comments + doc only)

**Deliverable:** `docs/CREP_EARTH_V2_AUDIT.md` (this doc + concrete findings)

Grep targets to run + log:
```bash
grep -rn "\b27\b\|\b32\b\|\b50\b\|\b100\b" lib/crep/registries/satellite-registry.ts \
  app/api/oei/satellites/ lib/crep/satellite-animation.ts
grep -rn "slice(0," app/dashboard/crep/CREPDashboardClient.tsx | grep -i "sat\|filtered"
grep -rn "maxResults\|MAX_SAT\|CAP_SAT" --include="*.ts" --include="*.tsx"
grep -rn "projection.*globe\|{ type: \"globe\" }" app/dashboard/crep
```

Also log every MapLibre / deck.gl / Three import in CREP to know the surface area to rewrite.

### Phase 2 — Replace the renderer

**New files:**
- `components/crep/earth/CesiumEarth.tsx` — the new Viewer wrapper
- `components/crep/earth/BaseModeSwitcher.tsx` — REAL_EARTH / TOPOGRAPHY / BATHYMETRY toggle
- `components/crep/earth/hooks/useCesiumViewer.ts` — React-safe Viewer lifecycle
- `lib/geo/engine/cesium-init.ts` — Ion token wiring + fallback path

**Earth defaults (opaque, not glass):**
```ts
viewer.scene.globe.depthTestAgainstTerrain = true
viewer.scene.globe.translucency.enabled = false    // opaque by default
viewer.scene.globe.showGroundAtmosphere = true
viewer.scene.skyAtmosphere.show = true
viewer.scene.globe.enableLighting = true
viewer.scene.globe.dynamicAtmosphereLighting = true
```

**Env wiring:**
- `NEXT_PUBLIC_CESIUM_ION_TOKEN` for world-tier assets (server-rendered into HTML `<meta>` tag, NOT bundled into JS — avoids leaking if rotated)
- Fallback if unset → log warn, continue with self-hosted terrain + GIBS imagery only

### Phase 3 — Real terrain + bathymetry

**New files:**
- `lib/geo/terrain/bathymetry.ts`
- `lib/geo/terrain/self-hosted.ts` (for fallback)
- `lib/geo/terrain/clipping.ts` (local cutaway for bathy inspection without global glass)

**Provider selection logic:**
```ts
export async function resolveTerrainProvider(): Promise<TerrainProvider> {
  if (env.cesiumIonToken) {
    // Cesium World Bathymetry: asset 2426648 (land+ocean combined)
    return await CesiumTerrainProvider.fromIonAssetId(2426648)
  }
  if (env.cesiumIonToken) {
    // Cesium World Terrain: asset 1 (land only)
    return await CesiumTerrainProvider.fromIonAssetId(1)
  }
  // Self-hosted GEBCO 2025 + ETOPO 2022 derived quantized-mesh tiles
  return await CesiumTerrainProvider.fromUrl(env.selfHostedTerrainUrl ?? "/tiles/terrain")
}
```

**Self-hosted data prep (separate worker, documented separately):**
- GEBCO 2025 15-arc-second global grid: https://www.gebco.net/data-products/gridded-bathymetry-data/
- ETOPO 2022 15-arc-second ice-surface: https://www.ncei.noaa.gov/products/etopo-global-relief-model
- Convert to Cesium quantized-mesh via `cesium-terrain-builder` or `quantized-mesh-tile`
- Host on CDN / MINDEX / S3 + CF; point `selfHostedTerrainUrl` at it

**Local clipping for bathy inspection:**
- User clicks "dive here" → Cesium `ClippingPlaneCollection` is applied to a 1000km radius around the point
- Globe translucency is scoped to that clipped region, not the whole planet → addresses Morgan's "don't turn the globe into glass" rule

### Phase 4 — Layer registry

**New file:** `lib/geo/layerRegistry.ts`

```ts
export type BaseMode = "REAL_EARTH" | "TOPOGRAPHY" | "BATHYMETRY"

export interface LayerEntry<TOpts = unknown> {
  id: string
  label: string
  category: "base" | "imagery" | "live" | "reference" | "analysis"
  providerType: "imagery-wmts" | "imagery-xyz" | "terrain" | "geojson"
    | "czml-orbital" | "wms" | "3d-tiles" | "raster-overlay" | "websocket"
  supportedModes: BaseMode[]
  timeEnabled: boolean
  defaultOpacity: number
  defaultZOrder: number
  defaultVisibility: boolean
  attribution: string
  updateCadenceMs?: number
  docsUrl?: string
  requiresToken?: string[]           // env var names
  status: "stable" | "beta" | "experimental"
  providerOpts: TOpts
}
```

Registry is a plain array of entries + a hook `useLayerRegistry()` that returns entries filtered by the current base mode.

### Phase 5 — Satellites done properly

**New backend route:** `app/api/crep/satellites/groups/route.ts`

Query multiple CelesTrak GROUPs in parallel:
```
stations, active, weather, noaa, goes, resource, sarsat, dmc, amateur,
visual, analyst, iridium-NEXT, orbcomm, starlink, oneweb, kuiper,
gps-ops, glo-ops, galileo, beidou, sbas, nnss, musson, last-30-days,
science, geo, intelsat, ses, telesat, gorizont, raduga, molniya
```

Use FORMAT=`json` (not TLE) per brief — legacy TLE is catalog-number-capped at 99999 and 2026 starts overflowing. CelesTrak OMM format is the current standard.

**Response shape:**
```ts
{
  source: "celestrak-groups",
  generatedAt: "2026-04-18T...",
  groups: {
    active:   { raw: 9842, deduped: 9842, propagated: 9720, errors: 122 },
    stations: { raw: 4, deduped: 4, propagated: 4, errors: 0 },
    starlink: { raw: 6734, deduped: 6734, propagated: 6621, errors: 113 },
    ...
  },
  total: { raw, deduped, propagated, errors },
  satellites: [ ...propagated... ]
}
```

**Frontend layer counts:**
- Top-bar shows `propagated` (total live)
- Diagnostics panel shows the full breakdown

**Render path:**
- Cesium `CzmlDataSource` preferred for orbital tracks — automatic propagation, no manual rAF
- Or `PointPrimitiveCollection` with custom SGP4 tick (keep existing `lib/crep/sgp4-propagator.ts`)

### Phase 6 — AIS

**New backend:** `app/api/crep/ais/ws/route.ts` — upgrade-request handler on a Node runtime WebSocket

**Flow:**
1. Browser client connects to `wss://mycosoft.com/api/crep/ais/ws` (our proxy)
2. Client sends `{cmd: "subscribe", bbox: [w,s,e,n]}` whenever map viewport changes (debounced 500ms)
3. Proxy maintains one persistent connection to `wss://stream.aisstream.io/v0/stream` with the server-side API key
4. Proxy forwards messages to subscribed clients filtered by bbox
5. Periodic keepalive + diagnostics (vessel count, last-message-age, reconnect count) sent as control frames

**Protection:**
- Key never reaches browser
- Subscription churn throttled: new bbox accepted only if moved >10% of viewport OR paused for 500ms
- Per-IP connection cap
- Stale-feed alarm if upstream gap > 30s

### Phase 7 — Domain layers

**Reference data to wire (public sources, per brief):**

| Layer | Source | Provider |
|---|---|---|
| Volcanoes global | NOAA NCEI Volcano Location DB (Smithsonian GVP derived) | GeoJSON via `/api/crep/reference/volcanoes` |
| Submarine volcanoes | Smithsonian GVP + GEBCO filter for submarine | Same route, `?filter=submarine` |
| Undersea feature gazetteer | GEBCO Undersea Feature Names WFS | GeoJSON `/api/crep/reference/undersea-features` |
| Seamounts / ridges / trenches | GEBCO + Global Seamount Dataset | Same |
| Public military bases | HIFLD MIRTA (already bundled) | `public/data/military-bases-us.geojson` + OSM fallback |
| Ports / naval / air stations | NGA WPI (already bundled) | `public/data/crep/ports-global.geojson` |
| Submarines — public reference ONLY | Historical / static / museum / publicly-listed port visits | `public/data/crep/submarines-public.geojson` — curated, zero live-position inference |

**Submarine layer constraints (enforced in layer metadata):**
```ts
{
  id: "submarines-public",
  label: "Submarines (public reference only)",
  category: "reference",
  ...
  attribution: "Public domain records only. No live position inference. Sources: museum fleet registries, publicly-announced port visits, historical deployment announcements.",
  docsUrl: "/docs/CREP_SUBMARINE_DATA_POLICY.md"
}
```

And a separate `docs/CREP_SUBMARINE_DATA_POLICY.md` spelling out what's in-bounds (no covert asset tracking).

### Phase 8 — Imagery + topo unification

**New provider adapters:**
- `lib/geo/providers/imagery-gibs.ts` — NASA GIBS WMTS with time-addressable layers
- `lib/geo/providers/imagery-xyz.ts` — plain XYZ (CartoCDN, OSM, MapTiler, etc.)
- `lib/geo/providers/wms-generic.ts` — for anything WMS-only

**Default imagery stack:**
- Base: GIBS `BlueMarble_NextGeneration` + `Reference_Labels` (static)
- Real-time overlays: GIBS `MODIS_Terra_CorrectedReflectance_TrueColor` (daily) + `VIIRS_SNPP_CorrectedReflectance_TrueColor` (daily) — time-addressable
- Topo: OSM topographic style or MapTiler outdoor
- Bathy: depth-ramp shader applied to terrain via Cesium `Material`

### Phase 9 — UX + performance

**New UI components:**
- `components/crep/earth/BaseModeSwitcher.tsx` — 3-way toggle in the top bar
- `components/crep/earth/LayerSidebar.tsx` — searchable, categorised layer list from the registry
- `components/crep/earth/DiagnosticsPanel.tsx` — source health, satellite counts, AIS subscription status, bbox info, FPS
- `components/crep/earth/DiveMode.tsx` — "dive here" → clipped bathy inspection

**Performance guardrails:**
- Satellite propagation runs in a dedicated Web Worker (`workers/satellite-prop.worker.ts`) so the main thread stays at 60 FPS
- Cluster markers where density > threshold using Cesium's native clustering
- Avoid loading full-world live feeds unless explicitly enabled (bbox-filter always on by default)
- Lazy-load reference datasets (volcanoes, undersea features) only when layer is enabled

### Phase 10 — Tests + docs

- `lib/geo/__tests__/layerRegistry.test.ts`
- `lib/geo/__tests__/terrain-selection.test.ts`
- `app/api/crep/satellites/groups/__tests__/route.test.ts`
- `app/api/crep/ais/ws/__tests__/proxy.test.ts`
- E2E smoke: open /dashboard/crep?engine=cesium, confirm Earth renders opaque, confirm ≥1000 satellites render, confirm AIS socket opens
- `docs/CREP_EARTH_V2_ARCHITECTURE.md` — final engineering note
- `docs/CREP_SUBMARINE_DATA_POLICY.md` — per-brief rule
- `docs/CREP_EARTH_V2_MIGRATION.md` — removed files, removed imports, rolling-back instructions
- Before/after screenshot pair committed to `docs/img/`

---

## 6. Rollout plan

1. Cut branch `crep/earth-v2` from `main` once prod is 200 + Option B has landed.
2. Phases 1-10 as sequential commits on the branch.
3. Feature flag: `/dashboard/crep` still defaults to old engine; `/dashboard/crep?engine=cesium` gives v2 for QA.
4. Open PR → Morgan + Cursor review.
5. Internal QA at Morgan's preview URL.
6. Flip default engine in a single commit (`feat: make Cesium the default CREP engine`).
7. Monitor prod for 48h; remove old MapLibre/deck.gl engine code in a follow-up commit.

No `[fast]` pushes for this series — full pipeline runs (lint, test, build, integration, deploy-production) since the change is large.

---

## 7. Environment variables

New env vars this refactor introduces:

| Var | Purpose | Default |
|---|---|---|
| `NEXT_PUBLIC_CESIUM_ION_TOKEN` | Cesium World Bathymetry + premium terrain/imagery | unset → self-hosted fallback |
| `CREP_TERRAIN_URL` | Self-hosted quantized-mesh terrain CDN | `/tiles/terrain` |
| `GIBS_API_BASE` | NASA GIBS WMTS base URL | `https://gibs.earthdata.nasa.gov/wmts/` |
| `AISSTREAM_API_KEY` | AIS upstream key (backend only, already exists) | required |
| `CELESTRAK_USER_AGENT` | Polite UA string for CelesTrak GROUP queries | `MycosoftCREP/1.0` |

All secrets stay in GH Actions secrets + VM `.env`. None reach the browser except `NEXT_PUBLIC_CESIUM_ION_TOKEN` (which is public-by-design per Cesium ion's scoping model).

---

## 8. Definition of done

- From orbit, Earth is **solid**. No glass globe.
- Ocean is present in normal mode and does not expose continents through the sphere.
- Land elevation is real terrain (tile-based, not a texture trick).
- Seafloor relief exists and is inspectable.
- Bathymetry mode and Real-Earth mode are distinct toggles.
- Satellite layer shows **loaded / filtered / rendered** separately — "27" cannot silently recur.
- AIS flows through backend WebSocket proxy; key never reaches browser.
- Undersea features, volcanoes, bases, and public submarine-reference layers are all source-labeled in the registry.
- Existing imagery, topo, weather, fungi, space-weather overlays continue to work.
- Old MapLibre/deck.gl CREP engine removed from production code path after the flip.
- Tests pass. Lint passes. `npx tsc --noEmit` on the touched tree returns zero new errors.
- `docs/CREP_EARTH_V2_ARCHITECTURE.md` + `docs/CREP_EARTH_V2_MIGRATION.md` + `docs/CREP_SUBMARINE_DATA_POLICY.md` all present.

---

## 9. Open decisions Morgan needs to resolve before Phase 2 starts

1. **Cesium ion token** — do we already have an account + token? If yes, add the secret; we get World Bathymetry on day 1. If no, we start on self-hosted GEBCO/ETOPO tiles (2-3 days extra prep).
2. **Self-hosted terrain hosting** — MINDEX 189, sandbox 187, or a dedicated CF R2 / S3 bucket? Quantized-mesh globe tiles are ~30 GB.
3. **2D flat-mode fate** — kill it entirely once Cesium is default, or keep it available for tablet operators who prefer 2D? (Recommend: keep as `?engine=maplibre-2d` for accessibility but remove from the default UI.)
4. **Satellite propagation thread model** — Web Worker (my default) or keep in main thread with rAF (current)? Worker gives 60 FPS at 15k sats; main-thread caps around 3k.
5. **Submarine layer dataset** — do you already have a curated list, or do I build one from public records (museum boats, historical deployment announcements)? I'll NOT infer positions from sonar, patrol patterns, or AIS gaps.

---

## 10. Nothing starts until

- [ ] Prod `mycosoft.com` returns 200
- [ ] Option B (`.github/workflows/ci-cd.yml` GHCR rewrite) is committed + deployed
- [ ] Cursor's MINDEX ingest wiring work is in a stable commit
- [ ] Branch `crep/earth-v2` cut from that stable `main`

Then Phase 1. Then the rest, in order, on the branch.

---

**This document is the contract. Commits on `crep/earth-v2` reference phase numbers from Section 5. Any deviation gets updated here first.**

---

## Appendix A — Rev 1.1 additions (Apr 18, 2026)

Rolled in from the ChatGPT architecture research report (`CREP-research-report.md`) plus the items already shipped from Fixes A–L on main.

### A.1 Data catalog layer (fold into Phase 3)

The terrain pipeline in Section 5 Phase 3 should sit on top of a proper
geospatial data catalog, not ad-hoc file URLs:

| Layer | Canonical format | Notes |
|---|---|---|
| Global relief + bathymetry masters | `COG` (Cloud Optimized GeoTIFF) | Range-request friendly. Sources: NOAA ETOPO 2022, GEBCO 2024 |
| Raster/imagery scene metadata | `STAC API` on PostGIS + Timescale | Standards-based asset discovery |
| Volumetric forecasts (Earth-2 weather cubes, spore fields) | `Zarr v3` with sharding | Colocates many chunks in one object while preserving random access |
| Derived terrain serving tiles | `quantized-mesh` tiled from the COG master | Cesium-native streaming |
| Vector 2D overlays | `PMTiles` (shipped via Fix C infrastructure) | Single archive + HTTP Range |

New module targets:
- `lib/geo/catalog/stac.ts` — STAC client + type wrappers
- `lib/geo/catalog/cog-tiler.ts` — range-request tile fetcher for COG sources
- `lib/geo/catalog/zarr.ts` — Earth-2 cube accessor via Zarr v3
- `scripts/etl/crep/build-terrain-pyramid.ts` — offline: COG master → quantized-mesh tile tree

### A.2 CelesTrak 2-hour upstream cadence (shipped Apr 18 as Fix G)

CelesTrak's current policy is "no more than once every two hours" for heavy
groups. `/api/oei/satellites` now caches at **15 min registry / 2 h legacy**,
so the client-side live-entity pump's 30-second cadence no longer cascades
into upstream hits.

Phase 5 (satellite ingestion) must preserve this contract — any new
satellite code path must go through the cached route, not directly to
`celestrak.org`.

### A.3 Browser isolation + compression stack (Phase 9 additions)

**Deferred to Phase 9** (performance) — none of these are blocking v2 launch
but all are worth enabling before scaling to 30k+ satellites or big 3D
asset payloads:

- **COOP/COEP headers** for cross-origin isolation → unlocks `SharedArrayBuffer`
  in workers. Non-trivial because every cross-origin resource (Cartocdn, NASA
  GIBS, MINDEX proxy, Cesium ion) must send correct CORP headers. Plan:
  audit every `connect-src` entry in the current CSP, confirm each origin
  returns `Cross-Origin-Resource-Policy: cross-origin` (or proxy through our
  own host), THEN flip COOP/COEP on for `/dashboard/crep/*` only.
- **CompressionStream / DecompressionStream in workers** for progressive
  client-side Zstd/Brotli decode on track payloads.
- **WebAssembly SIMD** decoders for numeric paths (meshopt, Draco, Zstd).
- **Zstd with dictionary mode** for repetitive JSON envelopes on API
  responses.

### A.4 Mesh / texture compression for 3D assets (Phase 3/7 additions)

When CREP Earth v2 renders photogrammetric volcanoes, undersea cable meshes,
or 3D Tiles 1.1 asset sets, wire in:

- `meshopt` (`gltfpack` + `meshopt_decoder`) for glTF payloads
- `Draco` for point clouds
- `KTX2 + Basis Universal` for 3D asset imagery (transcodable GPU textures)
- `Blosc2` for chunked numerical arrays on the server-side precompute cache

### A.5 MINDEX backbone — already partially in place

MINDEX already has:
- `crep.unified_entities` table with `s2_cell_id`, geometry, observed/valid
  timestamps, confidence, source, properties
- `/api/mindex/earth/ingest` with per-layer routing (wired by Cursor in
  commit `ab11b91f` via the `[type]/route.ts` proxy rewrite)
- `/api/mindex/observations/bulk` for obs-class ingestion
- Vector index registry scaffold (`ivf_pq`, `ivf_flat`, `cagra` per
  March 2026 migration)

Phase 4 (layer registry) should expose MINDEX domain queries through a
single client adapter rather than each CREP layer constructing its own
fetch. Adapter at `lib/mindex/worldview-client.ts`.

### A.6 Test matrix additions (Phase 10)

Fixed contract-test classes from the audit report:

| Test class | Must prove | Shipped? |
|---|---|---|
| Differential feed tests | aircraft/vessels/satellites counts do not collapse to 0 on payload-shape changes | ✅ `.github/workflows/feed-integrity-check.yml` (Fix J) |
| Cross-endpoint consistency | `/api/oei/satellites` vs `/api/crep/unified?type=satellites` vs `/api/oei/orbital-objects` roughly agree | ✅ same workflow (Fix L) |
| Tile correctness | terrain min/max height, bathy sign conventions, antimeridian handling | ❌ v2 Phase 10 |
| Worker tests | main thread never parses large tile payloads | ❌ v2 Phase 10 |
| Memory tests | 10-minute roam produces bounded heap + tile-cache residency | ❌ v2 Phase 10 |
| Security tests | unpublished or unverified "covert asset" data is rejected or labeled unknown | ❌ v2 Phase 10 (Submarine Data Policy enforcement) |

### A.7 Deferred from A–E series

These were in the audit recommendation but didn't fit the original A–E
scope:

- **Fix H** — `/api/crep/unified` exists and coalesces 13+ separate API
  calls via `crep-data-service.ts` module-level caching. Fix B's live
  pump could route through it instead of the 3 separate OEI endpoints,
  for one-shot semantics + shared cache. Not urgent (current Fix B works
  and is Promise.allSettled-isolated). v2 Phase 4 should collapse these
  paths when building the unified layer registry.
- **Fix K** — COOP/COEP + SharedArrayBuffer. See §A.3 above.
- Cesium ion token + terrain pipeline. Phase 3.
- STAC/COG/Zarr catalog. §A.1.

### A.9 New data sources — Morgan's Apr 19, 2026 ask

Additional layers for CREP v2/v3. All MUST flow through MINDEX ingest
(per Morgan rule) and be bbox-scoped at query time. None should be
hardcoded into the Docker image except the "instant" subset (see
`cell-towers-us-tw-instant.geojson` precedent).

#### A.9.1 Drone maps — live drone activity heatmap

- **Source:** https://thedronemap.com/ (commercial, no public API
  documented). Investigate partner API vs OSINT scraping path.
- **Fallback:** OpenSky ADS-B drone filter (most consumer drones don't
  broadcast). Commercial: DroneDeploy enterprise, AirMap, Skydio fleet.
- **Layer id:** `droneActivity` (new). Category: telecom or new `aerial`.
- **Visual:** dashed circles or small triangle glyphs — distinguish
  from piloted aircraft (solid plane icons) and towers (static dots/rings).
- **Status:** scope review needed before building. OSS equivalents are
  limited — likely requires a MINDEX connector to a partner API.

#### A.9.2 Drone no-fly zones + altitude limits

- **Sources:**
  - https://flyk.com/map?drone — consumer app, TDLR / D-Flight / AIXM
    data, Europe-heavy.
  - https://map.godrone.nl/ — Netherlands specific, good model reference.
  - **Canonical:** OpenAIP (https://www.openaip.net/) — global airspace
    class + NOTAM data, OpenAPI-compatible JSON.
- **Layer id:** `droneNoFlyZones` (new). Polygon layer, class-colored
  (CTR red, CTA orange, TRA amber, parks green).
- **Extras:** altitude-limit halos around airports, dynamic NOTAM
  overlay (Super Bowl TFRs etc.) via FAA NOTAM system.
- **Status:** OpenAIP is canonical; MINDEX connector needed.

#### A.9.3 Railway infrastructure + live train positions

- **Sources:**
  - **OpenRailwayMap** (https://www.openrailwaymap.org/) — OSM-based
    infra (tracks, signals, stations, electrification). Public vector-
    tile TMS at https://www.openrailwaymap.org/api — use as underlay.
  - **Live trains** (country-specific):
    - US: Amtrak Track-A-Train JSON; GTFS-RT feeds for commuter rails
      (Caltrain / LIRR / MBTA) at https://gtfs.org/realtime/feeds/.
    - UK: Network Rail Open Rail Data (SCHEDULE + MOVEMENT, register
      required).
    - EU: Deutsche Bahn HAFAS, SNCF Open Data, multiple per-country.
  - **Starter:** Amtrak + one GTFS-RT commuter feed proves the pattern
    in 2–3 days.
- **Layer ids:**
  - `railwayTracks` — OpenRailwayMap tile service underlay.
  - `railwayTrainsLive` — animated point layer, 30 s update interval.
  - `railwayStations` — symbol layer on top.
- **Visual:** tracks as thin grey-steel lines; live trains as small
  filled squares colored by operator (distinct from aircraft planes
  and vessel chevrons already on the map).
- **Status:** OpenRailwayMap tile integration is straightforward;
  live train layer needs a canonical starter feed.

#### A.9.4 Live-streaming event animation

Per Morgan: earthquakes / fires / lightning must appear ANIMATED on the
map as they happen, no full reload. Current state: `batchFetch` polls
every 30 s but each poll replaces the source data, so new features don't
"pop in" — they just suddenly exist on the next poll.

- **Mechanism:** feature-state `freshness` (0..1) decaying on the client
  over 10 s since first-seen. Paint expression pulses opacity + radius
  while freshness > 0, then settles into the normal styling.
- **Client-side diff:** keep a `Set<featureId>` of previously-seen ids;
  on each poll, new ids get freshness=1 + ripple animation; leaving
  features stay visible until bbox changes.
- **Sources:** no change — USGS earthquakes, FIRMS wildfires, NLDN /
  GLM lightning, NOAA HRRR cells all poll as today.
- **Layer ids affected:** `earthquakes`, `wildfires`, `lightning`,
  `stormTracks` (any time-indexed point/line layer).
- **Implementation home:** extend `applyLODToEvents()` in
  `lib/crep/lod-policy.ts` to inject freshness; CREPDashboardClient
  maintains the Set<id> map.

### A.8 Report items noted as outdated

These claims in the ChatGPT research report do not reflect the current
state (Apr 18, 2026):

- "Mycelium/heat/weather tile routes cause 404s" — routes exist and work,
  verified this session (`app/api/earth-simulator/{mycelium,heat,weather}-tiles/`).
- "609 aircraft, 55 vessels, 27 satellites" — stale counts from a Jan 16
  snapshot. Post-Fix-B the counts will be real again (verifying via
  watcher `b1jk2z6o2` as of this writing).
- "Transport layers demo/off by default" — outdated, fully live.
- "Embeddings may extend later; knowledge router falls back to mock" —
  need to re-audit after MINDEX ingest fix landed (`ab11b91f` + `7d31c2d6`).
