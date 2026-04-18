# CREP Earth v2 — Phase 1 Audit

**Branch:** `crep/earth-v2`
**Date:** Apr 18, 2026

Phase 1 is a read-only audit. Nothing changes. Findings below feed Phase 2+
implementation decisions on this branch.

## 1.1 Current CREP globe engine — what's actually running

| Finding | Evidence |
|---|---|
| CREP dashboard uses **MapLibre** globe projection, not Cesium | `app/dashboard/crep/CREPDashboardClient.tsx:1785` — `const [projectionMode, setProjectionMode] = useState<ProjectionMode>("globe")` |
| The transparent globe look comes from MapLibre's `{ type: "globe" }` projection option | `app/dashboard/crep/CREPDashboardClient.tsx:4928` — `projection={projectionMode === "globe" ? { type: "globe" } : { type: "mercator" }}` |
| **No Cesium imports** in CREP dashboard code path | `grep -rn "from \"cesium\"" app/dashboard/crep` → 0 matches |
| Cesium IS used elsewhere | `components/earth-simulator/earth-simulator-container.tsx` imports `CesiumGlobe` — that's the observation-portal experience, not CREP |
| Cesium dep installed | `package.json`: `cesium@^1.115.0` |
| Cesium workers bundled | `public/cesium/{Widgets,Workers}` directories present |

**Confirmed**: the v2 architectural decision stands — make Cesium canonical
for CREP. The renderer swap happens at the component boundary; Cesium is
already available, just not wired into the CREP dashboard.

## 1.2 Current CREP dashboard primary deps

`grep -E "import.*maplibre-gl|import.*deck\\.gl|import.*three/\"" app/dashboard/crep/CREPDashboardClient.tsx | wc -l` returns 50+ hits. High-level categories:

- **MapLibre**: basemap tiles (CartoCDN dark-matter), globe projection, GeoJSON sources for every CREP layer, click handlers per layer, symbol + circle + fill + line layer specs
- **deck.gl**: `ScatterplotLayer` and `PathLayer` via `@deck.gl/layers` (used for a subset of live entities through MapboxOverlay pattern)
- **Three.js**: imported transitively via `components/earth-simulator/*` (not the CREP path)

Replacement strategy for Phase 2: keep all layer data pumps + registries
unchanged. Only the **presentation layer** (MapLibre Map, deck.gl overlay,
the 6,500-line dashboard's direct source/layer calls) gets replaced by
`<CesiumEarth />`.

## 1.3 Satellite count caps — where "27" could hide

- `lib/crep/registries/satellite-registry.ts`: grepping for hardcoded ints
  27/32/50/100 → no matches in the sat-count-relevant paths
- `applyLODToMovers(filtered, "satellites", mapZoom)` (shipped as Fix D)
  returns `slice(0, lod.movers.satellites)` where the budget varies
  300 (globe) → 50,000 (street). Not capped at 27.
- Earlier "27" observation in the ChatGPT report is most likely stale from
  a moment when the satellite registry was mis-initialised (empty after
  an effect re-mount cleared the animation state). Fix B (live pump) +
  Fix E (worker-backed SGP4) address that regression class. Post-deploy,
  the feed-integrity check in `.github/workflows/feed-integrity-check.yml`
  (Fix J) asserts `satellites >= 100` every 10 min and opens an issue on
  regression.

## 1.4 Existing Cesium infrastructure (keep, reuse, don't rebuild)

`components/earth-simulator/cesium-globe.tsx` already has:

- Cesium Viewer creation
- `Cesium.Ion.defaultAccessToken = undefined` (no ion token, bathymetry-free)
- mycelium/heat/weather custom raster overlays
- Land-grid rectangle entities (debug/analytics overlay — NOT the planet
  surface; v2 treats this as optional diagnostic layer only)
- Camera controls, atmosphere, lighting presets

Phase 2 builds a **separate** `components/crep/earth/` tree that:
- Does NOT depend on `components/earth-simulator/` (different product concern)
- DOES share the Cesium v1.115.0 runtime + workers from `public/cesium/`
- Can borrow terrain provider patterns from `earth-simulator/cesium-globe.tsx`
  where helpful but must start from the v2 target architecture, not grow
  out of the earth-simulator component

## 1.5 Layer-fetch coalescing opportunity (informational for Phase 4)

- `/api/crep/unified` exists with per-type + all-data modes
- Uses `crep-data-service.ts` module-level LRU caching (survives between requests)
- Currently my live-entity pump (Fix B) hits `/api/oei/flightradar24`,
  `/api/oei/aisstream`, `/api/oei/satellites` separately. All correct,
  but could be a single `/api/crep/unified` call instead.
- Phase 4 (layer registry) should route all queries through the unified
  path so multiple consumers share the cache.

## 1.6 What to DELETE from the production CREP path after v2 is default

(Noted for Phase 10 cleanup; do not delete on this branch.)

- `projectionMode === "globe"` toggle in MapLibre — replaced by Cesium
- `<MapComponent>` + `<MapMarker>` + `<MarkerContent>` usage in
  CREPDashboardClient (these are the MapLibre React wrappers)
- deck.gl overlay `MapboxOverlay` for live entities — Cesium primitive
  collections do the same thing natively
- `components/crep/layers/signal-heatmap-layer.tsx`,
  `components/crep/layers/aurora-overlay.tsx`,
  `components/crep/layers/gibs-base-layers.tsx` — MapLibre-specific; port
  or replace in Phase 4 registry

## 1.7 What to keep (unchanged) even after v2 is default

- All OEI routes (`/api/oei/*`)
- All registries (`lib/crep/registries/*`)
- Live-entity pump (Fix B)
- LOD policy (Fix D)
- MINDEX integration
- Widgets (flight tracker, vessel tracker, satellite tracker — bottom panel)
- Nature observation list (left panel)
- Top-bar counter + status pills
- Right panel (Mission Control, Live Tracking, Stats)

These are presentation-agnostic. Cesium gets the map surface, everything
else around the map stays identical.
