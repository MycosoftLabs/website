# Earth Simulator — Technical Feature Reference & Capability Index

> **Route:** `/natureos/earth-simulator` (the operator-facing branding of the CREP — *Common Relevant Environmental Picture* — dashboard).
> **Generated:** 2026-06-13. Built by a 21-agent codebase survey + completeness-critic backfill against `WEBSITE/website` (the canonical ~23,200-line `CREPDashboardClient.tsx` plus its layer/lib/api tree). **The code is the source of truth**; every claim below carries `file:line` references.
> **Purpose:** the definitive feature/capability index for the Earth Simulator, and the test plan for live production QA.

## Table of Contents

1. [Overview & Architecture](#1-overview-architecture)
2. [Routes & Entry Points](#2-routes-entry-points)
3. [Mobile, Tablet & Performance Classes](#3-mobile-tablet-performance-classes)
4. [Layer Registry & Intel Feed](#4-layer-registry-intel-feed)
5. [Nature, Species & Fungal Atlas](#5-nature-species-fungal-atlas)
6. [Infrastructure & Power Grid](#6-infrastructure-power-grid)
7. [Telecom](#7-telecom)
8. [Signal Coverage, Proposal Overlays & Telecom Detail](#8-signal-coverage-proposal-overlays-telecom-detail)
9. [Events & Hazards (Layers)](#9-events-hazards-layers)
10. [Events Data Pipeline & V3 Render Engine](#10-events-data-pipeline-v3-render-engine)
11. [Environment & Conditions](#11-environment-conditions)
12. [Earth-Observation Rasters, Aurora, Clouds & Sun-Earth](#12-earthobservation-rasters-aurora-clouds-sunearth)
13. [Live Movers (Air / Sea / Space)](#13-live-movers-air-sea-space)
14. [Cameras / Eagle Eye](#14-cameras-eagle-eye)
15. [Eagle Eye — Camera Resolution & HLS Pipeline](#15-eagle-eye-camera-resolution-hls-pipeline)
16. [Devices & Telemetry](#16-devices-telemetry)
17. [Device Ingestion, Sensors, Transit & Jurisdiction](#17-device-ingestion-sensors-transit-jurisdiction)
18. [Regional Projects, Civic & Defense](#18-regional-projects-civic-defense)
19. [Viewport Prefetch Architecture & Web Workers](#19-viewport-prefetch-architecture-web-workers)
20. [MYCA Panel & Full API Index](#20-myca-panel-full-api-index)

---

## 1. Overview & Architecture

### Earth Simulator — Overview & Architecture

#### 1. What the Earth Simulator Is

The **Earth Simulator** is the public/operator-facing branding of the **CREP dashboard** — *Common Relevant Environmental Picture*, an "intelligence-grade operational environmental awareness dashboard" (`app/dashboard/crep/CREPDashboardClient.tsx:1-19`). It is a single, very large React client component (`CREPDashboardClient.tsx` is ~22,000+ lines) that renders a full-screen interactive world map/globe with dozens of toggleable data overlays: live nature observations (fungi-first), natural-hazard events (earthquakes/volcanoes/wildfires/storms/lightning/tornadoes/floods), live movers (aircraft/vessels/satellites), static and live infrastructure (power, telecom, transport, data centers), civic/military facilities, MycoBrain/SporeBase devices, jurisdiction boundaries, Earth-observation rasters, and Mycosoft project zones.

The *same* dashboard component is served at three routes; "Earth Simulator" is the canonical one with a distinct, performance-tuned **staged boot profile** that the other two routes do not get:

| Route | Purpose | Notes |
|-------|---------|-------|
| `/natureos/earth-simulator` | **Canonical** Earth Simulator | `page.tsx:1-4`; staged-boot + strict perf mode activate here |
| `/natureos/tools/earth-simulator` | Legacy alias | Redirects to the canonical URL (`page.tsx:2-3`) |
| `/dashboard/crep` | CREP dashboard | Same component; shares "globe CREP" marker behavior |
| `/natureos/crep` | CREP alias | Shares globe marker behavior (`isGlobeCrepRoute`, `CREPDashboardClient.tsx:3202-3214`) |

Route detection is by pathname string match: `isEarthSimulatorPath()` checks `pathname.includes("/natureos/earth-simulator")` (`CREPDashboardClient.tsx:3192-3199`); the boot library duplicates this as `isEarthSimulatorPathFromWindow()` (`lib/crep/earth-simulator-boot.ts:293-300`). Because detection is window-based, all Earth-Sim-specific behavior is gated client-side at runtime, not via build-time props.

#### 2. Rendering Stack

The visualization is a layered hybrid renderer, not a single engine:

| Layer in the stack | Technology | Role | Evidence |
|--------------------|-----------|------|----------|
| **Base map / projection** | **MapLibre GL JS** | WebGL raster + vector basemap, globe and mercator projections, native circle/line/symbol/fill/heatmap layers | `CREPDashboardClient.tsx:8` (mapcn/MapLibre), map wrapper `@/components/ui/map` (line 24) |
| **Vector tiles** | **PMTiles** | Single-file vector tile archives for bulk static infra; protocol registered on the MapLibre instance | `registerPMTilesProtocol` (line 329, registered at 18226); PMTiles-first static-infra loader `addInfraSourceWithFallback` (line 332) |
| **Dynamic entities** | **deck.gl** (`@deck.gl/layers`) overlay | GPU `ScatterplotLayer`/`PathLayer` for live movers (aircraft/vessels/satellites) and entity streams via `EntityDeckLayer` | line 341, `EntityDeckLayer` (line 215), comments at 9378-9382 |
| **Point markers (clickable)** | **React DOM markers** (`maplibregl.Marker` per node) | Nature observations + events rendered as `FungalMarker` DOM nodes because *deck.gl IconLayer `onClick` fails with `MapboxOverlay`/interleaved rendering* | `FungalMarker` (line 192), comment at 15964 and 22011 |
| **Volumetric / 3D** | **Three.js** | Realistic volumetric cloud rendering with altitude/density (`RealisticCloudLayer`) | lines 270-274 |
| **EO rasters** | NASA GIBS / ESRI / Mapbox raster tiles | Satellite imagery, bathymetry, topography, aurora, etc. | `GibsBaseLayers` (line 246), preconnect origins in resource hints |

**Critical architectural constraint — DOM-marker main-thread starvation.** Nature observations and events are rendered as individual React/`maplibregl.Marker` DOM nodes (not deck.gl) so clicks are reliable. The documented failure mode: above ~1,200–1,500 DOM markers the main thread spends so long creating/updating DOM nodes that MapLibre's WebGL tile paints starve. A real browser-tab check found **4,515 markers at city zoom with literally 0 rendered features from any other layer** because the main thread was saturated (`lib/crep/lod-policy.ts:168-176`). This single constraint drives nearly every cap in the system (Section 6).

#### 3. Route & Entry / Component Tree

The page is a **static-rendered Next.js Server Component** that defers all interactivity to a lazy client bundle.

`app/natureos/earth-simulator/page.tsx`:
- `export const dynamic = "force-static"`, `revalidate = 3600`, `fetchCache = "default-cache"` (`page.tsx:9-11`) — the shell HTML is statically generated and cached for 1 hour.
- Renders three things (`page.tsx:13-20`):
  1. `<EarthSimulatorViewportLock>` — locks the page to the viewport.
  2. `<CrepResourceHints />` — network preconnect/dns-prefetch hints.
  3. `<CREPDashboardLoader />` — the lazy CREP client bundle.

**`EarthSimulatorViewportLock`** (`EarthSimulatorViewportLock.tsx`): on mount sets `<html>`/`<body>` `overflow: hidden` and `body { height: 100dvh }` (lines 15-17), then measures the dashboard root's top offset and publishes it as the CSS var `--crep-viewport-offset` (lines 19-27). It re-measures on RAF, on a timer ladder of `[50, 150, 350, 800, 1500] ms` (line 38), on a `MutationObserver` of child changes (line 41), and on window/visualViewport resize (lines 45-46). All styles are restored on unmount (lines 48-60). This keeps the map flush to the viewport edge across mobile URL-bar collapse and panel mounts.

**`CrepResourceHints`** (`components/crep/crep-resource-hints.tsx`): emits `<link rel="preconnect">` for 5 high-traffic TLS origins fired on every mount — Carto Dark Matter basemap, ESRI World Imagery/Ocean, AWS Terrain Tiles, NASA GIBS, Mapbox (lines 18-24) — plus `<link rel="dns-prefetch">` for 17 secondary origins (OpenRailwayMap, RainViewer clouds, ArcGIS FAA/wildfire, Caltrans CCTV/HLS, OpenSky, FR24, Windy, Amtrak, MBTA, CBP, IBWC, Surfline) (lines 26-44). Stated benefit: first basemap/imagery/infra fetch starts ~100–300 ms sooner.

**`CREPDashboardLoader`** (`app/dashboard/crep/CREPDashboardLoader.tsx`): wraps the client in a provider/error stack and a mobile shell:
```
<MYCAProvider>
  <CREPProvider>
    <GroundStationProvider>
      <CREPErrorBoundary componentName="CREP Dashboard">
        <CrepMobileShell disabled={props.embedded}>
          <CREPDashboardClient {...props} />   ← the ~22k-line shell
```
(`CREPDashboardLoader.tsx:186-198`). The loader also installs a **global ChunkLoadError self-heal**: a window `error`/`unhandledrejection` handler that, on a `ChunkLoadError` or `Loading chunk … failed`, reloads the page exactly once (guarded by a `sessionStorage` key + a `_crep_chunk_reload` query param) (`CREPDashboardLoader.tsx:150-184`). This is the runtime backstop to the dev-time reload loop that forced dozens of widget imports to be static (see Section 7). Phone (<768px) users get the same dashboard inside `CrepMobileShell` (slide-up panels + FABs), not a "requires desktop" fallback (`CREPDashboardLoader.tsx:5-22`).

#### 4. Staged Boot Sequence

The Earth Simulator does **not** mount everything at once. A staged boot profile (single source of truth in `lib/crep/earth-simulator-boot.ts`) controls what paints first, what is deferred, and what starts OFF. The master switch is `EARTH_SIM_STAGED_BOOT`, default **true**, disabled only by `NEXT_PUBLIC_EARTH_SIM_STAGED_BOOT=0` (`earth-simulator-boot.ts:6-10`). `isEarthSimStagedBootActive()` further requires the URL to be the Earth Simulator route (`earth-simulator-boot.ts:302-304`).

**Default camera:** center `[-98.5, 39.8]` (continental US), zoom `3` (`earth-simulator-boot.ts:12-13`) — identical to the CREP default (`CREPDashboardClient.tsx:3002-3005`) and to the US fly-to. Desktop opens in **globe** projection; touch/tablet/phone open in **mercator** map mode because MapLibre globe + rasters can starve input on mobile GPUs (`CREPDashboardClient.tsx:2366-2376`, 7972-7976).

**Boot ordering (the staged sequence):**

1. **Mount → reset to a known clean state.** On Earth-Sim mount the dashboard clears audit/isolation modes, forces `showInfraLayers = true`, sets `isStreaming = false`, removes any saved mission, and applies the boot profile to layers + ground filter (`CREPDashboardClient.tsx:8896-8927`). The layer transform is `applyEarthSimulatorBootToLayers()` (`earth-simulator-boot.ts:316-335`): forces `fungalAtlasECM` ON at opacity `0.55`, forces `fungalAtlasAM` OFF (EcM and AM are mutually exclusive), forces every id in `EARTH_SIM_OFF_AT_BOOT_LAYER_IDS` OFF, and forces profile-ON ids + project-prefixed layers ON.

2. **Instant first paint (z≈3).** Base imagery + the EcM fungal raster (`satImagery, bathymetry, topography, fungalAtlasECM`, `earth-simulator-boot.ts:32-37`), global infra *lines* (`submarineCables, txLinesGlobal`, lines 43-46), and fungi-only nature context paint immediately. The ground filter at first paint is fungi-only with EcM on and all other kingdoms off (`EARTH_SIM_FUNGI_ONLY_GROUND_FILTER`, `earth-simulator-boot.ts:224-252`).

3. **`EARTH_SIM_LIVE_STREAM_DELAY_MS = 1_200 ms` → enable streaming.** After 1.2 s the boot effect flips `isStreaming = true` (`CREPDashboardClient.tsx:8921-8923`; constant at `earth-simulator-boot.ts:275`), starting the live aircraft/vessel/satellite pump without blocking first paint.

4. **`earthSimDeferredDataReady` gate flips** after a perf-class-dependent delay (Section 5), unlocking all non-camera event/nature/heavy-overlay fetches.

5. **`EARTH_SIM_INFRA_READY_DELAY_MS = 750 ms` → permanent static infra.** Permanent infra (military bases seed, full GeoJSON, etc.) loads via `startPermanentInfraWhenIdle`, scheduled 750 ms after map load on Earth Sim (vs. immediately elsewhere) (`CREPDashboardClient.tsx:21276-21288`; constant at line 809). Military full-static GeoJSON specifically is delayed `2_500 ms` on Earth Sim vs `0` elsewhere (line 21263).

6. **`EARTH_PROJECT_DETAIL_DELAY_MS = 1_500 ms` → project detail overlays** (`setEarthProjectDetailsReady(true)`, line 14351) — but project detail also requires desktop perf budget, `earthSimDeferredDataReady`, and zoom ≥ 6.5 with the project in viewport (`canRenderEarthProjectDetails`, lines 14354-14359).

7. **`EARTH_SIM_ASSET_READY_DELAY_MS = 2_500 ms` → MYCA + heavy overlay assets.** MYCA assets and proposal/overlay assets become ready 2.5 s after readiness conditions hold (`CREPDashboardClient.tsx:14299-14330`). On the very first load (before initial data has loaded) the MYCA-asset delay is `EARTH_SIM_ASSET_READY_DELAY_MS + 2_500 = 5_000 ms` (line 14299).

A live debug snapshot of this profile is published to `window.__crep_boot_profile` and `window.EARTH_SIMULATOR_BOOT_PROFILE` (`earth-simulator-boot.ts:337-371`) for console inspection.

#### 5. Viewport Performance Classes (phone / tablet / desktop)

`getEarthSimViewportPerfClass()` (`CREPDashboardClient.tsx:2350-2357`) classifies the viewport on every read:

| Class | Condition |
|-------|-----------|
| `phone` | `width ≤ 767`, **or** coarse pointer and `width ≤ 900` |
| `tablet` | `width ≤ 1180`, **or** any coarse pointer (not already phone) |
| `desktop` | otherwise (fine pointer, `width > 1180`) |

Off the Earth Sim route the class is forced to `desktop`. The class is held in state (`earthSimViewportPerfClass`) and re-synced on resize, visualViewport resize, and `(pointer: coarse)` change (`CREPDashboardClient.tsx:7888-7890`, 7862-7872). Several budgets key off it:

- **`earthSimDeferredDataReady` delay** (the master first-paint data gate): `phone = 2_500 ms`, `tablet = 1_750 ms`, `desktop = 750 ms` (`CREPDashboardClient.tsx:7907-7911`).
- **Globe projection / desktop overlay budget:** only `desktop` gets the native globe at start (`shouldStartInGlobeProjection`, lines 2371-2376) and the heavy desktop overlay budget (`earthSimDesktopOverlayBudget`, line 7891-7892).
- **Startup fungal rasters:** only enabled when perf class is `desktop` (`earthSimStartupFungalRastersEnabled`, lines 2682-2684); on tablet/phone the fungal-atlas raster layers are forced off and mycelium-heat disabled (lines 2686-2699).
- **Global event API limit:** `phone = 220`, `tablet = 360`, `desktop = 420` events per fetch (`getEarthSimGlobalEventApiLimit`, lines 2359-2364).
- **DOM marker caps** (events and nature) scale down hard on phone/tablet (Section 6).
- **Right panel:** on non-desktop Earth Sim the right panel and some controls default closed/unmounted (`shouldMountRightPanelContent`, line 7893-7894; defaults at lines 7800-7803, 7835-7855).

#### 6. First-Paint Data-Readiness Gates & Current Delays

The single most important first-paint gate is **`earthSimDeferredDataReady`** (`CREPDashboardClient.tsx:7899`). It initializes to `!isEarthSimulatorPath()` — i.e. `true` everywhere except the Earth Simulator, where it starts **false** and flips true after the perf-class delay above (`750/1750/2500 ms`). It is reset to false on perf-class change and held false in audit-all-off / asset-isolation modes (lines 7900-7918).

While `earthSimDeferredDataReady` is false (and on any map animation/interaction), the dashboard **defers all non-camera heavy data**: `deferEarthNonCameraData` blocks the events fetch (`CREPDashboardClient.tsx:10832-10838`), the nature fetch (lines 11052, 11708), the live-nature fallback (11221, 11817), viewport sensor prefetch (14387-14389), and the entire V3 event-overlay block (every `earthquakes/volcanoes/wildfires/storms/floods/lightning/tornadoes` + pollution/military/route layer is `(!isEarthSimulatorRoute || earthSimDeferredDataReady) && …`, lines 22542-22573).

Full gate inventory and current delay constants:

| Gate / constant | Value | Controls | Location |
|-----------------|-------|----------|----------|
| `earthSimDeferredDataReady` delay | 750 ms desktop / 1,750 ms tablet / 2,500 ms phone | Unlocks all non-camera event/nature/overlay fetch + render | `CREPDashboardClient.tsx:7907-7911` |
| `EARTH_SIM_LIVE_STREAM_DELAY_MS` | **1,200 ms** | Start live mover stream (`isStreaming = true`) | `earth-simulator-boot.ts:275`; used 8921-8923 |
| `EARTH_SIM_INFRA_READY_DELAY_MS` | **750 ms** | Schedule permanent static infra load | `CREPDashboardClient.tsx:809`, 21284 |
| `EARTH_PROJECT_DETAIL_DELAY_MS` | **1,500 ms** | `earthProjectDetailsReady` (project detail overlays) | `CREPDashboardClient.tsx:807`, 14351 |
| `EARTH_SIM_ASSET_READY_DELAY_MS` | **2,500 ms** (+2,500 = 5,000 ms on first load) | MYCA assets + proposal/overlay assets ready | `CREPDashboardClient.tsx:808`, 14299-14330 |
| Spinner deadline | 6,000 ms | Force `isLoading = false` even if data hasn't arrived | `CREPDashboardClient.tsx:10795-10800` |
| Highlight layers | 2,000 ms | Init OpenGridWorks-style selection glow last | `CREPDashboardClient.tsx:21267-21273` |
| Military full-static GeoJSON | 2,500 ms on Earth Sim (0 elsewhere) | Defer heavy military layer | `CREPDashboardClient.tsx:21263` |

Derived readiness flags built on the above: `canRenderEarthProjectDetails` (desktop budget + deferred-ready + detail-ready + zoom ≥ 6.5 in viewport, lines 14354-14359), `proposalOverlayAssetsReady` (line 14363), `liveAuxiliaryLayersReady` (line 14370), `viewportSensorPrefetchReady` (lines 14387-14389), and `earthProjectViewportReady` (zoom ≥ 6.5, line 14354-14356).

#### 7. Global Resource & LOD Limits

**Browser-memory resource governor** (`CREPDashboardClient.tsx:837-859`). A `RESOURCE_GOVERNOR_MS = 30_000` cadence (line 837) scales global in-memory store caps by detected memory pressure (`normal` / `medium` / `high`):

| Pressure | nature | events | aircraft | vessels | satellites | streamed | lastKnown |
|----------|-------:|-------:|---------:|--------:|-----------:|---------:|----------:|
| normal | 30,000 | 1,200 | 1,500 | 2,500 | 1,200 | 1,500 | 3,500 |
| medium | 20,000 | 900 | 1,000 | 1,800 | 900 | 800 | 2,400 |
| high | 12,000 | 500 | 600 | 1,200 | 600 | 500 | 1,600 |

On the Earth Simulator route, strict perf mode (`earthStrictPerfMode = isEarthSimulatorRoute`, line 7896) substitutes **`EARTH_SIM_SAFE_RESOURCE_LIMITS`** (line 851-859) for mover limits: `nature 30,000 · events 220 · aircraft 700 · vessels 900 · satellites 240 · streamed 180 · lastKnown 900` — far tighter than even `high` pressure for movers.

**Nature store budgets** (`earth-simulator-boot.ts:269-272`): browser store cap `EARTH_SIM_NATURE_STORE_CAP = 36_000` (MINDEX remains source of truth for full iNat history); instant first-paint paint budget `EARTH_SIM_NATURE_INSTANT_LIMIT = 2_400`.

**Per-frame mover render caps** (Earth Sim, zoom-tiered) — `getEarthSimMoverRenderCap` (`CREPDashboardClient.tsx:861-882`):

| kind | z<3 | z<5 | z<7 | z<10 | z≥10 |
|------|----:|----:|----:|-----:|-----:|
| satellite | 60 | 80 | 110 | 140 | 180 |
| vessel | 120 | 160 | 220 | 280 | 340 |
| aircraft | 140 | 180 | 240 | 300 | 360 |

**DOM marker caps** (the WebGL-starvation defense). Hard ceilings: `EVENT_DOM_MARKER_CAP = 800`, `NATURE_DOM_MARKER_CAP = 1400`, `EARTH_SIM_DOM_MARKER_CAP = 900`, `EARTH_SIM_NATURE_PANEL_LIST_CAP = 90` (`CREPDashboardClient.tsx:2862-2867`).
- **Event DOM caps (Earth Sim base)** `getEarthSimulatorEventDomCap` (`earth-simulator-boot.ts:260-266`): z<3→160, z<5→220, z<7→280, z<9→340, else 420. These are then floored by perf class: phone caps 50–90, tablet caps 100–180 (`CREPDashboardClient.tsx:2382-2405`).
- **Nature DOM caps** `getNatureDomMarkerCapForZoom` (`CREPDashboardClient.tsx:2417-2464`), scaled by enabled-kingdom count: Earth-Sim **desktop** 360→900 across zoom tiers (capped at 900), **tablet** 220→760 (capped at 900), **phone** 110→420 (min 60); generic CREP 350→1,400 (capped at `NATURE_DOM_MARKER_CAP`).

**LOD policy** (`lib/crep/lod-policy.ts`). Zoom maps to one of six tiers (`getLODForZoom`, lines 228-234) — `globe[0,3) · continent[3,5) · region[5,7) · state[7,10) · city[10,13) · street[13,25)` — and each tier sets, for events/movers/infra/nature, a time-window, severity floor, render cap, bbox-filter flag, and MINDEX/bundled enablement (`LOD_TIERS`, lines 160-223). Morgan's inversion rule is encoded here: **zoom out = narrow time window, fewer markers, higher severity threshold; zoom in = wider history, larger budget, lower threshold**, while *nature inverts it* (research-grade-only at low zoom, all history at high zoom) (lines 1-20). Key LOD constants:

- Display-age hard limits independent of tier: events never older than `MAP_DISPLAY_MAX_EVENT_AGE_MS = 72 h` (line 72); nature never older than `MAP_DISPLAY_MAX_NATURE_AGE_MS = 1 year` (line 75). These are intersected with the tier cutoff in `applyLODToEvents`/`applyLODToNature` (lines 264-330).
- City-level zoom (`isCityLevelZoom`, lines 125-137: zoom ≥ 8, or viewport ≤ ~1.5°×1.5°) lifts the render cap to `UNCAPPED_RENDER_LIMIT = +Infinity` (line 78) — "show every filtered item in viewport."
- Bbox culling uses a `expandedBbox` 2× halo so panning doesn't immediately re-fetch (lines 361-370); `cullByBbox` handles antimeridian wrap (lines 451-465).

**Infra zoom floors** (`lib/crep/lod-policy.ts` + `lib/crep/production-first-load.ts`). Infra *point/symbol* icons are gated by minzoom while *lines and rasters never are* (`applyInfraPointIconMinZoom`, `production-first-load.ts:87-105` — early-returns for `crep-live-*`, `line`, and `raster`):

| Constant | Value | Applies to |
|----------|------:|-----------|
| `INFRA_POINT_ICON_MIN_ZOOM` | 5 | Generic infra point icons |
| `INFRA_COUNTRY_REVEAL_MIN_ZOOM` | 2.7 | Infra begins at US-flyover scale |
| `DATA_CENTER_MIN_ZOOM` | 2.7 (= country reveal) | DCs (global/IM3/regional) |
| `POWER_PLANT_MIN_ZOOM` | 2.7 (= country reveal) | Plants (local/global/EIA) |
| `DATA_CENTER_LABEL_MIN_ZOOM` | 12 | DC name labels (icons earlier) |
| `TELECOM_DETAIL_MIN_ZOOM` | 5 | Cell towers, AM/FM radio, signal heatmap |
| `TELECOM_CITY_MIN_ZOOM` | 8 | City-scoped tower/antenna detail (SD/TJ bbox) |
| `INFRA_LINE_GLOBAL_MIN_ZOOM` | 0 | Bundled/global infra lines (cables, TX) |
| `RAILWAY_MIN_ZOOM` | 5 | Railway raster tiles |

`getInfraLayerMinZoom` (`production-first-load.ts:43-85`) resolves a layer id substring to one of these floors.

#### 8. Overall Data Flow (viewport bounds → fetch → store → render)

```
        camera move / zoom
                │
                ▼
  map "moveend" → setMapBounds / setMapZoom
                │
   gate: earthSimDeferredDataReady && !isMapAnimationActive
         && !mapInteractionActive && !audit/isolation
                │  (else defer — Section 6)
                ▼
  ┌─────────────────────────────────────────────────────────┐
  │ FETCH (viewport-scoped, abortable, no-store)             │
  │  • events  /api/natureos/global-events?days=3&limit=N    │
  │    N = getEarthSimGlobalEventApiLimit() (220/360/420)    │
  │  • nature  viewport-bounds MINDEX/iNat fetch             │
  │  • intel/env/eagle/sensor viewport prefetch hooks        │
  │  • live movers  EntityStreamClient (WebSocket)           │
  │  Cap timeouts: 6–10 s; AbortSignal.any(controller,timer) │
  └─────────────────────────────────────────────────────────┘
                │
                ▼
  ┌─────────────────────────────────────────────────────────┐
  │ STORE (in-memory React state, governed)                  │
  │  • mergeById + ENTITY_TTL_MS dedupe (entity-merge)       │
  │  • RESOURCE_LIMITS / EARTH_SIM_SAFE_RESOURCE_LIMITS caps │
  │  • EARTH_SIM_NATURE_STORE_CAP = 36,000                   │
  └─────────────────────────────────────────────────────────┘
                │
                ▼
  ┌─────────────────────────────────────────────────────────┐
  │ SELECT / CULL / CAP (per render, per zoom)               │
  │  • cullByBbox + expandedBbox (2× halo)                   │
  │  • getLODForZoom → time-window + severity + maxRendered  │
  │  • applyLODToEvents / applyLODToNature / applyLODToMovers │
  │  • DOM caps: event/nature DOM marker caps by zoom+perf   │
  │  • stratified nature pick (fair kingdom split)           │
  └─────────────────────────────────────────────────────────┘
                │
                ▼
  ┌─────────────────────────────────────────────────────────┐
  │ RENDER (hybrid)                                          │
  │  • MapLibre native layers: lines, fills, rasters, infra  │
  │  • deck.gl EntityDeckLayer: live movers (GPU)            │
  │  • React DOM markers: nature + events (clickable)        │
  │  • debounced map.setData (makeDebouncedSetData) +        │
  │    cullToViewport before each setData                    │
  └─────────────────────────────────────────────────────────┘
```

Key flow facts: fetches are viewport-bounds-scoped, abortable, and wrapped with a per-cycle timeout via `AbortSignal.any([controller, timeoutController])` (`CREPDashboardClient.tsx:10816-10830`); a 6-second spinner deadline guarantees the loading state clears (line 10795-10800); live movers arrive over a WebSocket via `EntityStreamClient` (lines 216, 16451) and are merged with `mergeById`/`ENTITY_TTL_MS` (line 219); deck.gl source updates are debounced and viewport-culled (`makeDebouncedSetData` + `cullToViewport`, line 220, used 15506-15509). Nature/events are bounded twice — once by LOD render budget and again by the absolute DOM marker ceiling — before reaching the DOM.

#### 9. Known Limitations (in this domain)

- **DOM-marker scaling is the dominant bottleneck.** Nature + event markers must be DOM (not deck.gl) for reliable clicks, and the documented hard wall is ~1,200–1,500 markers before WebGL paints starve (4,515 markers → 0 other features observed) (`lib/crep/lod-policy.ts:168-176`). Every nature/event cap exists to stay under this ceiling, so on dense viewports the displayed set is sampled, not complete (except at city/uncapped zoom).
- **Route detection is pathname-string based and window-only** (`isEarthSimulatorPath`, `CREPDashboardClient.tsx:3192-3199`). Server-side it always returns false, so all Earth-Sim tuning is client-runtime; SSR renders the generic shape.
- **Live events don't animate in.** `batchFetch` polls ~every 30 s and *replaces* the source, so new earthquakes/fires just "suddenly exist" on the next poll rather than animating. A freshness diff utility (`diffFreshness` + `FRESH_DURATION_MS = 8_000` + paint expressions) exists in `lod-policy.ts:373-446` but the wiring is documented as a sketch, not fully active.
- **Globe projection is desktop-only at start.** Touch/tablet/phone open in mercator because MapLibre globe + rasters can starve input on mobile GPUs (`CREPDashboardClient.tsx:2371-2376`, 7972-7976); the globe toggle is available but not the default there.
- **Heavy widgets are statically imported on purpose.** Numerous overlay/tracker widgets that would naturally be `dynamic()` are forced to static imports to avoid a dev-server `ChunkLoadError` → Next auto-reload → recompile → timeout infinite loop (`CREPDashboardClient.tsx:157-300`); the loader's one-shot reload handler is the production backstop (`CREPDashboardLoader.tsx:150-184`). This inflates the main bundle.
- **First paint intentionally withholds data.** On Earth Sim, events/nature/overlays are blank until `earthSimDeferredDataReady` flips (up to 2.5 s on phone) and movers until 1.2 s; project detail needs zoom ≥ 6.5 and up to 1.5 s; MYCA/heavy assets up to 2.5–5 s. This is by design for first-paint FPS but means a cold load shows base map + EcM raster + infra lines before the rest streams in.
- **EcM/AM fungal layers are mutually exclusive at boot** — only `fungalAtlasECM` paints at refresh (opacity 0.55); `fungalAtlasAM` is force-off (`earth-simulator-boot.ts:39-40`, 319-324). Fungal-atlas rasters are entirely suppressed on tablet/phone (`CREPDashboardClient.tsx:2682-2699`).

---

## 2. Routes & Entry Points

### Earth Simulator — Routes, Mounts & Species Data Path (Corrected)

This section documents the actual route topology of the CREP / Earth Simulator dashboard, the runtime route-detection predicates that gate first-paint behavior, and the species data proxy with its fallback chain. All claims below are verified against the source tree at the stated `file:line`.

#### 1. Route correction summary

The critic is **correct that the directory `app/natureos/tools/earth-simulator/` does not exist** — `ls` returns `No such file or directory`. However, the claim that "the redirect doesn't happen / the README is wrong about the redirect" is itself wrong. `/natureos/tools/earth-simulator` **does** redirect to `/natureos/earth-simulator`, but the redirect is implemented in **`next.config.js` `redirects()`**, not by a route directory. The missing directory is exactly *why* the static redirect is needed — there is no page to serve at the old path, so Next.js answers the URL with an HTTP 308 before routing ever reaches the app directory.

| Claim under review | Verdict | Evidence |
|---|---|---|
| `app/natureos/tools/earth-simulator/` exists | **FALSE** — directory absent | `ls` → `No such file or directory` |
| `/natureos/tools/earth-simulator` redirects to `/natureos/earth-simulator` | **TRUE** — but via config, not a route file | `next.config.js:234` |
| `/natureos/earth-simulator` is the canonical Earth Simulator URL | **TRUE** | `app/natureos/earth-simulator/page.tsx:3-4`; `components/dashboard/nav.tsx:73` |
| Earth Simulator, `/dashboard/crep`, `/natureos/crep` render the same dashboard | **TRUE** | all three mount `CREPDashboardLoader` → `CREPDashboardClient` |

#### 2. Verified route table

Every route below was confirmed by listing the directory and reading its `page.tsx`.

| URL | Backing file (exists?) | `dynamic` / cache | What it renders | Notes |
|---|---|---|---|---|
| `/natureos/earth-simulator` | `app/natureos/earth-simulator/page.tsx` ✅ | `force-static`, `revalidate = 3600`, `fetchCache = "default-cache"` (`page.tsx:9-11`) | `EarthSimulatorViewportLock` → `CrepResourceHints` + `CREPDashboardLoader` | **Canonical** Earth Simulator URL. The only route wrapped in `EarthSimulatorViewportLock`. |
| `/dashboard/crep` | `app/dashboard/crep/page.tsx` ✅ | `force-dynamic` (`page.tsx:7`) | `CrepResourceHints` + `CREPDashboardLoader` | Original internal CREP dashboard route. No viewport lock. |
| `/natureos/crep` | `app/natureos/crep/page.tsx` ✅ | `force-dynamic` (`page.tsx:3`) | Re-exports `CREPDashboardLoader` directly (`export { default } from …`) | Thin public-NatureOS alias. No `CrepResourceHints`, no viewport lock. |
| `/natureos/tools/earth-simulator` | **no directory** ❌ | — | — | HTTP **308** permanent redirect → `/natureos/earth-simulator` (`next.config.js:234`). |
| `/earth-simulator` | **no directory** ❌ | — | — | HTTP **308** permanent redirect → `/natureos/earth-simulator` (`next.config.js:236`). Short path for voice intents / bookmarks; explicitly *not* the 3D `/apps/earth-simulator`. |

Redirect block (`next.config.js:226-236`), all `permanent: true` (308):

```js
async redirects() {
  return [
    …
    { source: "/natureos/tools/earth-simulator", destination: "/natureos/earth-simulator", permanent: true }, // :234
    { source: "/earth-simulator",                destination: "/natureos/earth-simulator", permanent: true }, // :236
  ]
}
```

The nav confirms the intent: `components/dashboard/nav.tsx:73` links to `/natureos/earth-simulator`, and `:122` carries the comment "Legacy /natureos/tools/earth-simulator redirects."

#### 3. Shared mount chain

All three live routes converge on one component tree. The only divergence is the Earth Simulator route's viewport lock wrapper.

```
page.tsx (server)
  └─ CREPDashboardLoader            (app/dashboard/crep/CREPDashboardLoader.tsx — "use client")
       ├─ ChunkLoadError self-heal  (loader.tsx:150-184 — one-shot reload on ChunkLoadError)
       └─ MYCAProvider
            └─ CREPProvider
                 └─ GroundStationProvider
                      └─ CREPErrorBoundary
                           └─ CrepMobileShell (disabled when embedded)
                                └─ CREPDashboardClient   (~1.2 MB, the actual dashboard)
```

- `CREPDashboardEmbedded.tsx` is a **parallel** wrapper with the identical provider stack used for embedded host pages; it takes `CREPDashboardEmbedProps` and passes `disabled={props.embedded}` to `CrepMobileShell`.
- `EarthSimulatorViewportLock` (`app/natureos/earth-simulator/EarthSimulatorViewportLock.tsx`) is client-only. On mount it pins `documentElement`/`body` overflow to `hidden` and `body.height` to `100dvh`, then computes the dashboard's top offset and writes it to the `--crep-viewport-offset` CSS var (`:26`), re-measuring on `requestAnimationFrame`, a `MutationObserver` over the subtree, `window` resize, and `visualViewport` resize, plus timed re-measures at `[50,150,350,800,1500]` ms (`:38`). All listeners/timers/observers are torn down and the original styles restored on unmount (`:48-60`).

#### 4. Route-detection predicates (the gates)

Three predicates drive first-paint and globe behavior. They are **path-substring** checks against `window.location.pathname` and therefore correctly fire after the 308 lands the browser on `/natureos/earth-simulator` (the legacy `/tools/…` path never reaches the client, so it is intentionally absent from these checks).

| Predicate | File:line | Returns true when pathname includes… | Purpose |
|---|---|---|---|
| `isEarthSimulatorPath()` | `CREPDashboardClient.tsx:3192-3199` | `/natureos/earth-simulator` (only) | Master gate for the Earth Simulator staged-boot path: fungal-first first paint, viewport perf-class, deferred data/asset readiness, staged layer enabling. |
| `isGlobeCrepRoute()` | `CREPDashboardClient.tsx:3202-3214` | `/natureos/earth-simulator` **OR** `/dashboard/crep` **OR** `/natureos/crep` | Shared globe-marker behavior across all three CREP surfaces (keep DOM markers mounted while panning). Comment at `:3201`. |
| `isEarthSimulatorPathFromWindow()` | `lib/crep/earth-simulator-boot.ts:293-300` | `/natureos/earth-simulator` (only) | Boot-module twin of `isEarthSimulatorPath()`, used where the boot lib can't import from the client. Feeds `isEarthSimStagedBootActive()` (`:302-304`). |

**Semantic difference (`isGlobeCrepRoute` vs `isEarthSimulatorPath`):**
- `isEarthSimulatorPath()` is the **narrow** gate — true on the Earth Simulator route *only*. Used in ~30 call sites in `CREPDashboardClient.tsx` (e.g. `:2687`, `:2696`, `:3161`, `:7800-7803`, `:7838-7839`, `:9694-9729`, `:10307-10322`, `:14289-14344`) to enable staged boot, fungal-only startup layers, viewport perf-class throttling, and deferred readiness state. Every one of these behaviors is conditional on `EARTH_SIM_STAGED_BOOT && isEarthSimulatorPath()`.
- `isGlobeCrepRoute()` is the **broad** gate — true on *any* of the three globe surfaces. Used at `CREPDashboardClient.tsx:21321` (`const isGlobeRoute = isGlobeCrepRoute()`) to keep fungal DOM markers mounted during pans on the standard CREP routes as well, not just Earth Simulator. In short: Earth-Sim-specific boot tuning keys off the narrow predicate; the cross-route map-marker UX keys off the broad one.

Both server-render safe: each returns `false` when `typeof window === "undefined"` and is wrapped in try/catch.

**Staged-boot flag** (`earth-simulator-boot.ts:7-10`): `EARTH_SIM_STAGED_BOOT` defaults **true**; set `NEXT_PUBLIC_EARTH_SIM_STAGED_BOOT=0` to revert to legacy mount behavior. So on `/natureos/earth-simulator` the staged path is on unless explicitly disabled.

#### 5. Species data path — `/api/mindex/proxy/[source]`

The species proxy (`app/api/mindex/proxy/[source]/route.ts`) is the unified bbox data access used by every CREP map layer, not just species. The dynamic segment `[source]` is mapped to a MINDEX layer name via `SOURCE_TO_MINDEX_LAYER` (`:66-113`).

**Query params** (`GET`, parsed at `:776-801`):

| Param (aliases) | Default | Clamp / handling |
|---|---|---|
| `lat_min` / `south` (or `bbox` w,s,e,n) | `-90` | clamped to `[-90, 90]` (`parseAndClampBounds :352-371`) |
| `lat_max` / `north` | `90` | clamped to `[-90, 90]` |
| `lng_min` / `west` | `-180` | clamped to `[-180, 180]` |
| `lng_max` / `east` | `180` | clamped to `[-180, 180]` |
| `limit` | `500` | clamped to `[1, 50000]` (`:782`) |
| `bbox` | — | `w,s,e,n` CSV; invalid form → 400 (`parseBboxParam :377-393`) |
| `liveFallback` / `fallbackLive` | species: enabled unless `=false` or `CREP_ENABLE_LIVE_NATURE_FALLBACK=0`; non-species: disabled unless `=true` or `CREP_ENABLE_LIVE_NATURE_FALLBACK=1` (`:791-795`) | — |
| `kingdom` | `all` | maps to iNat `iconic_taxa` / GBIF taxon keys (`:450-497`) |
| `preferLive` | `false` | species-only; when `true` (and fallback enabled) skips MINDEX and hits live sources first (`:797-832`) |

Invalid bbox (out-of-order min/max, or non-finite after `bbox` parse) → **HTTP 400** `"Invalid bounding box or limit parameters"` (`:785-790`). Unknown `[source]` (not in `SOURCE_TO_MINDEX_LAYER`) → **HTTP 400** with the list of available sources (`:769-774`).

**Timeouts & cache (env-tunable):**

| Constant | Default (prod / dev) | Env override |
|---|---|---|
| `MINDEX_PROXY_TIMEOUT_MS` | 8000 / 1500 | `CREP_MINDEX_PROXY_TIMEOUT_MS` (`:30-36`) |
| `FALLBACK_TIMEOUT_MS` | 12000 / 6000 | `CREP_MINDEX_PROXY_FALLBACK_TIMEOUT_MS` (`:37-43`) |
| `PROXY_CACHE_TTL_MS` | 3000 | `CREP_PROXY_CACHE_TTL_MS` (`:44`) |
| `PROXY_CACHE_STALE_MS` | 30000 | `CREP_PROXY_CACHE_STALE_MS` (`:45`) |

**Resolution order (GET):**
1. **`devices` special-case** (`:726-766`): `source=devices` bypasses MINDEX entirely and proxies `/api/earth-simulator/devices?refresh=1&wait=1` (6.5 s timeout); returns empty `devices:[]` on failure (never 400s).
2. **In-process LRU cache hit** (`proxyResponseCache`, keyed by source|limit|bounds|kingdom|fallback|preferLive at `:801`) → returns with `X-Proxy-Cache: hit`.
3. **`preferLive` species path** (`:808-832`): live iNat/GBIF first; caches as `fallback` with extended TTL (≥60 s) / stale (≥10 min).
4. **MINDEX primary** (`:834-872`): `GET {MINDEX_URL}/api/mindex/earth/map/bbox?layer=…&lat_min…&limit…`. On 2xx with non-empty entities, movers (`aircraft`/`vessels`/`satellites`) are run through `formatMoverPayload`; species is tagged `lineage.activeSource = "mindex"`. An **empty** species or mover layer is treated as a miss and falls through to live fallback (`:846-852`).
5. **Internal-route fallback** (`FALLBACK_ROUTES :116-123`): only `aircraft`, `vessels`, `satellites`, `earthquakes`, `species`, `internet-cables` have fallbacks. Species fallback calls `fetchLiveSpeciesFallback` (iNat + GBIF merge); other sources proxy their OEI/natureos route with bbox params forwarded. Response carries `X-MINDEX-Source: fallback` and `X-MINDEX-Warning: mindex-unavailable-using-direct-api`.
6. **Stale cache** (`:985-987`) → returns last good body with `X-Proxy-Cache: stale`.
7. **Unavailable** (`:989-1010`): `{ available:false, total:0, dataSource:"mindex_and_fallback_unavailable" }`, `X-MINDEX-Source: unavailable`, `Cache-Control: no-store`. (Status is still 200 — graceful degradation, not an error.)

If species fallback is **disabled** and MINDEX is empty, the proxy short-circuits at `:884-906` with `dataSource:"mindex_empty_live_fallback_disabled"` rather than hitting live APIs.

`POST` (`:1022-1106`) ingests entities into MINDEX via `/api/mindex/earth/ingest`; entities are normalized to require `lat`/`lng`/`timestamp` and silently drop rows missing coordinates.

#### 6. Related species fallback routes (spot-checked)

These are sibling routes the proxy and dashboard lean on; both verified to exist (`route.ts` present).

| Route | File | Behavior |
|---|---|---|
| `GET /api/crep/species/search?q=&limit=` | `app/api/crep/species/search/route.ts` | Name search over MINDEX species catalog (`/api/mindex/earth/map/bbox?layer=species&query=…`, global bbox), **falling back to iNaturalist taxa search when MINDEX returns 0** (`:4-5`). `limit` clamped to ≤100 (`:44`); 30 s in-memory cache with `X-Cache: hit` (`:21-22, 53-58`); missing `q` → 400 (`:46-51`). Note this is the **search** path, distinct from the proxy's bbox `species` layer. |
| `GET /api/crep/nature/preloaded?project=\|bbox=&limit=&grade=` | `app/api/crep/nature/preloaded/route.ts` | Reads MINDEX `crep.project_nature_cache` (warmed by a 6 hr MAS cron) for a project bbox; `force-dynamic`, `runtime=nodejs` (`:31-32`). Accepts explicit `?bbox=w,s,e,n` or named `?project=oyster\|goffs` from `PROJECT_BBOX` (`:41-44`); `limit` clamped to `[1,500]` default 200 (`:54`). **Graceful-degradation contract**: empty/missing cache returns `{ cache_warm:false, observations:[] }` at HTTP 200 so consumers fall back to live iNat without distinguishing "cache miss" from "infra broken" (`:14-19`). |

The proxy's species fallback (`FALLBACK_ROUTES.species = "/api/crep/fungal"`, `:121`) is yet another path (verified present at `app/api/crep/fungal/route.ts`) — it is the route invoked when the proxy's MINDEX species layer is empty and `liveFallback` is enabled but `preferLive` was not set.

#### Key file references
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\app\natureos\earth-simulator\page.tsx`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\app\natureos\earth-simulator\EarthSimulatorViewportLock.tsx`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\app\natureos\crep\page.tsx`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\app\dashboard\crep\page.tsx`, `CREPDashboardLoader.tsx`, `CREPDashboardEmbedded.tsx`, `CREPDashboardClient.tsx`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\lib\crep\earth-simulator-boot.ts`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\next.config.js`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\app\api\mindex\proxy\[source]\route.ts`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\app\api\crep\species\search\route.ts`, `app\api\crep\nature\preloaded\route.ts`, `app\api\crep\fungal\route.ts`

---

## 3. Mobile, Tablet & Performance Classes

### Mobile / Tablet / Performance Classes

The Earth Simulator route (`/natureos/earth-simulator`) classifies every client viewport into one of three performance tiers — `desktop`, `tablet`, or `phone` — and uses that class to gate overlays, scale DOM marker budgets, stagger deferred-data hydration, and (on phones) toggle a slide-up mobile chrome. This tiering is **active only on the Earth Simulator route**; the plain CREP dashboard (`/dashboard/crep`) always behaves as `desktop`. All logic lives in `app/dashboard/crep/CREPDashboardClient.tsx` unless otherwise noted.

> ⚠️ **CRITICAL OPEN ISSUE (iPad Pro freeze):** Apple iPad Pro is misclassified as `desktop` and immediately freezes on this route. Root cause and fix are documented in [§ Known critical issue](#known-critical-issue-ipad-pro-freezes-on-the-earth-simulator) below — read it before any tablet QA.

#### 1. Classification — `getEarthSimViewportPerfClass()`

Defined at `CREPDashboardClient.tsx:2350-2357`. Pure function of `window.innerWidth` and the `(pointer: coarse)` media query. SSR-safe: returns `"desktop"` when `window` is undefined.

```ts
function getEarthSimViewportPerfClass(): "desktop" | "tablet" | "phone" {
  if (typeof window === "undefined") return "desktop";
  const width = window.innerWidth || 1440;
  const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  if (width <= 767 || (coarsePointer && width <= 900)) return "phone";
  if (width <= 1180 || coarsePointer) return "tablet";
  return "desktop";
}
```

Evaluation is strictly ordered (first match wins):

| Order | Condition | Result | Notes |
|-------|-----------|--------|-------|
| 1 | `width <= 767` **OR** (`coarsePointer` **AND** `width <= 900`) | `phone` | Narrow viewport, or a touch device up to 900px |
| 2 | `width <= 1180` **OR** `coarsePointer` | `tablet` | Mid viewport, **or any coarse-pointer device of any width** that wasn't caught as phone |
| 3 | else | `desktop` | Wide viewport **and** a non-coarse (fine/mouse) pointer |

Key implications of the ordering:
- A device wider than 1180px is classified `desktop` **unless** `coarsePointer` is true — width alone never forces `tablet`/`phone` above 1180px.
- `coarsePointer` is the **only** signal that can demote a wide screen. There is no use of `navigator.maxTouchPoints`, `navigator.userAgent`, or `ontouchstart` anywhere in this function (this gap is the iPad Pro root cause).
- The `|| 1440` / `|| 1180` defaults bias toward `desktop`/`tablet` when `innerWidth` reports 0.

##### State wiring & reactivity

The raw function result is mirrored into React state and recomputed on viewport/pointer changes:

| Symbol | Location | Purpose |
|--------|----------|---------|
| `earthSimViewportPerfClass` (state) | `7888-7890` | `useState` initialized to `getEarthSimViewportPerfClass()` on the Earth Sim route, else `"desktop"`. |
| `setEarthSimViewportPerfClass` sync effect | `7860-7875` | Re-syncs on `window` `resize`, `visualViewport` `resize`, and `(pointer: coarse)` `change`. Off-route it is pinned to `"desktop"`. |
| `isEarthSimulatorRoute` | `7887` | `isEarthSimulatorPath()` (`3192-3199`) — true when `location.pathname` includes `/natureos/earth-simulator`. |

The function is **also called imperatively** (not via state) in several hot paths so the freshest class is used at call time: `2360`, `2385`, `2426`, `2683`, `7800`, `7803`, `7863`, `7889`, `8700`, `9071`, `11328`, `11523`, `11743`.

#### 2. What each class changes

##### 2a. Desktop overlay budget — `earthSimDesktopOverlayBudget`

Defined at `7891-7892`:

```ts
const earthSimDesktopOverlayBudget =
  !isEarthSimulatorRoute || earthSimViewportPerfClass === "desktop";
```

`true` off-route or when class is `desktop`; `false` for `tablet`/`phone` on the Earth Sim route. This is the master gate for heavy proposal/infrastructure overlays. Consumers:

| Consumer | Location | Effect when `earthSimDesktopOverlayBudget === false` (tablet/phone) |
|----------|----------|--------------------------------------------------------------------|
| `earthOverlayAssetsReady` effect | `14319-14323` | Early-returns and forces `earthOverlayAssetsReady = false`; overlay assets never schedule their `EARTH_SIM_ASSET_READY_DELAY_MS` (2500ms) load timer. |
| `canRenderEarthProjectDetails` | `14357-14359` | Requires `earthSimDesktopOverlayBudget` → live project detail overlays (Tijuana estuary live data, Mojave project, etc.) are suppressed on tablet/phone. Gates `MojaveProjectLayer` (`22442`) and `TijuanaEstuaryLayer` `liveDataEnabled` (`22400`). |
| `proposalOverlayAssetsReady` | `14363` | `= earthOverlayAssetsReady && earthSimDesktopOverlayBudget` → all `<ProposalOverlays>` toggles (`radioStations`, `factories`, `orbitalDebris`, `debrisCloud`, `railwayTrains`, `droneNoFly`, `cctv`) are forced off on tablet/phone (`22296-22311`). |
| `liveAuxiliaryLayersReady` | `14370` | `= proposalOverlayAssetsReady && earthSimDeferredDataReady` → live transit / railway aux layers (`22490`) suppressed. |
| `FungalAtlasLayer` mount gate | `22253` | `(!isEarthSimulatorRoute \|\| earthSimDesktopOverlayBudget \|\| fungalAtlasUserControlRef.current)` — the full-density GeoJSON fungal-atlas raster layer only mounts on desktop **unless** the user has explicitly toggled it (`fungalAtlasUserControlRef`). |

Related desktop-only helpers driven by the same `=== "desktop"` check:
- `earthSimStartupFungalRastersEnabled()` (`2682-2684`) → fungal-atlas rasters (AM/ECM mycorrhizal overlays) start enabled **only** on desktop; `applyEarthSimFungalRasterBudgetToLayers` (`2686+`) strips their initial enabled/opacity on tablet/phone.
- `warmInactiveRasters` (`8700`) → desktop pre-warms inactive AM/ECM raster paint (`FUNGAL_ATLAS_WARM_RASTER_OPACITY`); tablet/phone keep them `visibility:none`.
- Left/right panels default **open** only when class is `desktop` (`7800`, `7803`); they default closed on tablet/phone and an effect (`7833-7858`) force-closes both panels when `(max-width: 1180px), (pointer: coarse)` matches on the Earth Sim route.

##### 2b. Per-class DOM marker caps

DOM marker caps protect MapLibre's WebGL thread (documented starvation threshold ~1200 React marker nodes — `lod-policy`, `NATURE_DOM_MARKER_CAP = 1400` at `2864`). On the Earth Sim route they are tightened per class. Constants: `EARTH_SIM_DOM_MARKER_CAP = 900` (`2866`).

**Nature / Fungal markers — `getNatureDomMarkerCapForZoom(zoom, enabledKingdoms=7, earthSimulator, bounds)`** (`2417-2464`). A `kingdomScale = clamp(enabledKingdoms/7, 0.45, 1)` multiplies every tier; floors guarantee a minimum.

| Zoom tier | Phone cap (`2428-2435`) | Tablet cap (`2438-2445`) | Desktop cap (`2447-2454`) |
|-----------|------------------------|--------------------------|---------------------------|
| `zoom >= 11` | 420 | 760 | 900 |
| `zoom >= 9` | 340 | 660 | 850 |
| `zoom >= 7` | 280 | 560 | 760 |
| `zoom >= 5` | 220 | 460 | 680 |
| `zoom >= 3` | 160 | 320 | 520 |
| else | 110 | 220 | 360 |
| **post-scale floor / ceiling** | `max(60, floor(cap × kingdomScale))` | `min(900, max(120, floor(cap × kingdomScale)))` | `min(900, max(240, floor(cap × kingdomScale)))` |

(Off-route / non-Earth-Sim falls through to the generic tier caps capped at `NATURE_DOM_MARKER_CAP = 1400`, `2456-2463`.)

**Event markers — `getEventDomMarkerCapForZoom(zoom, earthSimulator)`** (`2382-2414`). Starts from `getEarthSimulatorEventDomCap(zoom)` (`lib/crep/earth-simulator-boot.ts:260-266`: 160/220/280/340/420 by zoom band), then `Math.min` with a per-class cap:

| Zoom tier | Base (`earth-simulator-boot.ts`) | Phone cap (`2387-2392`) | Tablet cap (`2396-2401`) | Desktop |
|-----------|----------------------------------|-------------------------|--------------------------|---------|
| `zoom >= 9` | 420 | 90 | 180 | base only |
| `zoom >= 7` | 340 | 80 | 160 | base only |
| `zoom >= 5` | 280 | 70 | 140 | base only |
| `zoom >= 3` | 220 | 60 | 120 | base only |
| else | 160 | 50 | 100 | base only |

Effective event cap = `min(base, classCap)`. Desktop uses `base` directly (no extra class cap).

**Related per-class API/store budgets:**
- `getEarthSimGlobalEventApiLimit()` (`2359-2364`): phone 220 / tablet 360 / desktop 420.
- Viewport-nature fetch `earthNatureCap` (`11753-11758`): phone 600 / tablet 1000 / desktop 1800 (applied as `Math.min` over the zoom-derived `zoomLimit`).
- Baked-iNat historical preload (`11328-11335`): enabled for `desktop` **or** `tablet` (or Vegas-in-viewport); effectively a phone exclusion, not a per-class budget.

##### 2c. Deferred-data staging delays

The Earth Sim route stages a "deferred data ready" gate so first paint isn't blocked by gated events/biodiversity/infra/nature. State `earthSimDeferredDataReady` (`7899`), effect at `7900-7918`:

```ts
const delayMs =
  earthSimViewportPerfClass === "phone" ? 2_500 :
  earthSimViewportPerfClass === "tablet" ? 1_750 :
  750;
const timer = window.setTimeout(() => setEarthSimDeferredDataReady(true), delayMs);
```

| Class | Deferred-data delay (`7908-7910`) |
|-------|-----------------------------------|
| `desktop` | 750 ms |
| `tablet` | 1750 ms |
| `phone` | 2500 ms |

The effect short-circuits (no staging) when `auditAllOffMode` or `assetIsolationMode` is active (`7906`). `earthSimDeferredDataReady` then gates: `shouldRenderHeavyOverlays` (`13721-13722` — clouds, waypoints, lookup widget, verified-entity feed), `canRenderEarthProjectDetails` (`14359`), and `liveAuxiliaryLayersReady` (`14370`).

> **Regression note (commit `de688bd`, Jun 12 2026 — "cut deferred-data delay to <=2.5s"):** these three delays were **recently cut from 35 s / 45 s / 55 s (desktop/tablet/phone) down to 0.75 s / 1.75 s / 2.5 s.** The same commit removed the deferred-gate early-return from the live entity pump (planes/vessels/sats now stream at startup). The previous multi-second tablet/phone staging used to give weaker GPUs ~45–55 s of breathing room before the heavy gated layers landed; that runway is now gone. See [Known critical issue](#known-critical-issue-ipad-pro-freezes-on-the-earth-simulator).

**Other per-class staggers driven by the class (not the deferred-data state):**
- Nature batch flush (`11522-11524`): on `EARTH_SIM_STAGED_BOOT`, desktop flushes at 250 ms, tablet/phone batch at 2000 ms.
- FPS sampler cadence (`9069-9073`): desktop samples a 1000 ms window every 2000 ms; tablet/phone sample 250 ms every 8000 ms (cheaper telemetry on weak devices).
- Fixed staging constants used alongside the class gates: `EARTH_PROJECT_DETAIL_DELAY_MS = 1500` (`807`), `EARTH_SIM_ASSET_READY_DELAY_MS = 2500` (`808`), `EARTH_SIM_LIVE_STREAM_DELAY_MS = 1200` (`earth-simulator-boot.ts:275`).

##### 2d. Phone slide-up shell — `CrepMobileShell`

`components/crep/mobile/crep-mobile-shell.tsx`. Wraps `<CREPDashboardClient>` in the loaders: `CREPDashboardLoader.tsx:191-193` and `CREPDashboardEmbedded.tsx:17-19` (always present in the tree; `disabled` prop passed for embedded). Phone detection is its **own** `useIsPhone()` hook (`56-67`) bound to `matchMedia("(max-width: 767px)")` — i.e. a pure 767px width breakpoint, **independent** of `getEarthSimViewportPerfClass` and its coarse-pointer logic.

Behavior (`263-292`):
- On phone, toggles `html.crep-mobile` class; off phone, removes it and resets drawer state.
- The class drives CSS in `app/globals.css:840-878`: desktop-only overlays (`[data-crep-desktop-only="true"]`, `.crep-desktop-overlay`, `[data-panel="fly-to"|"timeline"|"stats"]`) get `display:none`; `[data-panel="left"|"right"]` become fixed bottom-anchored bottom-sheets that slide up (`translateY(112%) → 0`) when `[data-mobile-open="true"]`.
- Provides a slim top bar (`CrepMobileTopBar`, `94-160`) with logo, live-entity count, left FAB (layers/filters, `SlidersHorizontal`), right FAB (intel feed, `Menu`), and a horizontally-scrolling project-chip row (`PROJECTS`, `80-92`: NYC/DC/LV/YOS/ZION/YELL/MENDO/BASE/HOME/OYS/GOF) firing a `crep:fly-to-project` `CustomEvent` (`283-287`).
- Bottom-sheet drawers (`CrepMobileDrawer`, `166-232`) lock body scroll while open and render `DefaultLeftPanel` / `DefaultRightPanel` capability summaries.

> **Caveat:** the exported `CrepMobileShell` body currently `return <>{children}</>` (`292`) — the top bar, FABs, and drawers are defined but not yet wired into the returned tree. The active phone chrome today is therefore the CSS in `globals.css` (panel→bottom-sheet transforms) toggled by the `html.crep-mobile` class, not the JSX top bar. **This phone shell keys off 767px width only and never engages for iPad-class widths.**

#### 3. Effective per-class profile (summary)

| Dimension | `desktop` | `tablet` | `phone` |
|-----------|-----------|----------|---------|
| Classifier trigger | width > 1180 **and** fine pointer | width ≤ 1180 **or** coarse pointer (and not phone) | width ≤ 767, or coarse & width ≤ 900 |
| Proposal/infra overlays (`earthSimDesktopOverlayBudget`) | **All on** | **Off** | **Off** |
| Fungal atlas rasters at startup | On (warm-cached) | Off (unless user-toggled) | Off (unless user-toggled) |
| Nature DOM cap (z≥9 / z<3, scale=1) | 850 / 360 (ceil 900) | 660 / 220 | 340 / 110 (floor 60) |
| Event DOM cap (z≥9 / z<3) | 420 / 160 | 180 / 60 | 90 / 50 |
| Global event API limit | 420 | 360 | 220 |
| Viewport-nature fetch cap | 1800 | 1000 | 600 |
| Deferred-data delay | **750 ms** | **1750 ms** | **2500 ms** |
| Nature batch flush | 250 ms | 2000 ms | 2000 ms |
| Side panels default | open | closed | closed |
| Baked-iNat preload | yes | yes | no (unless Vegas in viewport) |

---

#### Known critical issue — iPad Pro freezes on the Earth Simulator

**Symptom:** an Apple iPad Pro loading `/natureos/earth-simulator` **immediately freezes** (UI lock, GPU stall) rather than degrading to the tablet profile.

**Root cause — desktop misclassification:**

1. **Width is above the tablet ceiling.** iPad Pro reports CSS `window.innerWidth` of **1366px** (12.9″, landscape) or **1194px** (11″, landscape). Both are **> 1180**, so the `width <= 1180` branch at `CREPDashboardClient.tsx:2355` does not fire.
2. **Pointer is reported as fine, not coarse.** iPadOS Safari (a) defaults to requesting **desktop sites**, and (b) when a Magic Keyboard / trackpad (or hover-capable Apple Pencil) is attached, reports `(pointer: fine)` — so `window.matchMedia("(pointer: coarse)").matches` is **`false`** at line `2353`.
3. **No touch fallback exists.** `getEarthSimViewportPerfClass` (`2350-2357`) consults **only** `innerWidth` and `(pointer: coarse)`. It never checks `navigator.maxTouchPoints`, the user-agent, or `ontouchstart`. With width > 1180 and `coarsePointer === false`, both demotion branches are skipped and the function falls through to `return "desktop"` (`2356`).

**Consequence — a tablet GPU is handed the full desktop budget:**

- `earthSimDesktopOverlayBudget` becomes `true` (`7891-7892`) → **all** proposal/infra overlays mount: `radioStations`, `factories`, `orbitalDebris`, `debrisCloud`, `railwayTrains`, `droneNoFly`, `cctv`, plus the `FungalAtlasLayer` (`22253`) at full-density GeoJSON, plus live project-detail layers (Tijuana/Mojave) and live transit aux layers.
- DOM marker caps jump to the desktop tier — up to **900** nature markers (`EARTH_SIM_DOM_MARKER_CAP`, `2448-2454`) plus the desktop event cap (`2404`), well above the ~1200-node WebGL starvation threshold once events + nature + movers stack.
- Startup fungal-atlas rasters render and inactive rasters are pre-warmed (`2682-2684`, `8700`).
- Both side panels default **open** (`7800`, `7803`).

**Compounding regression:** the only remaining backpressure that used to absorb this — the staged deferred-data delay — was just gutted. Commit `de688bd` (Jun 12 2026) cut the delays from **35 s / 45 s / 55 s** to **0.75 s / 1.75 s / 2.5 s** (`7908-7910`) and removed the deferred-gate early-return from the live mover pump. So the misclassified iPad Pro now also gets the full event/biodiversity/infra/nature gated payload **plus** live planes/vessels/sats within ~750 ms (it's on the `desktop` 750 ms path) instead of the old ~35 s runway — guaranteeing a thundering-herd mount that the tablet-class GPU cannot survive.

The phone shell does not help: `CrepMobileShell`'s `useIsPhone()` (`crep-mobile-shell.tsx:60`) is a 767px-width check, so iPad widths never trigger `html.crep-mobile` either.

**Recommended fix (in `getEarthSimViewportPerfClass`, `CREPDashboardClient.tsx:2350-2357`):**

1. **Add a touch signal so any touch device is demoted to at most `tablet`.** iPadOS reports `navigator.maxTouchPoints > 1` even when it spoofs a fine pointer and a desktop UA:

   ```ts
   function getEarthSimViewportPerfClass(): "desktop" | "tablet" | "phone" {
     if (typeof window === "undefined") return "desktop";
     const width = window.innerWidth || 1440;
     const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
     // iPadOS spoofs (pointer: fine) + desktop UA with a trackpad, but still
     // reports maxTouchPoints > 1. Treat any multi-touch device as touch.
     const touchDevice =
       coarsePointer ||
       (typeof navigator !== "undefined" && (navigator.maxTouchPoints ?? 0) > 1);
     if (width <= 767 || (touchDevice && width <= 900)) return "phone";
     // Any touch device caps at "tablet" regardless of width (iPad Pro 1366px).
     if (width <= 1180 || touchDevice) return "tablet";
     return "desktop";
   }
   ```

   This forces the 1194px/1366px iPad Pro into `tablet`, which suppresses `earthSimDesktopOverlayBudget`, the full-density `FungalAtlasLayer`, the proposal/infra overlays, and drops the nature DOM cap from 900 → 660 (z≥9).

2. **Restore meaningful tablet staging.** The 1.75 s tablet deferred-data delay (`7909`) is too aggressive for a touch GPU now that the live mover pump is ungated. Reintroduce a longer tablet/phone runway (e.g. tablet ≥ 5–10 s, phone ≥ 10 s) so the heavy gated layers + live movers don't all mount inside ~2 s on weak hardware.

3. **Apply harder tablet caps.** Once iPad Pro lands in `tablet`, validate the tablet nature cap (660 at z≥9, `2439`) and event cap (180 at z≥9, `2397`) hold 30+ FPS on real iPad Pro hardware; tighten these tiers (and consider gating the live mover pump behind `earthSimDeferredDataReady` again for non-desktop classes) if QA still shows stalls.

**QA note:** because the classifier is width+pointer based, reproducing the freeze in a desktop browser requires emulating **both** a >1180px width **and** a fine pointer with `maxTouchPoints > 1` — DevTools device emulation that forces `(pointer: coarse)` will incorrectly demote to `tablet` and mask the bug. Test on physical iPad Pro hardware (both 11″ and 12.9″, landscape, with Magic Keyboard attached) and in iPadOS Safari's default desktop-site mode.

**Relevant files:** `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\app\dashboard\crep\CREPDashboardClient.tsx`, `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\crep\mobile\crep-mobile-shell.tsx`, `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\lib\crep\earth-simulator-boot.ts`, `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\app\globals.css`.

---

## 4. Layer Registry & Intel Feed

### Layer Registry & Intel Feed UI

This section documents the complete CREP layer registry (the `layers` React state array), the boot-time transform pipeline that overrides per-layer defaults, the `window.__crep_layers` debug hook, and the Intel Feed left-panel UI (tabs, ALL ON / ALL OFF, Legend/Filters, the AM/EcM opacity slider, and the observation/event/device count chips). The component file is `app/dashboard/crep/CREPDashboardClient.tsx` (23,189 lines); the Earth Simulator boot profile lives in `lib/crep/earth-simulator-boot.ts`; the panel-hide / layer-merge bridge lives in `lib/crep/metro-infra-layer-bridge.ts`.

#### Layer data model

Every layer is a `LayerConfig` (`CREPDashboardClient.tsx:2103-2114`):

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Stable layer key (used by toggles, the debug hook, and `__crep_setLayer`). |
| `name` | `string` | Display name shown in the legend / layer panel. |
| `category` | union | One of `events \| devices \| environment \| infrastructure \| human \| military \| pollution \| imagery \| telecom \| facilities \| projects` (`:2106`). Note: `imagery` is declared in the type but **no layer in the registry uses it** — satellite/3D imagery layers are filed under `environment`/`infrastructure`. |
| `icon` | `React.ReactNode` | Lucide icon (or inline glyph, e.g. the `AM`/`Ec`/🍄 spans). |
| `enabled` | `boolean` | **Literal** default in the array; later overridden by the boot transforms (see below). |
| `opacity` | `number` | 0–1. Overridden for fungal-atlas + base layers by `FUNGA_LAYER_OPACITY` / Earth-Sim opacity. |
| `color` | `string` | Hex marker/line color. |
| `description` | `string` | One-line purpose. |
| `dataStatus?` | `"real" \| "planned_real" \| "mock"` | Optional provenance tag (`:2101`). |
| `dataSource?` | `string` | Optional source label (surfaced into legend tooltips). |

The registry is declared at `CREPDashboardClient.tsx:9986` as `const [layers, setLayers] = useState<LayerConfig[]>(() => {...})`. The literal array spans **lines 9992–10304** and contains **exactly 183 layers**.

#### Boot transform pipeline (default `enabled` is NOT the literal value)

The array literal is wrapped in a chain of pure transforms before it becomes initial state (`:9987` and `:10305-10316`). Order of application:

1. `applyAssetIsolationToLayers(layers, assetIsolationMode, isolatedFungalLayerIds)` (`:3444`) — when `assetIsolationMode` is `"funga"` or `"assets-off"`, **every** layer is forced off except active fungal layers and the four base-context layers; opacity is reset from `FUNGA_LAYER_OPACITY`. Default mode is `null`, so this is normally a no-op.
2. `applyRequestedFungalLayersToLayers(layers, getRequestedFungalLayerIdsFromUrl())` (`:3457`, `:3145`) — if the URL has `?fungalLayers=` / `?fungalLayer=` / `?fungaLayers=`, only the requested fungal-atlas layers in `FUNGAL_ATLAS_LAYER_IDS` are enabled.
3. Filters-off branch (`:10306-10311`): if **not** Earth-Sim staged boot **and** `getInitialFiltersOffMode()` returns true (URL `?filters=off|0|false`, or `_filters` / `allFilters`; `:3120`), `applyFiltersOffToLayers` (`:3468`) forces **everything off except** the four `FUNGA_BASE_CONTEXT_LAYER_IDS`. Default (no `filters` param) is filters-**on**.
4. `applyForceOffToLayers` (`:3476`) — unconditionally forces the `FORCE_OFF_UNTIL_STABLE_LAYER_IDS` set off (`:2839-2860`): `photorealistic3D`, `mapbox3dBuildings`, `mapboxSatelliteStreets`, `orbitalDebris`, `debrisCloud`, `realisticClouds`, `earth2Forecast/Nowcast/Spore/Wind/Temp/Precip`, `sunEarthImpact`, **`militaryAir`, `militaryNavy`, `tanks`, `militaryDrones`** (no live collector — must never light up even on ALL ON), and **`jurisdictionFema`** (off at start and on ALL ON). This is the reason several layers whose literal is `enabled: true` (e.g. `militaryAir`) render off by default.
5. Earth-Sim branch (`:10313-10315`): when `EARTH_SIM_STAGED_BOOT` is true (default; disable with `NEXT_PUBLIC_EARTH_SIM_STAGED_BOOT=0`) **and** the path is `/natureos/earth-simulator`, `applyEarthSimulatorBootToLayers` then `applyEarthSimFungalRasterBudgetToLayers` rewrite the entire default set per the Earth-Sim profile (documented in its own subsection below).

Constants:
- `FUNGA_BASE_CONTEXT_LAYER_IDS` = `{ fungalAtlasECM, satImagery, bathymetry, topography }` (`:2931`) — the layers kept visible in all-off / filters-off / asset-isolation states.
- `FUNGA_LAYER_OPACITY` (`:2951`) — opacity overrides applied whenever the fungal/base layers are (re)initialized: `fungalAtlasMycelium 0.98`, `fungalAtlasAM 0.55`, `fungalAtlasECM 0.55`, `fungalAtlasRare 0.88`, `fungalAtlasProtected 0.72`, `fungalAtlasUncertainty 0.72`, `fungalAtlasFci 0.9`, `fungalAtlasSamples 1`, `satImagery 1`, `bathymetry 0.45`, `topography 0.55`.

> **Default-state reading guide for the tables below:** the `Default` column gives the **literal** `enabled` value from the array. For the actual on-screen default, apply the rules above: (a) any id in `FORCE_OFF_UNTIL_STABLE_LAYER_IDS` is **forced OFF** regardless of literal; (b) on the Earth Simulator route the Earth-Sim profile overrides everything (separate table). Layers forced off by rule (a) are flagged **⚠ forced-off** in the tables.

#### `window.__crep_layers` debug hook

Installed on mount at `CREPDashboardClient.tsx:12264-12270`:

```js
window.__crep_layers = () => layersRef.current.map(l => ({
  id: l.id, name: l.name, enabled: l.enabled, category: l.category, opacity: l.opacity,
}));
```

It returns a live snapshot of `[{ id, name, enabled, category, opacity }, ...]` for all 183 layers (note: `color`, `description`, `icon` are **not** included in the snapshot). After installing it, the component dispatches a `crep:qa-ready` CustomEvent with `detail.surface === "layers"` (`:12272`) so QA harnesses can await readiness. Companion hooks documented in the same region (`:12829-12841`): `window.__crep_setLayer(id, true|false|undefined)` to enable / disable / toggle any panel layer (a `crep:layer` CustomEvent fires on every change), and `window.__crep_flyTo('project-nyc'|'project-dc'|'project-vegas')` referenced in project-layer descriptions. The `__crep_layers()` snapshot is queried throughout the render path to read live enabled-state for power/transmission/data-center sublayers (e.g. `:19787`, `:20204`, `:20596`).

On the Earth Simulator route an additional boot-profile hook is published: `window.__crep_boot_profile` and `window.EARTH_SIMULATOR_BOOT_PROFILE` (`earth-simulator-boot.ts:337-345`, `:348-370`), exposing the staged-boot snapshot for console inspection.

---

#### Layer enumeration by category

All 183 layers, grouped by `category`, with literal default-enabled state. Category totals: **environment 19, devices 9, events 11, infrastructure 69, human 3, military 5, pollution 12, telecom 9, facilities 6, projects 40** (= 183).

##### environment (19 layers)

| id | Name | Default | Opacity | Purpose |
|----|------|---------|---------|---------|
| `fungi` | Nature Observations | ON | 0.6 | **Primary data source** — MINDEX biodiversity (iNaturalist/GBIF: fungi, plants, birds, insects, animals, marine) with GPS. Master toggle for all baked + live iNat dots. (`:9992`) |
| `biodiversity` | Biodiversity Hotspots | ON | 0.7 | High-biodiversity concentration areas. (`:10004`) |
| `fungalAtlasMycelium` | Mycelium Heat | OFF | 1 | MINDEX fungal-atlas predicted mycorrhizal-richness surface. (`:10005`) |
| `fungalAtlasAM` | AM Fungi Distribution | OFF | 0.55 | Native arbuscular-mycorrhizal richness layer. (`:10006`) |
| `fungalAtlasECM` | EcM Fungi Distribution | OFF | 0.55 | Native ectomycorrhizal richness layer. **Base-context layer** (stays on in all-off). (`:10007`) |
| `fungalAtlasRare` | Rare / Endemic Fungi | OFF | 0.5 | Native predicted-endemism layer. (`:10008`) |
| `fungalAtlasProtected` | Fungal Protected Areas | OFF | 0.36 | Native protected-area overlay (hidden in panel until WDPA polygons load). (`:10009`) |
| `fungalAtlasUncertainty` | High Uncertainty Areas | OFF | 0.4 | Native high-uncertainty overlay. (`:10010`) |
| `fungalAtlasFci` | FCI Probe Priority | OFF | 0.58 | MYCA priority surface; hidden until a real MINDEX-backed FCI model exists. (`:10011`) |
| `fungalAtlasSamples` | Fungal Sequence Samples | OFF | 1 | Zoom-gated GlobalFungi/GlobalAMFungi/GSMc sample points; raw sequences stay server-side. (`:10012`) |
| `weather` | Weather Overlay | ON | 0.6 | Temperature, precipitation, wind — affects fungal growth. (`:10013`) |
| `buoys` | Ocean Buoys (NDBC) | ON | 0.9 | NOAA NDBC ocean buoys — wave height, water temp, wind, pressure (~1300 stations). (`:10014`) |
| `liveAqi` | Air Quality (AirNow) | ON | 0.9 | Live AQI from ~2,000 AirNow monitors, hourly, EPA color scale; click → LiveAQIWidget. (`:10077`) |
| `bathymetry` | Ocean Bathymetry | ON | 0.45 | GEBCO 2024 ocean-depth shading (200 m). **Base-context layer.** (`:10149`) |
| `topography` | Land Topography | ON | 0.55 | AWS Terrain Tiles hillshade (30 m DEM, GPU hillshade). **Base-context layer.** (`:10150`) |
| `satImagery` | Satellite Imagery (HD) | ON | 1.0 | ESRI World Imagery to zoom 19, free/no key. **Base-context layer.** (`:10231`) |
| `mapboxSatelliteStreets` | Mapbox Satellite Streets (HD hybrid) | OFF ⚠ forced-off | 0.95 | Mapbox satellite-streets-v12 hybrid (needs `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`); alternate basemap, competes with ESRI. (`:10232`) |
| `photorealistic3D` | Photorealistic 3D (Google / Cesium) | OFF ⚠ forced-off | 1.0 | Google Map Tiles photogrammetry / Cesium fallback; pulls GBs of mesh. (`:10234`) |
| `realisticClouds` | Realistic Clouds (Earth-2 + Satellite) | OFF ⚠ forced-off | 0.7 | NASA GIBS MODIS cloud texture + RainViewer radar composite + sun-angle shadows. (`:10235`) |

> The eight `fungalAtlas*` ids constitute the fungal-atlas group; `fungalAtlasAM`/`fungalAtlasECM` are driven by the mutually-exclusive `mycorrhizalMode` state, not their raw `enabled` flag (see Legend/Filters). `biodiversity`, `weather`, `liveAqi`, `realisticClouds` are also tagged into the Nature tab's "Environment / Conditions" legend via `NATURE_ENVIRONMENT_LAYER_IDS` (`:2710`).

##### devices (9 layers)

| id | Name | Default | Opacity | Purpose |
|----|------|---------|---------|---------|
| `mycobrain` | MycoBrain Devices | ON | 1 | All MycoBrain-powered devices (ESP32-S3 + BME688 + MQTT/MDP/MMP via Jetson-MycoBrain bridge). (`:9994`) |
| `devMushroom1` | Mushroom 1 | ON | 1 | Mushroom 1 fruiting-body monitor. (`:9995`) |
| `devHyphae1` | Hyphae 1 | ON | 1 | Hyphae 1 mycelium-network VOC sensor. (`:9996`) |
| `sporebase` | SporeBase | ON | 1 | SporeBase environmental spore-detection sensors. (`:9997`) |
| `devMycoNode` | MycoNode | ON | 1 | MycoNode edge compute node (Jetson + MycoBrain bridge). (`:9998`) |
| `devAlarm` | Alarm | ON | 1 | Alarm sensor (MycoBrain-powered event trigger). (`:9999`) |
| `devPsathyrella` | Psathyrella (Buoy) | ON | 1 | Aquatic MycoBrain buoy — marine spore + water chemistry. (`:10000`) |
| `partners` | Partner Networks | ON | 0.8 | Third-party research stations. (`:10001`) |
| `smartfence` | Smart Fence Network | ON | 1 | MycoBrain fence sensors for wildlife corridors. (`:10002`) |

##### events (11 layers)

| id | Name | Default | Opacity | Purpose |
|----|------|---------|---------|---------|
| `earthquakes` | Seismic Activity | ON | 1 | Real-time USGS earthquake data. (`:10019`) |
| `volcanoes` | Volcanic Activity | ON | 1 | Active volcanoes and eruption alerts. (`:10020`) |
| `wildfires` | Active Wildfires | ON | 0.9 | NASA FIRMS fire detections. (`:10021`) |
| `storms` | Storm Systems | ON | 0.8 | NOAA storm tracking and forecasts. (`:10022`) |
| `floods` | Floods & Hydrology | ON | 0.85 | Active flood, tsunami, landslide alerts. (`:10023`) |
| `solar` | Space Weather | ON | 0.7 | Solar flares, CME, geomagnetic storms. (`:10024`) |
| `lightning` | Lightning Activity | ON | 0.8 | Real-time global lightning strikes. (`:10025`) |
| `tornadoes` | Tornado Tracking | ON | 0.9 | Active tornado cells and warnings. (`:10026`) |
| `auroraOverlay` | Aurora Forecast | ON | 0.5 | NOAA SWPC aurora-probability polar overlay. (`:10090`) |
| `eagleEyeEvents` | Eagle Eye — Live Events | ON | 0.9 | Ephemeral social video (YouTube Live + Bluesky/Mastodon/Twitch/X geo media); pulsing yellow ring, 24 h TTL, color by location-confidence tier. (`:10120`) |
| `sunEarthImpact` | Sun→Earth Impact | OFF ⚠ forced-off | 0.8 | Live flares/CME arrival, aurora ovals, sunspot→earthspot projection, cyclone correlation lines. (`:10236`) |

##### infrastructure (69 layers)

| id | Name | Default | Opacity | Purpose |
|----|------|---------|---------|---------|
| `aviation` | Air Traffic (Live) | ON | 0.9 | FlightRadar24 live aircraft positions. *(panel-merged into Device chips — `MOVER_DUPLICATE_PANEL_IDS`)* (`:10031`) |
| `aviationRoutes` | Flight Trajectories | ON | 0.7 | Aircraft route paths airport-to-airport. *(mover-merged)* (`:10032`) |
| `ships` | Ships (AIS Live) | ON | 0.9 | AISstream live vessel positions. *(mover-merged)* (`:10033`) |
| `shipRoutes` | Ship Trajectories | ON | 0.7 | Vessel route paths port-to-port. *(mover-merged)* (`:10034`) |
| `fishing` | Fishing Fleets | ON | 0.7 | Global Fishing Watch data. *(mover-merged)* (`:10035`) |
| `containers` | Container Ships | ON | 0.6 | Shipping-container trajectories. *(mover-merged)* (`:10036`) |
| `vehicles` | Land Vehicles | ON | 0.4 | Aggregate vehicle traffic patterns. (`:10037`) |
| `drones` | Drones & UAVs | ON | 0.8 | Known drone activity and flights. (`:10038`) |
| `satellites` | Satellites (TLE Live) | ON | 0.9 | CelesTrak live satellite positions. *(mover-merged)* (`:10039`) |
| `liveTransit` | Live Transit (Trains/Buses) | ON | 0.9 | Live US transit (MTA/WMATA/BART/MBTA/511-Bay/CTA/TriMet/MARTA/Amtrak/SEPTA/Metrolink/DART), polled `/api/transit/all` every 15 s. (`:10072`) |
| `ports` | Global Seaports | ON | 0.9 | 3,600+ seaports (WPI/NGA + UNCTAD + MarineCadastre + MINDEX). (`:10108`) |
| `cctv` | CCTV / Webcams | ON | 0.85 | Public webcams + Shinobi CCTV (MINDEX `crep.cctv_cameras` + Shinobi on MAS VM). (`:10112`) |
| `eagleEyeCameras` | Eagle Eye — Cameras | ON | 0.9 | Permanent video — Shinobi + Caltrans/511 + Windy + EarthCam + NPS/USGS + ALERTWildfire/HPWREN + Surfline. (`:10119`) |
| `eiaOperating` | EIA-860M Operating | ON | 0.85 | EIA Feb 2026 — 27,716 operating utility-scale generators. *(panel-merged into "Power Plants (all sources)")* (`:10128`) |
| `eiaPlanned` | EIA-860M Planned (Projected) | ON | 0.9 | EIA-860M — 1,946 planned generators. *(power-merged)* (`:10129`) |
| `eiaRetired` | EIA-860M Retired | ON | 0.7 | EIA-860M — 7,201 retired generators. *(power-merged)* (`:10130`) |
| `eiaCanceled` | EIA-860M Canceled | ON | 0.6 | EIA-860M — 1,605 canceled/postponed generators. *(power-merged)* (`:10131`) |
| `radar` | Radar Sites | ON | 0.8 | NEXRAD + Mycosoft SDR + FAA ASR coverage rings. (`:10132`) |
| `orbitalDebris` | Orbital Debris (Catalogued) | OFF ⚠ forced-off | 0.7 | ~22k tracked debris via CelesTrak + SatCat + analyst; GPU frame-drop risk. (`:10136`) |
| `debrisCloud` | Debris 1-10cm (Statistical) | OFF ⚠ forced-off | 0.45 | 1.2M sub-catalog debris via NASA ODPO ORDEM density cloud; crashes browser if on. (`:10137`) |
| `substations` | Substations | ON | 0.82 | HIFLD + OSM + MINDEX substations; viewport+zoom gated. (`:10140`) |
| `jurisdictionCountry` | Country Borders | ON | 0.6 | Country admin boundaries from basemap vector tiles; dashed green, zoom 1+. (`:10245`) |
| `jurisdictionState` | State / Province Borders | ON | 0.9 | State/province outlines + labels (sky blue); zoom 2+, labels z3–11. (`:10246`) |
| `jurisdictionCounty` | County / District Borders | ON | 0.3 | County/district boundaries; dashed purple, zoom 7+. (`:10247`) |
| `jurisdictionFema` | FEMA Regions | OFF ⚠ forced-off | 0.4 | FEMA 10-region fill/border/titles; off at start and on ALL ON. (`:10248`) |
| `mapbox3dBuildings` | 3D Buildings (Mapbox extrusions) | OFF ⚠ forced-off | 0.85 | Mapbox building extrusions at z≥14; feeds MYCA device-placement LOS logic. (`:10233`) |
| `railwayTracks` | Railway Network | ON | 0.75 | OpenRailwayMap global tracks + stations + electrification. (`:10151`) |
| `railwayTrains` | Live Trains | ON | 0.9 | Amtrak Track-A-Train live positions (30 s refresh). (`:10152`) |
| `droneNoFly` | Drone No-Fly Zones | OFF | 0.18 | FAA UAS restricted + OpenAIP airspace (CTR/TRA/parks); off — fill polygons block underlying clicks. (`:10153`) |
| `sdtjHospitals` | Hospitals (SD/TJ) | ON | 0.85 | OSM hospitals/clinics in SD County + Tijuana bbox (136). *(SD/TJ detail — hidden in panel)* (`:10159`) |
| `sdtjPolice` | Police / Fire / Border (SD/TJ) | ON | 0.85 | OSM police/fire/border posts in SD+TJ (128). *(SD/TJ detail)* (`:10160`) |
| `sdtjSewage` | Sewage Works (SD/TJ) | ON | 0.6 | OSM sewage/wastewater (SBIWTP etc.). *(SD/TJ detail)* (`:10161`) |
| `sdtjCellTowers` | Cell Towers (OSM, SD/TJ detail) | ON | 0.8 | OSM comms towers/masts in SD+TJ (449). *(SD/TJ detail)* (`:10162`) |
| `sdtjAmFmAntennas` | AM/FM / TV antennas (SD/TJ) | ON | 0.85 | OSM broadcast antennas (84). *(SD/TJ detail)* (`:10163`) |
| `sdtjMilitary` | Military installations (OSM) | ON | 0.5 | OSM military boundaries/landuse SD+TJ (229). *(SD/TJ detail)* (`:10164`) |
| `sdtjDataCenters` | Data Centers (SD/TJ detail) | ON | 0.85 | OSM data centers (13). *(SD/TJ detail)* (`:10165`) |
| `nycHospitals` | NYC — Hospitals | ON | 0.85 | OSM 5-borough + NJ approach hospitals (~400). *(metro detail — hidden in panel)* (`:10171`) |
| `nycPolice` | NYC — Police / Fire | ON | 0.85 | NYPD + FDNY precincts/firehouses. *(metro detail)* (`:10172`) |
| `nycSewage` | NYC — Sewage Works | ON | 0.6 | NYC DEP WWTPs. *(metro detail)* (`:10173`) |
| `nycCellTowers` | NYC — Cell Towers (detail) | ON | 0.8 | OSM comms towers/masts NYC. *(metro detail)* (`:10174`) |
| `nycAmFmAntennas` | NYC — AM/FM / TV antennas | ON | 0.85 | OSM broadcast antennas. *(metro detail)* (`:10175`) |
| `nycMilitary` | NYC — Military installations | ON | 0.5 | OSM military NYC bbox. *(metro detail)* (`:10176`) |
| `nycDataCenters` | NYC — Data Centers | ON | 0.85 | OSM data centers (60 Hudson etc.). *(metro detail)* (`:10177`) |
| `nycTransitSubway` | NYC — Subway Stations | ON | 0.9 | MTA subway stations. *(metro detail)* (`:10178`) |
| `nycTransitRail` | NYC — Rail Stations (LIRR/NJT/Amtrak) | ON | 0.85 | LIRR/Metro-North/NJT/Amtrak. *(metro detail)* (`:10179`) |
| `nycAirports` | NYC — Airports | ON | 0.9 | JFK/LGA/Newark/Teterboro/heliports. *(metro detail)* (`:10180`) |
| `nycGovtEmbassy` | NYC — Government / Embassy / Consulate | ON | 0.8 | UN, consulates, courthouses, city gov. *(metro detail)* (`:10181`) |
| `dcHospitals` | DC — Hospitals | ON | 0.85 | OSM hospitals DC+Arlington+Bethesda+Walter Reed (152). *(metro detail)* (`:10194`) |
| `dcPolice` | DC — Police / Fire / USSS | ON | 0.85 | MPD+USSS+Capitol Police+AFD+Arlington fire (117). *(metro detail)* (`:10195`) |
| `dcSewage` | DC — Sewage Works | ON | 0.6 | DC Water + regional WWT (Blue Plains). *(metro detail)* (`:10196`) |
| `dcCellTowers` | DC — Cell Towers (detail) | ON | 0.8 | 530 OSM comms towers NCR. *(metro detail)* (`:10197`) |
| `dcAmFmAntennas` | DC — AM/FM / TV antennas | ON | 0.85 | OSM broadcast antennas (25). *(metro detail)* (`:10198`) |
| `dcMilitary` | DC — Military installations | ON | 0.5 | Pentagon/Ft Myer/JB Andrews/Ft Meade/NSA (86). *(metro detail)* (`:10199`) |
| `dcDataCenters` | DC — Data Centers | ON | 0.85 | Ashburn + NoVA + DC proper. *(metro detail)* (`:10200`) |
| `dcTransitSubway` | DC — WMATA Metro Stations | ON | 0.9 | WMATA Metrorail. *(metro detail)* (`:10201`) |
| `dcTransitRail` | DC — Rail Stations (MARC/VRE/Amtrak) | ON | 0.85 | MARC/VRE/Amtrak Union. *(metro detail)* (`:10202`) |
| `dcAirports` | DC — Airports | ON | 0.9 | Reagan/Dulles/BWI/Andrews. *(metro detail)* (`:10203`) |
| `dcGovtEmbassy` | DC — Government / Embassy / IC | ON | 0.8 | Embassies, WH/Capitol, depts, IC (CIA/NGA/NSA). *(metro detail)* (`:10204`) |
| `vegasHospitals` | Vegas — Hospitals | ON | 0.85 | UMC/Sunrise/Valley/Summerlin/Nellis. *(metro detail)* (`:10216`) |
| `vegasPolice` | Vegas — Police / Fire | ON | 0.85 | LVMPD/Clark/NLV/Henderson + fire. *(metro detail)* (`:10217`) |
| `vegasSewage` | Vegas — Sewage Works | ON | 0.6 | Clark County WRD + Henderson WRF. *(metro detail)* (`:10218`) |
| `vegasCellTowers` | Vegas — Cell Towers (detail) | ON | 0.8 | OSM comms towers LV Valley. *(metro detail)* (`:10219`) |
| `vegasAmFmAntennas` | Vegas — AM/FM / TV antennas | ON | 0.85 | OSM broadcast antennas LV+Black Mtn. *(metro detail)* (`:10220`) |
| `vegasMilitary` | Vegas — Military installations | ON | 0.5 | Nellis/Creech/NTTR (OSM perimeters). *(metro detail)* (`:10221`) |
| `vegasDataCenters` | Vegas — Data Centers | ON | 0.85 | Switch SUPERNAP + Summerlin DCs. *(metro detail)* (`:10222`) |
| `vegasTransitSubway` | Vegas — Monorail + LVCVA tram | ON | 0.9 | LV Monorail + Mandalay tram + Vegas Loop. *(metro detail)* (`:10223`) |
| `vegasTransitRail` | Vegas — Rail (Brightline / Amtrak) | ON | 0.85 | Amtrak bus/rail + Brightline LV-LA. *(metro detail)* (`:10224`) |
| `vegasAirports` | Vegas — Airports | ON | 0.9 | LAS + VGT + HND + heliports. *(metro detail)* (`:10225`) |
| `vegasGovtEmbassy` | Vegas — Government | ON | 0.8 | City Hall + Clark County + federal courthouse + LVCVA. *(metro detail)* (`:10226`) |

> Metro detail layers (NYC/DC/Vegas `*Hospitals/Police/Sewage/CellTowers/AmFmAntennas/Military/DataCenters/TransitSubway/TransitRail/Airports/GovtEmbassy`) and the `sdtj*` set are **hidden from the layer panel** by `isHiddenFromLayerPanel` (`metro-infra-layer-bridge.ts:42-74,181`); they are driven by their parent category filters, not by individual chips. The `aviation/aviationRoutes/ships/shipRoutes/fishing/containers/satellites` movers are hidden from the infra panel (`MOVER_DUPLICATE_PANEL_IDS`, `:131`) because the **Devices tab** filter chips own them.

##### human (3 layers)

| id | Name | Default | Opacity | Purpose |
|----|------|---------|---------|---------|
| `population` | Population Density | ON | 0.5 | Global population-density heatmap. *(removed from infra panel — `REMOVED_FROM_INFRA_PANEL_IDS`)* (`:10041`) |
| `humanMovement` | Human Movement | ON | 0.6 | Aggregated human-mobility patterns. *(removed from infra panel)* (`:10042`) |
| `events_human` | Human Events | ON | 0.7 | Gatherings, protests, migrations. *(removed from infra panel)* (`:10043`) |

##### military (5 layers)

| id | Name | Default | Opacity | Purpose |
|----|------|---------|---------|---------|
| `militaryBases` | Military Bases (Live) | ON | 0.9 | Real military installations via OSM — US + global. (`:10047`) |
| `militaryAir` | Military Aircraft | OFF ⚠ forced-off | 0.9 | Military aviation via ADS-B (literal `true`, but in `FORCE_OFF` set — no live collector). (`:10048`) |
| `militaryNavy` | Naval Vessels | OFF ⚠ forced-off | 0.9 | Military ships via AIS (forced-off — no live collector). (`:10049`) |
| `tanks` | Ground Forces | OFF ⚠ forced-off | 0.8 | Tanks, carriers, ground vehicles (forced-off — no live collector). (`:10050`) |
| `militaryDrones` | Military UAVs | OFF ⚠ forced-off | 0.8 | Military drone operations (forced-off — no live collector). (`:10051`) |

> Of the 5 military layers, only `militaryBases` actually renders by default; the other four are in `FORCE_OFF_UNTIL_STABLE_LAYER_IDS` and stay off even on ALL ON.

##### pollution (12 layers)

| id | Name | Default | Opacity | Purpose |
|----|------|---------|---------|---------|
| `factories` | Factories & Plants | ON | 0.7 | Industrial facilities globally. (`:10055`) |
| `co2Sources` | CO₂ Emission Sources | ON | 0.6 | Major CO₂ emitters/hotspots. (`:10056`) |
| `methaneSources` | Methane Sources | ON | 0.6 | Methane leaks and emission sources. (`:10057`) |
| `oilGas` | Oil & Gas Infrastructure | ON | 0.5 | Refineries, pipelines, platforms. (`:10058`) |
| `powerPlants` | Power Plants | ON | 0.9 | Thermal/nuclear/renewable (OpenGridWorks-style). **Panel-merge anchor → "Power Plants (all sources)"** drives `powerPlants + powerPlantsG + eiaOperating/Planned/Retired/Canceled`. (`:10059`) |
| `metalOutput` | Metal & Mining | ON | 0.5 | Mining operations and output. (`:10060`) |
| `waterPollution` | Water Contamination | ON | 0.6 | Water-pollution events and sources. (`:10061`) |
| `powerPlantsG` | Global Power Plants | ON | 0.85 | 34,936 plants / 167 countries (WRI v1.3.0). *(power-merged)* (`:10134`) |
| `factoriesG` | Global Factories | ON | 0.7 | Climate TRACE + OSM + GEM, bbox-scoped. (`:10135`) |
| `txLinesGlobal` | Global Transmission Lines | ON | 0.6 | Global HV grid (HIFLD US + OpenInfraMap + OSM + MINDEX), 22,760 lines, PMTiles. **Panel-merge anchor → "Transmission Lines"** drives `transmissionLines + txLinesGlobal + txLinesFull`. (`:10138`) |
| `txLinesFull` | Transmission Lines (ALL voltages) | ON | 0.7 | Full HIFLD + OSM, 52,244 lines incl. 69/115/138/230 kV feeders, PMTiles. *(transmission-merged)* (`:10139`) |
| `txLinesSub` | Sub-Transmission (OSM) | ON | 0.65 | OSM community ≤115 kV feeders (dashed); rebuilt weekly. (`:10146`) |

##### telecom (9 layers)

| id | Name | Default | Opacity | Purpose |
|----|------|---------|---------|---------|
| `submarineCables` | Submarine Cables | ON | 0.8 | Undersea fiber-optic cables. (`:10063`) |
| `dataCenters` | Data Centers (all sources) | ON | 0.9 | **Unified DC toggle** → OSM + global + IM3 atlas + IM3 footprints; metro DC detail follows automatically. (`:10064`) |
| `cellTowers` | Cell Towers | ON | 0.7 | Cellular tower locations. **Cell-tower merge anchor** → `cellTowers + cellTowersG`. (`:10065`) |
| `signalHeatmap` | Signal Coverage | ON | 0.4 | Approximate cellular signal-coverage heatmap. (`:10094`) |
| `im3DataCenters` | Data Centers (IM3 Atlas) | ON | 0.9 | PNNL IM3 Atlas v2026.02.09 — 1,479 US DCs. *(DC-merged)* (`:10126`) |
| `im3DataCenterFootprints` | DC Footprints (IM3 buildings) | ON | 0.85 | IM3 building/campus polygons (1,374 shapes, zoom ≥11); click → InfraAsset widget. *(DC-merged)* (`:10127`) |
| `radioStations` | Radio Stations | ON | 0.8 | 44,000+ AM/FM/TV + KiwiSDR + Mycosoft SDR. (`:10133`) |
| `dataCentersG` | Global Data Centers | ON | 0.85 | OSM + PeeringDB + MINDEX (~5–7k), bbox-scoped. *(DC-merged)* (`:10147`) |
| `cellTowersG` | Global Cell Towers | ON | 0.6 | OpenCelliD (47M) + FCC ASR + OSM, PMTiles, bbox-scoped. *(cell-merged)* (`:10148`) |

> The four `DATA_CENTER_LAYER_IDS` (`dataCenters, dataCentersG, im3DataCenters, im3DataCenterFootprints`) collapse to one panel chip; `dataCentersG/im3DataCenters/im3DataCenterFootprints` are panel-hidden duplicates (`metro-infra-layer-bridge.ts:84-88`).

##### facilities (6 layers)

| id | Name | Default | Opacity | Purpose |
|----|------|---------|---------|---------|
| `hospitals` | Hospitals | ON | 0.7 | Hospital locations from OSM. (`:10098`) |
| `fireStations` | Fire Stations | ON | 0.7 | Fire-station locations from OSM. (`:10099`) |
| `universities` | Universities | ON | 0.6 | University/college locations. (`:10100`) |
| `policeStations` | Police Stations | ON | 0.75 | Police/sheriff/public-safety from OSM + baked civic data. (`:10101`) |
| `libraries` | Libraries | ON | 0.7 | Public libraries from OSM + baked civic data. (`:10102`) |
| `civicFacilities` | Civic Buildings | ON | 0.8 | City/town halls, courthouses, municipal buildings. (`:10103`) |

##### projects (40 layers)

Sub-grouped by project. All literal `enabled: true` **except** `mojaveINat`, `mojaveBroadcast`, `mojaveCell` (literal `false`). Opacity 1.0 unless noted.

**Project anchors (category `projects`, fly-to enabled):**

| id | Name | Default | Opacity | Purpose |
|----|------|---------|---------|---------|
| `projectNyc` | Project NYC — anchor + perimeter | ON | 1.0 | NYC anchor + 5-borough perimeter + landmarks; `__crep_flyTo('project-nyc')`. (`:10170`) |
| `projectDc` | Project DC — anchor + perimeter | ON | 1.0 | DC anchor + NCR perimeter + landmarks; `__crep_flyTo('project-dc')`. (`:10193`) |
| `projectVegas` | Project Las Vegas — anchor + perimeter | ON | 1.0 | Vegas anchor + metro perimeter + landmarks; `__crep_flyTo('project-vegas')`. (`:10215`) |

**Project Oyster (Tijuana Estuary / Imperial Beach / south SD) — 22 layers:**

| id | Name | Default | Opacity | Purpose |
|----|------|---------|---------|---------|
| `tijuanaEstuary` | Project Oyster — Master toggle | ON | 1.0 | Master switch for all Oyster sub-layers (federated pollution/env data, TJ River Valley / IB / south SD). (`:10261`) |
| `projectOysterPerimeter` | Oyster — Perimeter polygon | ON | 1.0 | Operational-zone polygon, teal dashed. (`:10262`) |
| `projectOysterSites` | Oyster — Restoration sites | ON | 1.0 | MYCODAO oyster-reef deployment/monitoring sites. (`:10263`) |
| `h2sHotspot` | Oyster — H₂S hotspot (SDAPCD) | ON | 1.0 | Hydrogen-sulfide heatmap from 5 SDAPCD stations. (`:10264`) |
| `tjRiverFlow` | Oyster — TJ River + IBWC discharge | ON | 1.0 | TJ River course + IBWC station 11013300 discharge. (`:10265`) |
| `tjBeachClosures` | Oyster — Beach closures (SD DEH) | ON | 1.0 | IB (>1000 days), Coronado, TJ Slough closures. (`:10266`) |
| `tjNavyTraining` | Oyster — Navy training waters | ON | 1.0 | NSWC/Silver Strand/NAB Coronado sewage-exposure waters. (`:10267`) |
| `tjEstuaryMonitors` | Oyster — NERR research monitors | ON | 1.0 | TJ River NERR facility + monitors. (`:10268`) |
| `oysterCameras` | Oyster — Cameras | ON | 1.0 | Surf cams + CBP POE + Caltrans CCTV + NOAA buoy cams + EarthCam. (`:10270`) |
| `oysterBroadcast` | Oyster — AM/FM/TV broadcast | ON | 1.0 | FCC AM/FM/TV across SD/TJ corridor. (`:10271`) |
| `oysterCell` | Oyster — Cell towers | ON | 1.0 | Cell sites IB/Coronado/Tijuana overlap. (`:10272`) |
| `oysterPower` | Oyster — Power infrastructure | ON | 1.0 | SDG&E substations, Otay Mesa, South Bay, San Onofre. (`:10273`) |
| `oysterNature` | Oyster — Live iNat observations | ON | 1.0 | ~200/fetch iNat in TJ Estuary/IB/Silver Strand/La Jolla. (`:10274`) |
| `oysterPlume` | Oyster — UCSD PFM plume tracker | ON | 1.0 | SCCOOS/Scripps PFM sewage-plume + FIB modeling. (`:10275`) |
| `oysterEmit` | Oyster — NASA EMIT methane plumes | ON | 1.0 | NASA EMIT (ISS) methane/CO₂/dust plumes. (`:10276`) |
| `oysterCrossBorder` | Oyster — Scripps cross-border | ON | 1.0 | Scripps cross-border water/aerosol/H₂S/VOC. (`:10277`) |
| `oysterRails` | Oyster — Rails + Trolley | ON | 1.0 | MTS Blue Line, BNSF, Coaster, Sprinter. (`:10278`) |
| `oysterCaves` | Oyster — Sea caves + coastal | ON | 1.0 | Sunset Cliffs / La Jolla / Point Loma formations. (`:10279`) |
| `oysterGovernment` | Oyster — Government facilities | ON | 1.0 | CBP San Ysidro, Navy bases, NOAA, EPA R9, USCG. (`:10280`) |
| `oysterTourism` | Oyster — Tourism + landmarks | ON | 1.0 | Hotel del Coronado, IB Pier, Border Field, USS Midway. (`:10281`) |
| `oysterSensors` | Oyster — Environmental sensors | ON | 1.0 | EPA AQS, NOAA tide, USGS stream, SDAPCD, Scripps Pier, NERR sondes. (`:10282`) |
| `oysterHeatmap` | Oyster — Pollution heatmap | ON | 0.55 | Combined H₂S + PM2.5 + sewage + bacteria intensity. (`:10283`) |

**Project Goffs (Mojave National Preserve / east Mojave) — 15 layers:**

| id | Name | Default | Opacity | Purpose |
|----|------|---------|---------|---------|
| `mojavePreserve` | Goffs — Mojave Preserve boundary | ON | 1.0 | NPS MOJA unit boundary (live NPS service). (`:10289`) |
| `mojaveGoffs` | Goffs — MYCOSOFT project site | ON | 1.0 | Biz-dev thesis site (Garret, completed Apr 18 2026). (`:10290`) |
| `mojaveWilderness` | Goffs — Wilderness POIs | ON | 1.0 | Cima Dome, Kelso Dunes, Mitchell Caverns, etc. (`:10291`) |
| `mojaveClimate` | Goffs — Climate stations | ON | 1.0 | KEED/KDAG/KIFP ASOS + RAWS/COOP. (`:10292`) |
| `mojaveINat` | Goffs — Live iNat observations | **OFF** | 1.0 | ~200/fetch iNat (desert flora/fauna). Literal `false`. (`:10293`) |
| `mojaveCameras` | Goffs — Cameras | ON | 1.0 | HPWREN + ALERTWildfire + Caltrans I-40 + NPS Kelso. (`:10295`) |
| `mojaveBroadcast` | Goffs — AM/FM broadcast | **OFF** | 1.0 | FCC AM/FM east Mojave + Colorado River. Literal `false`. (`:10296`) |
| `mojaveCell` | Goffs — Cell towers | **OFF** | 1.0 | FCC ASR + OpenCelliD east Mojave. Literal `false`. (`:10297`) |
| `mojavePower` | Goffs — Power infrastructure | ON | 1.0 | Ivanpah Solar, LUGO/Eldorado/Kramer/Mead, LADWP HVDC. (`:10298`) |
| `mojaveRails` | Goffs — Rails | ON | 1.0 | BNSF Cajon + UP Caliente + Goffs/Kelso depots + Amtrak SW Chief. (`:10299`) |
| `mojaveCaves` | Goffs — Caves + lava tubes | ON | 1.0 | Mitchell Caverns, Crystal Cave, Amboy Crater tubes. (`:10300`) |
| `mojaveGovernment` | Goffs — Government facilities | ON | 1.0 | NPS MOJA HQ, BLM, CBP, Ft Irwin NTC, Edwards AFB, USGS. (`:10301`) |
| `mojaveTourism` | Goffs — Tourism + landmarks | ON | 1.0 | Goffs Schoolhouse, Kelso Depot, Amboy Crater, Route 66. (`:10302`) |
| `mojaveSensors` | Goffs — Environmental sensors | ON | 1.0 | EPA AQS, USGS gauges, RAWS, tortoise telemetry, SNOTEL, seismic, Bortle-2 dark-sky, NSRDB. (`:10303`) |
| `mojaveHeatmap` | Goffs — Environmental heatmaps | ON | 0.55 | Fire-risk + biodiversity-density + aridity-index. (`:10304`) |

> Project layers (ids beginning `tijuana/project/oyster/mojave/nyc/dc/vegas/sdtj/h2s/tj`, matched by `PROJECT_LAYER_PREFIXES`, `earth-simulator-boot.ts:185-196`) are treated as a group by the Earth-Sim boot (`isEarthSimProjectLayer`). In the infra-panel classifier (`:16837-16864`), project layers are re-bucketed by keyword into cameras / telecom / power / rail or "MYCOSOFT Projects".

---

#### Earth Simulator boot profile (route `/natureos/earth-simulator`)

When `EARTH_SIM_STAGED_BOOT` is on (default; `earth-simulator-boot.ts:7`) and the path matches, `applyEarthSimulatorBootToLayers` (`:316-335`) **completely replaces** the literal defaults per the boot profile. Map starts at center `[-98.5, 39.8]`, zoom `3` (`:12-13`).

**Forced ON at first paint** (`EARTH_SIM_PROFILE_ON_LAYER_IDS`, `:210-221`, union of):
- Base: `satImagery, bathymetry, topography, fungalAtlasECM` (EcM forced on at opacity `0.55`; **AM forced off** — mutually exclusive) (`:32-37`, `:319-324`).
- Instant infra lines: `submarineCables, txLinesGlobal` (`:43-46`).
- Boot infra-on (deferred points + rail): all of `EARTH_SIM_DEFERRED_INFRA_POINT_IDS` (`:49-71`) + `railwayTracks` (`:199-202`).
- Telecom boot: `im3DataCenters, signalHeatmap` (`:205-208`).
- Device boot (ground/network, stationary): `liveAqi, buoys, liveTransit, railwayTrains` (`:117-122`).
- Boundaries: `jurisdictionCountry, jurisdictionState, jurisdictionCounty` (`:124-128`).
- Events: `earthquakes, volcanoes, wildfires, storms, lightning, tornadoes, floods, events` (`:74-83`) — **`solar` (space weather) excluded**.
- Always-on infra: `cctv, eagleEyeCameras, militaryBases, radar` (`:85`).
- Civic: `hospitals, fireStations, universities, policeStations, libraries, civicFacilities` (`:88-95`).
- Instant live: `fungi, biodiversity` + all 9 MycoBrain device layers (`:98-114`).
- **All project layers** (prefix-matched) are also forced on (`:328`).

**Forced OFF at boot** (`EARTH_SIM_OFF_AT_BOOT_LAYER_IDS`, `:131-183`): all live movers (`aviation, aviationRoutes, ships, shipRoutes, fishing, containers, satellites`), `orbitalDebris, debrisCloud`, space weather (`solar, auroraOverlay, sunEarthImpact`), Earth-2 + clouds, every `fungalAtlas*` except ECM, `weather`, human (`population, humanMovement, events_human`), unsupported military (`militaryAir/Navy, tanks, militaryDrones`), pollution (`factories, factoriesG, co2Sources, methaneSources, oilGas, metalOutput, waterPollution`), `eagleEyeEvents, im3DataCenterFootprints, droneNoFly`, alt basemaps (`mapboxSatelliteStreets, mapbox3dBuildings, photorealistic3D`), and `jurisdictionFema`. Anything not in the ON union and not a project layer also defaults off (`:333`).

A `useLayoutEffect` (`:10321-10356`) additionally re-forces the four base-context layers on at first refresh and locks `groundFilter` to `{showFungi:true, showMyceliumHeat:false, showAmFungi:false, showEcmFungi:true}` with `mycorrhizalMode="ecm"`, so a refresh cannot flip ECM→AM. Companion budget caps (`:259-275`): event DOM cap scales 160→420 by zoom; nature store cap 36,000; instant nature paint 2,400; live-stream pump delayed 1,200 ms; fungal DOM markers only at zoom ≥ 3.

---

#### Intel Feed left-panel UI

The floating left sidebar (`data-panel="left"`) is the "INTEL FEED" panel, rendered when `!embedded` at `CREPDashboardClient.tsx:17290-17302`. It is a 288 px (`w-72`) glass panel, hidden on mobile until `leftPanelOpen`. Header at `:17304`.

##### Tab row

Two state vars drive the tabs: `leftPanelTab` (`"fungal" | "infra" | "myca"`) and `leftSecondaryTab` (`"events" | "devices" | null`). The grid is `grid-cols-[1fr_1fr_74px] grid-rows-2` (`:17343`) — primary tabs on row 1, secondary tabs on row 2, MYCA spanning both rows in column 3.

| Tab | Label | `data-*` attr | Selects | Active color | Source |
|-----|-------|---------------|---------|--------------|--------|
| NATURE | `TreePine` + "NATURE" | `data-crep-left-tab="fungal"` | `leftPanelTab="fungal"` | green | `:17344-17368` |
| INFRA | `Zap` + "INFRA" | `data-crep-left-tab="infra"` | `leftPanelTab="infra"` | amber | `:17369-17393` |
| MYCA LIVE | `Bot` + "MYCA / LIVE" (2-row) | `data-crep-left-tab="myca"` | `leftPanelTab="myca"` | purple | `:17394-17418` |
| EVENTS | `AlertTriangle` + "EVENTS" | `data-crep-left-secondary-tab="events"` | `leftSecondaryTab="events"` | orange | `:17420-17444` |
| DEVICES | `Radar` + "DEVICES" | `data-crep-left-secondary-tab="devices"` | `leftSecondaryTab="devices"` | cyan | `:17445-17469` |

NATURE/INFRA are switched via `switchLeftPanelTab(...)` (clears the secondary tab); EVENTS/DEVICES via `setLeftSecondaryTab(...)`. Content blocks gate on the combination: NATURE = `leftPanelTab==="fungal" && leftSecondaryTab===null` (`:17498`); INFRA = `leftPanelTab==="infra" && leftSecondaryTab===null` (`:17882`); MYCA = `leftPanelTab==="myca" && leftSecondaryTab===null` (renders `<CREPMycaPanel>`, `:17857-17859`); EVENTS = `leftSecondaryTab==="events"` (`:17705`); DEVICES = `leftSecondaryTab==="devices"` (`:17943`).

##### Header count badge (top-right of "INTEL FEED")

A single `Badge` (`:17310-17331`) whose text + color change per active tab:

| Active tab | Badge text | Color |
|------------|------------|-------|
| EVENTS | `{filteredEvents.length} EVENTS` | orange |
| DEVICES | `{onlineDevices}/{devices.length} DEVICES` | cyan |
| NATURE (fungal) | `{visibleFungalObservations.length}/{fungalObservations.length} NATURE` | green |
| MYCA | `MYCA LIVE` | purple |
| INFRA (else) | `{staticInfraLegendItems.filter(isLegendLayerItemOn).length}/{staticInfraLegendItems.length} INFRA` | amber |

##### Quick-Stats strip (always visible under the tabs, `:17482-17495`)

Three centered counters: **Observations** = `fungalObservations.length` (green), **Devices** = `onlineDevices` (cyan), **Events** = `globalEvents.length` (orange). These are **global** totals, distinct from the viewport-LOD counts in the header bar.

##### Top-toolbar viewport-LOD count chip (separate from the panel)

Outside the panel, the right toolbar holds a per-viewport count chip (`:17177-17198`), titled "Viewport LOD at z{zoom}. Counts update with zoom, pan, region, and layer filters." It shows: `z{mapZoom}` · **Planes** `filteredAircraft.length` (sky / amber when 0) · **Boats** `filteredVessels.length` (teal / amber) · **Sats** `filteredSatellites.length` (purple / amber) · **Nature** `visibleFungalObservations.length` (green / amber). Amber = the layer is on but zero entities are in the current viewport LOD.

##### ALL ON / ALL OFF master toggles

Rendered in the top toolbar (`xl:`-only, `:17149-17171`), **not** inside the left panel:
- **ALL ON** (`data-crep-native-key="master:all-on"`, emerald) → `enableAllAuditFilters` (`:12422-12507`): clears asset-isolation + audit-off, sets streaming on, enables every layer via `applyForceOffToLayers(prev.map(... enabled:true))` (so the `FORCE_OFF` set — military air/navy/tanks/UAVs, FEMA, debris, alt-basemaps — stays off), sets every `groundFilter.show*` true **except `showAmFungi`** (kept false so the AM/EcM mutual-exclusion useEffect keeps EcM as primary), turns on all aircraft/vessel/satellite/space-weather/EO filter sets, and forces `showInfraLayers=true`.
- **ALL OFF** (`data-crep-native-key="master:all-off"`, red) → `disableAllAuditFilters` (`:12509+`): sets `auditAllOffMode=true`, streaming off, `applyFiltersOffToLayers` (everything off except the four base-context layers), `applyFiltersOffToGround`, and clears all mover/aircraft/vessel/satellite filter sets. This is the clean filter-audit baseline. `getInitialAuditAllOffMode() || getInitialFiltersOffMode()` seeds `auditAllOffMode` at mount (`:7810`).

##### NATURE tab — Legend / Filters

An open `<details>` "Legend / Filters" (`:17503-17602`) with these sub-sections:

1. **Species** (`:17509-17522`) — 7 `LegendFilterButton`s bound to `groundFilter` keys via `toggleGroundFilterKey` (`natureSpeciesLegendItems`, `:16704-16712`): Fungi (`showFungi`, `#b45309`, 🍄 glyph), Plants (`showPlants`), Birds (`showBirds`), Mammals (`showMammals`), Reptiles / Amphibians (`showReptiles`), Fish / Marine (`showMarineLife`), Insects / Arachnids (`showInsects`). `nativeKey` = `ground:<key>`.
2. **Fungal Atlas** (`:17523-17538`) — 7 buttons from `fungalAtlasLegendItems` (`:16714-16725`): Mycelium Heat (`fungalAtlasMycelium`), **AM Fungi** (`fungalAtlasAM`), **EcM Fungi** (`fungalAtlasECM`), Rare / Endemic (`fungalAtlasRare`), High Uncertainty (`fungalAtlasUncertainty`), FCI Priority (`fungalAtlasFci`), Sequence Samples (`fungalAtlasSamples`). `nativeKey` = `layer:<id>`; toggled via `toggleLegendLayer`→`toggleLayer`. **Protected Areas is deliberately omitted** (commented out, `:16719-16721`, until WDPA polygons load). AM/EcM "on" state reads `mycorrhizalMode` rather than the raw `enabled` flag: `isFungalAtlasLegendItemOn("fungalAtlasAM") === (mycorrhizalMode==="am")`, ECM === `"ecm"` (`:16539-16543`).
3. **AM / EcM opacity slider** (`:17539-17581`) — a bordered card showing "AM / EcM opacity" + live percent (`Math.round(activeMycorrhizalOpacity*100)%`). Range input min `15`, max `100`, step `5`, `aria-label="AM and EcM fungal atlas opacity"` → `setMycorrhizalOpacity(value/100)`. Four preset buttons `[35, 55, 75, 100]` (`data-crep-fungal-opacity={value}`, `aria-pressed`) set the same value. `setMycorrhizalOpacity` (`:16549-16561`) clamps to `[0.15, 1]`, writes opacity to **both** `fungalAtlasAM` and `fungalAtlasECM`, and calls `applyMycorrhizalRasterState`. `activeMycorrhizalOpacity` (`:16544-16548`) reads ECM's opacity when mode is `ecm`, AM's when `am`, else the min of the two. A capture-phase `pointerdown` listener (`:16673-16702`) intercepts `[data-crep-fungal-opacity]` presses for native/Computer-Use control and re-syncs `aria-pressed` styling.
4. **Environment / Conditions** (`:17582-17600`, shown only if non-empty) — `natureEnvironmentLegendItems` = layers in `NATURE_ENVIRONMENT_LAYER_IDS` (`biodiversity, weather, liveAqi, realisticClouds`, `:2710`), each a `LegendFilterButton` toggled via `toggleLegendLayerItem`. `nativeKey` = `legend:<key>`.

Below the legend: a **Nature Observations** sub-header (`:17604-17618`) with two count badges — `{...quality_grade==="research"...} Research Grade` (green) and `{...!=="research"...} Needs ID` (yellow) — followed by the scrollable observation list (`:17620+`), capped at `EARTH_SIM_NATURE_PANEL_LIST_CAP = 90` items (`:2867`, `:17636`); empty states show "Loading from MINDEX…" / "Zoom in to see observations".

##### INFRA tab

Renders `<InfrastructureStatsPanel>` (live power/transmission/substation/datacenter/cable stats, bubble-scale control, per-layer toggle callback wired to `setLayerEnabled`, `:17884-17897`), then a collapsible **Infrastructure Filters** `<details>` with header count `{staticInfraLegendItems.filter(isLegendLayerItemOn).length}/{staticInfraLegendItems.length}` (`:17905-17907`). Inside, layers are bucketed into accordion groups by `staticInfraLegendGroups`. Group definitions (`infrastructureLegendGroups`, `:16794-16913`) classify each layer by keyword into: Air/Space Assets, Maritime/Ocean Assets, Rail/Transit, Ground Vehicles, Power/Grid, Telecom/Broadcast/Data, Cameras/Eagle Eye, Public Safety/Medical, Water/Wastewater, Industry/Pollution, Facilities/Education, Military/Defense, Civic/Government, MycoBrain Devices, MYCOSOFT Projects, Other. Each group header shows its own `{on}/{total}` tally (`:16906-16919`). The classifier skips `fungi`, all fungal-atlas ids, the nature-environment ids, all `events`-category layers, and any `isHiddenFromLayerPanel` id (`:16795-16868`); it also merges the four DC ids, six power-plant ids, three transmission ids, and two cell-tower ids into single chips (`:16871-16903`). `DEVICE_LEGEND_GROUP_KEYS = {airspace, maritime, rail, devices, ground}` (`:7877`) split into `deviceLegendGroups` (→ Devices tab) vs `staticInfraLegendGroups` (→ this tab).

##### EVENTS tab

A "Live Event Stream" header with `{filteredEvents.length} active` badge (`:17707-17717`), then the scrollable event list capped at **90** items (`:17725`, "Showing 90 of N visible • Zoom in for more"); each row shows the event icon (from `eventTypeConfig`), title, lat/lng fly-to, severity badge, source, and an inline description when selected. Footer (`:17801-17852`) has two open `<details>`: **Ground Events** (7 `eventFilterLegendItems` bound to `groundFilter` show* keys — Earthquakes/Wildfires/Storms/Lightning/Tornadoes/Floods/Volcanoes; `:16741-16749`) and **Space Weather** (6 `spaceWeatherFilterLegendItems` — Solar Flares/CME/Geomag/Radiation/Aurora/Solar Wind; `:16751-16758`), each with a `{on}/{total}` tally.

##### DEVICES tab

A "Live Tracking" header with `z{mapZoom} viewport` badge (`:17946-17954`), then count tiles (`:17955-17988`): **Aircraft** `filteredAircraft.length`, **Satellites** `filteredSatellites.length`, **Vessels** `filteredVessels.length`, **Trains** = `isLayerOn("railwayTrains") ? "LIVE" : "OFF"`, plus **MycoBrain Online** `onlineDevices` and **Mycosoft Devices** `devices.length`. Below are collapsible filter accordions, each with a `{on}/{total}` tally: **Aircraft Filters** (`aircraftFilterLegendItems`, 6 keys, `:16760-16767`), **Vessel Filters** (`vesselFilterLegendItems`), **Satellite Filters** (`satelliteFilterLegendItems`, 7 keys, `:16780-16787`), all bound to their respective `*Filter` state via the matching `toggle*FilterKey`. The mover parent layers these chips control (`aviation/ships/satellites/...`) are hidden from the infra panel so the device chips are their sole UI owner.

#### Known limitations / gotchas

- **Literal `enabled` ≠ rendered default.** 5 ids (`militaryAir, militaryNavy, tanks, militaryDrones`, `jurisdictionFema`) are literal `true` but in `FORCE_OFF_UNTIL_STABLE_LAYER_IDS`, so they never render on first paint and stay off on ALL ON. Always resolve through `applyForceOffToLayers` + the Earth-Sim profile, not the array literal.
- **`imagery` category is dead.** Declared in the `LayerConfig` union (`:2106`) but unused by any layer; satellite/3D imagery is filed under `environment`/`infrastructure`.
- **Panel-hidden layers.** ~75 metro/SD-TJ detail ids plus the DC/power/transmission/cell duplicates and the human-category trio are hidden from the layer panel (`isHiddenFromLayerPanel`); they exist in the registry and in `__crep_layers()` but have no individual chip — they follow parent toggles. The `__crep_layers()` snapshot therefore lists more layers than the panel exposes.
- **AM/EcM are mutually exclusive** and driven by `mycorrhizalMode`, not their `enabled` flag — toggling one in the legend (or via ALL ON keeping `showAmFungi` false) is intentional, not a bug. The opacity slider always writes to both ids simultaneously.
- **Counts are viewport-LOD, not global.** Header/toolbar/device-tile counts (`filtered*`, `visibleFungalObservations`) reflect the current zoom/pan/region LOD; only the Quick-Stats strip and the "Observations/Events" tiles use global lengths — the two can differ widely.
- **`__crep_layers()` omits `color`/`description`/`icon`** — consumers needing those must read the registry directly, not the debug snapshot.
- **`fungalAtlasProtected` / `fungalAtlasFci`** have registry entries but are intentionally not surfaced (Protected dropped from the legend until WDPA data; FCI hidden until a real MINDEX FCI model exists), so they can be enabled programmatically yet render nothing.
```

---

## 5. Nature, Species & Fungal Atlas

### Nature, Species & Fungal Atlas

The Earth Simulator renders two distinct biodiversity layers that share a "fungi-first" philosophy but use completely different data paths and render primitives:

1. **Live species observations** — point records (iNaturalist / GBIF / MINDEX) bucketed into 7 kingdoms, painted as React DOM `FungalMarker` widgets, governed by a viewport-windowed LOD pipeline.
2. **Fungal Atlas** — 8 scientific raster/choropleth overlays (Mycelium Heat, AM, EcM, Rare/Endemic, Protected, FCI, Uncertainty, Sequence Samples) sourced from SPUN/GlobalFungi predicted-richness tiles and MINDEX overlay cells.

These are independent systems: the species kingdom toggles never refetch the atlas, and the AM/EcM atlas controls never refetch species observations (`CREPDashboardClient.tsx:9881-9905`).

#### 1. The 7 Species Buckets (kingdom classification)

Every live observation is normalized to a `FungalObservation` and classified into one of 8 `NatureKingdomBucket` values (`CREPDashboardClient.tsx:1029-1037`). The classifier `natureKingdomBucket()` (`:1136-1182`) reads `obs.iconicTaxon` first, falling back to `obs.kingdom`, lower-cased and trimmed via `normalizeNatureTaxonToken()` (`:1039-1041`):

| UI bucket | Internal `NatureKingdomBucket` | GroundFilter key | iconic/kingdom tokens matched | iNat/GBIF API param |
|-----------|-------------------------------|------------------|-------------------------------|---------------------|
| **Fungi** | `Fungi` | `showFungi` | `fungi`, `fungus`, `mycota` | `Fungi` |
| **Plants** | `Plantae` | `showPlants` | `plantae`, `plants`, `plant` | `Plantae` |
| **Birds** | `Aves` | `showBirds` | `aves`, `birds`, `bird` | `Aves` |
| **Mammals** | `Mammalia` | `showMammals` | `mammalia`, `mammals`, `mammal`, `cetacea` | `Mammalia` |
| **Reptiles–Amphibians** | `Reptilia` | `showReptiles` | `reptilia`, `amphibia`, `reptiles/reptile`, `amphibians/amphibian` | `Reptilia` |
| **Fish–Marine** | `Marine` | `showMarineLife` | `actinopterygii`, `mollusca`, `marine`, `fish`, `chondrichthyes` | `Actinopterygii` |
| **Insects–Arachnids** | `Insecta` | `showInsects` | `insecta`, `arachnida`, `insects/insect`, `arachnids` | `Insecta` |
| _(unclassified)_ | `Other` | — | `animalia` + everything else | `all` |

The API param mapping is `natureBucketApiParam()` (`:1082-1101`). Note the two-token aggregations that surface in the UI as a single bucket: "Reptiles–Amphibians" merges `Reptilia` + `Amphibia`; "Fish–Marine" merges `Actinopterygii` + `Mollusca` + `Chondrichthyes`; "Insects–Arachnids" merges `Insecta` + `Arachnida`.

##### Kingdom → API param resolution (`natureKingdomApiParam`, `:1124-1134`)
- Exactly **1** kingdom enabled → that bucket's param (fast single-taxon MINDEX index path).
- Exactly **2** enabled where one is Fungi → the **non-Fungi** param (server treats fungi as always-included).
- Otherwise → `"all"`.

##### `Other`-bucket safety rule (`observationMatchesNatureFilter`, `:1185-1213`)
Unclassified rows (`Other`) are never painted as fungi:
- In **fungi-only** filter mode (`isFungiOnlyNatureFilter`, `:1069-1079`) → `Other` rows are dropped (prevents whales/rabbits with a missing kingdom leaking onto a fungi map).
- In multi-kingdom mode, broad `Animalia`/unknown rows show **only when all 7 buckets are enabled** (`enabledNatureKingdomCount(filter) >= 7`). Rows carrying an explicit non-fungi taxon token (`observationHasExplicitNonFungiTaxon`, checking `NON_FUNGAL_NATURE_TOKENS` at `:1043-1058`) are dropped otherwise.

#### 2. The Fungi-First Default

##### Production CREP dashboard default (`CREPDashboardClient.tsx:9759-9809`)
The initial `groundFilter` state sets:
- Species: `showFungi: true`; all other 6 kingdoms `false`.
- Atlas mycorrhizal: `showEcmFungi: true`, `showAmFungi: false`, `showMyceliumHeat: false` (ECM on, AM off, mutually exclusive — comment at `:9769`).
- Other atlas layers (`showRareEndemicFungi`, `showProtectedFungi`, `showFungalUncertainty`, `showFciPriority`, `showFungalSamples`) all `false`.
- Sample groups: `showMushrooms: true`; `showMold/showMildew/showYeast: false`.

##### Earth Simulator boot override (`earth-simulator-boot.ts`)
When `EARTH_SIM_STAGED_BOOT && isEarthSimulatorPath()`, the default is replaced with `EARTH_SIM_FUNGI_ONLY_GROUND_FILTER` (`earth-simulator-boot.ts:224-252`):
```
showFungi: true, showPlants/Birds/Mammals/Reptiles/Insects/MarineLife: false,
showAmFungi: false, showEcmFungi: true, showMyceliumHeat: false,
showMycoBrain/SporeBase/SmartFence/PartnerNetworks: true
```
- Default fungal-atlas layer: `EARTH_SIM_DEFAULT_FUNGAL_LAYER_ID = "fungalAtlasECM"` (`:40`).
- Base layers visible at refresh: `satImagery, bathymetry, topography, fungalAtlasECM` (`EARTH_SIM_BASE_LAYER_IDS`, `:32-37`).
- Instant live layers: `fungi, biodiversity` + MycoBrain boot set (`EARTH_SIM_INSTANT_LIVE_LAYER_IDS`, `:110-114`).
- **OFF at boot** (`EARTH_SIM_OFF_AT_BOOT_LAYER_IDS`, `:131-183`) explicitly includes every non-ECM atlas layer: `fungalAtlasAM, fungalAtlasSamples, fungalAtlasMycelium, fungalAtlasRare, fungalAtlasProtected, fungalAtlasUncertainty, fungalAtlasFci`.
- `applyEarthSimulatorBootToLayers()` (`:316-335`) hard-codes `fungalAtlasECM → enabled:true, opacity:0.55` and `fungalAtlasAM → enabled:false`.

The `mycorrhizalMode` state (`"am" | "ecm" | "off"`) initializes from the requested fungal-layer IDs and defaults to `"ecm"` when ECM is in the set (`CREPDashboardClient.tsx:8680-8685`). `fungalAtlasDesiredRef` initial value is `{ showAm: false, showEcm: true, opacity: EARTH_SIM_FUNGAL_OPACITY }` (`:8689-8693`).

##### Per-perf-class boot suppression
On Earth Simulator, atlas rasters only auto-enable at boot when `getEarthSimViewportPerfClass() === "desktop"` (`earthSimStartupFungalRastersEnabled`, `:2682-2684`). On phone/tablet, `applyEarthSimFungalRasterBudgetToLayers` (`:2686-2693`) and `applyEarthSimFungalRasterBudgetToGroundFilter` (`:2695-2708`) force all atlas layers OFF to protect FPS.

#### 3. Data Sources

##### Live species pipeline (`/api/mindex/proxy/species`)
This is the `[source]` dynamic proxy route (`app/api/mindex/proxy/[source]/route.ts`); `species` maps to MINDEX layer `species` (`SOURCE_TO_MINDEX_LAYER`, `:86`). Tiered resolution:

1. **`preferLive` path** (`:808-832`) — when `kingdom`-expanded or wide-globe boot requests it, hits iNaturalist directly first.
2. **MINDEX primary** (`:834-872`) — `${MINDEX_URL}/api/mindex/earth/map/bbox?layer=species&...` (PostGIS + Redis multi-tier cache described at `:14-21`). 8s prod timeout / 1.5s dev (`:30-36`).
3. **Live fallback** when MINDEX returns 0 entities and `fallbackLive !== "false"` (`fetchLiveSpeciesFallback`, `:585-716`):
   - **iNaturalist** (`INATURALIST_API = https://api.inaturalist.org/v1`, `:28`): `/observations` with `quality_grade=research,needs_id`, `geo=true`, bbox via `swlat/nelat/swlng/nelng`, `iconic_taxa` param from `inaturalistIconicTaxaParam()` (`:450-462`). Wide bbox (≥12° lat & ≥20° lng, `isWideSpeciesBounds`, `:508-513`) caps at 360 records and fans out supplemental per-taxon queries; narrow bbox paginates up to 200/page.
   - **GBIF** (`GBIF_API = https://api.gbif.org/v1`, `:29`): `fetchGbifSpeciesFallback` (`:523-583`) used to top up when iNat returns too few. Per-taxon `kingdomKey`/`classKey` queries defined in `GBIF_SPECIES_QUERIES` (`:471-491`) — Fungi=5, Plantae=6, Aves classKey 212, Mammalia 359, Actinopterygii 204, Amphibia 131, Insecta 216, Arachnida 367.
   - Output normalized through `normalizeSpeciesFallback()` (`:404-448`); `lineage.activeSource = "fallback"`.

Client-side, every row is normalized by `normalizeSpeciesRowToFungalObservation()` (`CREPDashboardClient.tsx:928-1027`), which tolerates MINDEX/iNat/GBIF/GeoJSON shapes via `extractMindexSpeciesRows()` (`:911-926`) and the `firstString`/`firstNumber` coalescers. Rows at exactly `(0,0)` or non-finite coordinates are rejected. `mindex-integration.ts` (`fetchMINDEXObservations`, `:96-187`) is the alternate typed entry point with a 15s timeout and `quality_grade → confidence` mapping (research 0.95 / needs_id 0.6 / casual 0.4 at `convertMINDEXToEntities`, `:204`).

##### Fungal Atlas raster source (SPUN/Felt)
SPUN predicted-richness rasters proxied through `/api/crep/fungal-atlas/tiles/[layer]/[z]/[x]/[y]/route.ts`:
- Upstream host `FELT_TILE_HOST = https://us1.data-pipeline.felt.com/imgtile` (`:28`).
- `FELT_DATASETS` (`:30-35`): `amRichness`, `ecmRichness`, `amEndemism`, `ecmEndemism` (UUID dataset IDs).
- `TILE_LAYER_CONFIG` (`:64-93`) defines per-layer ramp + grayscale domain: **am** domain `[55,150]`, **ecm** `[7,50]`, **rarity/endemic** `[0,255]`, alpha 244 (am/ecm) / 232 (endemism). Source labels: "SPUN AM/EcM predicted richness", "SPUN AM predicted endemism".
- The proxy fetches the gray upstream tile (1.2s timeout, `:387`), then `colorizeSpunTile()` (`:264-305`) recolours via `interpolateRamp()`, treating `alpha<8 || gray<=2` as no-data → transparent.
- Caching: in-process `globalThis.__crepSpunTileCache`, 24h TTL, 650-entry LRU (`:103-104`).
- Attribution declared on the source: "SPUN / GlobalFungi / GlobalAMFungi / Global Soil Mycobiome consortium" (`fungal-atlas-layer.tsx:292`).

##### Fungal Atlas cell/sample source (MINDEX overlays + GlobalFungi)
`/api/crep/fungal-atlas/route.ts` (cells) and `/samples/route.ts`:
- **Cells**: MINDEX-first via `${MINDEX_API}/api/mindex/fungal-overlays/cells` (1.2s timeout, `route.ts:113-120`); each row mapped to `{lat,lng,sampleCount,richness,amScore,ecmScore,rarity,endemicity,uncertainty,fciPriority}` at `nativeResolutionMeters:1000` (`:126-149`). Viewport-rebalanced into a 16×10 grid keeping highest-score cell per bucket (`rebalanceCellsForViewport`, `:52-91`). Fails open to local `getFungalAtlasCells()` (`lib/crep/fungal-atlas.ts`).
- **Samples**: MINDEX `fungal-overlays/samples` (5s timeout) → `getFungalAtlasSamples()` fallback reading **GlobalFungi** sample metadata (`GlobalFungi_5_sample_metadata.txt`, `fungal-atlas.ts:118-174`), `nativeResolutionMeters:30`, source `"GlobalFungi"`. Valid sample groups: `mycelium, mushroom, mold, mildew, yeast, fungi` (`samples/route.ts:13-20`).
- The local native renderer (`lib/crep/fungal-atlas.ts`) emphasizes that **pixels are interpolated display detail on a fixed 30-arc-second / 1 km predicted-richness grid; high zoom reveals samples, it does not invent new cells** (`:538`, `:557`). This precision note is echoed in every API response and surfaced on sample-marker click (`fungal-atlas-layer.tsx:1065-1067`).

#### 4. The 8 Fungal Atlas Layers

Defined in `HEAT_LAYERS` (`fungal-atlas-layer.tsx:41-55`) plus the Sequence-Samples overlay. The canonical layer-ID set is `FUNGAL_ATLAS_LAYER_IDS` (`CREPDashboardClient.tsx:2669-2678`).

| # | UI name | `HeatLayer` id | Layer ID | GroundFilter key | Render primitive | Base opacity | minZoom | Boot default |
|---|---------|----------------|----------|------------------|------------------|--------------|---------|--------------|
| 1 | **Mycelium Heat** | `mycelium` | `fungalAtlasMycelium` | `showMyceliumHeat` | viewport cell choropleth (geojson fill+line) | 0.95 | 1.2 | OFF |
| 2 | **AM Fungi** | `am` | `fungalAtlasAM` | `showAmFungi` | global SPUN raster tiles | 1.0 | 1.2 | OFF |
| 3 | **EcM Fungi** | `ecm` | `fungalAtlasECM` | `showEcmFungi` | global SPUN raster tiles | 1.0 | 1.2 | **ON** |
| 4 | **Rare / Endemic** | `rarity`+`endemic` | `fungalAtlasRare` | `showRareEndemicFungi` | viewport cell choropleth | 0.58 | 1.2 | OFF |
| 5 | **Protected Areas** | `protected` | `fungalAtlasProtected` | `showProtectedFungi` | polygon fill+line+label overlay | 0.52 | 1.2 | OFF |
| 6 | **FCI Priority** | `fci` | `fungalAtlasFci` | `showFciPriority` | viewport cell choropleth | 0.58 | 1.2 | OFF |
| 7 | **High Uncertainty** | `uncertainty` | `fungalAtlasUncertainty` | `showFungalUncertainty` | polygon fill+line+label overlay | 0.5 | 1.2 | OFF |
| 8 | **Sequence Samples** | `samples` | `fungalAtlasSamples` | `showFungalSamples` | circle dots + emoji symbol | — | 2 (dots) / 10 (icons) | OFF |

Notes:
- **Rare/Endemic is a single UI toggle wired to two internal layers**: `fungalAtlasRare` drives both `rarity` and `endemic` (`CREPDashboardClient.tsx:22267-22268`, and `enabledFromDashboardLayerIds` maps both to `fungalAtlasRare` at `fungal-atlas-layer.tsx:93-94`).
- **AM and EcM are the only two SPUN-tile layers** (`SPUN_TILE_HEAT_LAYERS = {am, ecm}`, `:67`). All others are viewport-budgeted cell polygons or symbol overlays.
- **Composite native renderer** (`COMPOSITE_LAYER`) exists for server-side multi-layer tiles but the client mounts AM/ECM as separate raster shells.

##### SPUN raster tile endpoints (AM / EcM)
`spunTileUrl()` (`:73-75`):
```
/api/crep/fungal-atlas/tiles/{id}/{z}/{x}/{y}.png?v=2026-05-24-global-ecm-am-raster-v9-green-am
```
where `{id}` ∈ `{am, ecm}` and `SPUN_TILE_VERSION` is the cache-bust token (`:38`). Raster source config (`ensureSpunTileHeatLayer`, `:272-320`): `tileSize:512`, `minzoom:0`, `maxzoom:15`, layer `maxzoom:20`, `raster-resampling:"nearest"`, `raster-fade-duration:0`. Native cell fallback is force-bounded (450ms race) for am/ecm at zoom ≥9 (`shouldBoundNativeFallback`, `tiles route:202-221`).

##### Cell choropleth (mycelium / rarity / endemic / fci)
Fetched per enabled layer from `/api/crep/fungal-atlas?layer={id}&bbox=...&limit=...` (`fungal-atlas-layer.tsx:1121-1211`). `cellsToGeoJson()` (`:422-472`) builds `ATLAS_CELL_DEGREES = 0.05`° (`:33`) square polygons pre-coloured per layer ramp:
- `RICHNESS_STOPS` (blue→green→yellow, `:337-344`) for mycelium/am/ecm scoring;
- `RARITY_STOPS` (`:348-354`) for rarity/endemic/fci;
- `PROTECTED_STOPS` / `UNCERTAINTY_STOPS` (`:356-368`) for the overlay layers.
Per-layer scoring is `scoreCellForLayer()` (`:393-413`): e.g. `am = 0.65·amScore + 0.35·richness`, `fci = fciPriority`, `protected = 0.45·endemicity + 0.3·rarity + 0.25·uncertainty`. Cell opacity scales with score + `log1p(sampleCount)` boost (`cellOpacity`, `:415-420`).

Cell-fetch limits scale with zoom (`:1161-1170`): global-globe mode (zoom<6 or span>90°lng/45°lat) → 3000; else 2600 (z<7) / 1800 (z<10) / 1200. Each fetch is throttled to one per significant viewport change via `viewportTick`, which only increments when a quarter-degree-rounded center/zoom signature changes (400ms debounce, `:980-1011`).

##### Protected / Uncertainty / Samples overlays
- Protected/Uncertainty mount empty `FeatureCollection` sources (`PROTECTED_AREAS_GEOJSON`/`UNCERTAINTY_AREAS_GEOJSON` are empty stubs, `:728-736`) with fill+line+label layers; labels appear only at zoom ≥5 (`syncSupportOverlayLayers`, `:709-719`).
- **Sequence Samples**: `SAMPLE_DOT_LAYER` (circle) paints at `SAMPLE_MIN_ZOOM = 2`; `SAMPLE_ICON_LAYER` (🍄 emoji glyph) at `SAMPLE_ICON_MIN_ZOOM = 10` (`:31-32`, `:873-922`). Per-feature colour comes from `colorExpression()` (`:738-760`): AM=cyan, EcM=magenta, mixed=violet, else group colour (mushroom `#f59e0b`, mycelium `#22c55e`, etc.). Sample-fetch limits by zoom: 1000 (z<4) → 1800 → 2200 → 1200 → 700 (`:1274`); 12s timeout. Sample groups passed from `fungalAtlasSampleGroups` memo (`CREPDashboardClient.tsx:16516-16525`): mushrooms→`["mushroom","mycelium","fungi"]`, etc.; empty selection sends `["none"]` (server returns empty FC).

#### 5. AM / EcM Opacity & Exclusivity Control

**AM and EcM are mutually exclusive atlas modes.** Selecting one turns the other off, enforced at three layers:
- `nextExclusiveFungalLayerSet()` (`CREPDashboardClient.tsx:3065-3075`) and `mergeGroundFilterExclusiveAmEcm()` (`:3078-3086`): `showAmFungi:true` forces `showEcmFungi:false` and vice-versa.
- `setLayerEnabled` intercepts `fungalAtlasAM`/`fungalAtlasECM` toggles and routes to `switchMycorrhizalFungiLayer(mode)` (`:12141-12151`), which sets `mycorrhizalMode`, updates layers/ground filter, and calls `applyMycorrhizalRasterState()` (`:12091-12139`).

**Opacity** is a single shared control across AM+EcM:
- `setMycorrhizalOpacity()` (`:16549-16561`) clamps to `[0.15, 1]` and writes the same opacity to **both** `fungalAtlasAM` and `fungalAtlasECM` layers, then re-applies raster state.
- `activeMycorrhizalOpacity` (`:16544-16548`) reads the active mode's layer opacity (default `EARTH_SIM_FUNGAL_OPACITY = 0.55`, `earth-simulator-boot.ts:254`).
- `applyMycorrhizalRasterState()` (`:8695-...`) writes `raster-opacity` directly on the MapLibre layer with a zero-duration transition; inactive rasters are warmed at `FUNGAL_ATLAS_WARM_RASTER_OPACITY` on desktop only (warm-keep avoids re-tiling on toggle). The matching constant in the layer module is `INACTIVE_SPUN_RASTER_WARM_OPACITY = 0.001` (`fungal-atlas-layer.tsx:39`).
- `bootstrapFungalAmEcmRasters()` (`:615-673`) mounts both raster shells and toggles visibility; it warms inactive rasters unless on the Earth Simulator path, mobile width ≤1180px, or coarse pointer (`shouldWarmInactiveSpunRasters`, `:159-165`). On `/natureos/earth-simulator` it never warms inactive rasters.
- The `FungalAtlasLayer` props gate AM/EcM additionally on `mycorrhizalMode` (`:22265-22266`): `am: ...fungalAtlasLayerState.am && mycorrhizalMode === "am"`. `fungalAtlasDisplayOpacity` (`:16562-16578`) picks the first-enabled layer's opacity in priority order AM→EcM→Mycelium→Rare→FCI→Protected→Uncertainty→Samples (fallback 0.72).

#### 6. Viewport-Windowed Species LOD

Live species observations flow: **fetch → store (`fungalStoreRef`) → state (`fungalObservations`) → `visibleFungalObservations` (LOD) → `renderedFungalObservationsForMap` (DOM cap) → `FungalMarker`**.

##### Store and merge (`fungalStoreRef`)
- `fungalStoreRef: Map<string, FungalObservation>` (`:8420`) is the persistent browser-memory store keyed by observation id; `fungalObservations` state is `Array.from(store.values())`.
- The viewport fetch effect (`:11700-11904`) computes a zoom-scaled `zoomLimit` (800 at z<2 → 3000 at z≥10, `:11738-11742`), clamped further on Earth Simulator by perf class (phone 600 / tablet 1000 / desktop 1800, `:11754-11758`) and to ≤1800 when kingdom-expanded (`:11745-11747`); city-level pushes to 15000 (non-ES) (`:11748-11749`). It issues a **quick** iNat-all-taxa fetch first then a delayed **full enrich** (delay 180–1600ms by route/kingdom, `:11878-11889`).
- `mergeViewportNature()` (`:11761-11795`) normalizes rows, drops any not matching the current kingdom filter, `store.set`s by id, then **prunes viewport-first**: `pruneStoreViewportFirst()` keeps in-bounds (0.25° pad) rows up to `storeCap` and culls the rest by `observationResourceRank` (`:11784-11792`). Store caps: Earth-Sim staged boot → `EARTH_SIM_NATURE_STORE_CAP = 36_000` (`earth-simulator-boot.ts:269`); city zoom → `min(20000, RESOURCE_LIMITS.nature·2)`; else `min(12000, RESOURCE_LIMITS.nature)`.
- Fetch suppression: globe pan/animation defers refetch (700ms retry while `mapInteractionActiveRef` active, `:11710-11715`); Earth-Sim throttles to one viewport fetch / 3.5s (`:11721-11727`).
- `observationResourceRank()` (`:890-893`) = `observedAtMs + (quality_grade==="research" ? 2000 : 0)` — recency-dominant with a small research-grade tiebreak. Used everywhere a "keep the best N" decision is made.

##### Sticky retention + spatial sampling (`spatiallySampleNatureObservations`, `:1345-1464`)
Called by `visibleFungalObservations` whenever in-viewport count exceeds the DOM cap. Algorithm:
1. **Sticky retention** — carry forward prior-frame markers still in-viewport, capped at `STICKY_FRACTION = 0.35` of the cap (`:1396-1407`). This is the key Jun-12-2026 change: previously the full previous set was kept (gluing a dense origin cluster to screen on zoom-out); now fresh viewport-wide sampling dominates so the newest species across the entire viewport paint.
2. **Protected fungi minimum** — in multi-kingdom mode, reserve `min(fungiRows, max(80, ⌊cap·0.35⌋))` slots for fungi so fungi never get crowded out (`:1385-1420`).
3. **Per-bucket minimum** — guarantee `min(32, max(12, ...))` markers per active bucket (`:1422-1435`).
4. **Even remainder split** across active buckets via `spatiallySampleNatureBucket()` (`:1276-1343`), which grids the viewport into `√cap × √cap` cells (absolute lat/lng origin) and keeps the highest-rank observation per cell, with a sticky-first pass that never displaces a prior-frame marker (`:1311-1325`).
5. **Fill** any remaining slots by global rank (`:1453-1461`).

`pickStratifiedNatureObservations()` (`:1232-1274`) is a simpler fair per-bucket split (`max(40, ⌈cap/buckets⌉)` per bucket) used where stratification without spatial gridding suffices.

##### The LOD memo (`visibleFungalObservations`, `:13323-13659`)
Two branches — Earth Simulator (`:13344-13443`) and standard CREP (`:13446-13658`):
- **Hold during animation**: while `isMapAnimationActive && !liveMarkerBounds`, returns the frozen prior list (`:13324-13335`) to prevent churn during globe spin.
- **Step 0** kingdom filter via `observationMatchesNatureFilter` (instant, no network).
- **Step 0b** optional single-species filter (`fungalSpeciesFilter`).
- **Step 1** viewport cull with 25%-of-span padding capped at 15° lat / 30° lng, with antimeridian handling (`:13488-13509`).
- **Age filter** `getMaxNatureAgeMsForZoom()` (`:2470-2474`): unlimited at z≥8, 5 years at z≥5, else `MAP_DISPLAY_MAX_NATURE_AGE_MS`.
- **City-level zoom** (`isCityLevelZoom`) → spatial-sample to `domHardCap` with no extra LOD grid (`:13526-13535`).
- Otherwise a **recency-first merge**: rows inside `RECENT_PRIORITY_WINDOW_MS` are force-kept ahead of `applyLODToNature()` output (`:13537-13560`), then if still over cap, `spatiallySampleNatureObservations()` runs, falling back to an inline absolute-origin sticky grid (`:13608-13648`) if sampling returns empty.

##### DOM marker caps (perf gate)
`getNatureDomMarkerCapForZoom()` (`:2417-2464`) — the hard FPS protection gate:
- **Standard CREP**: 350 (z<3) → 450 → 650 → 900 → 1200 → 1400 (z≥11), clamped to `NATURE_DOM_MARKER_CAP = 1400` (`:2864`). The doc comment notes >~1200 DOM `FungalMarker` nodes starve the MapLibre WebGL main thread (`:2863`).
- **Earth Simulator** by perf class: phone 110→420, tablet 220→760 (clamped to `EARTH_SIM_DOM_MARKER_CAP = 900`), desktop 360→900. All scaled by `kingdomScale = clamp(enabledKingdoms/7, 0.45, 1)` so a single-kingdom view gets a smaller cap.
- `renderedFungalObservationsForMap` (`:13661-13706`) re-applies this cap, force-preserving `selectedFungal` in the sampled set (`:13697-13699`), and memoizes by sorted id-key to keep array identity stable (anti-flicker).

##### DOM marker render gate
`renderFungalDomMarkers` (`:13708-13715`): always true when any nature filter is enabled or at city zoom; on Earth-Sim strict-perf staged boot it additionally requires the `fungi` layer enabled OR `mapZoom ≥ EARTH_SIM_FUNGAL_DOM_MIN_ZOOM` (= 3, the US fly-to zoom; `earth-simulator-boot.ts:257`). Final render at `:22013` also gates on `shouldRenderDomMarkers` and `!auditAllOffMode && !assetIsolationMode`.

##### Earth-Sim instant paint & baked preload
- **Instant MINDEX paint** (`:11206-11274`): one immediate `quick=true` fetch (`EARTH_SIM_NATURE_INSTANT_LIMIT = 2_400` on ES, else 30000; `earth-simulator-boot.ts:272`) using `EARTH_SIM_US_BBOX` (`{S:14,N:62,W:-140,E:-52}`, `:16-21`) at globe zoom, merged straight into the store for first-paint.
- **Baked iNat history** (`:11349-11517`): bundled regional snapshots (NYC/DC/etc.) merged into the same store, pruned by `EARTH_SIM_NATURE_STORE_CAP`.

#### 7. Known Limitations & Behaviors

- **Protected Areas & High Uncertainty render empty polygons by default** — `PROTECTED_AREAS_GEOJSON` and `UNCERTAINTY_AREAS_GEOJSON` are hard-coded empty `FeatureCollection`s (`fungal-atlas-layer.tsx:728-736`); these layers paint only when their geojson source is populated at runtime, otherwise the toggle is a no-op visually.
- **AM/EcM tiles are predicted-richness rasters, not observation density** — high-zoom pixels are interpolated display; `X-Precision-Note` headers and the sample-click `precision_note` explicitly warn against scientific over-interpretation (`tiles route:375`, `fungal-atlas.ts:538/557`, `fungal-atlas-layer.tsx:1065-1067`).
- **Felt/SPUN upstream is a hard external dependency** with a 1.2s timeout; on failure the route silently degrades to native cell tiles or a 1×1 transparent PNG (`tiles route:158-170, 390-430`). Native fallback is time-bounded (450ms) for am/ecm at zoom ≥9 and can return transparent on timeout.
- **`Other`/Animalia observations are invisible unless all 7 kingdoms are on** — many real iNat rows with a missing/broad `iconic_taxon_name` will never paint in fungi-only or partial multi-kingdom modes (`:1187-1196`).
- **DOM marker cap is a hard FPS ceiling** — at dense urban zoom the true observation count (the panel shows `visible/total NATURE`, `:17327`) far exceeds the ≤1400 (CREP) / ≤900 (Earth-Sim) markers actually drawn; spatial sampling decides which survive, so the map is a representative sample, not the full set.
- **Sticky retention is intentionally capped at 35%** — on a large pan/zoom-out, up to 65% of the previous frame's markers are dropped in favor of newest-in-viewport species; this is the Jun-12-2026 "unpaint older things in the new area" behavior, which can make familiar markers vanish on zoom-out.
- **Single shared AM/EcM opacity** — there is no independent AM-vs-EcM opacity; `setMycorrhizalOpacity` writes both, and since they are mutually exclusive only one is ever visible.
- **Rare and Endemic are not independently controllable** — one `fungalAtlasRare` toggle drives both internal `rarity` and `endemic` cell layers.
- **Phone/tablet Earth-Sim suppresses all atlas rasters at boot** regardless of the fungi-first default (`:2682-2708`); ECM only auto-appears on desktop-class viewports.
- **City-level non-Earth-Sim nature fetches request up to 15000 records** (`:11749`), bounded server-side by the iNat pagination ceiling (10 pages × per-taxon), so very dense viewports may still be undersaturated relative to total records that exist.

---

## 6. Infrastructure & Power Grid

### Infrastructure & Power Grid

This domain covers every electric-grid and digital-infrastructure asset on the Earth Simulator / CREP map: power plants (global WRI + EIA-860M status splits), substations, transmission lines (three voltage-tier sources), data centers (global + IM3 atlas + building footprints), and cell towers. It is the largest static-data domain in CREP — on the order of **150k+ point/line features** across all sources — and is engineered around a PMTiles-first / GeoJSON-fallback loader, per-source zoom gates, and OpenGridWorks-style capacity-graduated dot sizing.

> Provenance note for the whole domain: the layer descriptions, feature counts, and "flipped ON per Morgan" notes are quoted verbatim from the layer registry in `app/dashboard/crep/CREPDashboardClient.tsx`. Where a count appears in two places with different values (e.g. WRI "34,936" in the registry vs. "35k" in loader comments), both are noted.

#### 1. Data sources & file inventory

| Dataset | Source provenance | Static file (`public/data/crep/`) | PMTiles archive | Feature count (per code) |
|---|---|---|---|---|
| Global power plants | WRI Global Power Plant Database v1.3.0 | `power-plants-global.geojson` (~15.6 MB) | `tiles/power-plants-global.pmtiles` | 34,936 plants / 167 countries (registry); ~35k / 15.6 MB (loader) |
| US substations | HIFLD + OSM + MINDEX | `substations-us.geojson` (~12 MB) | `tiles/substations-us.pmtiles` | 76,065 / "93k HIFLD" referenced in glow comment; 76,065 in idle-load comment |
| Transmission (major / backbone) | HIFLD ≥345 kV | `transmission-lines-us-major.geojson` (~14 MB) | `tiles/transmission-lines-us-major.pmtiles` (served via `/api/crep/tiles/…`) | 22,760 lines (registry `txLinesGlobal`) |
| Transmission (ALL voltages) | HIFLD + OSM + MINDEX | `transmission-lines-us-full.geojson` (~78 MB) | `tiles/transmission-lines-us-full.pmtiles` (served via `/api/crep/tiles/…`) | 52,244 lines (registry); "52k lines / 78 MB" |
| Sub-transmission (≤115 kV feeders) | OSM community-mapped | `transmission-lines-sub-transmission.geojson` | — (raw GeoJSON, idle-loaded) | baked weekly by `bake-osm-sub-transmission.mjs` |
| Global data centers | OSM `man_made=data_center` + PeeringDB + MINDEX | `data-centers-global.geojson` (~1.1 MB) | `tiles/data-centers-global.pmtiles` | ~5–7k globally |
| IM3 data centers (existing) | PNNL IM3 Open Source Data Center Atlas v2026.02.09 | `im3-datacenters-existing.geojson` | — (raw GeoJSON) | 1,479 existing US DCs |
| IM3 DC footprints (polygons) | IM3 gpkg `building` + `campus` tables | `im3-datacenter-footprints.geojson` | — (raw GeoJSON) | 1,374 polygons |
| EIA-860M Operating | EIA-860M (Feb 2026) | `eia860m-operating.geojson` | — (raw GeoJSON) | 27,716 generators |
| EIA-860M Planned | EIA-860M (Feb 2026) | `eia860m-planned.geojson` | — | 1,946 generators |
| EIA-860M Retired | EIA-860M (Feb 2026) | `eia860m-retired.geojson` | — | 7,201 generators |
| EIA-860M Canceled | EIA-860M (Feb 2026) | `eia860m-canceled.geojson` | — | 1,605 generators |
| Cell towers (global) | OpenCelliD (47M) + FCC ASR + OSM | `cell-towers-global.geojson` (~78 MB referenced) | `tiles/cell-towers-global.pmtiles` (~41 MB, served via `/api/crep/tiles/…`) | bbox-scoped |
| Cell towers (instant bundle) | US + Taiwan + territories | `cell-towers-us-tw-instant.geojson` | `tiles/cell-towers-us-tw-instant.pmtiles` | 192-feature bundled US set is the final fallback |

EIA-860M total (`components/crep/layers/eia-im3-overlays.tsx:9-19`): **38,468 generators** = 27,716 operating + 1,946 planned + 7,201 retired + 1,605 canceled.

#### 2. The static-infra loader (`lib/crep/static-infra-loader.ts`)

##### 2.1 `InfraLayerConfig` shape (`:16-42`)

Each PMTiles-backed layer is described by:

| Field | Purpose |
|---|---|
| `sourceId` | MapLibre source name (`static-infra-loader.ts:17`) |
| `pmtilesLayerName` | Vector-tile layer name inside the archive (matches `--layer=` in `gen-pmtiles.sh`); becomes `source-layer` for PMTiles mode (`:19`) |
| `pmtilesUrl` | Relative URL of the `.pmtiles` file (`:21`) |
| `geojsonUrl` | Bundled-static fallback GeoJSON URL (`:23`) |
| `label` | Human-readable debug label (`:25`) |
| `maxGeojsonFallbackBytes` | Cap above which the raw GeoJSON fallback is skipped to protect the UI thread (`:28`) |
| `skipGeojsonFallback` | Never load the raw GeoJSON fallback in-browser (`:30`) |
| `preferGeoJSON` | Prefer the full GeoJSON over PMTiles for cheap POINT layers where tippecanoe decimation drops most points at low zoom (`:31-41`) |

The `preferGeoJSON` flag exists because of a documented bug (`:36-39`): tippecanoe drops most points below its base zoom, so a continental flyover showed ~50 plants instead of all ~35k. Points are GPU-cheap, so for plants and DCs the loader pulls the full GeoJSON to get "every asset at every zoom"; **lines (transmission) stay on PMTiles**. (Jun 12, 2026, Morgan: "massive amount of missing power stations, power plants. It should be all of them.")

##### 2.2 The `INFRA_LAYERS` registry (`:46-149`)

| Key | `sourceId` | `pmtilesLayerName` | PMTiles URL | minzoom/maxzoom of tileset | GeoJSON fallback policy |
|---|---|---|---|---|---|
| `substations` | `crep-substations` | `substations` | `/data/crep/tiles/substations-us.pmtiles` | (baked by tippecanoe; zoom range not pinned in this file) | `maxGeojsonFallbackBytes: 2 MB`, **`skipGeojsonFallback: true`** |
| `transmissionLines` | `crep-txlines-global` | `transmission_lines` | `/api/crep/tiles/transmission-lines-us-major.pmtiles` | pre-clustered to z2 by tippecanoe | `maxGeojsonFallbackBytes: 2 MB`, **`skipGeojsonFallback: true`** |
| `transmissionFull` | `crep-txlines-full` | `transmission_lines` | `/api/crep/tiles/transmission-lines-us-full.pmtiles` | pre-clustered | `maxGeojsonFallbackBytes: 24 MB`, **`skipGeojsonFallback: true`** (all-voltage raw GeoJSON would freeze controls during zoom) |
| `dataCentersGlobal` | `crep-datacenters-global` | `data_centers` | `/api/crep/tiles/data-centers-global.pmtiles` | — | **`preferGeoJSON: true`**, `maxGeojsonFallbackBytes: 8 MB` (~1.1 MB of points — load full set so every DC shows at flyover) |
| `powerPlantsGlobal` | `crep-plants-global` | `power_plants` | `/data/crep/tiles/power-plants-global.pmtiles` | base-zoom decimation shows only ~50 biggest at z3-4 | **`preferGeoJSON: true`**, `maxGeojsonFallbackBytes: 20 MB` |
| `cellTowersGlobal` | `crep-celltowers-global` | `cell_towers` | `/api/crep/tiles/cell-towers-global.pmtiles` | — | `maxGeojsonFallbackBytes: 24 MB`, **`skipGeojsonFallback: true`** |
| `cellTowersUsTwInstant` | `crep-celltowers-us-tw-instant` | `cell_towers` | `/api/crep/tiles/cell-towers-us-tw-instant.pmtiles` | — | (no caps set) |

Notable routing decisions baked into the config:
- **`transmissionLines` / `transmissionFull` / `cellTowersGlobal` route through `/api/crep/tiles/*`** (an fs-streaming API route) rather than the Next.js static handler. Reason (`:126-132`): the 41 MB `cell-towers-global.pmtiles` 404s from the default Next.js static handler on prod (smaller `<20 MB` PMTiles serve fine — suspected size threshold in the Next.js standalone runtime). The route serves smaller tiles too, so it is used uniformly for these three.
- **`substations` / `powerPlantsGlobal` use the plain `/data/crep/tiles/*` static path** (they are not routed through the API).

##### 2.3 CDN rewrite (`resolvePmtilesUrl`, `:176-199`)

When `NEXT_PUBLIC_TILES_CDN_ENABLED=true` AND `NEXT_PUBLIC_TILES_CDN` is set (e.g. `https://tiles.mycosoft.com` — Cloudflare R2 edge), the loader strips the filename off the app path and serves it from the CDN root (~10 ms edge vs ~500 ms origin). A `canonical` map (`:188-196`) translates verbose filenames to the bake-script names (`substations-us.pmtiles` → `substations.pmtiles`, `transmission-lines-us-major.pmtiles` → `transmission-major.pmtiles`, etc.). If CDN use is not explicitly enabled, the app-served path is used and falls back to GeoJSON — this avoids broken CDN probes adding 404 noise.

##### 2.4 PMTiles availability probe (`isPMTilesAvailable`, `:208-261`)

- Results cached per URL for **5 minutes** (`PROBE_TTL_MS = 5 * 60_000`, `:206`) so style churn can't re-probe on every source add.
- Uses a **range GET** `bytes=0-1023` (NOT HEAD), with a 10 s `AbortController` timeout (`:218`). HEAD was abandoned because the Next.js dev static handler returns 200 but omits `content-type` for `.pmtiles`, which made the old guard always fail and fall back to the 78 MB raw GeoJSON every time (`:221-227`).
- Accepts any `200` or `206`. Validates the file has real bytes and is "large enough": `totalBytes >= 4096`, or for a 206 range slice `sliceBytes >= 512`. This rejects tiny JSON/error stubs — live once served `transmission-lines-us-full.pmtiles` as a 134-byte 206 (`:248-252`).

##### 2.5 GeoJSON fallback gate (`isGeojsonFallbackAllowed`, `:274-302`)

- If `skipGeojsonFallback` is set → returns `false` and warns "GeoJSON fallback disabled to protect map controls".
- Otherwise does a `Range: bytes=0-0` `force-cache` GET to read `Content-Range` total bytes; if total exceeds `maxGeojsonFallbackBytes` it skips with a warn ("…MB exceeds …MB UI-thread budget"). Unknown size also skips.

##### 2.6 Source-add path (`addInfraSourceWithFallback`, `:308-375`)

Returns `{ mode: "pmtiles" | "geojson" | "skipped", sourceId }`:
1. If source already present → `skipped`.
2. Unless `forceGeoJSON` or `preferGeoJSON`, resolve CDN URL, probe; on success `map.addSource(sourceId, { type: "vector", url: "pmtiles://<absoluteUrl>" })` → `pmtiles`.
3. Else check `isGeojsonFallbackAllowed`; fetch (`force-cache`), `map.addSource(sourceId, { type: "geojson", data: fc })` → `geojson`.
4. On `"already exists"` errors → `skipped`.

`layerSpecForMode` (`:382-388`) returns `{ sourceLayer: cfg.pmtilesLayerName }` for PMTiles mode and `{}` for GeoJSON — callers spread this into the render-layer `source-layer` property.

#### 3. Render layers in `CREPDashboardClient.tsx`

All render layers share two helpers: `safeAddSource` / `safeAddLayer` (idempotent wrappers) and `bindFeatureHoverPreview` (hover tooltip). Every layer is enable-gated by reading `window.__crep_layers()` for its toggle id, defaulting to ON for the Earth Simulator route (`isEarthSimulatorRoute`).

##### 3.1 Substations (`crep-subs-*`)

Two code paths exist for substations:

**Static PMTiles path (`renderStaticSubstations`, `:19786-19897`)** — primary. Uses `INFRA_LAYERS.substations`. Voltage is normalized from multiple property names (`:19795-19801`): `voltage_kv`, else `v / 1000`, else `VOLTAGE / 1000`, else 0.

| Layer id | type | minzoom | Key paint |
|---|---|---|---|
| `crep-subs-glow` | circle | `INFRA_COUNTRY_REVEAL_MIN_ZOOM` (2.7) | radius interp `z3→4, z6→7, z9→11, z12→16`; opacity 0.3, blur 1.0 (Jun 12 2026: "OpenGridWorks parity: visible at continental zoom, was z6-floored") |
| `crep-subs-circle` | circle | 2.7 | radius `z3→2.4, z6→3.4, z9→5, z12→8`; opacity 0.95; 0.8px dark stroke (`#0b1220`) |
| `crep-subs-label` | symbol | **10** | "`<name> · <kV> kV`", text-size `z10→9 … z18→13`, `text-allow-overlap:false`, `text-optional:true` |

Color ramp (both glow + dot) interpolated on `voltage_kv`: `0→#9ca3af` (gray), `100→#a855f7` (purple), `230→#60a5fa` (blue), `345→#22d3ee` (cyan), `500→#ffffff` (white). Click → `setSelectedInfraAsset({ type: "substation", … })`, normalizing `voltage_kv` (divides by 1000 if raw > 1000) and resolving `operator` from `op`/`OWNER` (`:19871-19884`).

**Legacy idle-load GeoJSON path (`renderSubstations` + `loadSubstationsFetch`, `:19694-19959`)** — fallback that fetches `/data/crep/substations-us.geojson` directly. Gated by `loadSubstationsOnceAtZoom` (`:19927`): only fetches when `zoom >= INFRA_POINT_ICON_MIN_ZOOM` (5) AND the `substations` toggle is ON, and re-attempts on `moveend`. This avoids pulling 12 MB + 76k entities into heap on every mount regardless of zoom (Apr 21 2026 OOM audit). Its `crep-subs-glow`/`crep-subs-circle` use simpler radius ramps (`z6→2, z9→3.5, z12→6`) and `minzoom: INFRA_COUNTRY_REVEAL_MIN_ZOOM`.

##### 3.2 Transmission lines — three sources, layered

There are **three** transmission render layers plus a fourth deck.gl component, intentionally coexisting:

**(a) Major / global PMTiles backbone — `crep-txlines-global-line` (`:20276-20314`)**
Uses `INFRA_LAYERS.transmissionLines`. Gated on `txLinesGlobal` enabled (default ON for Earth Sim). **No minzoom** — tippecanoe pre-clustered geometry paints the HV backbone cleanly from z2. Color interp on `coalesce(v, VOLTAGE, 0)` in **volts**: `0→gray, 31000→#fb923c, 100000→#ec4899, 230000→#a855f7, 345000→#60a5fa, 500000→#22d3ee, 735000→#ffffff`. Width `z2→0.4 … z16→3.5`, opacity `z2→0.45 … z12→0.8`.

**(b) Full all-voltage PMTiles — `crep-txlines-full-line` + `crep-txlines-full-label` (`:20322-20436`)**
Uses `INFRA_LAYERS.transmissionFull`. Gated on `txLinesFull` (the "BIGGEST single offender — 52k lines / 78 MB"; default ON for Earth Sim). Color breakpoints differ slightly (`69000→#fb923c, 138000→#ec4899, 230000→#a855f7, 345000→#60a5fa, 500000→#22d3ee, 765000→#ffffff`). Width `z2→0.3 … z16→3.5`. Click → `transmission_line` InfraAsset with `voltage_kv = v/1000`. Label layer `crep-txlines-full-label` is `symbol-placement: "line"`, `symbol-spacing: 250`, **minzoom 9**, renders "`<kV> kV`" repeated along the line, filtered to lines `> 34000` V (i.e. ≥34.5 kV).

**(c) GeoJSON voltage-granular path — `crep-txlines-glow` + `crep-txlines-line` (`renderTxLines`, `:20006-20065`)**
Sourced from MINDEX-shaped entities into `crep-txlines` GeoJSON source. **`minzoom: 5`** on both layers (20k lines at z3 = render storm). Color interp is on `voltage_kv` in **kV** (not volts): `0→gray, 31→#fb923c, 100→#ec4899, 230→#a855f7, 345→#60a5fa, 500→#22d3ee, 735→#ffffff`. Glow has `line-blur: 3.5`.

**(d) OSM sub-transmission — `crep-txlines-sub-glow` + `crep-txlines-sub-line` (`loadSubTransmissionLines`, `:20077-`)**
Idle-loaded from `/data/crep/transmission-lines-sub-transmission.geojson`. Gated on `txLinesSub` (default ON). Fills the ≤115 kV feeder gap HIFLD misses (Loveland / Jamacha / Otay / Chula Vista). **Rendered DASHED** (`line-dasharray: [2, 1.5]`) to signal provenance differs from the solid HIFLD backbone. **`minzoom: 5`**. Color ramp on `voltage_kv` (kV): `0→#6b7280, 31→#f97316, 69→#eab308, 115→#f43f5e`.

The `transmissionLines` panel toggle drives **all** of these layer ids (`:16330`): glow, line, sub-glow, sub-line, global-line, bbox-line, full-line, full-label. `txLinesGlobal`/`txLinesFull`/`txLinesSub` are separate sub-toggles (`:16331-16333`).

##### 3.3 Global power plants (`crep-plants-global-*`, `:20443-20589`)

Uses `INFRA_LAYERS.powerPlantsGlobal` (`preferGeoJSON: true` → full GeoJSON). Gated on `powerPlantsG` ?? `powerPlants` ?? ON-for-Earth-Sim. Capacity expr (`:20457`): `max(1, coalesce(capacity_mw, capacity, 10))`. Fuel expr (`:20462`): `coalesce(fuel, primary_fuel, technology, "Other")`.

**Fuel color match (`plantColorExpr`, `:20463-20481`):**

| Fuel | Color | Fuel | Color |
|---|---|---|---|
| Solar | `#facc15` | Coal | `#9ca3af` |
| Wind | `#22d3ee` | Oil | `#fb7185` |
| Offshore Wind | `#38bdf8` | Storage / Battery | `#f472b6` |
| Hydro | `#0ea5e9` | Geothermal | `#2dd4bf` |
| Pumped Storage | `#0284c7` | Biomass | `#84cc16` |
| Nuclear | `#34d399` | Waste | `#eab308` |
| Gas | `#a78bfa` | (default) | `#64748b` |

| Layer id | type | minzoom | Sizing (OpenGridWorks capacity bubbles) |
|---|---|---|---|
| `crep-plants-global-glow` | circle | `POWER_PLANT_MIN_ZOOM` (2.7) | `z3→min(17, 5 + sqrt(cap)*0.22) … z14→min(52, 9 + sqrt(cap)*0.9)`; opacity 0.42, blur 1.0 |
| `crep-plants-global-dot` | circle | 2.7 | `z3→min(9, max(2.8, sqrt(cap)*0.07)) … z14→min(34, max(6, sqrt(cap)*0.3))`; opacity 0.95; white stroke `z3→0.45 … z12→1.1` (Jun 12 2026: "bigger + brighter at global/continental zoom so the grid reads worldwide") |
| `crep-plants-global-label` | symbol | **10** | "`<name> - <round(cap)> MW`", text-size `z10→9 … z18→13` |

Click → `setSelectedInfraAsset({ type: "plant", … capacity_mw, fuel, owner, country: country_long||country, source: "WRI Global Power Plant Database" })` (`:20556-20578`).

##### 3.4 Global data centers (`crep-dcs-global-*`, `:20594-20760`)

Uses `INFRA_LAYERS.dataCentersGlobal` (`preferGeoJSON: true`). Gated on `dataCentersG` (default ON). Four-layer neon stack for the OpenGridView "glowing blue squares" look, all `minzoom: DATA_CENTER_MIN_ZOOM` (2.7):

| Layer id | type | Color | Radius ramp |
|---|---|---|---|
| `crep-dcs-global-halo` | circle | `#22d3ee` (cyan-300), opacity 0.18, blur 1.4 | `z2→8, z5→13, z8→20, z12→32, z16→48` |
| `crep-dcs-global-glow` | circle | `#38bdf8` (sky-400), opacity 0.42, blur 0.8 | `z2→5 … z16→28` |
| `crep-dcs-global-dot` | circle | `#60a5fa` (blue-400), opacity 1.0, 2px white stroke | `z2→4.5, z5→6.5, z8→9, z12→13, z16→18` |
| `crep-dcs-global-icon` | symbol (`dc-diamond`) | white-with-cyan-border rotated-square glyph drawn on a 32×32 canvas (`:20669-20691`) | icon-size `z3→0.35 … z14→1.1` |

DC name label is gated via a `step(zoom)` expression on the icon layer: empty below `DATA_CENTER_LABEL_MIN_ZOOM` (12), then `coalesce(n, name, "Data Center")` (`:20694-20699`). Click → `__crep_selectAsset({ type: "data_center", operator: op, tier, country, city, source: src })` (`:20736-20750`). Property keys use the compact GeoJSON schema (`n`, `op`, `src`).

##### 3.5 EIA-860M + IM3 overlays (`components/crep/layers/eia-im3-overlays.tsx`)

This is a **separate React component** that lazily attaches five point datasets plus the IM3 polygon footprints. Each dataset (`DATASETS`, `:69-164`) renders a 3-layer stack `[glow, core, label]`:

| Dataset key | File | sourceId | Color / halo | minzoom | radius/value prop |
|---|---|---|---|---|---|
| `im3DataCenters` | `im3-datacenters-existing.geojson` | `crep-im3-datacenters` | `#22d3ee` / `#67e8f9` (cyan) | `DATA_CENTER_MIN_ZOOM` (2.7) | `sqft`; label gate `DATA_CENTER_LABEL_MIN_ZOOM` (12) |
| `eiaOperating` | `eia860m-operating.geojson` | `crep-eia-operating` | `#22c55e` / `#4ade80` (green) | `POWER_PLANT_MIN_ZOOM` (2.7) | `capacity_mw` |
| `eiaPlanned` | `eia860m-planned.geojson` | `crep-eia-planned` | `#3b82f6` / `#60a5fa` (blue — "projected future") | 2.7 | `capacity_mw` |
| `eiaRetired` | `eia860m-retired.geojson` | `crep-eia-retired` | `#ef4444` / `#f87171` (red) | 2.7 | `capacity_mw` |
| `eiaCanceled` | `eia860m-canceled.geojson` | `crep-eia-canceled` | `#9ca3af` / `#d1d5db` (gray — canceled/postponed) | 2.7 | `capacity_mw` |

The four EIA splits map directly to the **operating / planned / retired / canceled** plant states; each feature carries `{ plant_name, entity_name, technology, capacity_mw, state, county, plant_id, generator_id, status_code, year }` (`:17-19`).

**Glow/core radius (`:493-522`)** are capacity-graduated: glow `z3→min(14, 3 + sqrt(value)*0.1) … z13→min(32, 7 + sqrt(value)*0.6)`; core `z3→min(6, 1.5 + sqrt(value)*0.05) … z13→min(16, 4 + sqrt(value)*0.25)`, white 1.1px stroke. **Label** (`:532-559`) renders "`<name> · <value> <unit>`" at `labelMinzoom ?? 9`.

**IM3 footprint polygons (`:336-431`)** — separate `useEffect`. Source `crep-im3-footprints` from `im3-datacenter-footprints.geojson`, rendered as `crep-im3-footprint-fill` + `crep-im3-footprint-line` at **`minzoom: 11`**. `atlas_type` match: `campus → #0ea5e9` (fill-opacity 0.12), `building → #22d3ee` (fill-opacity 0.32). Click → `__crep_selectAsset({ type: "data_center", atlas_source: "IM3 footprint (PNNL)" })`.

**Earth-Simulator viewport scoping (`shouldLoadRawDetail`, `:224-236`):** On the Earth Sim route these raw-GeoJSON layers only paint when `zoom >= RAW_OVERVIEW_POINT_MIN_ZOOM (11.5)` OR the viewport span ≤ `RAW_DETAIL_MAX_SPAN_DEG (0.85°)` in both lat and lng. Footprints use `RAW_FOOTPRINT_DETAIL_MIN_ZOOM (11)` with the small-viewport override disabled. When active, the loaded data is filtered to a **padded viewport** (`expandBounds` factor 0.18, `scopeGeojsonToBounds`, `:270-280`) so off-viewport features leave the render source. Datasets are also loaded with a **staggered delay** (`datasetIndex * 90 ms`) and a `requestIdleCallback` yield (300 ms for `eiaOperating`, 180 ms otherwise) to avoid blocking first paint. Datasets are cached in a module-level `EIA_IM3_DATASET_CACHE` (`:186`).

The component is mounted only when at least one of its layer ids is enabled (`hasEnabledLayer(layers, EIA_IM3_LAYER_IDS)`, `:22520`). Enabled props (`:22526-22531`): `im3DataCenters` defaults ON; `im3DataCenterFootprints` defaults OFF; the four EIA splits default to `isEarthSimulatorRoute` (ON on the Earth Sim, OFF elsewhere).

#### 4. Layer-toggle bridge & unified controls (`lib/crep/metro-infra-layer-bridge.ts`)

Several visually distinct sources are collapsed into **one panel toggle each**, with the extra source ids hidden from the panel (`isHiddenFromLayerPanel`, `:181-192`):

| Unified panel toggle | Drives state ids (`expandLayerToggleIds`) | Hidden duplicate ids |
|---|---|---|
| Data centers | `dataCenters`, `dataCentersG`, `im3DataCenters`, `im3DataCenterFootprints` (`:77-82`) | `dataCentersG`, `im3DataCenters`, `im3DataCenterFootprints` |
| Power plants | `powerPlants`, `powerPlantsG`, `eiaOperating`, `eiaPlanned`, `eiaRetired`, `eiaCanceled` (`:91-98`) | `powerPlantsG`, `eiaOperating`, `eiaPlanned`, `eiaRetired`, `eiaCanceled` |
| Transmission | `transmissionLines`, `txLinesGlobal`, `txLinesFull` (`:109-113`) | `transmissionLines`, `txLinesFull` |
| Cell towers | `cellTowers`, `cellTowersG` (`:121-124`) | `cellTowersG` |

Toggling the parent expands to all linked ids via `expandLayerToggleIds` (`:195-209`). Per-city OSM detail layers for 17 metros (`METRO_INFRA_REGION_IDS`, `:20-38`) × 11 suffixes (Hospitals, Police, Sewage, CellTowers, AmFmAntennas, Military, DataCenters, TransitSubway, TransitRail, Airports, GovtEmbassy, `:42-54`) plus the SD/TJ coverage set are also hidden from the panel and follow the generic parent toggles — e.g. every region's `…DataCenters` follows the unified data-center toggle (`deriveRegionInfraEnabled`, `:250-264`).

#### 5. Viewport-stats API (`app/api/crep/infra/viewport-stats/route.ts`)

Server route (`runtime = "nodejs"`, `dynamic = "force-dynamic"`) that reads `power-plants-global.geojson` and `data-centers-global.geojson` from disk (memoized module-level promises so each file parses once per server lifetime, `:70-71, :146-207`) and returns viewport-scoped plant/DC counts + per-fuel capacity stats.

**Query params (`:248-251`):**
- `bbox` = `west,south,east,north` (parsed/clamped; defaults to whole world; handles antimeridian, `:124-144`).
- `plantLimit` = clamp(100, value, 15000), default 8000.
- `datacenterLimit` = clamp(50, value, 5000), default 2000.

The client (`CREPDashboardClient.tsx:14895-14896`) sets these by zoom: `plantLimit = z≤4.5 ? 2500 : z≤7 ? 5000 : 9000`; `datacenterLimit = z≤4.5 ? 750 : 2000`.

**Response shape (`:259-281`):** `{ ok, bbox, counts: { plants, datacenters }, plantStats, plants[], datacenters[], sampled: { plants, datacenters }, generatedAt }`. `counts` is the **full viewport count** (pre-sampling); `plants`/`datacenters` arrays are sampled — plants sampled by **largest capacity first** (`samplePlantsForClient`, `:234-240`), DCs by array order (`:242-245`). Cache header: `public, s-maxage=300, stale-while-revalidate=900`.

**`computePlantStats` (`:209-232`)** groups by normalized fuel and returns `totalPlants`, `totalCapacityGW = (ΣMW/1000).toFixed(1)`, and `byFuelType[]` sorted by GW desc. `normalizeFuel` (`:92-110`) canonicalizes raw fuel strings; `FUEL_COLORS` (`:49-68`) is the server-side fuel palette (note: server uses `solar=#f59e0b`, `wind=#14b8a6`, `gas=#a855f7`, etc. — slightly different from the client `plantColorExpr`).

**Client wiring:** the response feeds `setPowerPlants`, `setViewportInfraDatacenters`, and `viewportInfraStats` (`:14907-14920`), which the `InfrastructureStatsPanel` reads as `statsOverride` + `countsOverride`. The fetch is **debounced 320 ms** on bounds change, aborts in-flight on re-fire, and is skipped if both plants and DCs are disabled (`:14876-14942`). It is also skipped entirely when `auditAllOffMode` or `assetIsolationMode` is active. (Note: `infraFetchEnabled` for the *other* MINDEX infra hook is gated `!isEarthSimulatorRoute`, but this viewport-stats effect is not — it runs on the Earth Sim too.)

#### 6. The Infrastructure Stats panel (`components/crep/panels/infrastructure-stats-panel.tsx`)

OpenGridWorks-style viewport-reactive left panel. Header shows `regionName || "Infrastructure"`, a `BETA` badge, and "`<totalPlants> plants | <totalCapacityGW> GW`" (`:150-158`). Counts come from `countsOverride` (server) falling back to client array lengths (`:105-109`).

**Overview grid (`:202-227`):** Power Plants (amber `bg-amber-400`), Substations (violet), TX Lines (rose), Sub. Cables (cyan), each with a live count.

**Sections (collapsible):**
- **Technology** (`:229-267`) — `stats.byFuelType` rows: color dot, fuel name, count, capacity (GW if ≥1 else MW), and a capacity bar normalized to the largest fuel.
- **Size (MW) legend** (`:269-304`) — concentric circles for 5000/2500/1000/500/100 MW, radius = `sqrt(mw) * 0.3`; footer shows "`Zoom <z> | Bubble size <scale>x`".
- **Data Centers** (`:306-336`), **Transmission** (`:338-371`), **Substations** (`:373-406`), **Submarine Cables** (`:408-427`), **Planned Upgrades** (`:429-440`), **Gas Pipelines** (`:442-452`), **Globe Controls** (`:454-484`), **Label Settings** (`:486-519`).

**Transmission section LayerRows (`:354-356`)** expose three named sub-sources to the user: "HIFLD Lines (US)" → `transmissionLines`, "ROW Infra" → `txLinesGlobal`, "OSM Lines (US)" → `txLinesSub`. Below them, `txStats` bins each line into a `VOLTAGE_CLASS` by `voltage_kv` and shows per-class counts (`:112-123, :357-367`). **Substations section** similarly maps HIFLD/ROW/OSM rows all to the `substations` toggle and bins by `SUBSTATION_TIERS`.

**Settings sub-panels (`InfraSettingsPanel`, `:599-811`):**
- *Filters/Plants status filter* (`plantStatus`, `:70-77`): **Operating, Planned, Under Construction** default ON; **Mothballed, Retired, Cancelled** default OFF. (Note: this is local panel state — it does not currently feed back into the EIA layer visibility, which is driven by the layer registry toggles.)
- *Color By* options: Technology / Sector / Status / Balancing Authority / Entity / COD Year / Retirement Year (`:691`).
- *Palette* presets: Default, Glow, Neon Night, Amber, Ivory, Sapphire, Prism (`:643-651`).
- *Size* slider: bubble scale **0.35–2.0**, step 0.05 (`:717-725`).
- *Data center source checkboxes*: Megaprojects, Epoch AI, IM3, OpenStreetMap, PeeringDB (`:737`).
- *Transmission zoom-gating* note (informational, `:752-754`): "230kV+ at z6.5, 100kV+ at z7, 31kV+ at z8, less than 31kV at z11."
- *Substation* style: diamond/triangle, glow neon/gold (`:758-777`).

##### 6.1 Voltage class tables (shared by panel + deck.gl layers)

**`VOLTAGE_CLASSES`** (`components/crep/layers/transmission-lines.tsx:68-76`):

| id | label | kV range | CSS color | base width |
|---|---|---|---|---|
| `735+` | 735kV+ | 735–∞ | `#ffffff` | 4 |
| `500-734` | 500-734kV | 500–734 | `#22d3ee` | 3.5 |
| `345-499` | 345-499kV | 345–499 | `#60a5fa` | 3 |
| `230-344` | 230-344kV | 230–344 | `#a855f7` | 2.5 |
| `100-229` | 100-229kV | 100–229 | `#ec4899` | 2 |
| `31-99` | 31-99kV | 31–99 | `#fb923c` | 1.5 |
| `<31` | <31kV | 0–30 | `#fb923c80` | 1 |

**`SUBSTATION_TIERS`** (`components/crep/layers/substation-markers.tsx:46-53`):

| id | label | kV range | CSS color | radius |
|---|---|---|---|---|
| `500+` | 500+ kV | 500–∞ | `#ffffff` | 8 |
| `345-499` | 345-499 kV | 345–499 | `#22d3ee` | 7 |
| `230-344` | 230-344 kV | 230–344 | `#60a5fa` | 6 |
| `100-229` | 100-229 kV | 100–229 | `#a855f7` | 5 |
| `31-99` | 31-99 kV | 31–99 | `#9ca3af` | 4 |
| `<31` | <31 kV | 0–30 | `#6b7280` | 3 |

#### 7. deck.gl render alternative (legacy / non-Earth-Sim path)

`infrastructure-stats-panel.tsx` and the MINDEX `useInfrastructureData` path also feed standalone deck.gl layer components. These are the OpenGridWorks-style renderers used outside the MapLibre-native global-dot path:

- **`usePowerPlantLayers`** (`power-plant-bubbles.tsx:125-223`): `ScatterplotLayer` with `getRadius = sqrt(max(cap,1)) * 80 * bubbleScale` (meters, `radiusMinPixels:3`, `radiusMaxPixels:200`); hidden when `zoom < POWER_PLANT_MIN_ZOOM`. `FUEL_TYPE_COLORS` is the RGBA palette "matches OpenGridWorks exactly" (`:62-88`). Text labels at `zoom ≥ max(7, 2.7)`, label threshold by zoom (`z≥10` all, `z≥9` ≥10MW, else ≥50MW).
- **`TransmissionLineLayer`** (`transmission-lines.tsx:89-229`): `PathLayer`, width = voltage-class width (×2.5 if highlighted), `widthMinPixels:1`/`max:12`; voltage labels at midpoint at `zoom ≥ 7` for lines ≥100 kV.
- **`SubstationMarkerLayer`** (`substation-markers.tsx:64-158`): `ScatterplotLayer`, radius = tier radius (pixels, `radiusMinPixels:2`/`max:12`); labels at `zoom ≥ 9` (all subs at z≥11, else ≥100 kV).
- **`DatacenterDiamondLayer`** (`datacenter-diamonds.tsx:45-145`): `ScatterplotLayer` (circles, with a code comment acknowledging the "diamond" is not yet a true diamond — "we'll upgrade to IconLayer later"), `getRadius:6`px, hidden when `zoom < DATA_CENTER_MIN_ZOOM`; labels at `zoom ≥ DATA_CENTER_LABEL_MIN_ZOOM` (12).

Each deck.gl line/substation layer creates its **own** `MapboxOverlay` (`transmission-lines.tsx:202-207`, `substation-markers.tsx:139-141`) — note the in-code warning that only one `MapboxOverlay` can exist per map, so `usePowerPlantLayers` is the hook form designed to merge into a shared `EntityDeckLayer.extraLayers` (`power-plant-bubbles.tsx:120-124`); `PowerPlantBubbleLayer` is `@deprecated`.

#### 8. LOD / zoom-gate policy (`lib/crep/lod-policy.ts`)

Domain-relevant minzoom constants (`:96-123`):

| Constant | Value | Meaning |
|---|---|---|
| `INFRA_POINT_ICON_MIN_ZOOM` | 5 | generic point-icon floor (used to gate the substation idle-load fetch) |
| `INFRA_COUNTRY_REVEAL_MIN_ZOOM` | **2.7** | infrastructure begins painting at US-flyover / country scale |
| `INFRA_HEAVY_POINT_MIN_ZOOM` | 5 | heavy point families default to the generic floor |
| `DATA_CENTER_MIN_ZOOM` | 2.7 (= country reveal) | DC markers visible at US fly-to |
| `POWER_PLANT_MIN_ZOOM` | 2.7 | plant markers visible at US fly-to |
| `DATA_CENTER_LABEL_MIN_ZOOM` | 12 | DC names hidden until street-close zoom (icons stay visible) |
| `INFRA_LINE_GLOBAL_MIN_ZOOM` | 0 | bundled/global infra lines may paint from world view |

The LOD ladder (`LOD_TIERS`, `:160-223`) gates the `infra` budget by tier: `mindexEnabled`/`bundledEnabled` are **false at globe (z0-3) and continent (z3-5)**, turn **true at region (z5-7)** with `maxPerLayer: 15000`, rise to 30000 at state (z7-10), and become `UNCAPPED_RENDER_LIMIT` at city (z10-13) and street (z13-25). `getLODForZoom` (`:228-234`) resolves a zoom to its tier. Note these `infra.maxPerLayer` caps apply to the MINDEX/bundled infra hook path; the PMTiles-native global-dot layers in §3 use their own per-layer `minzoom` (2.7) and rely on tile-level culling rather than these numeric caps.

#### 9. Default on/off states (layer registry, `CREPDashboardClient.tsx:10059-10148`)

| Toggle id | Name | Category | Default | Notes |
|---|---|---|---|---|
| `powerPlants` | Power Plants | pollution | **ON** | "Thermal, nuclear, renewable — OpenGridWorks-style" |
| `powerPlantsG` | Global Power Plants | pollution | **ON** | 34,936 plants / 167 countries (WRI v1.3.0) |
| `eiaOperating` | EIA-860M Operating | infrastructure | **ON** | 27,716 operating generators |
| `eiaPlanned` | EIA-860M Planned (Projected) | infrastructure | **ON** | 1,946 planned generators |
| `eiaRetired` | EIA-860M Retired | infrastructure | **ON** | 7,201 retired generators |
| `eiaCanceled` | EIA-860M Canceled | infrastructure | **ON** | 1,605 canceled/postponed generators |
| `substations` | Substations | infrastructure | **ON** | HIFLD + OSM + MINDEX; viewport+zoom gated |
| `transmissionLines` | (parent TX toggle) | — | **ON** | drives all TX layer ids |
| `txLinesGlobal` | Global Transmission Lines | pollution | **ON** | 22,760 lines; flipped ON Apr 22 2026; PMTiles-served |
| `txLinesFull` | Transmission Lines (ALL voltages) | pollution | **ON** | 52,244 lines incl. 69/115/138/230 kV; PMTiles-only |
| `txLinesSub` | Sub-Transmission (OSM) | pollution | **ON** | ≤115 kV OSM feeders, dashed; rebuilt weekly |
| `dataCenters` | Data Centers (all sources) | telecom | **ON** | Unified: OSM + global + IM3 atlas + footprints |
| `dataCentersG` | Global Data Centers | telecom | **ON** | OSM + PeeringDB + MINDEX (~5–7k); bbox-scoped |
| `im3DataCenters` | Data Centers (IM3 Atlas) | telecom | **ON** | PNNL IM3 v2026.02.09 — 1,479 US DCs |
| `im3DataCenterFootprints` | DC Footprints (IM3 buildings) | telecom | **ON** in registry, but **OFF** as wired to EiaIm3Overlays (`:22527` defaults `?? false`) and gated to zoom ≥ 11 |
| `cellTowers` | Cell Towers | telecom | **ON** | Cellular tower locations |
| `cellTowersG` | Global Cell Towers | telecom | **ON** | OpenCelliD (47M) + FCC ASR + OSM; PMTiles bbox-scoped |

(Registry `enabled: true` is the persisted default; on the Earth Sim route most infra layers also fall back to ON via `isEarthSimulatorRoute` when the toggle is absent from `__crep_layers`.)

#### 10. Known limitations & gotchas

1. **PMTiles low-zoom decimation** (`static-infra-loader.ts:36-39, :116-119`): tippecanoe drops most points below base zoom, so a continental flyover of the *PMTiles* power-plant/DC source shows only the biggest ~50 features. Worked around by `preferGeoJSON: true` on plants and DCs (full GeoJSON loaded instead), but transmission **lines stay on PMTiles** and therefore rely on tippecanoe's simplification for low zoom.
2. **78 MB all-voltage TX raw GeoJSON is never loaded in-browser** (`:88-90`): `transmissionFull` and `cellTowersGlobal` set `skipGeojsonFallback: true` — if the PMTiles archive is missing or stubbed, the layer silently does not render rather than freezing controls.
3. **41 MB cell-tower PMTiles 404s from the Next.js static handler on prod** (`:126-132`) — exact cause unknown ("likely a size threshold in Next.js standalone runtime"); mitigated by routing through `/api/crep/tiles/*`.
4. **Tiny-stub PMTiles** can pass a naive probe — live once served `transmission-lines-us-full.pmtiles` as a 134-byte 206 (`:248-252`); the size guard (`largeEnough`) exists specifically to reject this.
5. **OOM history**: substations (12 MB / 76k), `txLinesFull` (78 MB / 52k), and the combined infra load were parsing into heap on *every* mount regardless of zoom/visibility before the Apr 21 2026 audit added enable+zoom gates (`:19918-19938, :20323-20326`). Several layers are still loaded eagerly on the Earth Sim route (defaults ON).
6. **Substation–line mismatch** (registry note at `:10141-10146`, Morgan Apr 22 2026: "a substation with no line to it… doesn't make sense"): HIFLD only carries ≥115 kV transmission, so 69/34.5 kV feeders connecting many substations are missing from the backbone. The OSM `txLinesSub` dashed layer was added to fill this gap, but coverage depends on OSM community mapping.
7. **Property-schema duality**: global DC/substation/cell GeoJSONs use compact keys (`n`, `op`, `v`, `src`) while HIFLD/EIA use full keys (`name`, `OWNER`, `VOLTAGE`, `capacity_mw`). Render expressions and click handlers `coalesce` across both, and voltage is divided by 1000 when raw values exceed 1000 (volts→kV). A mistake here silently shows "Substation" / 0 kV.
8. **Datacenter "diamond" is still a circle** in the deck.gl path (`datacenter-diamonds.tsx:60-63`) — the IconLayer diamond upgrade is a TODO; the true diamond glyph only exists in the MapLibre-native `crep-dcs-global-icon` canvas image.
9. **Panel status filters are inert**: the `InfrastructureStatsPanel` "Status / Color By / Palette / DC source" controls are local component state and do not currently drive the actual MapLibre layer visibility (which is governed by the layer registry toggles and the bridge in §4).
10. **Server-side fuel palette differs from client**: `viewport-stats/route.ts` `FUEL_COLORS` (`:49-68`) and the client `plantColorExpr` (`:20463-20481`) and deck.gl `FUEL_TYPE_COLORS` are three separate palettes — the panel Technology breakdown (server) can show a slightly different hue than the map dot for the same fuel.

**Key files:** `lib/crep/static-infra-loader.ts`, `components/crep/layers/eia-im3-overlays.tsx`, `lib/crep/metro-infra-layer-bridge.ts`, `components/crep/panels/infrastructure-stats-panel.tsx`, `app/api/crep/infra/viewport-stats/route.ts`, `lib/crep/lod-policy.ts`, `components/crep/layers/power-plant-bubbles.tsx`, `components/crep/layers/transmission-lines.tsx`, `components/crep/layers/substation-markers.tsx`, `components/crep/layers/datacenter-diamonds.tsx`, and the render blocks in `app/dashboard/crep/CREPDashboardClient.tsx` (substations `:19694-19959`, transmission `:20006-20436`, power plants `:20443-20589`, data centers `:20594-20760`, layer-visibility map `:16317-16347`, viewport-stats fetch `:14874-14942`, EiaIm3Overlays mount `:22520-22533`).

---

## 7. Telecom

### Telecom Layers

The Telecom category groups all communications-infrastructure overlays: submarine cables, data centers (three independent sources), cell towers (four delivery paths), the derived signal-coverage heatmap, and radio stations. These layers live in the `telecom` filter category in the layer registry (`app/dashboard/crep/CREPDashboardClient.tsx`) and are rendered through three code paths: (1) inline MapLibre source/layer blocks inside the main `CREPDashboardClient` map-init effect, (2) the lean `ProposalOverlays` wrapper (`components/crep/layers/proposal-overlays.tsx`), and (3) the standalone `SignalHeatmapLayer` React component (`components/crep/layers/signal-heatmap-layer.tsx`). The IM3 atlas is wired through `EiaIm3Overlays` (`components/crep/layers/eia-im3-overlays.tsx`).

#### Layer registry — telecom-category toggles

These are the `MapLayer` definitions in the dashboard's layer array (`CREPDashboardClient.tsx`). Every entry below is `category: "telecom"` unless noted. `enabled` is the default on/off state at first paint while the layer registry hydrates from persisted state.

| Filter id | Display name | File:line | Default | Opacity | Color | Description (verbatim source) |
|-----------|--------------|-----------|---------|---------|-------|-------------------------------|
| `submarineCables` | Submarine Cables | `CREPDashboardClient.tsx:10063` | **ON** | 0.8 | `#06b6d4` | Undersea fiber optic cables |
| `dataCenters` | Data Centers (all sources) | `:10064` | **ON** | 0.9 | `#7c3aed` | Unified toggle: OSM + global + IM3 atlas + IM3 footprints. NYC/DC/Vegas/SD-TJ metro detail follows this filter automatically. |
| `cellTowers` | Cell Towers | `:10065` | **ON** | 0.7 | `#8b5cf6` | Cellular tower locations |
| `signalHeatmap` | Signal Coverage | `:10094` | **ON** | 0.4 | `#a855f7` | Approximate cellular signal coverage heatmap |
| `im3DataCenters` | Data Centers (IM3 Atlas) | `:10126` | **ON** | 0.9 | `#22d3ee` | PNNL IM3 Open Source Data Center Atlas v2026.02.09 — 1,479 existing US data centers with building/campus classification + sqft + operator |
| `im3DataCenterFootprints` | DC Footprints (IM3 buildings) | `:10127` | **ON** | 0.85 | `#22d3ee` | IM3 gpkg building + campus POLYGON footprints (1,374 shapes, zoom ≥ 11). Click any footprint to open the InfraAsset widget. |
| `radioStations` | Radio Stations | `:10133` | **ON** | 0.8 | `#a855f7` | 44,000+ AM/FM/TV + KiwiSDR + Mycosoft SDR nodes |
| `dataCentersG` | Global Data Centers | `:10147` | **ON** | 0.85 | `#7c3aed` | OSM + PeeringDB + MINDEX data-center facilities (~5–7k globally). Apr 22 2026 flipped ON per Morgan — bbox-scoped so viewport-relevant only. |
| `cellTowersG` | Global Cell Towers | `:10148` | **ON** | 0.6 | `#8b5cf6` | OpenCelliD (47M) + FCC ASR + OSM — bbox-scoped via PMTiles. Apr 22 2026 flipped ON — viewport-scoped tile render keeps wide-area OOM at bay. |

> **`radar`** (`:10132`, `category: "infrastructure"`, ON, `#38bdf8`) is closely related — "NEXRAD + Mycosoft SDR + FAA ASR coverage rings" — but is filed under infrastructure, not telecom. It is documented in the Infrastructure domain.

Note the **overlapping ids**: `dataCenters` (unified) and `dataCentersG` (global) map to the *same* MapLibre layer IDs (`crep-static-dcs-circle`, `crep-dcs-global-*`) in the visibility toggle table (`:16320`–`:16321`), so toggling either flips the same rendered layers. Likewise `cellTowers` and `cellTowersG` both control `crep-celltowers-global-circle` + `crep-celltowers-bbox-dot` (`:16322`–`:16323`).

#### Per-layer visibility wiring

A single `useEffect` (`CREPDashboardClient.tsx:16314`) maps each filter id to its concrete MapLibre layer IDs and calls `setLayoutProperty(id, "visibility", …)` on every `layers` change. Layers not yet attached are silently skipped and picked up on the next run. Telecom mappings (`:16319`–`:16326`):

| Filter id | MapLibre layer IDs flipped |
|-----------|----------------------------|
| `submarineCables` | `crep-cables-line-glow`, `crep-cables-line` |
| `dataCenters` / `dataCentersG` | `crep-static-dcs-circle`, `crep-dcs-global-halo`, `crep-dcs-global-glow`, `crep-dcs-global-dot`, `crep-dcs-global-icon` |
| `cellTowers` | `crep-celltowers-circle`, `crep-celltowers-global-circle`, `crep-celltowers-bbox-dot` |
| `cellTowersG` | `crep-celltowers-bbox-dot`, `crep-celltowers-global-circle` |
| `radioStations` | `crep-radio-dot` |
| `signalHeatmap` | `crep-signal-heatmap-layer` |

#### LOD / zoom policy for telecom

Telecom min-zoom floors are centralized in `lib/crep/lod-policy.ts` and applied via `applyInfraPointIconMinZoom()` in `lib/crep/production-first-load.ts`.

| Constant | Value | lod-policy.ts:line | Applies to |
|----------|-------|--------------------|------------|
| `INFRA_POINT_ICON_MIN_ZOOM` | **5** | `:96` | Generic infra point/symbol/heatmap floor |
| `INFRA_COUNTRY_REVEAL_MIN_ZOOM` | **2.7** | `:99` | US fly-to / country scale |
| `DATA_CENTER_MIN_ZOOM` | **2.7** (= country reveal) | `:105` | Global + IM3 + regional DC points |
| `DATA_CENTER_LABEL_MIN_ZOOM` | **12** | `:111` | DC names (icons stay visible below this) |
| `TELECOM_DETAIL_MIN_ZOOM` | **5** | `:114` | Cell towers, AM/FM radio, signal heatmap (state/region) |
| `TELECOM_CITY_MIN_ZOOM` | **8** | `:117` | City-scoped tower/antenna detail (SD/TJ, bbox dots) |
| `INFRA_LINE_GLOBAL_MIN_ZOOM` | **0** | `:120` | Bundled/global infra lines (cables, TX) — paint from world view |

`getInfraLayerMinZoom(layerId)` (`production-first-load.ts:44`) resolves the floor by substring match on the layer id:
- `sdtj-cell` / `sdtj-am-fm` / `celltowers-bbox` → `TELECOM_CITY_MIN_ZOOM` (8)
- `celltower` / `cell-tower` / `crep-radio` / `signal-heatmap` / `signalheatmap` → `TELECOM_DETAIL_MIN_ZOOM` (5)
- `dcs-global` / `static-dcs` / `im3-dc` / `sdtj-data-centers` → `DATA_CENTER_MIN_ZOOM` (2.7)

`applyInfraPointIconMinZoom()` (`:88`) only injects a floor for `circle`/`symbol`/`fill`/`heatmap` layer types; it returns `line` and `raster` specs untouched (so cables render from z0) and never gates `crep-live-*` movers. If a spec already has a `minzoom >= floor`, it is left as-is.

The LOD ladder (`LOD_TIERS`, `lod-policy.ts:160`) also governs per-tier `infra.maxPerLayer` budgets, but the telecom layers here are predominantly bbox/PMTiles-scoped rather than capped by that array. Relevant tiers: globe `[0,3)` `maxPerLayer 500`, continent `[3,5)` `1000`, region `[5,7)` `15000`, state `[7,10)` `30000`, city `[10,13)` uncapped, street `[13,25)` uncapped.

#### Readiness gating (Earth Simulator)

On `/natureos/earth-simulator`, telecom overlays are deferred behind several readiness gates so the first globe paint stays fast. Definitions in `CREPDashboardClient.tsx`:

| Gate | Definition | Line |
|------|-----------|------|
| `earthSimDesktopOverlayBudget` | `true` off-route, else `earthSimViewportPerfClass === "desktop"` (tablet/phone get NO desktop overlay budget) | `:7891` |
| `earthOverlayAssetsReady` | Set `true` after `EARTH_SIM_ASSET_READY_DELAY_MS` (`2_500` ms, `:808`) timer, gated on no animation/interaction | `:14313` |
| **`proposalOverlayAssetsReady`** | `earthOverlayAssetsReady && earthSimDesktopOverlayBudget` | `:14363` |
| `stableEarthOverlayAssetsReady` | `!isEarthSimulatorRoute \|\| (!auditAllOffMode && !assetIsolationMode)` | `:14364` |

The first-load delay is `EARTH_SIM_ASSET_READY_DELAY_MS` (2500 ms), bumped by +2500 ms on the very first load (`:14299`).

`ProposalOverlays` is mounted when `assetIsolationMode !== "funga"` AND (off-route OR `stableEarthOverlayAssetsReady` OR `proposalOverlayAssetsReady` OR `satelliteImageryOverlayReady`) (`:22291`). Within its `enabled` prop, the two telecom-relevant overlays gate differently:

- **`radioStations`** (`:22296`): `proposalOverlayAssetsReady && !assetIsolationMode && !isEmbeddedEarthquakeSearch && (layer enabled ?? true)` — i.e. requires the **full** 2.5 s asset-ready gate AND desktop budget.
- **`cellTowersG`** (`:22302`): `stableEarthOverlayAssetsReady && !assetIsolationMode && (!isEmbeddedEarthquakeSearch || embeddedAllowsInfrastructure) && (layer enabled ?? true)` — uses the lighter `stable` gate, so global cell towers appear sooner than radio stations.

The `bbox` prop is `detailedOverlayBbox` (`:22313`), which is `liveOverlayBbox` only when `mapZoom > 5`, else `undefined` (`:16514`). `liveOverlayBbox` is the clamped `[west, south, east, north]` of the current map bounds (`:16503`).

---

#### 1. Submarine cables

**Filter:** `submarineCables` (ON). **Rendered in:** main map-init effect, `CREPDashboardClient.tsx`.

**Primary data source** (`:19270`–`:19308`): static `/data/crep/submarine-cables.geojson` — **710 cables from TeleGeography (CC-BY 4.0)**, real seafloor routes (~725 KB, browser-cached), antimeridian splits pre-applied. Loaded via `fetch(... { cache: "default" })`. Each feature is normalized with `name` (default "Unnamed cable"), a `color` (from a 10-color palette `cableColors` cycled by index, `:19230`, or feature's own `color`), `cable_id`, `source: "telegeography"`, `status` (default "Active"), and geometry passed through `splitAntimeridian()` (`:19234`) which splits any LineString crossing ±180° so cables don't draw straight across the map.

**MINDEX fallback** (`:19313`–`:19345`): only if the static file fails. Two hemisphere queries (`mindexFetch("submarine-cables", …)` for W `[-180,0]` and E `[0,180]`, 5000 each), deduped by id, filtered to routes with ≥2 coordinates, colored by palette index, geometry split.

**Rendered layers** (`:19353`–`:19369`), both `type: "line"` on source `crep-cables`:
- `crep-cables-line-glow` — blurred halo behind: `line-color: ["get","color"]`, width interpolated z1→4 / z4→7 / z8→12, opacity 0.45, `line-blur: 3`.
- `crep-cables-line` — crisp line: same color, width z1→1.5 / z4→2.5 / z8→4, opacity 0.95.

**Interaction:** click on `crep-cables-line` (`:19371`) opens the InfraAsset widget (`type: "cable"`) with name, cable_id, status, owners, length_km, rfs_year, landing_points, capacity, url. `bindFeatureHoverPreview` (`:19389`) shows a hover card (labelKeys name/cable_id/id, detailKeys status/owners/length_km, `minZoom: 5`, 650 ms interval). Full-cable highlight is wired via `registerLineFeatures("crep-cables", features)` (`:19402`) so the whole route highlights, not just the viewport-clipped segment.

**Zoom/LOD:** cables are `line` type, so `applyInfraPointIconMinZoom` does not gate them — they paint from world view (z0) whenever the toggle is on.

---

#### 2. Data centers

Three independent data-center sources render simultaneously, all sharing the `dataCenters`/`dataCentersG` toggles for visibility:

##### 2a. Static hyperscale DCs (`MAJOR_DATACENTERS`)

`:19179`–`:19200`. Built from the in-bundle `MAJOR_DATACENTERS` array (the legacy 44-entry hyperscale set). Source `crep-static-dcs`, layer `crep-static-dcs-circle` (`type: "circle"`, `minzoom: DATA_CENTER_MIN_ZOOM` = 2.7): radius z2→2.5 / z6→4 / z10→6, color `#7c3aed` (violet-600), opacity 0.8, white-ish violet stroke. "Zero-latency" render with no network call.

##### 2b. Global data centers (`dataCentersG`)

`:20595`–`:20760`, loaded via `addInfraSourceWithFallback(map, INFRA_LAYERS.dataCentersGlobal)`. **Gated on `dataCentersG` enabled** (read live from `window.__crep_layers()`, `:20596`) to avoid loading ~4k features into heap when off.

**Source config** (`lib/crep/static-infra-loader.ts:99`):
- sourceId `crep-datacenters-global`, PMTiles `data_centers` layer at `/api/crep/tiles/data-centers-global.pmtiles`, GeoJSON fallback `/data/crep/data-centers-global.geojson`.
- **`preferGeoJSON: true`** (`:107`) — the PMTiles decimate points at low zoom, so the full ~1.1 MB GeoJSON is loaded instead so every DC shows at flyover. `maxGeojsonFallbackBytes: 8 MB`.
- Data sources: **OSM `man_made=data_center` + PeeringDB facilities + MINDEX** (~5–7k features globally).

**Rendered layers** — a three-circle neon "OpenGridView" stack, all `minzoom: DATA_CENTER_MIN_ZOOM` (2.7), source `crep-datacenters-global` (with `source-layer: data_centers` if PMTiles mode):
- `crep-dcs-global-halo` (`:20608`) — outer cyan halo `#22d3ee`, radius z2→8 … z16→48, opacity 0.18, blur 1.4.
- `crep-dcs-global-glow` (`:20625`) — mid glow `#38bdf8`, radius z2→5 … z16→28, opacity 0.42, blur 0.8.
- `crep-dcs-global-dot` (`:20641`) — core `#60a5fa` (blue-400), radius z2→4.5 … z16→18, opacity 1.0, 2px white stroke.
- `crep-dcs-global-icon` (`:20700`, `type: "symbol"`) — a canvas-drawn rotated-square "diamond" glyph (`dc-diamond`, `:20669`), icon-size z3→0.35 … z14→1.1. **Name label** uses a `step` expression that emits "" below `DATA_CENTER_LABEL_MIN_ZOOM` (12) and the DC name at/above it (`:20694`). Text color `#bfdbfe`.

**Interaction:** click on `crep-dcs-global-dot` (`:20736`) fires `window.__crep_selectAsset` (`type: "data_center"`) with operator/tier/country/city/source. Hover preview wired at `:20751`. Property keys use compact PMTiles names (`n`, `op`, `src`) with full-name fallbacks.

##### 2c. IM3 Data Center Atlas

Filters `im3DataCenters` + `im3DataCenterFootprints`, rendered by `EiaIm3Overlays` (`:22520`), mounted when `!auditAllOffMode && !assetIsolationMode && hasEnabledLayer(layers, EIA_IM3_LAYER_IDS)`. Props (`:22526`): `im3DataCenters` (default ON), `im3DataCenterFootprints` (default OFF). Source: **PNNL IM3 Open Source Data Center Atlas v2026.02.09 — 1,479 existing US data centers** (building/campus classification + sqft + operator). Footprints are **1,374 building/campus POLYGON shapes, zoom ≥ 11**, click-to-open InfraAsset widget. The full layer implementation lives in `components/crep/layers/eia-im3-overlays.tsx`. `im3-dc` layer ids resolve to `DATA_CENTER_MIN_ZOOM` (2.7) via `getInfraLayerMinZoom`.

> The `dataCenters` "all sources" toggle description (`:10064`) explicitly states it unifies OSM + global + IM3 atlas + IM3 footprints, and that NYC/DC/Vegas/SD-TJ metro detail follows this filter automatically.

---

#### 3. Cell towers

Four delivery paths feed cell-tower coverage, coordinated by a small `ctState = { globalLoaded, instantRendered }` flag object (`:20941`):

##### 3a. US/TW instant bundle

`:20953`–`:20988`. Loads `/data/crep/cell-towers-us-tw-instant.geojson` (`cache: "force-cache"`) immediately (no idle deferral). Maps features to entities and calls `renderCellTowers(entities, "static-us-tw-instant")`. Config in `static-infra-loader.ts:142` (`cellTowersUsTwInstant`, sourceId `crep-celltowers-us-tw-instant`). **Known caveat (in-code comment, `:20955`):** the instant file was historically a 43-byte stub with zero features; the comment notes the fallback path switches to `cell-towers-us.geojson` (192 curated US towers). If `ctState.globalLoaded` becomes true, the instant overlay is removed via `stripInstantCellOverlay()` (`:20943`).

##### 3b. Legacy / instant render layer (`crep-celltowers`)

`renderCellTowers()` helper (`:20784`). Source `crep-celltowers` (`generateId: true` for hover feature-state). Layer `crep-celltowers-circle` (`:20792`, `minzoom: TELECOM_DETAIL_MIN_ZOOM` = 5): **`#39ff14` neon-green** dots, radius interpolate z2→1 / z5→1.25 / z8→1.5 / z12→2 / z16→3 (hover stops larger; radii were halved Apr 23 2026 per "make every cell tower dot 50% smaller"), opacity 0.85 (hover 1.0), 0.3px white stroke. Click (`:20853`) → `setSelectedInfraAsset({ type: "cell_tower", … })`; hover emits a feature-hover card (`:20834`).

##### 3c. Global PMTiles set (`cellTowersG`)

`:20994`–`:21142`. Gated: reads live `cellTowers` (main, default true) and `cellTowersG` (global, default true) from `window.__crep_layers()`; `cellTowersOn = main || global` (`:21008`). The heavy global load only runs when `useGlobal = cellTowersGlobal` is true (`:21016`); otherwise it throws a sentinel to skip PMTiles and fall through to the bbox path.

**Source config** (`static-infra-loader.ts:123`, `cellTowersGlobal`): sourceId `crep-celltowers-global`, PMTiles `cell_towers` layer routed through `/api/crep/tiles/cell-towers-global.pmtiles` (the 41 MB archive 404s from the default Next.js static handler, so it uses the explicit fs-streaming API route). GeoJSON fallback `/data/crep/cell-towers-global.geojson`, `maxGeojsonFallbackBytes: 24 MB`, **`skipGeojsonFallback: true`** (never load the raw all-towers GeoJSON in-browser). Data sources: **MINDEX + OpenCelliD (47M) + OSM**, supplemented by FCC ASR.

**Rendered layer** `crep-celltowers-global-circle` (`:21036`, source `crep-celltowers-global`, `source-layer: cell_towers` in PMTiles mode): **`minzoom: 3.5`** (Jun 12 2026 — show at continental/US flyover, lower than the generic floor since the tileset has data to z0). `#39ff14` neon-green, radius z3→1.4 / z5→1.8 / z8→2.4 / z12→3.2 / z16→4.5 (hover stops larger), opacity 0.85 (hover 1.0), 0.3px white stroke. On success, sets `ctState.globalLoaded = true` and strips the instant overlay. Hover + click wired (`:21095`, `:21115`) → `setSelectedInfraAsset({ type: "cell_tower", … })` with operator/height_m/radio/mcc/source. Compact PMTiles keys (`n`, `op`, `h`, `src`) with fallbacks.

##### 3d. Per-viewport bbox fill-in (ProposalOverlays)

`proposal-overlays.tsx:939`–`:1092`. Fills fresh OpenCelliD + FCC ASR + OSM results for the current viewport on top of the world-scale PMTiles catalog. Source `crep-celltowers-bbox`, layer `crep-celltowers-bbox-dot`.

- **Gating:** requires `enabled.cellTowersG`, an effective bbox, `mapZoom >= TELECOM_DETAIL_MIN_ZOOM` (5), and NOT `shouldSkipEarthSimulatorTabletBboxDetail()` (`:949`). The tablet/coarse-pointer skip (`:219`) suppresses bbox detail on Earth Simulator when `innerWidth <= 1180 || innerHeight <= 820 || pointer:coarse`.
- **Effective bbox:** `bboxFromMap(map, mapZoom) ?? bboxFromUrl(mapZoom) ?? bbox` (`:948`). `bboxFromMap` (`:161`) derives a zoom-scaled span (lng span `max(0.25, min(12, 22/2^(zoom-3)))`).
- **Zoom bands & precision** (`:958`): zoomBand 10/8/6/5 by `mapZoom`; coordinate precision 3/2/1; combined into a `bboxKey` for dedup so identical viewports don't refetch.
- **API:** `GET /api/oei/cell-towers-global?bbox=…&limit=…` (`:983`). **Limit scales by zoom and viewport class** (`:980`): tablet 50–160, desktop 80–260 (z≥10 → 260; z≥8 → 180; z≥6 → 120; else 80). Cache `"default"`, AbortController-cancelable, debounced (tablet 2500 ms / desktop 1200 ms, `:1085`).
- **Layer** `crep-celltowers-bbox-dot` (`:1014`, `type: "circle"`, `minzoom: TELECOM_DETAIL_MIN_ZOOM` = 5): `#39ff14`, radius z5→1.1 / z8→1.6 / z12→2.3 / z16→3 (hover larger), opacity 0.82 (hover 1.0), 0.35px white stroke.
- **Interaction:** hover feature-state (`:1046`), click (`:1061`) → `window.__crep_selectAsset({ type: "cell_tower", … })` with operator/radio/height_m/structure_type/source (sources joined if array).

##### 3e. MINDEX viewport batchFetch (legacy, off Earth Simulator only)

`:21170`–`:21197`. When `!ctState.globalLoaded && !isEarthSimulatorRoute`, `batchFetch("cell-towers", 20000, …)` pulls MINDEX viewport towers, dedups by id, and calls `renderCellTowers(..., "viewport"/"global")`. **On Earth Simulator this path is skipped entirely** (`:21195`) — only bundled PMTiles / US seed are used. If the global load never set `globalLoaded`, a US legacy bundle `/data/crep/cell-towers-us.geojson` (192 towers) is rendered as a fallback (`:21144`).

---

#### 4. Signal coverage heatmap

**Filter:** `signalHeatmap` (ON). **Component:** `SignalHeatmapLayer` (`components/crep/layers/signal-heatmap-layer.tsx`), mounted at `CREPDashboardClient.tsx:22242` when `!auditAllOffMode && !assetIsolationMode && (signalHeatmap enabled ?? true)`.

**Derivation:** the heatmap is **not** an independent data source — it is derived from `cellTowerPoints` (`:14958`), a memo over `infraFeatures` filtered to `type === "cell_tower"`, mapping each to `{ lat, lng, type: tags["tower:type"], height: parseFloat(tags.height || "30") }`. `infraFeatures` comes from `useInfrastructureData` (Overpass-backed, `:14868`), which on Earth Simulator is disabled (`infraFetchEnabled` requires `!isEarthSimulatorRoute`, `:14862`) — so on the Earth Simulator route `cellTowerPoints` is empty and the heatmap renders nothing.

> There is also a duplicate `signalHeatmap` prop wired into `V3Overlays` (`:22562`) gated on `signalHeatmap` enabled and `earthSimDeferredDataReady`.

**Component config** (`signal-heatmap-layer.tsx`): props `enabled` (default `false`), `towers`, `opacity` (default 0.4), `signalType` (`"cellular" | "radio" | "wifi"`, default `"cellular"`). Source `crep-signal-heatmap-source`, layer `crep-signal-heatmap-layer` (`type: "heatmap"`, run through `applyInfraPointIconMinZoom` → `TELECOM_DETAIL_MIN_ZOOM` floor 5).

**Range model** (`SIGNAL_RANGE`, `:29`): cellular 0.15° (~15 km), radio 0.5° (~50 km), wifi 0.005° (~500 m). `generateHeatmapData()` (`:36`) emits one Point per tower with `intensity = height ? min(1, (height/100)*0.8 + 0.2) : 0.6` and the chosen `range`.

**Paint** (`:92`):
- `heatmap-weight: ["get","intensity"]`.
- `heatmap-radius` interpolated by zoom AND signal type (`:96`): cellular z2→8 / z6→20 / z10→40 / z14→70; radio 15/30/60/100; wifi 3/8/15/25.
- `heatmap-color` ramp by density: transparent → blue (0.1) → cyan (0.3) → green (0.5) → yellow (0.7) → orange (0.9) → red (1.0).
- `heatmap-opacity` = `opacity` prop (default 0.4, updated live via a second effect at `:148`).
- `heatmap-intensity` interpolated z0→0.5 / z6→1 / z10→2.

**Lifecycle:** adds on `style.load`, updates source data on tower change, removes layer+source when `enabled` flips false or on unmount (`:126`, `:139`). Guards against torn-down maps via `mapReady()` (`:71`).

---

#### 5. Radio stations

**Filter:** `radioStations` (ON). **Rendered in:** `ProposalOverlays` section 3 (`proposal-overlays.tsx:427`–`:535`).

**Gating:** the `radioStations` prop requires the **full** `proposalOverlayAssetsReady` gate (`CREPDashboardClient.tsx:22296`) — i.e. the 2.5 s Earth-Sim asset delay plus desktop overlay budget — so radio stations are among the latest-appearing telecom layers on the Earth Simulator.

**API:** `GET /api/oei/radio-stations?limit=20000{&bbox=…}` (`:450`). The limit is set to 20000 in the client; the route caps at `min(limit, 60000)` (`route.ts:26`). Bbox passed when the `bbox` prop is present.

**API route** (`app/api/oei/radio-stations/route.ts`): `runtime: "nodejs"`, `dynamic: "force-dynamic"`. Calls `getAllRadioStations({ baseUrl, bbox })`. Supports query filters `band` (AM|FM|TV|PUBLIC_SDR|SW|CB), `country`, `streamable=true`. Response: `{ source: "radio-stations-multi", total, returned, sources, byBand, byCountry, stations, generatedAt }` with cache header `public, s-maxage=600, stale-while-revalidate=1200`.

**Registry / data sources** (`lib/crep/registries/radio-station-registry.ts`, `getAllRadioStations` at `:181`) — four sources fetched in parallel, merged by `normKey` (callsign, else freq+location, else id), with `merge()` union of `sources[]`:

| Source | Fn | Detail |
|--------|-----|--------|
| **Radio-Browser** | `fromRadioBrowser` (`:68`) | `de1.api.radio-browser.info/json/stations/search?has_geo_info=true&hidebroken=true&limit=…` (2000 global / 10000 bbox). All tagged `band: "FM"`. Carries `streamUrl` (url_resolved), `streamQuality` (by bitrate), genre, language. 20 s timeout. |
| **KiwiSDR** | `fromKiwiSDR` (`:103`) | Scrapes `http://kiwisdr.com/public/` HTML (regex for `(lat, lon)` + `http://ip:port`), max 2000 nodes. `band: "PUBLIC_SDR"`, `sdrUrl`, `sdrBandRange_mhz: [0.01, 30]`. 12 s timeout. |
| **FCC LMS** | `fromFCCStations` (`:131`) | **Bbox required** (returns `[]` without it). ArcGIS FeatureServer mirror `FCC_FM_AM_TV_Broadcast_Stations_View` queried by `Y BETWEEN … AND X BETWEEN …`, `resultRecordCount=2000`. Bands AM/FM/TV from `SERVICE`, freq, power_kw, licensee, city; `country: "US"`. |
| **MINDEX** | `fromMindex` (`:164`) | `${baseUrl}/api/mindex/proxy/radio-stations?limit=20000{&bbox=…}`, 10 s timeout, tagged `sources: ["MINDEX"]`. |

Header doc (`:1`) lists the full intended source set (also OFCOM UK, Bundesnetzagentur DE, FMList.org, OSM masts, WebSDR.org) targeting **44,000+ stations**; only the four above are wired in code. `total`/`byBand`/`byCountry` are computed post-merge (`:217`).

**Client mapping** (`proposal-overlays.tsx:453`): each station → Point feature with `id, name, band, freq (frequency_mhz), callsign, streamUrl (|| sdrUrl)`.

**Rendered layer** `crep-radio-dot` (`:469`, `type: "circle"`, source `crep-radio` with `generateId: true`; run through `applyInfraPointIconMinZoom` → floor `TELECOM_DETAIL_MIN_ZOOM` = 5 since id matches `crep-radio`). Visual language is deliberately distinct from cell towers — radio stations are **hollow band-colored rings** (transparent fill by default; fill appears on hover), cell towers are solid neon-green dots:
- `circle-radius` z2→1.4 / z6→2.2 / z10→3.6 / z14→5.5.
- Fill `circle-color`: transparent `rgba(0,0,0,0)` unless `feature-state hover`, then band color.
- `circle-stroke-color` by band: **FM `#a855f7` (violet), AM `#ec4899` (pink), TV `#f59e0b` (amber), PUBLIC_SDR `#22d3ee` (cyan), default `#8b5cf6`**.
- Stroke width 1.4 (hover 2.0), stroke opacity 0.85, fill opacity 0.0 (hover 0.95).

Hover feature-state wiring (`:509`–`:528`) fills the ring on `mousemove` and clears on `mouseleave`.

##### ⚠️ Known limitation / bug — radioStations effect IIFE never invoked

In `proposal-overlays.tsx`, the radio-stations effect body wraps its fetch+render logic in an async IIFE `void (async () => { … })` but the closure is **never called** — it terminates with `})` at **line 534** instead of `})()`. (Compare the ports effect at `:347` and plants at `:641`, which correctly end with `})()`.) As written, the radio-stations source/layer is only created on the re-enable visibility path (`loadedRef.current.radio` already true), which can never be reached because the load that sets `loadedRef.current.radio = true` (`:440`) runs but the IIFE that builds `crep-radio`/`crep-radio-dot` never executes. **Net effect: the `crep-radio-dot` layer is effectively never attached from this code path**, so radio stations do not appear despite the toggle defaulting ON and the API being fully wired. The visibility toggle table (`:16324`) and the readiness gate all reference `crep-radio-dot`, but nothing creates it.

---

#### Telecom API routes summary

| Route | Used by | Notes |
|-------|---------|-------|
| `/api/oei/radio-stations` | Radio stations | `limit` (≤60000), `bbox`, `band`, `country`, `streamable`. Fuses Radio-Browser + KiwiSDR + FCC LMS + MINDEX. `s-maxage=600`. |
| `/api/oei/cell-towers-global` | Cell tower bbox fill-in (3d) | `bbox` + `limit` (zoom/viewport-scaled 50–260). |
| `/api/crep/tiles/cell-towers-global.pmtiles` | Cell tower global PMTiles (3c) | fs-streaming route (41 MB archive bypasses Next static handler). |
| `/api/crep/tiles/data-centers-global.pmtiles` | Global DCs (2b) | PMTiles, but `preferGeoJSON` makes the GeoJSON the default. |
| `/api/crep/infra/viewport-stats` | DC/plant viewport counts | bbox + zoom-scaled `datacenterLimit` (750 / 2000). Populates `viewportInfraDatacenters` + stats (`:14898`). |
| `/api/mindex/proxy/radio-stations` | MINDEX radio source | Called inside the registry, `limit=20000{&bbox}`. |
| static `/data/crep/submarine-cables.geojson` | Submarine cables | TeleGeography 710 cables. |
| static `/data/crep/cell-towers-us-tw-instant.geojson` / `cell-towers-us.geojson` | Cell instant bundle / legacy fallback | 0-feature stub historically; 192-tower US fallback. |
| static `/data/crep/data-centers-global.geojson` | Global DCs GeoJSON | ~1.1 MB, preferred over PMTiles. |

#### Cross-cutting known limitations (Telecom)

1. **Radio-stations layer never attached** — the async IIFE in `proposal-overlays.tsx` (ends `})` at `:534`, not `})()`); `crep-radio-dot` is not created on first load.
2. **Signal heatmap is empty on Earth Simulator** — `cellTowerPoints` derives from `useInfrastructureData`, which is disabled on the Earth Simulator route (`infraFetchEnabled` excludes it, `:14862`). The heatmap therefore has no towers to render there.
3. **Overlapping toggle ids** — `dataCenters`/`dataCentersG` and `cellTowers`/`cellTowersG` control the same rendered layers, so they are not independent in practice.
4. **Tablet/phone suppression** — `shouldSkipEarthSimulatorTabletBboxDetail()` disables the bbox cell-tower fill-in on small/coarse-pointer Earth-Sim viewports, and `earthSimDesktopOverlayBudget` blocks `proposalOverlayAssetsReady` entirely on non-desktop perf class — radio stations + bbox towers do not load on tablet/phone Earth Simulator.
5. **FCC LMS requires a bbox** — without a viewport bbox (low zoom / globe view), no US AM/FM/TV stations come through that source; only Radio-Browser, KiwiSDR, and MINDEX populate the global view.
6. **KiwiSDR is HTML-scraped over HTTP** — `http://kiwisdr.com/public/` is a non-HTTPS scrape that can mixed-content-block or break if the page layout changes; nodes carry no `country`.
7. **Header-documented sources not implemented** — OFCOM, Bundesnetzagentur, FMList, OSM masts, and WebSDR are listed in the registry header but not wired, so the "44,000+" target is aspirational vs. the four live sources.

---

## 8. Signal Coverage, Proposal Overlays & Telecom Detail

### Telecom — Signal Coverage Heatmap, Proposal Overlays, Submarine Cables & Radio Stations

The CREP Telecom layer family spans three distinct rendering surfaces, all mounted from `app/dashboard/crep/CREPDashboardClient.tsx` (route `/natureos/earth-simulator`, shared with `mycosoft.com` CREP): (1) the standalone **Signal Coverage Heatmap** (`SignalHeatmapLayer`), (2) the **Proposal Overlays** wrapper (`ProposalOverlays`) which owns radio stations, radar, ports, power plants, factories, orbital debris, cell towers and more, and (3) the **Submarine Cables** lines drawn inline by the dashboard's infra pipeline. Telecom point/heatmap layers share a common zoom floor of `TELECOM_DETAIL_MIN_ZOOM = 5` enforced by `applyInfraPointIconMinZoom`.

#### 1. Signal Coverage Heatmap (`SignalHeatmapLayer`)

**File:** `components/crep/layers/signal-heatmap-layer.tsx` (full file, 159 lines). Canvas-based MapLibre `heatmap` layer that approximates cellular/radio/Wi-Fi signal coverage from tower point locations. Its documented purpose (file:3-11) is **MycoBrain device-placement planning** — visualizing where signal exists so field devices can be sited within range.

**Mount & wiring** (`CREPDashboardClient.tsx`):
- Static import at `:257` (`import SignalHeatmapLayer ...`) — deliberately *not* dynamic, to dodge the `ChunkLoadError` HMR crash pattern noted at `:244-253`.
- Rendered at `:22242-22248`, gated by `!auditAllOffMode && !assetIsolationMode && (layers.find(l => l.id === "signalHeatmap")?.enabled ?? true)`.
- Visibility-toggle ID mapping: `signalHeatmap → ["crep-signal-heatmap-layer"]` (`:16326`).
- The Earth-Simulator deferred-data gate at `:22562`: `signalHeatmap: (!isEarthSimulatorRoute || earthSimDeferredDataReady) && !isEmbeddedEarthquakeSearch && (layers.find(l => l.id === "signalHeatmap")?.enabled ?? false)`.

**Layer catalog entry** (`:10094`):

| Field | Value |
|-------|-------|
| `id` | `signalHeatmap` |
| `name` | `Signal Coverage` |
| `category` | `telecom` |
| `icon` | `<Wifi>` |
| `enabled` (default) | `true` |
| `opacity` (default) | `0.4` |
| `color` | `#a855f7` |
| `description` | "Approximate cellular signal coverage heatmap" |

**Tower-derived coverage model — `cellTowerPoints`** (`:14957-14963`): a `useMemo` over `infraFeatures` that filters `f.type === "cell_tower"` and maps each to `{ lat, lng, type: f.tags?.["tower:type"], height: parseFloat(f.tags?.height || "30") }`. Default tower height is **30 m** when untagged. This array is passed as the `towers` prop.

**Props** (`signal-heatmap-layer.tsx:17-23`):

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `map` | `MapLibreMap \| null` | — | map ref |
| `enabled` | `boolean` | `false` | dashboard passes the layer toggle |
| `towers` | `Array<{lat,lng,type?,height?}>` | — | `cellTowerPoints` |
| `opacity` | `number` | `0.4` | dashboard passes `0.4` literal at `:22246` |
| `signalType` | `"cellular" \| "radio" \| "wifi"` | `"cellular"` | dashboard passes `"cellular"` at `:22247` |

**Signal ranges by type** — `SIGNAL_RANGE` (`:28-33`), in degrees (~111 km/degree at equator):

| `signalType` | Range (deg) | Approx distance |
|--------------|-------------|-----------------|
| `cellular` | `0.15` | ~15 km |
| `radio` | `0.5` | ~50 km |
| `wifi` | `0.005` | ~500 m |

`generateHeatmapData` (`:36-56`) emits one GeoJSON Point per tower with two properties: `intensity` and `range`. **Intensity model** (`:51`): `tower.height ? Math.min(1, (tower.height / 100) * 0.8 + 0.2) : 0.6` — height-normalized 0.2–1.0 ramp, defaulting to **0.6** when height absent. `range` is the looked-up `SIGNAL_RANGE[signalType]` (fallback `cellular`).

**Source/layer IDs:** source `crep-signal-heatmap-source`, layer `crep-signal-heatmap-layer` (`:25-26`).

**Layer attach** (`:73-130`): guarded by `mapReady()` (`:71`, requires `map.style` + `getSource`). On enable with `towers.length > 0`, it `setData` on the existing source or `addSource` (geojson), then `addLayer(applyInfraPointIconMinZoom({...}))`. `applyInfraPointIconMinZoom` (see §5) stamps `minzoom: 5` (`TELECOM_DETAIL_MIN_ZOOM`) because the id contains `signal-heatmap`. On `!enabled && addedRef.current`, it removes layer + source (`:126-130`). Style-readiness handled via `isStyleLoaded()` or a `once("style.load")` deferral (`:133-137`).

**Heatmap paint** (`:92-121`):
- `heatmap-weight`: `["get", "intensity"]` — per-tower weight from the intensity property.
- `heatmap-radius`: zoom-interpolated, **branching on signalType** (`:96-102`):

| Zoom | radio | wifi | cellular (else) |
|------|-------|------|-----------------|
| 2 | 15 | 3 | 8 |
| 6 | 30 | 8 | 20 |
| 10 | 60 | 15 | 40 |
| 14 | 100 | 25 | 70 |

- `heatmap-color`: density ramp transparent→blue→cyan→green→yellow→orange→red (`:104-113`): `0 rgba(0,0,0,0)`, `0.1 blue`, `0.3 cyan`, `0.5 green`, `0.7 yellow`, `0.9 orange`, `1 red`.
- `heatmap-opacity`: the `opacity` prop (`0.4`).
- `heatmap-intensity`: zoom-interpolated `0→0.5`, `6→1`, `10→2` (`:115-120`).

**Opacity live-update** (`:148-156`): a second `useEffect` calls `setPaintProperty("heatmap-opacity", opacity)` when `opacity` changes, guarded against torn-down style. Component returns `null` (pure imperative map side-effect).

#### 2. Proposal Overlays wrapper (`ProposalOverlays`)

**File:** `components/crep/layers/proposal-overlays.tsx` (full file, 2,404 lines). A lean wrapper (header `:3-26`) that wires NEW CREP registries directly onto the map ref **without touching the 6,500-line `CREPDashboardClient`**. Each overlay is an independent `useEffect`, independently toggleable, and each performs its own `idleLoad → fetch → addSource/addLayer + setData` pattern. Click handlers bubble up through `window.__crep_selectAsset` when defined.

**Layers owned** (header `:8-25` and `enabled` interface `:86-114`): `ports`, `radar`, `radioStations`, `powerPlantsG`, `factories`, `orbitalDebris`, `debrisCloud`, `txLinesGlobal`, `cellTowersG`, `bathymetry`, `topography`, `satImagery`, `railwayTracks`, `railwayTrains`, `droneNoFly`, `cctv`.

**Props** (`:86-114`): `map`, `enabled` (the toggle object above), `bbox?: [w,s,e,n]`, `searchContextMode?`, `mapZoom?: number` (default 0; railway raster hidden below `RAILWAY_MIN_ZOOM`).

##### 2a. Idle-load orchestration & style-readiness

- **`idleLoad<T>`** (`:116-125`): wraps `requestIdleCallback(run, { timeout: 3000 })`, falling back to `setTimeout(run, 300)`. Used to defer heavy fetches (factories, debris, debrisCloud, railwayTracks, railwayTrains, droneNoFly, cctv) so they don't compete with first paint.
- **`isMapStyleReady`** (`:127-136`): true when `getSource`/`getStyle` exist and `isStyleLoaded()` OR style has ≥1 layer.
- **`styleReadyTick`** (`:239-271`): a counter bumped via `requestAnimationFrame` on `load`/`style.load` events plus one-shot retries at **150 ms, 700 ms, 1800 ms, 3200 ms, 6200 ms** (`:257-263`) — a startup safety net for HMR races where style events are missed. Every layer effect lists `styleReadyTick` in its dependency array so layers re-evaluate without waiting for user clicks.

##### 2b. `railway-live` module-level caching

A module-scoped cache for the Amtrak Track-A-Train feed (`:55-84`):
- `railwayLiveCache: { ts, data } | null`, `railwayLiveInFlight: Promise | null`, `railwayLiveAbortController` (`:55-57`).
- **`fetchRailwayLiveCached()`** (`:59-84`): returns cached `data` when `document.hidden`; serves cache when `< 30_000 ms` (30 s) old; coalesces concurrent calls via `railwayLiveInFlight`; aborts the prior controller; 5 s timeout via `setTimeout(abort)`; fetches `/api/oei/railway-live?limit=1500` (`cache: "no-store"`); on non-OK or error falls back to last cached data or `{ trains: [] }`. The railway-trains effect (`:1752-2036`) re-polls every **30 s** and renders a train SVG icon + a "cars" trail LineString.

##### 2c. `proposalOverlayAssetsReady` gate & mount

**Definition** (`CREPDashboardClient.tsx:14363`): `const proposalOverlayAssetsReady = earthOverlayAssetsReady && earthSimDesktopOverlayBudget;`. Companion gates: `stableEarthOverlayAssetsReady` (`:14364-14366` — `!isEarthSimulatorRoute || (!auditAllOffMode && !assetIsolationMode)`) and `satelliteImageryOverlayReady` (`:14367-14369`, same predicate). Outside Earth-Simulator these are all effectively `true`; on the Earth-Simulator route they hold overlays back until the desktop overlay budget and deferred Earth assets are ready (first-paint protection).

**Mount** (`:22291-22316`): `ProposalOverlays` renders when `assetIsolationMode !== "funga" && (!isEarthSimulatorRoute || stableEarthOverlayAssetsReady || proposalOverlayAssetsReady || satelliteImageryOverlayReady)`. `map={mapRef || mapNativeRef.current}`, `bbox={detailedOverlayBbox}`, `searchContextMode={isEmbeddedEarthquakeSearch}`, `mapZoom={mapZoom ?? 0}`. Each `enabled.*` flag composes a readiness gate × isolation/embedded guards × the per-layer toggle:

| `enabled` key | Readiness gate | Default toggle |
|---------------|----------------|----------------|
| `ports` | `stableEarthOverlayAssetsReady` | `false` |
| `radar` | `stableEarthOverlayAssetsReady` | `false` |
| `radioStations` | `proposalOverlayAssetsReady` | **`true`** |
| `powerPlantsG` | `stableEarthOverlayAssetsReady` (allows embedded infra) | `false` |
| `factories` | `proposalOverlayAssetsReady` (toggle id `factoriesG`) | `false` |
| `orbitalDebris` | `proposalOverlayAssetsReady` | `false` |
| `debrisCloud` | `proposalOverlayAssetsReady` | `false` |
| `txLinesGlobal` | `stableEarthOverlayAssetsReady` (allows embedded infra) | `false` |
| `cellTowersG` | `stableEarthOverlayAssetsReady` (allows embedded infra) | **`true`** |
| `bathymetry` | `stableEarthOverlayAssetsReady` | **`true`** |
| `topography` | `stableEarthOverlayAssetsReady` | **`true`** |
| `satImagery` | `satelliteImageryOverlayReady` | **`true`** |
| `railwayTracks` | `stableEarthOverlayAssetsReady` | **`true`** |
| `railwayTrains` | `proposalOverlayAssetsReady` | `false` |
| `droneNoFly` | `proposalOverlayAssetsReady` | `false` |
| `cctv` | `proposalOverlayAssetsReady` + `!isEarthSimulatorRoute` | `false` |

All keys additionally require `!assetIsolationMode` and (most) `!isEmbeddedEarthquakeSearch`.

##### 2d. Owned layers — source/layer IDs and behavior

| Overlay (effect) | Source ID | Layer ID(s) | Data source | Notes |
|------------------|-----------|-------------|-------------|-------|
| Ports (`:274-348`) | `crep-ports-global` | `crep-ports-global-dot` | `/data/crep/ports-global.geojson` (`force-cache`) | 3,600+ WPI/NGA Pub 150 seaports; teal `#14b8a6` circle; click → `seaport`. |
| Radar (`:351-425`) | `crep-radar` | `crep-radar-range`, `crep-radar-dot` | `getNexradStations()` from `radar-registry` | NEXRAD + Mycosoft SDR sites; range circle (`#38bdf8` 8% fill) + dot (`#0ea5e9`); click → `radar_site`. |
| **Radio stations** (`:428-535`) | `crep-radio` | `crep-radio-dot` | `/api/oei/radio-stations?limit=20000` + `&bbox=` | See §4. Hollow band-colored rings; `generateId: true` for hover. |
| Power plants (`:544-642`) | `INFRA_LAYERS.powerPlantsGlobal` (PMTiles/GeoJSON) | `crep-plants-global-dot`, `crep-plants-global-label` | WRI 34,936 plants via `addInfraSourceWithFallback` | `minzoom = POWER_PLANT_MIN_ZOOM (2.7)`; fuel-colored; label at zoom ≥9; click → `power_plant`. |
| Factories (`:645-702`) | `crep-factories` | `crep-factories-dot`, `crep-factories-label` | `/api/oei/factories?bbox=&limit=2000` | Requires `bbox`; `idleLoad`; orange `#f97316`; click → `factory`. |
| Orbital debris (`:705-748`) | `crep-orbital-debris` | `crep-orbital-debris-dot` | `/api/oei/debris?mode=catalogued` | `idleLoad`; first 8,000 objects; purple `#d946ef`. |
| TX lines global (`:756-795`) | `INFRA_LAYERS.transmissionLines` | `crep-txlines-global-line` | `addInfraSourceWithFallback` (PMTiles/GeoJSON) | Voltage-ramped line color; `minzoom: 0`. |
| TX lines bbox (`:798-934`) | `crep-txlines-bbox` | `crep-txlines-bbox-line` | `/api/oei/transmission-lines-global?bbox=&limit=` | Debounced (1.2 s / 2.5 s tablet); `minzoom: 5`; bbox-keyed; click → `transmission_line`. |
| **Cell towers bbox** (`:939-1092`) | `crep-celltowers-bbox` | `crep-celltowers-bbox-dot` | `/api/oei/cell-towers-global?bbox=&limit=` | OpenCelliD 47M + FCC ASR + OSM; `minzoom: TELECOM_DETAIL_MIN_ZOOM (5)`; neon-green `#39ff14`; debounced + bbox-keyed + abortable; hover feature-state; click → `cell_tower`. |
| Debris cloud (`:1095-1144`) | `crep-debris-cloud` | `crep-debris-cloud-heat` | `/api/oei/debris?mode=statistical&totalBudget=80000` | `idleLoad`; heatmap representing ~1.2M objects. |
| Bathymetry (`:1155-1471`) | `crep-bathymetry`, `crep-land-mask-10m` | `crep-bathymetry-raster`, `crep-land-mask-10m-fill` | ESRI World Ocean Base (GEBCO) raster + NE 1:10m land mask | Inserted below roads/labels; land mask clips to ~10 m coastline. |
| Topography (`:1483-1571`) | `crep-topo-dem` | `crep-topo-hillshade` | AWS Terrain Tiles (Mapzen terrarium 30 m DEM) | Native `hillshade`; on-by-default. |
| Satellite HD (`:1582-1682`) | `crep-satimagery` | `crep-satimagery-raster` | ESRI World Imagery (z0–19) | Above buildings, below roads/labels; `raster-opacity 0.72`. |
| Railway tracks (`:1691-1750`) | `crep-railway` | `crep-railway-raster` | OpenRailwayMap raster tiles | `minzoom: RAILWAY_MIN_ZOOM (5)`; `idleLoad`. |
| Railway trains (`:1759-2036`) | `crep-trains-live`, `crep-trains-live-cars` | `crep-trains-live-square`, `crep-trains-live-cars-line` | `/api/oei/railway-live` via `fetchRailwayLiveCached` | 30 s poll; train icon rotated to heading + cars trail; click → `train`. |
| Drone no-fly (`:2045-2184`) | `crep-drone-no-fly` | `crep-drone-no-fly-fill`, `-outline`, `-label` | `/api/oei/drone-no-fly?limit=5000&bbox=` | FAA UAS + OpenAIP polygons; class-colored; fill click-transparent (click on outline+label only); click → `drone_no_fly_zone`. |
| CCTV (`:2194-2401`) | `crep-cctv` | Eagle-camera layer set (`CCTV_LAYER_PREFIX="crep-cctv"`) | `/api/oei/cctv` + `/api/eagle/sources` | `CCTV_MIN_ZOOM=7`, requires `bbox`; fast (limit 160) then full (limit 600); 5 min poll; click → `camera`. |

#### 3. Submarine Cables (dashboard-inline)

Submarine cables are **not** a separate layer file — they are rendered inline by the dashboard's infra pipeline in `CREPDashboardClient.tsx` (`:19228-19406`).

**Layer catalog entry** (`:10063`):

| Field | Value |
|-------|-------|
| `id` | `submarineCables` |
| `name` | `Submarine Cables` |
| `category` | `telecom` |
| `icon` | `<Cable>` |
| `enabled` (default) | `true` |
| `opacity` (default) | `0.8` |
| `color` | `#06b6d4` |
| `description` | "Undersea fiber optic cables" |

**Primary source** (`:19269-19308`): static `/data/crep/submarine-cables.geojson` — **710 cables from TeleGeography (CC-BY 4.0)**, ~725 KB, browser-cached, accurate to the meter. `loadStaticCables()` filters features with coordinates and stamps `name` (default "Unnamed cable"), `color` (from feature or round-robin `cableColors`), `cable_id`, `source: "telegeography"`, `status` (default "Active"). MINDEX is **only** a metadata-enrichment fallback when the static file fails (`:19313-19345` — splits into West/East hemispheres `mindexFetch("submarine-cables", ...)` to dodge PostGIS full-globe bbox issues).

**Color palette** (`:19230`): 10-color round-robin `["#06b6d4","#3b82f6","#a855f7","#ec4899","#f59e0b","#22c55e","#ef4444","#8b5cf6","#14b8a6","#f97316"]`.

**Antimeridian handling** (`:19232-19267`): `splitAntimeridian` + `splitLineCoords` split any LineString/MultiLineString where consecutive longitudes jump > 180°, preventing a cable from Japan→US drawing across the whole map. Single-point segments are filtered out.

**Rendering** (`:19347-19405`): source `crep-cables` (geojson). Two line layers:
- `crep-cables-line-glow` (`:19353-19361`): blurred halo, `line-color ["get","color"]`, width zoom-ramp 4→12, opacity 0.45, `line-blur: 3` — neon glow over dark basemap + sat imagery.
- `crep-cables-line` (`:19362-19369`): crisp line, same color, width 1.5→4, opacity 0.95.

Click handler (`:19371-19388`) opens the InfraAsset widget with `type: "cable"`. Hover preview via `bindFeatureHoverPreview("crep-cables-line", { type: "submarine cable", labelKeys: ["name","cable_id","id"], detailKeys: ["status","owners","length_km"], minZoom: 5, hoverIntervalMs: 650 })` (`:19389-19395`). Full feature list registered via `registerLineFeatures("crep-cables", features)` so highlighting uses the complete route, not the viewport-clipped `querySourceFeatures` (`:19396-19403`).

**Visibility toggle mapping** (`:16319`): `submarineCables → ["crep-cables-line-glow", "crep-cables-line"]`. Click-routing: both `crep-cables-line-glow` and `crep-cables-line` map back to `submarineCables` (`:19116-19117`); `crep-cables-line` click resolves via `selectInfraFeatureFromClick(event, feature, "cable", ["name","cable_id","id"])` (`:21628-21629`).

#### 4. Radio Stations — Radio-Browser + KiwiSDR + FCC LMS via `/api/oei/radio-stations`

**Route:** `app/api/oei/radio-stations/route.ts` (full file, 54 lines). `runtime = "nodejs"`, `dynamic = "force-dynamic"`. Delegates to `getAllRadioStations` from `lib/crep/registries/radio-station-registry.ts`.

**Query params** (`route.ts:17-26`):

| Param | Type | Behavior |
|-------|------|----------|
| `bbox` | `w,s,e,n` (CSV→numbers) | passed to registry when length 4 |
| `band` | `AM\|FM\|TV\|PUBLIC_SDR\|SW\|CB` | post-filter `s.band === band` |
| `country` | ISO alpha-2 | post-filter `s.country === country.toUpperCase()` |
| `streamable` | `"true"` | keep only stations with `streamUrl` or `sdrUrl` |
| `limit` | number | `Math.min(Number(limit ?? 20000), 60000)` — **hard cap 60,000**, default 20,000 |

**Response** (`:41-50`): `{ source: "radio-stations-multi", total, returned, sources, byBand, byCountry, stations, generatedAt }` with `Cache-Control: public, s-maxage=600, stale-while-revalidate=1200`. Errors → HTTP 500 `{ error }`.

**Registry — `getAllRadioStations`** (`radio-station-registry.ts:181-229`). Target coverage **44,000+ stations** (header `:4`). Fetches **four** sources in parallel via a timed `time()` wrapper (each contributes a `{ name, count, error?, durationMs }` entry to `sources`):

| # | Source fn | Endpoint | Band assignment | Notes |
|---|-----------|----------|-----------------|-------|
| 1 | `fromRadioBrowser` (`:68-100`) | `https://de1.api.radio-browser.info/json/stations/search?has_geo_info=true&hidebroken=true&limit=` (10000 w/bbox else 2000) | always `"FM"` | UA header `MycosoftCREP/1.0`; 20 s timeout; client-side bbox filter; `streamUrl` from `url_resolved`; `streamQuality` by bitrate (≥128 high, ≥64 medium, else low). |
| 2 | `fromKiwiSDR` (`:103-128`) | `http://kiwisdr.com/public/` (HTML scrape, first 2000) | `"PUBLIC_SDR"` | 12 s timeout; regex-parses `(lat, lon) … http://ip:port`; `sdrBandRange_mhz: [0.01, 30]` (10 kHz–30 MHz); `sdrUrl` set. |
| 3 | `fromFCCStations` (`:131-161`) | ESRI FeatureServer mirror `FCC_FM_AM_TV_Broadcast_Stations_View` (LMS JSON API deprecated) | FM/AM/TV from `SERVICE` | **bbox required** (returns `[]` without it); 20 s timeout; freq stored kHz for AM, mHz for FM/TV; `country: "US"`. |
| 4 | `fromMindex` (`:164-177`) | `${baseUrl}/api/mindex/proxy/radio-stations?limit=20000&bbox=` | passthrough | 10 s timeout; own registry. |

(Header `:6-16` also lists OFCOM, Bundesnetzagentur, FMList, OSM, WebSDR.org as planned/aggregate sources; the implemented fetchers are the four above.)

**Deduplication** (`merge`/`normKey`, `:51-65`, `:207-214`): keyed by `cs:<CALLSIGN>` → else `freq:<lat3>,<lng3>:<freq_khz>` → else `id:<id>`. Merged records union the `sources` arrays and prefer later non-empty fields. Output aggregates `byBand` and `byCountry` counts and `generatedAt` ISO timestamp.

**Map rendering** in `ProposalOverlays` (`:428-535`): fetches `/api/oei/radio-stations?limit=20000` + optional `&bbox=`. The 20 k client limit (`:446-450`) is the route ceiling for the map call (additional data via PMTiles if needed). Features carry `{ id, name, band, freq: frequency_mhz, callsign, streamUrl: streamUrl||sdrUrl }`. Source `crep-radio` uses `generateId: true` (required for hover feature-state). Layer `crep-radio-dot` renders **hollow band-colored rings** (transparent fill, colored stroke) so they read distinctly from cell towers' solid neon-green dots (`:461-468`):

| Band | Color |
|------|-------|
| FM | `#a855f7` violet |
| AM | `#ec4899` pink |
| TV | `#f59e0b` amber |
| PUBLIC_SDR | `#22d3ee` cyan |
| (default) | `#8b5cf6` |

Radius zoom-ramps 1.4→5.5 (`:472`). On hover (`mousemove`, `:514-528`) the ring fills in and stroke widens via `setFeatureState({ source: "crep-radio", id }, { hover })`. Layer min-zoom is `TELECOM_DETAIL_MIN_ZOOM = 5` (id contains `crep-radio` → `getInfraLayerMinZoom`).

#### 5. Shared zoom-gating — `applyInfraPointIconMinZoom`

**File:** `lib/crep/production-first-load.ts` (`getInfraLayerMinZoom` `:44-85`, `applyInfraPointIconMinZoom` `:88-105`). Every telecom point/heatmap layer is wrapped in `applyInfraPointIconMinZoom(spec)`, which stamps a per-id `minzoom` floor (only when the spec lacks an equal-or-higher one). Exemptions: `crep-live-*` ids, and `line`/`raster` types pass through untouched (so cables and rasters paint from world zoom); only `circle`/`symbol`/`fill`/`heatmap` are gated.

Telecom floors (`getInfraLayerMinZoom`):

| id substring | Floor constant | Zoom |
|--------------|----------------|------|
| `sdtj-cell`, `sdtj-am-fm`, `celltowers-bbox` | `TELECOM_CITY_MIN_ZOOM` | 8 |
| `celltower`, `cell-tower`, `crep-radio`, `signal-heatmap`, `signalheatmap` | `TELECOM_DETAIL_MIN_ZOOM` | 5 |
| (fallback) | `INFRA_POINT_ICON_MIN_ZOOM` | 5 |

Relevant constants from `lib/crep/lod-policy.ts`: `TELECOM_DETAIL_MIN_ZOOM = 5` (`:114`), `TELECOM_CITY_MIN_ZOOM = 8` (`:117`), `RAILWAY_MIN_ZOOM = 5` (`:123`), `POWER_PLANT_MIN_ZOOM = INFRA_COUNTRY_REVEAL_MIN_ZOOM = 2.7` (`:108`,`:99`), `INFRA_POINT_ICON_MIN_ZOOM = 5` (`:96`). The doc comment at `lod-policy.ts:90-95` records the intended telecom tiering (cell towers, radio, signal heatmap all gated at `TELECOM_DETAIL_MIN_ZOOM`).

---

**Key files referenced:**
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\crep\layers\signal-heatmap-layer.tsx`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\crep\layers\proposal-overlays.tsx`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\app\api\oei\radio-stations\route.ts`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\lib\crep\registries\radio-station-registry.ts`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\lib\crep\lod-policy.ts`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\lib\crep\production-first-load.ts`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\app\dashboard\crep\CREPDashboardClient.tsx` (signalHeatmap/cellTowerPoints, ProposalOverlays mount + gate, submarine cables block)
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\public\data\crep\submarine-cables.geojson` (710 TeleGeography cables, primary cable source)

---

## 9. Events & Hazards (Layers)

### Events & Natural Hazards

The CREP dashboard renders global natural-hazard and space-weather events from a server-side aggregation route (`/api/natureos/global-events`), with two distinct client-side render paths that are deliberately deduplicated: **DOM-based `<EventMarker>` widgets** (the canonical, interactive icons) and **MapLibre GeoJSON circle layers** (built by `V3Overlays` but kept permanently hidden as of Jun 12, 2026). This section documents the full pipeline.

#### 1. Event Type Taxonomy

The API response type (`GlobalEvent.type`) is a fixed union of 26 string literals defined at `app/api/natureos/global-events/route.ts:17-47`:

```
earthquake, volcano, wildfire, storm, flood, drought, landslide, tsunami,
solar_flare, geomagnetic_storm, aurora, meteor, lightning, tornado,
hurricane, typhoon, cyclone, blizzard, heatwave, coldwave, air_quality,
radiation, biological, fungal_bloom, animal_migration, insect_swarm,
algae_bloom, other
```

The client's own `GlobalEvent` interface (`CREPDashboardClient.tsx:482-502`) is looser — `type: string` — and carries flattened render fields: `lat`, `lng`, `magnitude`, `locationName`, `depth`, `windSpeed`, `containment`, `affectedArea`, `affectedPopulation`, `source`, `sourceUrl`, `link`.

##### 1.1 Per-type data source and current availability

The eight types the prompt names, plus the rest, map to upstream feeds as follows. "Currently emitted" reflects which `fetch*` functions actually produce that type today.

| Event type | Upstream source (function) | Currently emitted? | Notes |
|---|---|---|---|
| **earthquake** | USGS Earthquake feed (`fetchUSGSEarthquakes`, route.ts:119-171) | **Yes** — primary, highest volume | Also emitted by EONET category `earthquakes` (rare). |
| **volcano** | NASA EONET category `volcanoes` (`fetchNASAEONET`, route.ts:349-404) | **Yes** (when EONET online) | No dedicated volcano feed; EONET only. |
| **wildfire** | **NIFC WFIGS** (`fetchNIFCWildfires`, route.ts:412-467) + NASA EONET category `wildfires` | **Yes** — WFIGS is the authoritative US incident feed | EONET alone tracks ~1 "notable" fire at a time; WFIGS added Jun 12, 2026 to fix empty wildfire layer (route.ts:406-411). |
| **storm** (+ hurricane/typhoon/cyclone/blizzard/heatwave/coldwave/air_quality/drought) | NWS active alerts (`fetchNWSActiveWeatherAlerts`, route.ts:469-533) classified by `normalizeWeatherEventType`; EONET `severeStorms` | **Yes** (US-only via NWS) | NWS is US-jurisdiction; `affected.countries: ["US"]` is hard-coded (route.ts:516-518). |
| **flood** | NWS alerts (flood classifier) + EONET category `floods` | **Yes** | Plus `tsunami`/`landslide` fold into the floods filter bucket. |
| **lightning** | *No upstream feed wired* | **No** | `lightning` is a valid type and has a filter/layer, but no fetcher produces it. NWS classifier can emit `lightning` only if an alert headline literally matches `/\blightning\b/` (route.ts:281). Effectively empty. |
| **tornado** | NWS alerts (tornado classifier, route.ts:276) | **Partial** | Only when an active NWS alert's text matches `tornado|twister`. No dedicated tornado-cell feed. |
| **solar_flare** | NOAA SWPC GOES X-ray flares (`fetchNOAASpaceWeather`, route.ts:173-256) | **Yes** | Class X/M/C → severity extreme/high/medium. Location is `{lat:0,lng:0,name:"Sun"}`. |
| **geomagnetic_storm** | NOAA SWPC planetary K-index (`fetchNOAASpaceWeather`) | **Yes** (only when Kp ≥ 4) | Location pinned to `{lat:65,lng:0,name:"Global - Polar Regions"}`; `magnitude` = Kp value. |
| **aurora** | *Not produced by global-events* | **No** (as an event) | Rendered separately by `AuroraOverlay` (NOAA SWPC aurora-probability overlay) and `SunEarthImpactLayer`. The `aurora` event type exists only for filter routing. |

Additional types (`tsunami`, `landslide`, `drought`, `air_quality`, etc.) are emitted by EONET or the NWS classifier but fold into the seven UI filter buckets (see §6).

#### 2. Server Aggregation — `/api/natureos/global-events`

`GET` handler at `route.ts:535-637`.

##### 2.1 Query params and feed selection

| Param | Default | Clamp | Effect |
|---|---|---|---|
| `limit` | 10000 | 1–25000 (route.ts:537) | Slices the final sorted array. |
| `type` | — | `earthquake`/`earthquakes` → "earthquake-only" mode | When earthquake-only, only `fetchUSGSEarthquakes(days)` runs; all other feeds are skipped (`[await fetchUSGSEarthquakes(days), [], [], [], []]`, route.ts:572-573). |
| `days` | 3 (all-events) / 30 (earthquake-only) | all-events max 7; earthquake-only fixed 30 (route.ts:541-549) | Sets both the USGS feed window and the age-prune cutoff (`maxAgeMs = days * DAY_MS`). |

The USGS feed file is chosen by window (route.ts:125): `days ≥ 30` → `all_month`; `days > 1` → `1.0_week` (all mags down to M1.0, ~8k–15k quakes); else `1.0_day`. The comment notes the Army-contract deliverable requires all active seismic activity, hence the M1.0 feed rather than the older `2.5_day`.

##### 2.2 Parallel fan-out and assembly

In all-events mode, five sources run via `Promise.all` (route.ts:574-580):
`fetchUSGSEarthquakes`, `fetchNOAASpaceWeather`, `fetchNASAEONET`, `fetchNWSActiveWeatherAlerts`, `fetchNIFCWildfires`.

Per-source timeouts (`AbortSignal.timeout`): USGS 6s, NOAA flares 4s, NOAA Kp 4s, EONET 4s, NWS 4s, NIFC WFIGS 5s. All use `cache: "no-store"`. Every fetcher is wrapped to **return `[]` on failure** — a down upstream degrades gracefully, never throws.

Results are concatenated, **age-pruned** by `pruneEventsByAge(events, maxAgeMs)` (drops anything with timestamp ≤ 0 or older than the window, route.ts:111-117, 584-590), then **sorted newest-first** (route.ts:592-594).

##### 2.3 Type classifier (`normalizeWeatherEventType`, route.ts:273-293)

NWS/EONET severe-storm text is classified by ordered regex (first match wins): tornado → typhoon → hurricane → cyclone → flood → lightning → storm → wildfire → blizzard → heatwave → coldwave → air_quality → tsunami → landslide → drought, with a default fallback of `storm`. EONET categories map directly (route.ts:367-374): `wildfires`→wildfire, `volcanoes`→volcano, `severeStorms`→`normalizeWeatherEventType(...)`, `floods`→flood, `earthquakes`→earthquake, `landslides`→landslide, `seaLakeIce`→other.

Geometry centroids are computed by recursively collecting valid `[lng,lat]` pairs and averaging (`collectCoordinatePairs`/`centroidFromGeometry`, route.ts:295-334); events with no valid geometry are dropped. NWS wind speed is parsed from headline/description text (mph or kt→mph) by `extractWindMph` (route.ts:336-347).

##### 2.4 Severity scales

- **USGS earthquakes** (route.ts:141-146): M≥7 extreme, ≥6 critical, ≥5 high, ≥4 medium, ≥3 low, else info.
- **Solar flares** (route.ts:190-194): X extreme, M high, C medium.
- **Geomagnetic** (route.ts:225-231): Kp≥8 extreme, ≥7 critical, ≥6 high, ≥5 medium, ≥4 low.
- **NIFC wildfires** (route.ts:437-438): ≥25,000 acres high, ≥500 medium, else low.
- **NWS** (`severityFromNws`, route.ts:258-271): extreme→extreme, severe→high, moderate→medium, minor→low, else info.

NIFC fires are stamped with **`new Date().toISOString()`** (current time, not discovery time) because the *Current* incident feed is all-active-now and real discovery dates can be weeks old and would be age-pruned (route.ts:451-454).

##### 2.5 Caching, in-flight de-dup, MINDEX ingest

- Per-shape cache keyed `earthquake:{days}` or `all:{days}` (route.ts:551), TTL **60s** (`CACHE_TTL = 60000`, route.ts:81). An earthquake-only search will not evict the all-events Earth Simulator boot feed.
- `globalEventsInFlight` map coalesces concurrent identical requests into one upstream fan-out (route.ts:567-624).
- Response headers: `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` plus `X-NatureOS-Events-Cache: hit|miss|stale-refresh` (route.ts:82-84, 563, 635).
- `sources` block reports per-feed status: usgs `online|offline`, noaa `online|degraded`, nasa_eonet/nws/nifc_wfigs `online|offline` (route.ts:599-605), derived from whether each returned >0 events.
- All assembled events are fire-and-forget ingested into MINDEX via `ingestEvents("global-events", ...)` (non-blocking, route.ts:609-617).
- Debug logging is gated behind `NATUREOS_GLOBAL_EVENTS_DEBUG=1`; EONET/NWS warnings are rate-limited to one per 5 minutes (route.ts:88-89, 397-401, 526-530).

#### 3. Client Fetch Paths & Poll Cadence

Three separate client effects fetch `/api/natureos/global-events`, all merging into a single persistent `eventStoreRef` (a `Map<id, GlobalEvent>`) that prevents marker blink on refresh.

| Effect | Location | URL | Cadence | Route gate |
|---|---|---|---|---|
| **Main `fetchData()`** | CREPDashboardClient.tsx:10838-10902, interval at 11050-11054 | `?days=3&limit={getEarthSimGlobalEventApiLimit()}` (Earth Sim) or `&limit=1200` (other); earthquake-search embed uses `?type=earthquake&days=30&limit=5000` | **60s** (`setInterval(..., 60000)`); skips when `document.hidden` or (Earth Sim and `!earthSimDeferredDataReady`) | All routes incl. Earth Simulator |
| **Instant events paint** | CREPDashboardClient.tsx:11278-11326 | same shape, `limit=1200` | Once on mount (20s timeout); `return` early if `isEarthSimulatorRoute` | Non-Earth-Sim only |
| **Live events refresh** | CREPDashboardClient.tsx:11906-11973 | same shape, `limit=1200` | **90s** (`LIVE_EVENTS_REFRESH_MS = 90_000`); skips via `shouldPauseLiveWork()`; `return` if `isEarthSimulatorRoute` | Non-Earth-Sim only (drives `newEventIds` blink) |

**Net cadence:** On the Earth Simulator route (`/natureos/earth-simulator`) events refresh on the **60s main `fetchData()` loop only**. On standard CREP/embedded routes, the 60s main loop + 90s live refresh both run; the 90s loop is what flags `newEventIds` (the blinking "NEW" ring).

The Earth Simulator API limit (`getEarthSimGlobalEventApiLimit`, CREPDashboardClient.tsx:2359-2364) is viewport-class-tiered: phone 220, tablet 360, desktop 420.

##### 3.1 Client-side formatting and filtering on ingest

All three paths apply the same transform (e.g. CREPDashboardClient.tsx:10849-10872):
1. `.filter(!shouldSuppressEventIcon(e.type))` — drops space-weather types so they never become DOM icons (see §5).
2. `.filter(hasRenderableEventCoordinates(e))` — requires finite lat/lng and rejects null-island `(|lat|<0.01 && |lng|<0.01)` (CREPDashboardClient.tsx:2174-2182).
3. `.map(...)` flattens `location.latitude/longitude/name/depth` to top-level `lat/lng/locationName/depth`, derives `windSpeed` (storms), and regex-extracts `containment` from description (`/Containment: (\d+)%/`).
4. On every merge, space-weather entries already in the store are purged (`for (const [id,ev] ...) if (shouldSuppressEventIcon) delete`) before the new batch is set.

There is also a **separate in-component cache inside `V3Overlays`** (`fetchAllGlobalEvents`, v3-overlays.tsx:396-428): 60s TTL (`CACHE_MS = 60_000`), in-flight promise coalescing, viewport-tiered limit (tablet 280 / desktop 420), `days=3`, request timeout tablet 5s / desktop 10s, and a 72-hour display window (`EVENT_DISPLAY_WINDOW_MS = 72*60*60*1000`, v3-overlays.tsx:372). This feeds only the (now-hidden) V3 circle layers — see §4.

#### 4. Two Render Paths and the De-dup

##### 4.1 EventMarker (canonical, DOM)

`EventMarker` (CREPDashboardClient.tsx:3696-4091) is a `memo`'d React component rendering a MapLibre `<MapMarker>` with a colored 16px dot + icon, a "NEW" amber ring (`isNew`), a pulsing ring for critical/extreme severity, and a rich `<MarkerPopup>` (320–380px) on selection. Popup content is type-specific via `getEventSpecificData()` (CREPDashboardClient.tsx:3728-3788) — e.g. earthquake shows Magnitude/Depth/Location + a satellite map-preview image (`/api/search/map-preview`, earthquakes only, CREPDashboardClient.tsx:3810-3812); wildfire shows Area(acres)/Containment%; storms show Wind Speed; volcano parses an aviation color code from the description; solar/geomagnetic show Class/Kp. Source attribution (icon+label+color) is resolved by `getSourceInfo()` for USGS, NOAA SWPC, NASA EONET, NHC, NWS, FIRMS, Smithsonian GVP, Blitzortung, GDACS, MycoBrain Network, Movebank (CREPDashboardClient.tsx:3791-3806).

Markers render from `renderedEventsForMap` (CREPDashboardClient.tsx:21880-21942). For each event, a `layerMap` (CREPDashboardClient.tsx:21883-21917) maps the event type to a UI layer id (e.g. `earthquake→earthquakes`, all storm sub-types `→storms`, `flood/tsunami/landslide→floods`, `solar_flare/geomagnetic_storm/cme→solar`); the marker renders only if that layer's toggle is `enabled` (`isLayerEnabled`, CREPDashboardClient.tsx:21919-21921). The selected event's popup is kept mounted separately even if perf throttling drops its marker from the render set (CREPDashboardClient.tsx:21946-21969).

##### 4.2 V3 circle dots — permanently hidden (the de-dup)

`V3Overlays` (`components/crep/layers/v3-overlays.tsx`) creates, during one-shot setup (v3-overlays.tsx:749-769), a MapLibre `geojson` source + `circle` layer per event kind (`crep-{earthquakes|volcanoes|wildfires|storms|floods|lightning|tornadoes}` with `-dot` render layer), severity-colored (earthquakes `#b45309`, volcanoes `#f97316`, wildfires `#dc2626`, storms `#6366f1`, floods `#0284c7`, lightning `#facc15`, tornadoes `#7c3aed`), radius interpolated by zoom (2px@z2 → 11px@z14), with a click handler wired to `window.__crep_selectAsset`.

**These dots are forced OFF unconditionally** in the visibility-sync effect (v3-overlays.tsx:996-1002):
```
flip("crep-earthquakes-dot", false)  // …and volcanoes/wildfires/storms/floods/lightning/tornadoes
```
The Jun 12, 2026 comment (v3-overlays.tsx:991-995) explains the de-dup: `EventMarker` DOM widgets are the canonical representation; the V3 plain-circle dots duplicated every event (Morgan saw a "second earthquake icon" / bare USGS dot), so they are kept permanently hidden. **The sources and layers still exist and still get data** — the V3 event fetcher effect (v3-overlays.tsx:1043-1076) still polls and calls `setData` — but the layers are never made visible, reserved as a low-cost fallback.

##### 4.3 V3 event fetcher (still runs, feeds hidden layers)

For each *enabled* event kind, `V3Overlays` polls every **60s** (`setInterval(fetchPaint, 60_000)`, v3-overlays.tsx:1073), skipping when `document.hidden` (v3-overlays.tsx:1061). `fetchEventsByType` (v3-overlays.tsx:430-459) calls `fetchAllGlobalEvents` once then distributes by type using `typeMap` (singular API types → plural filter keys): `earthquakes:["earthquake"]`, `volcanoes:["volcano"]`, `wildfires:["wildfire","fire"]`, `storms:["storm","hurricane","typhoon","cyclone","blizzard","heatwave","coldwave","air_quality","drought"]`, `floods:["flood","tsunami","landslide"]`, `lightning:["lightning"]`, `tornadoes:["tornado"]`. Because no upstream emits `lightning`, that layer stays empty (toggle still controls visibility — the design intent at v3-overlays.tsx:367-369). The original Apr 19, 2026 bug (v3-overlays.tsx:358-369): V3 was fetching nonexistent `/api/oei/{type}` routes (404), so only earthquakes rendered (via the separate EventMarker pipeline) — fixed by routing through `/api/natureos/global-events`.

#### 5. Space Weather: Aurora & Sun→Earth Impact

Space-weather event types are **excluded from the DOM EventMarker path** by `shouldSuppressEventIcon` (CREPDashboardClient.tsx:2169-2172), which returns true for the `SPACE_WEATHER_ICON_EVENT_TYPES` set: `solar_flare, geomagnetic_storm, aurora, cme, solar_wind, sun_earth_impact, sun-earth-impact, radiation_belt` (CREPDashboardClient.tsx:2158-2167). These are instead handled by dedicated overlays:

| Layer (UI id) | Default | Component | Source |
|---|---|---|---|
| **`solar`** ("Space Weather") | **ON** (CREPDashboardClient.tsx:10024) | feeds the `solar` layerMap bucket; events suppressed from DOM, shown via SpaceWeatherWidget | NOAA SWPC solar flares + geomagnetic storms (via global-events) |
| **`auroraOverlay`** ("Aurora Forecast") | **ON**, opacity 0.5 (CREPDashboardClient.tsx:10090) | `AuroraOverlay` (CREPDashboardClient.tsx:21846-21850) | NOAA SWPC aurora-probability overlay on polar regions |
| **`sunEarthImpact`** ("Sun→Earth Impact") | **OFF** (CREPDashboardClient.tsx:10236) | `SunEarthImpactLayer` with `showCorrelationLines={true}` (CREPDashboardClient.tsx:22583-22587) | DONKI + NOAA SWPC + aurora-oval APIs; live flares, CME arrival, aurora ovals, sunspot→earthspot projection, hypothesis correlation lines to tropical cyclones |

`sunEarthImpact` is OFF by default per Morgan ("too much on load") and is gated additionally by `(!isEarthSimulatorRoute || earthSimDeferredDataReady) && !auditAllOffMode && !assetIsolationMode`. Note `solar` is **not** present in the V3Overlays `enabled` prop map (CREPDashboardClient.tsx:22541-22573) — space weather never touches the V3 circle path.

#### 6. UI Filters, Defaults, and Type→Filter Mapping

The seven "events" category layers all default **ON** (CREPDashboardClient.tsx:10019-10026):

| Layer id | Name | Default | Opacity | Color | Description (source) |
|---|---|---|---|---|---|
| `earthquakes` | Seismic Activity | ON | 1.0 | `#b45309` | Real-time USGS earthquake data |
| `volcanoes` | Volcanic Activity | ON | 1.0 | `#f97316` | Active volcanoes / eruption alerts |
| `wildfires` | Active Wildfires | ON | 0.9 | `#dc2626` | (described as "NASA FIRMS"; actually NIFC WFIGS + EONET) |
| `storms` | Storm Systems | ON | 0.8 | `#6366f1` | NOAA storm tracking (NWS alerts) |
| `floods` | Floods & Hydrology | ON | 0.85 | `#0284c7` | Flood/tsunami/landslide alerts |
| `solar` | Space Weather | ON | 0.7 | `#fbbf24` | Solar flares, CME, geomagnetic storms |
| `lightning` | Lightning Activity | ON | 0.8 | `#facc15` | (no upstream feed — empty) |
| `tornadoes` | Tornado Tracking | ON | 0.9 | `#7c3aed` | NWS tornado alerts only |

The `typeFilteredEvents` memo (CREPDashboardClient.tsx:13945-13981) applies the canonical type→filter routing, also enforcing the **72-hour (3-day) display window** (`ts < now - MAP_DISPLAY_MAX_EVENT_AGE_MS`, CREPDashboardClient.tsx:13949). Routing:

- `solar_flare`/sub `radio_blackout` → `spaceWeatherFilter.showSolarFlares`
- `geomagnetic_storm` → `showGeomagneticStorms`; sub `solar_radiation` → `showRadiationBelts`; `aurora` → `showAuroraOval`
- `earthquake`→showEarthquakes, `volcano`→showVolcanoes, `wildfire|fire`→showWildfires
- `storm|hurricane|typhoon|cyclone|blizzard|heatwave|coldwave|air_quality|drought`→showStorms
- `lightning`→showLightning, `tornado`→showTornadoes, `flood|tsunami|landslide`→showFloods
- `fungal_bloom|fungi`→showFungi; device/mycobrain → showMycoBrain
- Anything unmatched → dropped.

`eventTypeConfig` (CREPDashboardClient.tsx:2123-2156) gives each type its marker color/icon/label (e.g. earthquake `#b45309`/Activity, wildfire `#dc2626`/Flame, with a `fire` alias and a `default` `#3b82f6`/CircleDot fallback).

#### 7. Zoom / LOD / Perf Gates

- **3-day age window** on all map display: `MAP_DISPLAY_MAX_EVENT_AGE_MS = 3 * 86400_000` (`lib/crep/lod-policy.ts:72`); enforced both in `typeFilteredEvents` and via `getMaxEventAgeMsForZoom` (constant across zoom, CREPDashboardClient.tsx:2466-2468).
- **DOM marker cap by zoom** (`getEventDomMarkerCapForZoom`, CREPDashboardClient.tsx:2382-2414): non-Earth-Sim — z<3:180, z<5:280, z<7:480, z<9:800, **z≥9: uncapped** (`UNCAPPED_RENDER_LIMIT = +Infinity`). Earth-Sim uses `getEarthSimulatorEventDomCap` (`lib/crep/earth-simulator-boot.ts:260-266`): z<3:160, z<5:220, z<7:280, z<9:340, else 420, further tightened on phone (50–90) / tablet (100–180).
- **Hard DOM ceilings**: `EVENT_DOM_MARKER_CAP = 800`, `EARTH_SIM_DOM_MARKER_CAP = 900` (CREPDashboardClient.tsx:2862-2866) — above ~1200 DOM nodes the main thread starves MapLibre WebGL.
- **Viewport padding (25%)** + **stable-reference hashing**: `visibleEvents` pads bounds by 25% per side (capped 15° lat / 30° lng) and returns the prior array reference when the sorted id-set is unchanged, eliminating marker flicker on micro-pans (CREPDashboardClient.tsx:13999-14228). Until `mapBounds` exists it returns a startup fallback rather than mounting all ~6000 events globally (the "events fade out one-by-one" bug, CREPDashboardClient.tsx:14103-14140).
- **Sticky LOD**: events visible last frame and still in viewport stay; remaining cap slots fill by severity↓+recency↓ via `selectViewportEventsWithPriority` (CREPDashboardClient.tsx:14187-14211). City-level zoom (`isCityLevelZoom && !earthStrictPerfMode`) uncaps entirely.
- **Earthquake-search embed LOD** (`applyEarthquakeSearchLOD`, CREPDashboardClient.tsx:1672-1679): zoom-independent, sorts recency↓ then magnitude/severity↓.
- **Diversity sampling** for caps: `selectDiverseEvents`/`selectDistributedEvents`/`spatiallySampleEventBucket` (CREPDashboardClient.tsx:2197-2345) round-robin across type buckets (`earthquake, wildfire, storm, flood, lightning, volcano, tornado, other`) and spatially grid-sample so a single dense type can't crowd out others.
- **Animation holds**: during `isMapAnimationActive` the visible/rendered sets freeze to their stable refs (CREPDashboardClient.tsx:14022-14038, 14474-14483) to avoid churn while the camera moves.
- **Background-tab skip**: every event poll (main, V3, military-derive) early-returns on `document.hidden`.
- **V3 event layers explicitly skip the Overpass facility/pollution fetch on the Earth Simulator route** (`isEarthSimulatorRoute()` guards, v3-overlays.tsx:629-631, 1128, 1187) — though the event circle layers themselves are hidden regardless.

#### 8. Event Count Display

The MYCA context builder (`getContextText`, CREPDashboardClient.tsx:7200-7235) computes `activeEvents = filteredEvents.length ? filteredEvents : globalEvents` and emits `Visible events: ${eventCount} environmental events` (CREPDashboardClient.tsx:7203-7205, 7230), plus the latest five viewport event titles (CREPDashboardClient.tsx:7218-7221, 7235). The count thus reflects the **viewport-filtered, type-filtered, 3-day-windowed** set when present, falling back to the full store when nothing is visible.

#### 9. Known Limitations

1. **Lightning has no data source.** The `lightning` type, layer, filter, and V3 circle layer all exist, but no fetcher emits it (the NWS classifier only matches literal "lightning" alert text). The layer is permanently empty despite defaulting ON. The marker source attribution even lists "Blitzortung" but it is never wired.
2. **Tornado coverage is alert-text-only** — limited to active NWS alerts whose text matches `tornado|twister`; no tornado-cell tracking feed.
3. **US-centric weather/wildfire.** NWS alerts and NIFC WFIGS are US-jurisdiction; storms/floods/tornadoes outside US rely solely on NASA EONET's sparse `severeStorms`/`floods` categories. `affected.countries` is hard-coded `["US"]` for NWS events.
4. **Volcanoes depend entirely on EONET** (no Smithsonian GVP integration despite the source-icon mapping), so when EONET is offline the volcano layer empties.
5. **Wildfire layer label is stale** — described as "NASA FIRMS fire detection data" but actually sourced from NIFC WFIGS (US) + EONET; FIRMS is referenced only in code comments, not fetched.
6. **Space-weather events have synthetic geometry** — solar flares at `(0,0)`/"Sun", geomagnetic storms pinned to `(65,0)` — so they are deliberately excluded from coordinate-based viewport filtering (treated as always-in-viewport in `visibleEvents`, CREPDashboardClient.tsx:14168-14176) and from the DOM icon path.
7. **V3 circle dots are dead weight** — the per-event GeoJSON sources, circle layers, fetchers, and 60s polling in `V3Overlays` all still run, but the layers are unconditionally hidden, so the work produces no visible output (retained only as a documented fallback).
8. **Triple-fetch redundancy** — on non-Earth-Sim routes, the main `fetchData` (60s), live-refresh (90s), instant paint (once), and `V3Overlays.fetchAllGlobalEvents` (60s) all hit the same endpoint; the server's 60s cache and in-flight coalescing absorb most of this, but it is uncoordinated client-side.
9. **`V3_SETUP_TERMINAL_LAYER` retry gate** (`crep-biodiversity-heat`, v3-overlays.tsx:641-659, 978-983): because `isStyleLoaded()` can flip false mid-setup during sprite/tile churn, the trailing `ensure*` calls (heatmaps, military/transport sub-types, biodiversity) could silently no-op while the old completion check (which validated only early-created sources) left `setupRef` stuck true. The Jun 12, 2026 fix verifies the *last* layer added (`crep-biodiversity-heat`) to force a retry until setup truly completes — this gate also protects the event sources' creation.

---

## 10. Events Data Pipeline & V3 Render Engine

### Events Source Pipeline & V3 Overlay Render Engine

This section documents the two halves of the CREP "natural events" data path: the **global-events aggregation API** (`app/api/natureos/global-events/route.ts`) that fans out to five live upstream feeds and normalizes them into a single `GlobalEvent[]`, and the **V3 MapLibre overlay engine** (`components/crep/layers/v3-overlays.tsx`) that consumes that feed and paints the long tail of layer toggles onto the Earth Simulator map at route `/natureos/earth-simulator`.

---

#### 1. Global Events API — `app/api/natureos/global-events/route.ts`

A single `GET` handler aggregates five upstream feeds in parallel, prunes by age, sorts newest-first, caches per query shape, and (non-blocking) ingests every event into MINDEX. Route is a Next.js App Router handler (`export async function GET`, `route.ts:535`).

##### 1.1 Upstream Sources

| # | Source | Fetcher (file:line) | Upstream endpoint | Timeout | Event `type`(s) emitted | `source` string |
|---|--------|---------------------|-------------------|---------|-------------------------|-----------------|
| 1 | **USGS Earthquakes** | `fetchUSGSEarthquakes(days=7)` — `route.ts:119` | `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/{feed}.geojson` (`route.ts:127`) | 6000 ms (`route.ts:128`) | `earthquake` | `USGS` |
| 2 | **NOAA SWPC Space Weather** | `fetchNOAASpaceWeather()` — `route.ts:173` | X-ray flares: `services.swpc.noaa.gov/json/goes/primary/xray-flares-7-day.json` (`route.ts:179`); planetary K-index: `services.swpc.noaa.gov/products/noaa-planetary-k-index.json` (`route.ts:216`) | 4000 ms each (`route.ts:180`, `route.ts:217`) | `solar_flare`, `geomagnetic_storm` | `NOAA SWPC` |
| 3 | **NASA EONET v3** | `fetchNASAEONET()` — `route.ts:349` | `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=5000` (`route.ts:352`) | 4000 ms (`route.ts:353`) | `wildfire`, `volcano`, `flood`, `earthquake`, `landslide`, severe-storm subtypes, `other` | `NASA EONET` |
| 4 | **NIFC WFIGS Wildfires** | `fetchNIFCWildfires()` — `route.ts:412` | ArcGIS FeatureServer `services3.arcgis.com/T4QMspbfLg3qTGWY/.../WFIGS_Incident_Locations_Current/FeatureServer/0/query` (`route.ts:423`) | 5000 ms (`route.ts:424`) | `wildfire` | `NIFC WFIGS` |
| 5 | **NWS Active Weather Alerts** | `fetchNWSActiveWeatherAlerts()` — `route.ts:469` | `https://api.weather.gov/alerts/active?status=actual&message_type=alert` (`route.ts:471`) | 4000 ms (`route.ts:485` signal) | `tornado`, `typhoon`, `hurricane`, `cyclone`, `flood`, `lightning`, `storm`, `wildfire`, `blizzard`, `heatwave`, `coldwave`, `air_quality`, `tsunami`, `landslide`, `drought` (via `normalizeWeatherEventType`) | `NWS` |

All five are fetched with `cache: "no-store"` and an `AbortSignal.timeout(...)` so a single slow upstream cannot stall the aggregate. Every fetcher is wrapped in `try/catch` and returns `[]` on failure — the route degrades gracefully rather than 500-ing.

###### 1.1.1 USGS feed selection (`route.ts:125`)

The USGS summary feed is selected by the `days` argument, trading recency window against payload size:

| `days` value | Feed file | Approx. count |
|--------------|-----------|---------------|
| `>= 30` | `all_month.geojson` | full monthly catalog |
| `> 1` (default path) | `1.0_week.geojson` | ~8,000–15,000 (all M ≥ 1.0, 7 days) |
| `<= 1` | `1.0_day.geojson` | last 24 h |

The code comment (`route.ts:121-124`) records that earlier versions used `2.5_day.geojson` (~150 quakes); the switch to the `1.0_*` feeds returns the full global catalog because the "Army-contract deliverable requires all active seismic activity." **No limit is applied inside the fetcher** (`route.ts:135`) — every feature is mapped; the response-level `limit` is applied later in `GET`.

USGS magnitude → severity mapping (`route.ts:141-146`):

| Magnitude | `severity` |
|-----------|-----------|
| `>= 7` | `extreme` |
| `>= 6` | `critical` |
| `>= 5` | `high` |
| `>= 4` | `medium` |
| `>= 3` | `low` |
| else | `info` |

Each event carries `location.depth` from `coords[2]` and a `tsunami` note appended to the description when `props.tsunami` is set (`route.ts:152`).

###### 1.1.2 NOAA SWPC (`route.ts:173-256`)

Two independent fetches inside one fetcher:

- **X-ray flares** (`route.ts:178`): each flare with a `max_class` becomes a `solar_flare`. Class letter → severity (`route.ts:191-194`): `X` → `extreme`, `M` → `high`, `C` → `medium` (default `info`). Pinned at `location {lat:0, lng:0, name:"Sun"}` (`route.ts:204-206`).
- **Planetary K-index** (`route.ts:215`): only the latest sample is emitted, and only when `Kp >= 4` (`route.ts:224`). Kp → severity (`route.ts:227-231`): `>=8` extreme, `>=7` critical, `>=6` high, `>=5` medium, `>=4` low. Emitted as a single `geomagnetic_storm` at `location {lat:65, lng:0, name:"Global - Polar Regions"}` (`route.ts:240-243`), with `magnitude = kp`.

NOTE: NOAA is the one source whose offline state is reported as `"degraded"` rather than `"offline"` (see §1.4).

###### 1.1.3 NASA EONET v3 (`route.ts:349-404`)

EONET category → `GlobalEvent.type` mapping (`route.ts:367-374`):

| EONET `categories[0].id` | mapped `type` |
|--------------------------|---------------|
| `wildfires` | `wildfire` |
| `volcanoes` | `volcano` |
| `severeStorms` | `normalizeWeatherEventType(title, description)` → `tornado`/`hurricane`/`storm`/etc. |
| `floods` | `flood` |
| `earthquakes` | `earthquake` |
| `landslides` | `landslide` |
| `seaLakeIce` | `other` |
| (anything else) | `other` |

Each event takes the **first** geometry entry (`route.ts:363`), computes a **centroid** via `centroidFromGeometry` (`route.ts:315`, which recursively walks nested coordinate arrays in `collectCoordinatePairs`, `route.ts:295`, validating lat∈[-90,90] / lng∈[-180,180]). Events with no resolvable centroid are dropped (`route.ts:365`, `.filter` at `route.ts:393`). All EONET events are hard-coded `severity: "medium"` (`route.ts:381`).

###### 1.1.4 IMPORTANT CORRECTION — real wildfires come from NIFC, not NASA FIRMS/EONET

The wildfire layer's authoritative source is **NIFC WFIGS** (`fetchNIFCWildfires`, `route.ts:412`), *not* NASA FIRMS and *not* NASA EONET. The code comment at `route.ts:406-411` is explicit:

> "NASA EONET only tracks a curated handful of 'notable' fires (~1 at a time), so on its own the wildfire layer looks empty. WFIGS publishes every current incident with point geometry + acreage. Jun 12, 2026 (Morgan: 'I don't see any fires, wildfire data anywhere'). Probed live: ~hundreds of WF incidents, ordered by size."

The WFIGS ArcGIS query (`route.ts:414-421`):

| Param | Value |
|-------|-------|
| `where` | `IncidentTypeCategory = 'WF' AND IncidentSize > 0` |
| `outFields` | `IncidentName,IncidentSize,POOState,FireCause,FireDiscoveryDateTime,PercentContained` |
| `f` | `geojson` |
| `returnGeometry` | `true` |
| `orderByFields` | `IncidentSize DESC` |
| `resultRecordCount` | `800` |

Acreage (`IncidentSize`) → severity (`route.ts:437-438`): `>= 25,000` acres → `high`, `>= 500` → `medium`, else `low`. Crucially, every WFIGS row is **timestamped `new Date().toISOString()`** ("now") rather than its discovery date (`route.ts:451-454`), because discovery dates can be weeks old and would otherwise be removed by the age-prune step (§1.3). Note the `@anthropic-ai`/Claude attribution does not apply — this is a third-party data correction; the FIRMS/EONET clarification is a documented behavioral fact, not a code change to make here.

Despite the file-header docstring (`route.ts:5-9`) still listing "Twitter/X Bot feeds" and "OpenWeatherMap Severe Weather", **no such fetchers exist** in the current implementation; the live source set is exactly the five in §1.1, plus the V3 overlay docstring's reference to "FIRMS proxies" (`v3-overlays.tsx:23`) which is likewise stale — wildfire data flows from NIFC via global-events.

###### 1.1.5 NWS Active Weather Alerts (`route.ts:469-533`)

Fetched with required headers `Accept: application/geo+json` and a descriptive `User-Agent` (`route.ts:474-477`). Each feature:
- Classified via `normalizeWeatherEventType(event, headline, description, instruction)` (`route.ts:273`, `route.ts:494`) — a regex cascade mapping NWS text to ~15 event types (tornado, typhoon, hurricane, cyclone, flood, lightning, storm, wildfire, blizzard, heatwave, coldwave, air_quality, tsunami, landslide, drought; default `storm`).
- Severity via `severityFromNws` (`route.ts:258`, `route.ts:505`): `extreme`→`extreme`, `severe`→`high`, `moderate`→`medium`, `minor`→`low`, else `info`.
- Optional `magnitude` = peak wind mph extracted by `extractWindMph` (`route.ts:336`, `route.ts:495`), which scans for `NN mph|kt|kts|knots` and converts knots→mph (×1.15078).
- `affected.countries = ["US"]` (`route.ts:516`), and an `updates[]` entry built from `props.instruction` when present (`route.ts:519`).

##### 1.2 Query Parameters (`GET`, `route.ts:535-551`)

| Param | Parsing (file:line) | Default | Clamp / behavior |
|-------|---------------------|---------|------------------|
| `limit` | `route.ts:537` | `10000` | `Math.max(1, Math.min(value, 25000))` — slices the final array (`route.ts:558`, `route.ts:630`) |
| `type` | `route.ts:538` | `""` | lowercased; only `"earthquake"`/`"earthquakes"` are special-cased → sets `earthquakeOnly` (`route.ts:539`) |
| `days` | `route.ts:540` | `3` (all) / `30` (earthquake-only) | clamped to `[1, maxDays]`; `maxDays` = `7` normally, `30` for earthquake-only (`route.ts:541-549`) |

Relevant constants: `DEFAULT_GLOBAL_EVENT_DAYS = 3` (`route.ts:86`), `MAX_GLOBAL_EVENT_DAYS = 7` (`route.ts:87`), `DAY_MS = 86400000` (`route.ts:85`).

**`earthquakeOnly` fast path** (`route.ts:539`, `route.ts:572-573`): when `type=earthquake[s]`, the route fetches **only** `fetchUSGSEarthquakes(days)` and supplies empty arrays for the other four sources — "so the globe never waits on unrelated layers" (`route.ts:571`). It also raises the default and max window to 30 days. This is the path used by earthquake-only search embeds.

The cache key is shaped per query: `earthquake:{days}` or `all:{days}` (`route.ts:551`) — an earthquake-only search will not evict the all-events Earth Simulator boot feed (`route.ts:79-80`).

##### 1.3 Aggregation, Pruning, Sort & Ingest (`route.ts:567-624`)

1. **Parallel fetch** — non-earthquake path runs all five fetchers via `Promise.all` (`route.ts:574-580`); earthquake path runs USGS only (`route.ts:573`).
2. **Age prune** — `pruneEventsByAge(events, maxAgeMs)` (`route.ts:111`, called `route.ts:584`) drops any event whose `timestamp` is older than `now - days*DAY_MS` or unparseable. Comment: "MINDEX can retain history, but the Earth Simulator boot feed should only render fresh operational data" (`route.ts:582-583`).
3. **Sort** — newest-first by `timestamp` (`route.ts:592-594`).
4. **MINDEX ingest** — `ingestEvents("global-events", realEvents)` (`route.ts:616`, imported from `@/lib/oei/mindex-ingest` at `route.ts:15`) is fired non-blocking with each event flattened to carry top-level `latitude`/`longitude` (`route.ts:610-614`).

**Concurrency control:** an in-flight promise map (`globalEventsInFlight`, `route.ts:103`) deduplicates concurrent misses per cache key, and a 60 s TTL cache (`CACHE_TTL = 60000`, `route.ts:81`; `globalEventsCache`, `route.ts:102`) serves repeat hits. Response headers include `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` (`route.ts:82-84`) and an `X-NatureOS-Events-Cache` value of `hit` / `miss` / `stale-refresh` (`route.ts:563`, `route.ts:635`).

##### 1.4 `sources` Health Block (`route.ts:91-100`, `route.ts:599-605`)

Every response carries a `sources` object reporting per-feed health, derived purely from whether the fetcher returned a non-empty array:

| Key | Online when | Offline/degraded value | Line |
|-----|-------------|------------------------|------|
| `usgs` | `earthquakes.length > 0` | `"offline"` | `route.ts:600` |
| `noaa` | `spaceWeather.length > 0` | `"degraded"` | `route.ts:601` |
| `nasa_eonet` | `eonetEvents.length > 0` | `"offline"` | `route.ts:602` |
| `nws` | `nwsWeather.length > 0` | `"offline"` | `route.ts:603` |
| `nifc_wfigs` | `wildfires.length > 0` | `"offline"` | `route.ts:604` |

The full JSON response shape is `{ events, lastUpdated, cached, sources }` (`route.ts:556-562` cached / `route.ts:628-634` fresh).

##### 1.5 The `GlobalEvent` Type Contract (`route.ts:17-77`)

**`type` union — all 27 values** (`route.ts:19-47`): `earthquake`, `volcano`, `wildfire`, `storm`, `flood`, `drought`, `landslide`, `tsunami`, `solar_flare`, `geomagnetic_storm`, `aurora`, `meteor`, `lightning`, `tornado`, `hurricane`, `typhoon`, `cyclone`, `blizzard`, `heatwave`, `coldwave`, `air_quality`, `radiation`, `biological`, `fungal_bloom`, `animal_migration`, `insect_swarm`, `algae_bloom`, `other`.

(Note: several of these — `aurora`, `meteor`, `radiation`, `biological`, `fungal_bloom`, `animal_migration`, `insect_swarm`, `algae_bloom`, `drought` — are part of the type contract but are **not currently emitted** by any of the five live fetchers; they exist for future sources and for downstream consumers.)

**`severity` enum (6 levels, ordered)** (`route.ts:50`): `info` → `low` → `medium` → `high` → `critical` → `extreme`.

**Other fields:** `id`, `title`, `description`, `timestamp` (ISO), `location {latitude, longitude, name?, depth?, altitude?}`, optional `magnitude`, `source`, `sourceUrl?`, `link?`, `media[]?`, `affected {population?, area_km2?, countries[]?}?`, `updates[]?`.

---

#### 2. V3 MapLibre Overlay Render Engine — `components/crep/layers/v3-overlays.tsx`

`V3Overlays` (default export, `v3-overlays.tsx:661`) is a headless (`return null`, `v3-overlays.tsx:1263`) client component that wires the "long tail" of CREP layer toggles directly into a MapLibre `Map` instance. It receives `{ map, enabled, bbox?, facilities? }` (`v3-overlays.tsx:91-98`) and, per the architecture docstring (`v3-overlays.tsx:11-45`), for each enabled layer: (1) adds an idempotent empty GeoJSON source, (2) adds a circle/line/heatmap render layer, (3) kicks off a best-effort fetch, (4) re-polls at a layer-appropriate interval, (5) wires a click handler to `window.__crep_selectAsset`.

##### 2.1 The `V3Enabled` Toggle Map (`v3-overlays.tsx:50-89`)

Optional booleans across seven groups: **events** (`earthquakes, volcanoes, wildfires, storms, floods, lightning, tornadoes`), **facilities** (`hospitals, fireStations, universities, policeStations, libraries, civicFacilities`), **pollution** (`oilGas, methaneSources, metalOutput, waterPollution`), **human/signal** (`population, humanMovement, events_human, signalHeatmap`), **military** (`militaryAir, militaryNavy, tanks, militaryDrones`), **transport** (`aviationRoutes, shipRoutes, fishing, containers, vehicles, drones`), and **biodiversity**.

##### 2.2 The Events Pipeline Fix — plural→singular type mapping

This is the heart of the events render path and the documented bug fix.

**Documented history (`v3-overlays.tsx:358-369`):** Originally V3Overlays fetched from `/api/oei/{earthquakes,volcanoes,wildfires,storms,lightning,tornadoes}` — **none of those routes existed (404)**. Only earthquakes rendered, because earthquakes came through a *separate* pipeline (`/api/natureos/global-events` + the `EventMarker` layer in `CREPDashboardClient`). This matches Morgan's Apr 19, 2026 QA report: "all of the natural events filters non work none change map except for earthquakes" (`v3-overlays.tsx:358-359`).

**The fix:** fetch `/api/natureos/global-events` **once** per refresh, then distribute its events to each enabled-typed layer by `type` match (`v3-overlays.tsx:365-369`).

- `fetchAllGlobalEvents()` (`v3-overlays.tsx:396`) hits `/api/natureos/global-events?days=3&limit=${limit}` (`v3-overlays.tsx:409`) where `limit` is 280 (tablet) or 420 (desktop) based on viewport (`v3-overlays.tsx:405-408`), with a 5 s/10 s timeout respectively. It has its own 60 s client cache (`_globalEventsCache`, `v3-overlays.tsx:370`, `CACHE_MS = 60_000`) + in-flight dedupe (`_globalEventsInFlight`, `v3-overlays.tsx:371`), and filters to a 72 h display window (`EVENT_DISPLAY_WINDOW_MS = 72*60*60*1000`, `v3-overlays.tsx:372`, applied `v3-overlays.tsx:414-418`).
- `fetchEventsByType(kind)` (`v3-overlays.tsx:430`) is the plural→singular bridge. API `type` strings are **singular**; the plural filter keys claim sets of singular API types via `typeMap` (`v3-overlays.tsx:433-441`):

| Plural filter key | Claims API `type`(s) |
|-------------------|----------------------|
| `earthquakes` | `earthquake` |
| `volcanoes` | `volcano` |
| `wildfires` | `wildfire`, `fire` |
| `storms` | `storm`, `hurricane`, `typhoon`, `cyclone`, `blizzard`, `heatwave`, `coldwave`, `air_quality`, `drought` |
| `floods` | `flood`, `tsunami`, `landslide` |
| `lightning` | `lightning` |
| `tornadoes` | `tornado` |

It filters the global-events feed by `type`/`category` membership in the claimed set (`v3-overlays.tsx:444-448`) and projects each to `{id, lat, lng, name, magnitude, severity, timestamp, source}` (`v3-overlays.tsx:449-458`). For types the API never emits (`lightning`, `tornado` from this feed), the layer stays empty but the visibility toggle still works (`v3-overlays.tsx:367-369`).

##### 2.3 The `crep-{type}` Sources & Layers (one-shot setup, `v3-overlays.tsx:744-984`)

A single `useEffect` (guarded by `setupRef`, `v3-overlays.tsx:744-746`) creates every source + layer. Sources are named `crep-{key}` and render layers append a suffix. Helpers: `ensureSource` (`:137`), `ensureCircleLayer` (`:146`), `ensureHeatmapLayer` (`:151`), `ensureLineLayer` (`:156`), `ensureSymbolLabel` (`:263`), `ensureSymbolIconLayer` (`:292`) — all idempotent (no-op if the layer/source already exists) and `mapReady`-gated (`:121`).

| Group | Source ids | Render layer(s) | Setup line |
|-------|-----------|-----------------|-----------|
| Events | `crep-{earthquakes,volcanoes,wildfires,storms,floods,lightning,tornadoes}` | `…-dot` (circle, severity-colored) | `:749-769` |
| Facilities | `crep-{hospitals,firestations,universities,policestations,libraries,civicfacilities}` | `…-dot` (circle) + `…-icon` (symbol, canvas-drawn glyphs) | `:772-842` |
| Pollution | `crep-{oilgas,methanesources,metaloutput,waterpollution}` | `…-dot` + `…-label` (symbol) | `:845-881` |
| Heatmaps | `crep-{population,humanmovement,events_human,signalheatmap}` | `…-heat` (heatmap) | `:884-902` |
| Military | `crep-{militaryair,militarynavy,tanks,militarydrones}` | `…-dot` | `:905-923` |
| Transport pts | `crep-{fishing,containers,vehicles,drones}` | `…-dot` | `:926-943` |
| Trajectories | `crep-aviation-routes`, `crep-ship-routes` | `…-line` (line) | `:946-959` |
| Biodiversity | `crep-biodiversity` | `crep-biodiversity-heat` (heatmap) | `:962-975` |

Event dot colors (`v3-overlays.tsx:751-759`): earthquakes `#b45309`, volcanoes `#f97316`, wildfires `#dc2626`, storms `#6366f1`, floods `#0284c7`, lightning `#facc15`, tornadoes `#7c3aed`. Circle radius scales with zoom (`v3-overlays.tsx:761`).

**Important — V3 event dots are permanently hidden.** In the visibility-sync effect (`v3-overlays.tsx:996-1002`), all seven `crep-{type}-dot` event layers are flipped `false` unconditionally. Events are instead rendered as DOM `EventMarker` widgets in `CREPDashboardClient` (the canonical icon/popup/fly-to representation); the V3 plain-circle dots duplicated every event (the "second earthquake icon" / bare USGS dot Morgan saw), so they are kept hidden while their sources remain for "any future low-cost fallback use" (`v3-overlays.tsx:990-995`, Jun 12 2026). The event *fetchers* (§2.2) still run and `setData` into the sources (`v3-overlays.tsx:1043-1076`, poll every 60 s, skipping when `document.hidden`) — only the dot layers' visibility is forced off.

##### 2.4 One-Shot Setup + Terminal-Layer Retry (Jun 12 2026 fix)

The setup effect must complete atomically, but `isStyleLoaded()` can flip `false` partway through the synchronous setup (sprite/tile churn on first load), silently no-op'ing the trailing `ensure*` calls and leaving biodiversity, the heatmaps, mover trajectories, military/transport sub-types, and pollution layers **permanently uncreated** (`v3-overlays.tsx:651-658`).

- **Completion gate** (`v3-overlays.tsx:692-696`): `setupComplete` requires `setupRef.current` AND all `REQUIRED_V3_SETUP_SOURCES` present AND `map.getLayer(V3_SETUP_TERMINAL_LAYER)`.
- `REQUIRED_V3_SETUP_SOURCES` (`v3-overlays.tsx:641-649`): `crep-earthquakes`, `crep-hospitals`, `crep-firestations`, `crep-universities`, `crep-policestations`, `crep-libraries`, `crep-civicfacilities` — all created **early** in setup.
- `V3_SETUP_TERMINAL_LAYER = "crep-biodiversity-heat"` (`v3-overlays.tsx:659`) — the **last** layer setup adds. The old check validated only the (early) required sources, so `setupRef` stayed `true` and never retried. Verifying the terminal layer forces a retry until setup truly finishes.
- **Retry mechanism:** end of setup (`v3-overlays.tsx:978-983`) recomputes missing sources + terminal-layer-missing; if either is incomplete it resets `setupRef.current = false` and schedules `setStyleReadyTick(+1)` after 200 ms, re-running the effect. The map-event watcher effect (`v3-overlays.tsx:685-716`) also resets+bumps on `load`/`style.load` and bumps on `styledata`, driving the same retry loop via `requestAnimationFrame`.

##### 2.5 Click & Selection Wiring

`wireClick(map, layerId, type, fallbackName)` (`v3-overlays.tsx:330`) binds (once per layer id, tracked in `wireClick._bound`) a MapLibre `click` handler that calls `window.__crep_selectAsset({ type, id, name, lat, lng, properties })` (`v3-overlays.tsx:341-348`) to drive the generic `InfraAsset` panel, plus `mouseenter`/`mouseleave` cursor changes. Event layers wire their click handler with the singularized type (`k.replace(/s$/, "")`, `v3-overlays.tsx:768`).

##### 2.6 Other Layer Pipelines (context)

- **Facilities** — painted immediately from viewport-intel/MINDEX `facilities` prop (`v3-overlays.tsx:1081-1118`), then enriched via OSM Overpass `fetchOSMFacility` (`:503`) at zoom ≥ `FACILITY_OSM_FETCH_MIN_ZOOM` (10); **explicitly skipped on the Earth Simulator route** via `isEarthSimulatorRoute()` (`:629`, guard at `:1128`). Facility visibility additionally gated to zoom ≥ `FACILITY_ICON_MIN_ZOOM` (9).
- **Pollution** — OSM industrial tags via `fetchOSMIndustrial` (`:531`), zoom floor 3, also Earth-Simulator-route-skipped (`:1187`).
- **Military** — derived client-side every 30 s from `window.__crep_aircraft` / `window.__crep_vessels` by callsign/operator regex (`:1199-1236`).
- **Biodiversity** — GBIF-density heatmap from `/api/crep/biodiversity-hotspots?bbox=…&limit=650` (`:1251`), zoom ≥ `BIODIVERSITY_HOTSPOT_MIN_ZOOM` (3).

##### 2.7 Net Result for `/natureos/earth-simulator`

On the Earth Simulator route, V3Overlays creates all sources/layers and runs the **event** fetchers (the global-events fix), but suppresses the OSM facility/pollution Overpass fetches (route guard) and keeps the duplicate event dot layers hidden. The user-visible natural-events markers are the canonical `EventMarker` DOM widgets fed by the same `/api/natureos/global-events` feed — which, after the Jun 12 2026 NIFC WFIGS addition, finally includes real wildfire incidents alongside earthquakes, space weather, EONET events, and NWS alerts. Before the global-events fix, the dead `/api/oei/{volcanoes,…}` 404s meant only earthquakes ever rendered.

---

## 11. Environment & Conditions

### Environment & Conditions + Base Imagery

This section documents the **Environment** layer category, the live **Environmental Sensors** intelligence panel, and the **base imagery** raster stack (satellite / bathymetry / topography / GIBS / photorealistic 3D / realistic clouds) of the CREP / Earth Simulator dashboard. The route is `/natureos/earth-simulator` (the same `CREPDashboardClient` also serves `/dashboard/crep`); the Earth-Simulator route is detected via `isEarthSimulatorRoute` and `window.location.pathname.startsWith("/natureos/earth-simulator")` (`components/crep/layers/v3-overlays.tsx:629-631`).

#### 1. Environment layer category — registry & defaults

Every layer below is declared in the `layers` state initializer in `app/dashboard/crep/CREPDashboardClient.tsx` (`useState<LayerConfig[]>` at `:9986`). Each entry has `{ id, name, category, icon, enabled, opacity, color, description }`.

| Layer ID | Name | Category | Default `enabled` | Default `opacity` | Color | Source (per `description`) | File:line |
|---|---|---|---|---|---|---|---|
| `fungi` | Nature Observations | environment | **true** | 0.6 | `#22c55e` | MINDEX / iNaturalist / GBIF observations | `:9992` |
| `biodiversity` | Biodiversity Hotspots | environment | **true** | 0.7 | `#a855f7` | GBIF density heat (see §2) | `:10004` |
| `weather` | Weather Overlay | environment | **true** | 0.6 | `#3b82f6` | Temperature / precipitation / wind | `:10013` |
| `buoys` | Ocean Buoys (NDBC) | environment | **true** | 0.9 | `#84cc16` | NOAA NDBC ~1300 stations | `:10014` |
| `liveAqi` | Air Quality (AirNow) | environment | **true** | 0.9 | `#00e400` | EPA AirNow live monitors | `:10077` |
| `bathymetry` | Ocean Bathymetry | environment | **true** | 0.45 | `#0e7490` | GEBCO 2024 / ESRI Ocean Base | `:10149` |
| `topography` | Land Topography | environment | **true** | 0.55 | `#78350f` | AWS Terrain Tiles hillshade | `:10150` |
| `satImagery` | Satellite Imagery (HD) | environment | **true** | 1.0 | `#1e40af` | ESRI World Imagery | `:10231` |
| `mapboxSatelliteStreets` | Mapbox Satellite Streets (HD hybrid) | environment | **false** | 0.95 | `#0ea5e9` | Mapbox satellite-streets-v12 (key required) | `:10232` |
| `photorealistic3D` | Photorealistic 3D (Google / Cesium) | environment | **false** | 1.0 | `#f59e0b` | Google Map Tiles / Cesium Ion | `:10234` |
| `realisticClouds` | Realistic Clouds (Earth-2 + Satellite) | environment | **false** | 0.7 | `#e2e8f0` | NASA GIBS MODIS + RainViewer + sun-angle shadow | `:10235` |

> The fungal-atlas layers (`fungalAtlasMycelium`, `fungalAtlasAM`, `fungalAtlasECM`, `fungalAtlasRare`, `fungalAtlasProtected`, `fungalAtlasUncertainty`, `fungalAtlasFci`, `fungalAtlasSamples`, `:10005-10012`) are also `category: "environment"` but are all `enabled: false` by default and belong to the Fungal/MINDEX domain, not Environment & Conditions.

##### 1.1 Category grouping constants

The dashboard groups env/base-imagery IDs into membership `Set`s used by force-off, isolation, and "all-on" logic (`CREPDashboardClient.tsx:2710-2725`):

- `NATURE_ENVIRONMENT_LAYER_IDS = { biodiversity, weather, liveAqi, realisticClouds }` (`:2710`)
- `INFRA_BASE_MAP_LAYER_IDS = { satImagery, mapboxSatelliteStreets, bathymetry, topography, mapbox3dBuildings, photorealistic3D, buoys }` (`:2717`)
- `PROPOSAL_OVERLAY_LAYER_IDS` includes `bathymetry, topography, satImagery` (`:2820-2837`)
- `V3_OVERLAY_LAYER_IDS` includes `biodiversity` (and all `events`/facility/pollution/heatmap IDs) (`:2883-2916`)

##### 1.2 Force-off-until-stable

`FORCE_OFF_UNTIL_STABLE_LAYER_IDS` (`:2839-2860`) holds layers that must stay OFF even when the user triggers "ALL ON". It includes **`photorealistic3D`, `mapboxSatelliteStreets`, and `realisticClouds`** (alongside `mapbox3dBuildings`, orbital debris, all `earth2*` layers, `sunEarthImpact`, military sub-types, FEMA). These are the GPU/bandwidth-heavy environment + base-imagery overlays that are never auto-enabled.

---

#### 2. Biodiversity Hotspots (`biodiversity`)

A GBIF species-density **heatmap** rendered natively in MapLibre by `V3Overlays`.

##### 2.1 Layer setup & rendering

`components/crep/layers/v3-overlays.tsx`:
- Source `crep-biodiversity` (empty GeoJSON FC) and a heatmap layer `crep-biodiversity-heat` are added in the one-shot setup (`:961-976`).
- Heatmap paint (`:963-975`): `heatmap-weight 1`, `heatmap-intensity 0.9`, `heatmap-radius` interpolated by zoom (`z0→2`, `z4→10`, `z8→22`), `heatmap-opacity 0.55`, color ramp `0→transparent`, `0.2→green(34,197,94)`, `0.5→lime(132,204,22)`, `0.85→yellow(250,204,21)`, `1.0→red(239,68,68)`.
- **`crep-biodiversity-heat` is the `V3_SETUP_TERMINAL_LAYER`** (`:659`) — the deliberately-last layer the setup creates. The setup-completion check (`bump()` at `:692-698`, retry at `:978-983`) verifies this terminal layer exists; a Jun 12 2026 fix ensures setup retries if `isStyleLoaded()` flips false mid-setup (otherwise biodiversity/heatmaps/military/transport sub-types would silently never be created).

##### 2.2 Zoom / LOD gating

- `BIODIVERSITY_HOTSPOT_MIN_ZOOM = 3` (`:373`).
- **Visibility** is set only when `enabled.biodiversity && zoom >= 3` (`:1039`). Below z3 the layer is forced `none`.
- **Data fetch** (`:1239-1261`) also gates on z3: below z3 it sets the source to an empty FC and returns; at/above z3 it fetches.

##### 2.3 Data fetch & API

- Client fetch (`:1251`): `GET /api/crep/biodiversity-hotspots?bbox=<w,s,e,n>&limit=650`, aborted via `AbortController` on bbox/zoom change. Response `features` set into `crep-biodiversity`; the last good FC is cached in `lastBiodiversityDataRef` and re-applied on style reload (`:976`, `:1256`).

**API route `app/api/crep/biodiversity-hotspots/route.ts`** (`runtime "nodejs"`, `dynamic "force-dynamic"`):
- **Upstream:** GBIF Occurrence Search `https://api.gbif.org/v1/occurrence/search` (`:10`). Params: `hasCoordinate=true`, `limit=min(limit,300)`, `decimalLatitude=s,n`, `decimalLongitude=w,e` (`:97-102`), 12 s timeout, `cache:"no-store"`.
- **Limits:** `MAX_RESPONSE_FEATURES = 800`, `GBIF_LIMIT = 300` (`:11-12`). Requested `limit` is clamped to `[1, 800]` (`:142-145`).
- **bbox validation** (`:20-27`): must be 4 finite numbers `w<e`, `s<n`, within `[-180,180]×[-90,90]`; else `400 {success:false}`.
- **Preloaded iNaturalist GeoJSON** (`PRELOADS`, `:13-16`): `sf-inat` (`public/data/crep/sf-inat.geojson`, bbox `[-122.6,37.6,-122.25,37.95]`) and `peninsula-inat` (`public/data/crep/peninsula-inat.geojson`, bbox `[-122.35,37.2,-121.95,37.58]`). Loaded + cached (`preloadCache`, `:18,:81-93`), point-in-bbox filtered, only when the request bbox intersects.
- **Merge** (`:115-129`): GBIF features first, then preload; de-duped by `id`/`inat_id`/`gbif_key`/coords; capped at `limit`.
- **Normalization:** GBIF → Point feature with `id="gbif-{key}"`, `name`, `sci_name`, `common_name`, `taxon_id`, taxonomy (`kingdom/class/order/family/genus`), `event_date`, `basis_of_record`, `source:"GBIF"`, gbif.org URL (`:54-79`). Preload features get `source:"iNaturalist"` and `preload:<id>` (`:40-52`).
- **Response:** `{ success, bbox, count, source_counts:{gbif,preload}, errors[], features[], generated_at }` (`:159-171`). Cache header `public, s-maxage=300, stale-while-revalidate=900`. Upstream/preload failures are caught per-source via `Promise.allSettled` and surfaced in `errors` (the layer still renders whatever succeeded).

##### 2.4 Dashboard enablement gate

In the `<V3Overlays>` mount (`CREPDashboardClient.tsx:22573`), `biodiversity` is enabled only when `(!isEarthSimulatorRoute || earthSimDeferredDataReady) && !isEmbeddedEarthquakeSearch && layers.find(l=>l.id==="biodiversity").enabled`. The whole `V3Overlays` only mounts when `hasEnabledLayer(layers, V3_OVERLAY_LAYER_IDS)` and not in audit-all-off / asset-isolation mode (`:22538`).

##### 2.5 Known limitations
- Heatmap only — individual GBIF/iNat points are **not** clickable on this layer (no `wireClick` is wired for `crep-biodiversity-heat`).
- GBIF returns at most 300 records/request regardless of `limit`; preloads only cover the SF Bay/Peninsula bboxes.
- Hard-hidden below zoom 3 (data and visibility).

---

#### 3. Weather Overlay (`weather`)

The `weather` layer (`:10013`, default ON) is a **logical** environment toggle; on the production dashboard it does **not** mount a live GPU MapLibre weather raster — the NVIDIA Earth-2 GPU weather layers are intentionally disabled until the production GPU service is ready (`CREPDashboardClient.tsx:21826` "Earth2 GPU weather overlays intentionally disabled"; `DEFAULT_EARTH2_FILTER.gpuMode = "off"`, all `show*` flags false, `components/crep/earth2/earth2-layer-control.tsx:120-152`).

Where weather data actually surfaces:
- **Earth-2 layer control / Weather Heatmap** (`components/crep/earth2/weather-heatmap-layer.tsx`, exported from `earth2/index.ts:10`) renders temperature/precip/etc. only when its filter flags are on — and those default OFF and are GPU-gated.
- **CPU fallback** is `useWeatherFallback` (`earth2/use-weather-fallback.ts`): tries `/api/earth2/weather` when `gpuMode==="earth2"`, else falls back to `/api/weather/openmeteo` (Open-Meteo), 10 s timeout, 5-min refresh, **no mock data** (returns empty when both fail). `useWindFallback` does the same for wind grids (`:187`), falling back to a 5×5 Open-Meteo grid (capped 16 points).
- **The user-facing weather readout** the Environment tab shows comes from `/api/crep/viewport-environment` (see §9), not the Earth-2 GPU path.

A separate non-Earth-2 satellite/weather concept (`SatelliteFilter.showWeather`) drives the satellite overlay weather toggle (`CREPDashboardClient.tsx:9732`, `16781`), independent of the Earth-2 weather layer.

---

#### 4. Air Quality / AirNow (`liveAqi`)

Live EPA AirNow monitors rendered as native MapLibre circles colored by EPA AQI category.

##### 4.1 Layer component — `components/crep/layers/live-aqi-layer.tsx`

- Source `crep-live-aqi`; layers `crep-live-aqi-glow` (blurred halo, opacity 0.25) below `crep-live-aqi-dot` (solid, opacity 0.95, white 1 px stroke) (`:25-95`).
- **EPA AQI color ramp** keyed on `aqi_category_number` 1–6: Good `#00e400`, Moderate `#ffff00`, USG `#ff7e00`, Unhealthy `#ff0000`, Very Unhealthy `#8f3f97`, Hazardous `#7e0023` (`:33-40`).
- Radii interpolate by zoom (dot `z4→2 … z16→11`; glow `z4→4 … z16→22`).
- **Click** dispatches `crep:airnow:monitor-click` CustomEvent (consumed by `LiveAQIWidget`) and falls back to `window.__crep_selectAsset({type:"aqi_monitor",…})` (`:101-119`).
- **Polling:** debounced `800 ms` after pan/zoom, periodic `pollMs = 300_000` (5 min, AirNow is hourly upstream) (`:52`). Pauses when `document.hidden` (`:177`). On HTTP `501` (key not configured) it stops polling and logs "AQI layer inert" (`:184-191`). 30 s fetch timeout, `cache:"no-store"`.

##### 4.2 Dashboard mount gate

`CREPDashboardClient.tsx:22501`: mounts when `liveAqiLayerReady && !auditAllOffMode && !isEmbeddedEarthquakeSearch && !assetIsolationMode && mapZoom >= 5.5 && layers.find(l=>l.id==="liveAqi").enabled`. **Zoom floor 5.5.** `liveAqiLayerReady` (`:14371`) = `!isEarthSimulatorRoute || (!auditAllOffMode && !assetIsolationMode && !isMapAnimationActive)` — on Earth-Sim it pauses during fly-to animations. bbox passed is `liveOverlayBbox`.

##### 4.3 API — `app/api/crep/airnow/bbox/route.ts` (the layer source)

`GET /api/crep/airnow/bbox?bbox=<w,s,e,n>&parameters=PM25,OZONE` (`runtime "nodejs"`, `force-dynamic`):
- **Key:** `getAirNowApiKey()` → `501 {error:"AIRNOW_API_KEY not configured"}` if absent.
- **Upstream:** AirNow `https://www.airnowapi.org/aq/data/` with `dataType=A` (AQI, not raw concentration), `verbose=1`, last whole UTC hour window (`startDate`/`endDate` `yyyy-mm-ddTHH`), 20 s timeout (`:107-136`).
- **World-view normalization** (`normalizeAirNowBboxes`, `:60-75`): full-world / span ≥170° requests are replaced with 4 US fallback bboxes — CONUS `[-125,24,-66.5,50]`, AK `[-170,51,-130,72]`, HI `[-161,18.5,-154,23]`, PR `[-68.5,17.5,-64,19]` (`US_AIRNOW_FALLBACK_BBOXES`, `:29-34`). Anti-meridian-crossing bboxes are split into two. Multiple bboxes fetched via `Promise.allSettled`.
- **Site grouping** (`:152-173`): keyed by `SiteName|lat,lng`; keeps the **highest-AQI** observation per site (markers color by the worst pollutant). Category from `catFromAQI` (same EPA ramp as above).
- **Response:** GeoJSON `FeatureCollection` with per-monitor properties `{ id, name, agency, parameter, aqi, aqi_category_number, aqi_category_name, aqi_color, observed_at }` (`:182-197`), plus `monitor_count`, `airnow_bboxes`. **Cache:** filesystem JSON at `var/cache/airnow/bbox-*.json`, TTL **15 min** (`TTL_MS`, `:26`); HTTP `public, max-age=120`, `X-AirNow-Cache: hit|miss`.

##### 4.4 API — `app/api/crep/airnow/current/route.ts` (per-point widget hook)

`GET /api/crep/airnow/current?lat=&lng=&distance=25&ttl=600`:
- **Upstream:** `https://www.airnowapi.org/aq/observation/latLong/current/` — nearest reporting area for a lat/lng (`:134-144`), 12 s timeout. `distance` clamped `1..100` mi (`:117`).
- **Parameters:** PM2.5 / O3 / PM10 / CO / NO2 / SO2 with display labels (`PARAM_LABELS`, `:99-107`, e.g. `NO₂`, `SO₂`).
- **Response** (`:174-185`): `{ reporting_area, state, observations:[{parameter, aqi, category:{number,name,color}, observed_at, lat, lng, agency, state}], dominant, site_count, cached_at, ttl_s, coordinates }`. `dominant` = highest-AQI observation.
- **Cache:** dual layer — in-memory `MEM` Map + filesystem `var/cache/airnow/current-*.json`. TTL default **10 min**, override via `?ttl=` clamped to `[60 s, 1 h]` (`:119`). HTTP `public, max-age=60`, `X-AirNow-Cache`.

##### 4.5 Key resolution & client hook

- `lib/airnow-key.ts`: `getAirNowApiKey()` reads `AIRNOW_API_KEY` → `AIR_NOW_API_KEY` → `NEXT_PUBLIC_AIRNOW_API_KEY` → `NEXT_PUBLIC_AIR_NOW_API_KEY`, returns `""` if none.
- `lib/crep/use-airnow-aqi.ts` — `useAirNowAQI(lat,lng,radiusMi=25)`: fetches `/api/crep/airnow/current` on mount, refreshes every **10 min** (`REFRESH_MS`, `:55`), pauses while `document.hidden`, refetches on tab-return if stale, 15 s timeout. Returns a discriminated union `{status: idle|loading|ok|err|unavailable}`; `501`→`unavailable` so widgets render a graceful "AQI unavailable" card.

##### 4.6 Known limitations
- Requires `AIRNOW_API_KEY`; without it the layer and widgets are inert (501).
- Coverage is US + AirNow partner sites only (~2,000); the description's "~2 000 US + partner sites" reflects the upstream network.
- Full-world requests silently collapse to the 4 US fallback bboxes — no global AirNow data exists.

---

#### 5. Ocean Buoys (`buoys`)

NOAA NDBC buoys (~1,300 stations) as native MapLibre circles.

- **Fetch** (`CREPDashboardClient.tsx:11079-11118`): `GET /api/oei/buoys`, every **5 min**, 6 s abort, visibility-throttled (`document.hidden` skip), gated by `embeddedAllowsMarine` and not in audit/isolation mode. Result → `setBuoys`, also mirrored to `window.__crep_buoys` (`:16082`).
- **Layers** (`:18762-18774`): source `crep-live-buoys`; `crep-live-buoys-glow` (lime `#84cc16`, opacity 0.25, blur 0.8) + `crep-live-buoys-dot` (lime, white stroke). Radii interpolate by zoom. Layer-ID mapping `buoys → ["crep-live-buoys-glow","crep-live-buoys-dot"]` (`:16336`).
- **Click** (`:18776-18787`) resolves the buoy from `__crep_buoys` and opens `setSelectedBuoy` (detail card). Hover preview bound via `bindFeatureHoverPreview` (`:18788`).
- Visibility is synced from the `buoys` toggle across the main map + secondary globe maps in a dedicated effect (`:16074-16120`).
- A status chip in the map chrome shows `{buoys.length} BUOYS` when the layer is on and data is loaded (`:22852-22855`).

##### 5.1 Per-station detail route — `app/api/crep/buoy/[station]/route.ts`

Used by the **viewport-sensors** API (§7), not the map dots:
- **Upstream:** NDBC realtime2 text `https://www.ndbc.noaa.gov/data/realtime2/{station}.txt`, 8 s timeout, custom UA.
- **Parser** (`parseNdbcRealtimeText`, `:54-85`): space-separated NDBC columns, `MM`/`-` → null; returns the most recent row with any non-missing measurement — `wind_dir_deg, wind_speed_ms, gust_ms, wave_height_m, dominant/average_wave_period_s, mean_wave_dir_deg, pressure_hpa, air/water/dew temps, visibility_nmi, pressure_tendency_hpa, tide_ft`.
- **Validation:** station id must match `^[A-Za-z0-9]{1,10}$` else 400. No-data / upstream errors return `{unavailable:true, observation:null}` (HTTP 200) so the panel degrades gracefully. **Cache:** `public, s-maxage=300, stale-while-revalidate=900` (60/300 on the unavailable path).

---

#### 6. Base imagery raster stack — Satellite / Bathymetry / Topography

All three are attached by `components/crep/layers/proposal-overlays.tsx` (mounted in `CREPDashboardClient.tsx:22291`), all **default ON**. Stack order (bottom→top): `bathymetry < land-mask < topography/satellite`. Insertion is computed *before* the first road/symbol/line layer so labels and markers composite on top.

##### 6.1 Satellite Imagery HD (`satImagery`)

- **Source `crep-satimagery`** (`:1625-1632`): raster, `type:"raster"`, single tile URL **ESRI World Imagery** `https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` (XYZ via `{y}` before `{x}`), `tileSize 256`, free / no key, attribution to Esri.
- **Layer `crep-satimagery-raster`** (`:1657-1672`) inserted before road layers. Its `raster-opacity` is dynamically tuned: when fungal data is co-rendered it is dropped to `0.08`, else `0.28` (`CREPDashboardClient.tsx:3531-3532`) so observation markers stay legible over imagery.
- **Enablement gate** (`:22307`): `satImagery: satelliteImageryOverlayReady && (layers.find(l=>l.id==="satImagery").enabled ?? true)`. `satelliteImageryOverlayReady` (`:14367`) = `!isEarthSimulatorRoute || (!auditAllOffMode && !assetIsolationMode)`.
- Layer-ID map: `satImagery → ["crep-satimagery-raster"]` (`:16340`).
- Detail/zoom: ESRI World Imagery serves to ~z19 ("Google-Earth-level detail").

##### 6.2 Ocean Bathymetry (`bathymetry`)

- **Source `crep-bathymetry`** (`:1414-1424`): raster **ESRI World Ocean Base** `https://services.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}`, `minzoom 0`, `maxzoom 14`, attribution "© Esri · GEBCO". (EMODnet 2024 25 m was the original primary but was **removed** — it failed consistently from some networks with CORS/regional blocks and MapLibre's `tiles[]` is round-robin not fallback; comment `:1406-1413`.)
- **Layer `crep-bathymetry-raster`** (`:1425-1444`): `raster-opacity 0.65`, `raster-fade-duration 150`, inserted below topography/satellite.
- **Land mask** `crep-land-mask-10m-fill` (Natural Earth 1:10m land GeoJSON, `:1343-1450`) is added above bathymetry to clip ocean shading at the coastline (Morgan's "bathymetry cannot overlap land topology" rule). Layer-ID map: `bathymetry → ["crep-bathymetry-raster","crep-land-mask-10m-fill"]` (`:16341`).
- **Enablement gate** (`:22305`): `stableEarthOverlayAssetsReady && (…enabled ?? true)`.

##### 6.3 Land Topography (`topography`)

- **Source `crep-topo-dem`** (`:1526-1535`): `type:"raster-dem"`, **AWS Terrain Tiles** (Mapzen terrarium-encoded 30 m global DEM) `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`, `encoding:"terrarium"`, `tileSize 256`, `maxzoom 15`. (Comment notes Copernicus GLO-30 / MapTiler Terrain-RGB are TODO when keys land.)
- **Layer `crep-topo-hillshade`** (`:1543-1561`): native MapLibre `type:"hillshade"`, GPU-shaded — `hillshade-shadow-color #0b1220`, `highlight #f8fafc`, `accent #27272a`, `illumination-direction 335`, `exaggeration 0.55`. Inserted just below the first circle/symbol/line layer.
- **Enablement gate** (`:22306`): `stableEarthOverlayAssetsReady && (…enabled ?? true)`. Layer-ID map: `topography → ["crep-topo-hillshade"]` (`:16342`).
- Topography attach is kept "strict" (extra style-ready guard) because raster-dem + hillshade is more sensitive to style-bootstrap races than plain rasters (`:1157-1158`, `:1473-1482`).

##### 6.4 Mapbox Satellite Streets (HD hybrid) — `mapboxSatelliteStreets`

- **Default OFF** (`:10232`) — an *alternate* basemap that competes with ESRI Satellite Imagery; the description instructs picking one. Requires `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`. Routes through the MINDEX tile cache (see §8). In `FORCE_OFF_UNTIL_STABLE_LAYER_IDS` so "ALL ON" never enables it.

##### 6.5 Tile-render proxy & MINDEX cache — `app/api/crep/tiles/satellite/[basemap]/[z]/[x]/[y]/route.ts`

The single tile endpoint the map uses for cached satellite imagery:
- **Basemaps** (`:53-64`): `mapbox-sat-streets` → Mapbox satellite-streets-v12 `@2x` (token required), `mapbox-sat` → Mapbox satellite-v9 `@2x`, `esri-world-imagery` → ESRI World Imagery (free).
- **Mapbox token resolution:** `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` → `MAPBOX_ACCESS_TOKEN` → `NEXT_PUBLIC_MAPBOX_TOKEN` (`:44-48`).
- **Resolution order** (`:149-191`): (1) MINDEX NAS cache `{MINDEX_TILE_CACHE_URL or MINDEX_API_URL}/api/mindex/tile-cache/{basemap}/{z}/{x}/{y}.jpg` (weekly-refreshed); (2) upstream fetch; (3) on 200, proxy + async write-back to MINDEX.
- **MINDEX circuit breaker** (`:80-104`): probe timeout 500 ms; on network failure trips a 60 s back-off (`MINDEX_UNAVAILABLE_TTL_MS`) so tile requests skip MINDEX while it's unreachable; a 404 is a valid miss (does not trip the breaker).
- **Cache headers:** MINDEX hit → `s-maxage=604800` (1 wk) / SWR 30 d (`X-Tile-Source: mindex-cache`); upstream → `s-maxage=86400` / SWR 1 wk (`X-Tile-Source: upstream`). Weekly refresh is driven by `scripts/etl/crep/prefetch-satellite-tiles.mjs` on VM 189 (z0–14, atomic staging swap).

##### 6.6 Known limitations
- ESRI satellite/bathymetry are free, keyless, but ESRI imagery vintage/coverage varies; bathymetry capped at `maxzoom 14`, terrarium DEM at `maxzoom 15`.
- EMODnet high-res bathymetry was removed entirely (network failures); only ESRI Ocean Base remains globally.
- Mapbox satellite basemaps require a token; without it the tile-render proxy returns `503` for those basemaps.

---

#### 7. NASA GIBS Earth-Observation base layers

Mounted as `<GibsBaseLayers>` (`CREPDashboardClient.tsx:21815-21824`), driven by `eoImageryFilter` (the on-map MapLayersPopup), opacity `0.4`. Component `components/crep/layers/gibs-base-layers.tsx`; config `lib/crep/gibs-layers.ts`.

| Key | GIBS layer | Source/Layer id | maxZoom | Default opacity | Notes |
|---|---|---|---|---|---|
| `modis` | MODIS Terra True Color | `crep-gibs-modis(-layer)` | 9 | 0.4 | 1-day lag; URL cached per calendar day to avoid flicker |
| `viirs` | VIIRS City Lights 2012 | `crep-gibs-viirs(-layer)` | 8 | 0.4 | static 2012 |
| `airs` | AIRS CO 400 hPa Daily | `crep-gibs-airs(-layer)` | 5 | 0.4 | 3-day lag |
| `landsat` | Landsat WELD True Color (Global Annual) | `crep-gibs-landsat(-layer)` | 12 | 0.85 | historic dates only (`2000-12-01` default) |

- All are raster sources over EPSG:3857 GoogleMapsCompatible WMTS, `raster-fade-duration 0`, inserted before the first `symbol` layer (`gibs-base-layers.tsx:70-88`).
- **Flicker fix** (`:29-44`): `enabledLayers` is destructured into primitive deps (`modis/viirs/landsat/airs`) so the effect only reruns when one toggles; the "remove-all on every render" cleanup was removed — true removal only on map unmount (`:116-125`). MODIS/AIRS URLs are also date-cached in `gibs-layers.ts` (`_modisCache`, `_airsCache`) to prevent source teardown/recreate.
- Separate `Earth-2 GIBS EO overlays` component (`components/crep/earth2/gibs-eo-overlays.tsx`, exported as `CrepGibsEoOverlays`) provides the Earth-2-tab variant.

---

#### 8. Realistic Clouds (Earth-2 + Satellite) — `realisticClouds`

Component `components/crep/layers/realistic-cloud-layer.tsx`, mounted at `CREPDashboardClient.tsx:22359-22374`. **Default OFF** (Morgan: "too much on load") and in `FORCE_OFF_UNTIL_STABLE_LAYER_IDS`.

##### 8.1 Mount gate
`:22359`: `!auditAllOffMode && !assetIsolationMode && shouldRenderHeavyOverlays && layers.find(l=>l.id==="realisticClouds").enabled`. Props: `bbox={cloudOverlayBbox}`, `mode3d=false`, and Earth-2-shared `forecastHours={earth2Filter.forecastHours}`, `resolutionDeg={earth2ApiResolutionDeg}`, `gpuMode={earth2Filter.gpuMode !== "off"}`.

##### 8.2 2D pipeline (the path that renders today)
Three stacked raster/fill layers (`:148-153`), attached with a style-ready guard (`isMapStyleReady`, `:62-68`):
1. **`crep-clouds-gibs-rgb`** — NASA GIBS MODIS Terra True Color WMTS `…/MODIS_Terra_CorrectedReflectance_TrueColor/default/{TIME}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg` (`:92-93`). `TIME` = **2-day-back UTC** (`gibsDateStr(2)`, `:181`) because NASA posts yesterday 12–18 h UTC. `minzoom 0`, `maxzoom 9` (declared so MapLibre **overzooms** rather than requesting nonexistent z10+ tiles → removes "zoom level not supported" gray boxes). Paint: `raster-opacity = opacity`, `brightness-min 0.2`, `brightness-max 1.0` (MapLibre max), `contrast 0.15`, `saturation -0.35` (`:211-218`).
2. **`crep-clouds-radar`** — RainViewer global radar composite. Index fetched from `https://api.rainviewer.com/public/weather-maps.json` (6 s timeout); latest past frame → `{host}{path}/256/{z}/{x}/{y}/2/1_1.png`, `maxzoom 12` (overzoom), `raster-opacity = opacity + 0.1` (`:226-267`).
3. **`crep-clouds-shadow-fill`** — sun-angle shadow polygon over the bbox. Fetches `/api/eagle/weather/multi?lat&lng&fh=<forecastHours>&res=<resolutionDeg>&gpu=<0|1>`; `shadow_opacity = clamp(cover%/100 × (1 − max(0,sun_alt)/90) × 0.5, 0, 0.25)`, fill `#0b1120` (`:269-326`). Re-polled every **5 min** (`:339-375`), re-forwarding the Earth-2 forecast inputs.

##### 8.3 3D path
The full volumetric raymarched path (Perlin/Worley shells at low 600–1800 m / mid 2500–5500 m / high 7000–12000 m AGL, plus a downward shadow map for MYCA device-placement) is documented in the header (`:28-53`) but mounts later in `<ThreeDGlobeView>`; the current component is the 2D scaffold (`mode3d` is passed `false`).

##### 8.4 GPU routing
`gpuMode` true (any Earth-2 filter mode ≠ `"off"`) routes `/api/eagle/weather/multi` through `MAS_API_URL` → PersonaPlex + 4080a/4080b NVIDIA Earth-2 physics bridge; `"off"` uses free Open-Meteo/NWS/Windy envelope (`:78-88`, `:365-373` and mount comment `:2365-2373`).

##### 8.5 Known limitations
- GIBS MODIS true-color is daytime/2-day-lagged satellite imagery, not a real-time cloud mask; clouds-only path (`GIBS_MODIS_Cloud_Top_Pressure_Day`, `:98-99`) is defined but not attached in the 2D scaffold.
- Shadow layer requires `/api/eagle/weather/multi`; if it fails the shadow simply isn't added.
- 3D volumetric rendering is pending (`ThreeDGlobeView` mount).

---

#### 9. Photorealistic 3D (Google / Cesium) — `photorealistic3D`

Component `components/crep/layers/photorealistic-3d-tiles.tsx`. **Default OFF** and in `FORCE_OFF_UNTIL_STABLE_LAYER_IDS` (Cesium Ion loader pulls GBs of mesh; enable explicitly at high zoom over a city).

- **Backends** (`resolveBackend`, `:71-79`): Google Photorealistic 3D Tiles (`https://tile.googleapis.com/v1/3dtiles/root.json?key=…`, deck.gl `Tile3DLayer` + `Tiles3DLoader`, PBR lighting) preferred; Cesium Ion fallback (asset `2275207` via `CesiumIonLoader`).
- **Key resolution** (`:45-56`): Google = `NEXT_PUBLIC_GOOGLE_MAP_TILES_API_KEY` → `…_GOOGLE_MAP_TILES_KEY` → `…_GOOGLE_3D_TILES_KEY` → `…_GOOGLE_MAP_TILES`; Cesium = `NEXT_PUBLIC_CESIUM_ION_TOKEN` → `…_CESIUM_ION_ACCESS_TOKEN` → `…_CESIUM_TOKEN`. No key → no-op + warn (`:100-106`).
- **Mount:** dedicated non-interleaved `MapboxOverlay` (`@deck.gl/mapbox`) added as a MapLibre control, removed on toggle-off/unmount (`:143-160`). LOD auto-managed by loaders.gl. Best with MapLibre globe projection at z ≥ 14. `photorealistic3DStatus()` helper (`:170-178`) reports which backend is configured.

##### 9.1 Known limitations
- Requires a Google or Cesium key; otherwise idle.
- Heavy: deck.gl 3D-tiles overlay; only meaningful at city zoom.

---

#### 10. Viewport Environment API — `/api/crep/viewport-environment`

`app/api/crep/viewport-environment/route.ts` (`dynamic "force-dynamic"`, `revalidate 900`) backs the Environment tab's weather/air-quality/feature readout (not a map layer). It fans out (each soft-timeout-wrapped via `Promise.race`):

| Sub-fetch | Upstream | Timeout | Notes |
|---|---|---|---|
| `openMeteoEnvironment` | Open-Meteo forecast (14 d) + archive (−14..−1 d) | 1.8 s | `temperature_2m, RH, precip, weather_code, pressure_msl, wind, cloud_cover`; imperial units for US (`:75-132`) |
| `openMeteoAirQuality` | Open-Meteo air-quality | 1.2 s | `us_aqi, pm10, pm2_5, CO, NO2, SO2, O3, uv_index` (`:134-159`) |
| `overpassEnvironment` | OSM Overpass (de + kumi.systems) | 1.2 s | water / geology / ecosystems features; `around` query when bboxArea>25 or zoom<7, else bbox; radius LOD `:64-73` |
| `fetchUsgsEarthquakes` | USGS FDSN | 1.2 s | radius by zoom (800/400/150/75 km), minmag 4 (z<8) else 2.5 (`:238-268`) |
| `fetchNwsAlerts` | api.weather.gov/alerts | 1.2 s | US only |
| `fetchNwsObservation` | api.weather.gov points→stations→obs | 1.2 s | US only; °F/mph conversion |

- **US detection** (`isUSLocation`, `:56-62`): CONUS + AK + HI + PR boxes → drives imperial units and whether NWS is queried.
- **LOD label** in the response (`:449`): `zoom<5 "regional"`, `<9 "watershed"`, `<12 "local ecosystem"`, else `"site"`.
- **Response:** `{ ok, generatedAt, lod, unitSystem, bounds, center, weather:{…,nwsObservation}, airQuality, alerts, live:{usgsEarthquakes}, features }`. Cache `public, s-maxage=300, stale-while-revalidate=900`; errors return `{ok:false}` with HTTP 200 (graceful UI).

---

#### 11. Viewport Environmental Sensors API + panel

The live **Environmental Sensors** grid in the right-panel **Environment / Analysis** room. Only sensors with confirmed live upstream data are shown — no placeholder rows.

##### 11.1 API — `app/api/crep/viewport-sensors/route.ts`
`GET /api/crep/viewport-sensors?bbox=<w,s,e,n>&limit=12` (`runtime "nodejs"`, `force-dynamic`). `limit` clamped `[1,24]` (default 12). bbox `west,south,east,north`, anti-meridian aware (`inBbox`, `:55-59`). Filters a static `VIEWPORT_SENSOR_CATALOG` to the viewport, then attaches live readings in parallel:

| Kind | Source fn | Upstream | Unit/param |
|---|---|---|---|
| `aqi` | `fetchAirNowMonitors` | internal `/api/crep/airnow/bbox` (PM25,OZONE; 2.8 s) | AQI; color/label from category |
| `h2s` | `fetchH2S` | internal `/api/crep/sdapcd/h2s` (12 s) | ppb (`h2s_ppb`) |
| `river-flow` | `fetchIbwc` | IBWC AQWebPortal CSV (station 11013300, 8 s) | m³/s discharge |
| `tide` | `fetchCoopsTide` | NOAA CO-OPS datagetter `water_level` MLLW (8 s) | ft |
| `streamflow` | `fetchUsgsFlow` | USGS NWIS IV `parameterCd=00060` (8 s) | ft³/s / cfs |
| `buoy` | `fetchNdbcBuoy` | internal `/api/crep/buoy/{station}` (10 s) | water_temp °C / wave_height m / wind_speed m/s / pressure hPa |

Merged + de-duped by `id`, sliced to `limit`. Response `{ source, generated_at, bbox, count, sensors[] }`; each sensor: `{ id, name, provider, agency, lat, lng, kind, category, station_id?, live:{value,unit,parameter,observed_at?,label?,color?} }`. Cache `public, s-maxage=120, stale-while-revalidate=300`. `resolveInternalBaseUrl` is used for the internal sub-fetches (`:260`).

##### 11.2 Catalog — `lib/crep/viewport-sensor-catalog.ts`
Fixed-coordinate San Diego / Tijuana / Baja border stations (the only catalog region):
- **IBWC** river discharge `ibwc-11013300` (Tijuana River @ Intl Border).
- **SDAPCD H₂S** network: Imperial Beach Pier, Nestor, Iris Ave, Saturn Blvd, TJ Slough.
- **NOAA CO-OPS tide** gauges: La Jolla `9410230`, SD Harbor `9410170`, Zuniga Pt `9410162`.
- **USGS streamflow**: TJ River @ NERR `11013500`, Sweetwater R `11015000`.
- **NDBC buoys**: Point Loma South `46232`, Torrey Pines `46225`, N Coronado `46231`.

##### 11.3 Client prefetch & panel render
- `lib/crep/use-viewport-sensor-prefetch.ts` — `useViewportSensorPrefetch(mapBounds, mapZoom, assetsReady, limit=8)`: only refetches on a *significant* viewport change (`isSignificantViewportChange` / revision key), aborts in-flight requests, dedupes by sensor-id sequence. Returns `{sensors, loading, refreshing, …}`.
- `lib/crep/viewport-sensor-sources.ts` — `loadViewportSensors` calls the API (requesting `max(limit,12)`) and re-filters to the viewport bbox via `pointInViewportBbox`.
- `components/crep/eagle-eye/ViewportSensorGrid.tsx` — renders the **"Environmental sensors"** card: 2-column grid of buttons, per-sensor icon by kind (`aqi`/`h2s`→Wind, `tide`/`buoy`→Waves/Droplets, `streamflow`/`river-flow`→Gauge), value formatted (`AQI`/`ppb` 0 decimals else 1), colored by `live.color`. Status label `"checking live feeds…" / "N · updating…" / "N live"`. Click → `onFlyTo(lng,lat,14)` + dispatches `crep:oyster:site-click` CustomEvent. Returns `null` (renders nothing) when not loading and empty — so the panel only appears when live data exists.
- `components/crep/panels/MycaViewportPanel.tsx` — owns the Environment tab; mounts `<ViewportSensorGrid sensors={prefetchedSensors} loading={prefetchedSensorsLoading} limit={8}>` only when `prefetchedSensorsLoading || prefetchedSensors.length>0` (`:1415-1426`); a `sensors` section header (`:1225-1228`) shows `"{eagleSources} cameras, {sensors} sensors, AQI {us_aqi}"`. Env weather/air-quality in the same panel come from the parent's `/api/crep/viewport-environment` prefetch (`prefetchedEnvironment`, `:557-587`).

##### 11.4 Known limitations
- The sensor **catalog is San Diego / Tijuana-only** — outside that bbox the grid shows nothing (by design: empty rows omitted).
- AQI sensors in the grid come through `/api/crep/airnow/bbox` (key-gated); H₂S via `/api/crep/sdapcd/h2s`; both return empty silently on failure.
- IBWC/USGS/CO-OPS/NDBC upstreams are best-effort with short timeouts; a slow or down upstream simply drops that sensor from the grid.

---

## 12. Earth-Observation Rasters, Aurora, Clouds & Sun-Earth

### EO / Imagery Raster Engine & Space-Weather Visual Layers

This section documents the Earth-Observation (EO) imagery raster pipeline and the space-weather visual overlays that paint on the CREP MapLibre map (`/dashboard/crep`) and the Earth Simulator (`/natureos/earth-simulator`, which renders the same `CREPDashboardClient`). It is exhaustive for the files named in scope: every raster source URL, every layer/source id, every toggle, every default, and every readiness gate is enumerated with `file:line` references.

All components share the same contract: each receives the live `MapLibreMap` (`mapRef`), an `enabled`/`opacity` prop derived from the dashboard `layers[]` registry, attaches MapLibre raster/image/geojson sources + layers directly to the map, returns `null` (no DOM), and tears down on disable/unmount. None of these is a React-rendered DOM layer.

---

#### 1. EO raster catalog — provider inventory

Three distinct raster engines feed the CREP map. They are sourced from different files and wired through different filter objects.

| Engine | Source file | Provider(s) | Tile scheme | Key required | Wiring |
|--------|-------------|-------------|-------------|--------------|--------|
| **NASA GIBS EO overlays** | `lib/crep/gibs-layers.ts`, `components/crep/layers/gibs-base-layers.tsx`, `components/crep/earth2/gibs-eo-overlays.tsx` | NASA GIBS (Earthdata) — MODIS Terra, VIIRS, AIRS, Landsat WELD | WMTS `EPSG:3857` / `GoogleMapsCompatible` | No | `eoImageryFilter` → `GibsBaseLayers` |
| **Base-imagery underlay** (satImagery / bathymetry / topography) | `components/crep/layers/proposal-overlays.tsx` | ESRI World Imagery, ESRI World Ocean Base (GEBCO), AWS Terrain Tiles (Mapzen terrarium) | XYZ raster + raster-dem hillshade | No | `ProposalOverlays.enabled.{satImagery,bathymetry,topography}` |
| **Cached HD satellite proxy** | `app/api/crep/tiles/satellite/[basemap]/[z]/[x]/[y]/route.ts` | Mapbox satellite-streets-v12 / satellite-v9, ESRI World Imagery, w/ MINDEX NAS cache | XYZ via internal proxy | Mapbox basemaps require token | Server route only |

The base-imagery underlay (engine 2) is the default-on EO layer at refresh. The GIBS overlays (engine 1) default OFF. The Mapbox-cached proxy (engine 3) is an internal tile endpoint with MINDEX fallback, not directly toggled in this scope.

---

#### 2. NASA GIBS EO raster catalog (`lib/crep/gibs-layers.ts`)

`GIBS_BASE = "https://gibs.earthdata.nasa.gov"` (`gibs-layers.ts:10`). Dates formatted `YYYY-MM-DD` via `toGibsDate()` (`:13`). Per-calendar-day URL caching (`_modisCache` `:20`, `_airsCache` `:64`) prevents MapLibre from tearing down/recreating the raster source on every render (the documented flicker cause).

| Layer key | Product | URL builder | WMTS layer / matrix | Format | Date param | `maxZoom` | Default opacity |
|-----------|---------|-------------|---------------------|--------|------------|-----------|-----------------|
| `modis` | MODIS Terra True Color (~1-day lag) | `getModisTerraTrueColorUrl(1)` `:22` | `MODIS_Terra_CorrectedReflectance_TrueColor` / `GoogleMapsCompatible_Level9` | `.jpeg` | today − `dateLagDays` (default 1) | 9 | inherits caller (0.4) |
| `viirs` | VIIRS City Lights (static 2012) | `getViirsNightLightsUrl()` `:34` | `VIIRS_CityLights_2012` / `GoogleMapsCompatible_Level8`, fixed date `2012-01-01` | `.jpg` | none (static) | 8 | inherits caller (0.4) |
| `airs` | AIRS Carbon Monoxide / RelHumidity (~3-day lag) | `getAirsCoTileUrl(3)` `:66` | `AIRS_L2_Carbon_Monoxide_400hPa_Volume_Mixing_Ratio_Daily` / `GoogleMapsCompatible_Level5` | `.png` | today − 3 | 5 | inherits caller (0.4) |
| `landsat` | Landsat WELD True Color (annual, historic) | `getLandsatWeldUrl("2000-12-01")` `:81` | `Landsat_WELD_CorrectedReflectance_TrueColor_Global_Annual` / `GoogleMapsCompatible_Level12` | `.jpeg` | fixed `2000-12-01` | 12 | **0.85** (`:132`) |

The `GIBS_LAYER_CONFIGS` registry (`:100`–`:134`) gives each layer a stable `sourceId` (`crep-gibs-{key}`) and `layerId` (`crep-gibs-{key}-layer`). `getAirsCoUrl()` (`:39`, WMS path) is dead — only the WMTS `getAirsCoTileUrl()` is wired (the long comment `:46`–`:63` documents the WMS-vs-WMTS reasoning). `LANDSAT_VALID_DATES` (`:85`) lists 9 valid annual snapshots (1983–2000), but only `2000-12-01` is wired.

##### 2.1 GIBS base-layer attachment (`components/crep/layers/gibs-base-layers.tsx`)

`GibsBaseLayers({ map, enabledLayers, opacity = 0.4 })` (`:26`). `enabledLayers` is `{ modis?, viirs?, landsat?, airs? }` (`:17`).

- **Anti-blink fix (Apr 19, 2026):** the effect deps were changed from the inline `enabledLayers` object to **primitive flags** `{ modis, viirs, landsat, airs }` (`:45`, dep array `:111`), so a new parent object reference no longer reruns the effect and removes every layer. The old `return () => removeAllLayers()` cleanup was dropped from the toggle effect (`:29`–`:44` comment).
- **Attachment** (`:50`–`:104`): raster source `type:"raster"`, `tiles:[tileUrl]`, `tileSize:256`, `maxzoom:config.maxZoom`, `attribution:"NASA GIBS"`. Layer inserted **before the first `symbol` layer** (`beforeId`, `:72`–`:74`) so basemap labels stay on top. Paint: `raster-opacity = config.opacity ?? opacity`, `raster-fade-duration:0`.
- **Live opacity:** on each pass, enabled layers get `setPaintProperty("raster-opacity", config.opacity ?? opacity)` (`:100`–`:102`).
- **Style gate:** `map.isStyleLoaded()` else `map.once("style.load", addOrRemove)` (`:106`–`:110`).
- **True unmount cleanup:** a separate effect keyed on `map` alone removes all `GIBS_LAYER_CONFIGS` layers/sources (`:116`–`:125`).

##### 2.2 GIBS EO overlays variant (`components/crep/earth2/gibs-eo-overlays.tsx`)

`CrepGibsEoOverlays({ map, eoImageryFilter, beforeId })` (`:30`) is a parallel implementation exporting `EoImageryFilter` (`:15`: `showModis/showViirs/showAirs/showLandsat/showEonet`). Same primitive-dep anti-blink fix (`:36`–`:39`). Differences from `GibsBaseLayers`: raster source declares `scheme:"xyz"` (`:74`) and the layer sets `minzoom:0` + `maxzoom:config.maxZoom` + default `raster-opacity: config.opacity ?? 0.8` (`:85`). Supports an explicit `beforeId` insertion (`:90`). This component is exported (`earth2/index.ts:45`) but the **dashboard wires `GibsBaseLayers`, not `CrepGibsEoOverlays`** (see §6).

---

#### 3. Base-imagery underlay engine (`components/crep/layers/proposal-overlays.tsx`)

These three toggles (`satImagery`, `bathymetry`, `topography`) are the **default-on EO layers** and form the visible Earth texture at first paint. They are part of `INFRA_BASE_MAP_LAYER_IDS` (`CREPDashboardClient.tsx:2717`).

##### 3.1 Satellite Imagery HD — ESRI World Imagery (`proposal-overlays.tsx:1582`–`1682`)

| Property | Value |
|----------|-------|
| Source id / layer id | `crep-satimagery` / `crep-satimagery-raster` |
| Tile URL | `https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` (`:1628`) |
| Type / scheme | `raster`, `xyz`, `tileSize:256` |
| Zoom range | `minzoom:0`, `maxzoom:19` (`:1632`–`1633`) — Google-Earth-level to z19 |
| Paint | `raster-opacity:0.72`, `raster-fade-duration:150` (`:1667`) |
| Attribution | `Tiles © Esri — World Imagery (DigitalGlobe, GeoEye, i-cubed, USDA FSA, USGS, AEX, Getmapping, Aerogrid, IGN, IGP, swisstopo)` |
| Insertion | **before first road/highway/bridge/tunnel/motorway/transit layer** (`findBeforeRoads()` `:1642`) — so aerial covers basemap rooftops but roads + labels still draw on top |
| Default opacity (registry) | `1.0` (`CREPDashboardClient.tsx:10231`) |

Lowercase `arcgis` in the URL is deliberate (`:1610`–`1615`) — some CDN nodes 404 on `ArcGIS` casing. Special interaction with the fungal atlas: when fungal layers are on, `crep-satimagery-raster` opacity is pushed down to `0.08` (vs `0.28`) (`CREPDashboardClient.tsx:3531`–`3532`).

##### 3.2 Ocean Bathymetry — ESRI World Ocean Base / GEBCO (`proposal-overlays.tsx:1146`–`1471`)

| Property | Value |
|----------|-------|
| Source id / layer id | `crep-bathymetry` / `crep-bathymetry-raster` |
| Tile URL | `https://services.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}` (`:1417`) |
| Type / scheme | `raster`, `xyz`, `tileSize:256`, `minzoom:0`, `maxzoom:14` |
| Paint | `raster-opacity:0.65`, `raster-fade-duration:150` (`:1439`) |
| Attribution | `© Esri · GEBCO` (ESRI Ocean Base is built on GEBCO 2022+) |
| Registry description | "GEBCO 2024 ocean depth shading (200 m resolution)" (`CREPDashboardClient.tsx:10149`) |
| Default opacity (registry) | `0.45` |

**EMODnet was removed** (`:1406`–`1413`): the EMODnet 2024 25 m source caused 15+ `AJAXError` tile failures/sec from Morgan's network (CORS/regional block); MapLibre's `tiles[]` array is round-robin not fallback, so every rotation re-hit it. ESRI World Ocean Base alone now.

**Coastline-clip land mask** — the critical companion (`attachLandMask()` `:1301`–`1360`): Carto Dark Matter has no dedicated landcover fill, so bathymetry would "walk over" continents. A `crep-land-mask-10m` GeoJSON fill (`crep-land-mask-10m-fill`) is loaded from, in order: `/data/crep/ne_10m_land.geojson`, the nvkelso GitHub `ne_10m_land.geojson`, then `/data/crep/ne_50m_land.geojson` (`:1308`–`1312`). Fill color `#08111f` (basemap-matching), opacity `1.0` (`:1349`). Resolution tracked in `landMaskResolutionRef` (`"10m" | "50m"`). The mask wires to `bathymetry` in the layer-group map (`CREPDashboardClient.tsx:16341`: `bathymetry → ["crep-bathymetry-raster", "crep-land-mask-10m-fill"]`).

**Stack-order rules (additive, not subtractive)** — repeatedly re-asserted (`:1213`–`1253`, `:1383`–`1463`): `bathymetry < land-mask < topography/satellite`. Bathymetry inserts before the first road layer (`findInsertionPointBeforeRoads()` `:1269`), but if `crep-topo-hillshade` or `crep-satimagery-raster` already exist it slots **below** them (`:1384`–`1390`) so satellite imagery does not get wiped ("satelite shows then goes away" fix). `moveLayer` re-asserts order on every enable (`:1454`–`1462`).

##### 3.3 Land Topography — AWS Terrain Tiles → MapLibre native hillshade (`proposal-overlays.tsx:1483`–`1571`)

| Property | Value |
|----------|-------|
| Source id / layer id | `crep-topo-dem` / `crep-topo-hillshade` |
| Tile URL | `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png` (`:1529`) |
| Type | `raster-dem`, `encoding:"terrarium"`, `tileSize:256`, `maxzoom:15` (`:1526`–`1534`) |
| Layer type | **`hillshade`** (GPU-shaded by MapLibre, not a raster image) |
| Paint | `hillshade-shadow-color:#0b1220`, `hillshade-highlight-color:#f8fafc`, `hillshade-accent-color:#27272a`, `hillshade-illumination-direction:335`, `hillshade-exaggeration:0.55` (`:1553`–`1557`) |
| Attribution | `© Mapzen / AWS Terrain Tiles (30 m global DEM)` |
| Insertion | before the first `circle`/`symbol`/`line` layer (`:1539`–1542`) — above bathymetry, below all point markers |
| Registry description | "AWS Terrain Tiles hillshade (30 m DEM, GPU-shaded via MapLibre native hillshade)" (`CREPDashboardClient.tsx:10150`) |
| Default opacity (registry) | `0.55` |

Future DEMs (Copernicus GLO-30, MapTiler Terrain-RGB v2) are noted as key-gated TODOs (`:1519`–`1525`).

##### 3.4 Toggle lifecycle (all three)

Each effect (a) attaches once on first enable or first-load bootstrap, (b) on disable flips `visibility:"none"` rather than remove/re-add (cheaper across many toggles), (c) on re-enable flips back to `visible`. `loadedRef.current.{satImagery,bathymetry,topography}` guards. `enabled.satImagery` uses `isMapStyleReady()`; bathymetry/topography use a stricter `map.isStyleLoaded()` gate (`:1159`–1166, `:1487`–1493) because raster-dem/hillshade is more bootstrap-race-sensitive. A `styleReadyTick` counter (driven by `load`/`style.load` events + one-shot retries at 150/700/1800/3200/6200 ms, `:241`–`271`) re-evaluates so base layers paint on refresh without a user click.

`FUNGA_LAYER_OPACITY` (`CREPDashboardClient.tsx:2951`) overrides: `satImagery:1`, `bathymetry:0.45`, `topography:0.55`. These three are also in `FUNGA_BASE_CONTEXT_LAYER_IDS`, `EARTH_NATURE_EVENT_FOCUS_LAYER_IDS`, and `PROPOSAL_OVERLAY_LAYER_IDS`.

##### 3.5 Cached HD satellite proxy (`app/api/crep/tiles/satellite/[basemap]/[z]/[x]/[y]/route.ts`)

A server route giving a single tile endpoint with MINDEX-NAS fallback. Basemaps (`:53`–`64`): `mapbox-sat-streets` (Mapbox satellite-streets-v12 `@2x`, needs `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`), `mapbox-sat` (satellite-v9 `@2x`, needs token), `esri-world-imagery` (ESRI World Imagery, no key). Resolution order: (1) MINDEX cache at `{MINDEX_TILE_BASE}/{basemap}/{z}/{x}/{y}.jpg`, (2) upstream fetch, (3) async write-back to MINDEX. A 60 s circuit breaker (`mindexUnavailableUntil`, `MINDEX_PROBE_TIMEOUT_MS=500`, `:80`–`104`) skips MINDEX when unreachable so tiles don't block. Weekly refresh by `scripts/etl/crep/prefetch-satellite-tiles.mjs` (systemd timer on VM 189), zooms 0–14.

---

#### 4. Aurora overlay — NOAA SWPC OVATION (`components/crep/layers/aurora-overlay.tsx`)

`AuroraOverlay({ map, enabled=false, opacity=0.5 })` (`:59`). Renders the NOAA SWPC northern + southern auroral-forecast images as two MapLibre **ImageSource** overlays at polar bounds.

| Property | North | South |
|----------|-------|-------|
| Source id | `crep-aurora-north` (`:20`) | `crep-aurora-south` (`:22`) |
| Layer id | `crep-aurora-north-layer` (`:21`) | `crep-aurora-south-layer` (`:23`) |
| Bounds `[W,S,E,N]` | `[-180, 40, 180, 90]` (`:26`) | `[-180, -90, 180, -40]` (`:27`) |

- **Data fetch** (`:88`–`129`): `GET /api/oei/space-weather/aurora` with `AbortSignal.timeout(15000)`; sets `auroraData = data.aurora` (`{ northernHemisphere, southernHemisphere }` base64 JPEGs). Polls every `REFRESH_MS = 30 min` (`:29`). Skips when `document.hidden` (`:102`).
- **Circuit breaker (Apr 21, 2026 OOM audit, `:91`–119):** after `MAX_FAILURES = 3` consecutive failures it clears the interval and gives up until re-enable; warns only on failure #1 and at the cap.
- **data: → blob: conversion** (`dataUriToBlobUrl()` `:41`–57): MapLibre's AJAX image loader throws `AJAXError` on long base64 `data:` URIs, so each image is converted to a `blob:` URL. Blob URLs are revoked on a **10 s delay** (`scheduleRevoke()` `:71`) after MapLibre finishes its async fetch (eager revoke caused `AJAXError: Failed to fetch (0): blob:...`). On disable/unmount, immediate `revokeAllBlobUrls()` (`:78`).
- **ImageSource geometry** (`:175`–185 / `:209`–219): four `coordinates` corners (TL,TR,BR,BL) from the polar bounds. Existing source updated via `updateImage({url})`; raster layer paint `raster-opacity:opacity`, `raster-fade-duration:500`.
- **Teardown guards (Apr 20, 2026):** `typeof map.getLayer === "function"` check (`:138`, `:256`) survives an HMR-torn-down map (object exists, methods gone). Live opacity effect (`:270`–277).
- **API provenance (`app/api/oei/space-weather/aurora/route.ts`):** images from `services.swpc.noaa.gov/images/aurora-forecast-northern-hemisphere.jpg` + southern (`:89`–94, fetched as base64). Also returns `ovation` (`ovation_aurora_latest.json`), `activeRegions` (`solar_regions.json`), and parsed `kpIndex` (`noaa-planetary-k-index.json`). 30 min server cache.

Registry: `auroraOverlay` (`CREPDashboardClient.tsx:10090`), **enabled:true**, opacity 0.5, color `#34d399`, category `events`, "NOAA SWPC aurora probability overlay on polar regions".

---

#### 5. Realistic volumetric clouds (`components/crep/layers/realistic-cloud-layer.tsx`)

`RealisticCloudLayer({ map, enabled, bbox, opacity=0.7, mode3d=false, forecastHours=0, resolutionDeg=0.25, gpuMode=false })` (`:111`). The architecture (`:33`–53) describes a MapLibre `CustomLayerInterface` hosting a Three.js scene with two pipelines (satellite-texture + volumetric raymarch shader) across three altitude shells. **The file as committed implements only the 2D multi-source scaffold**; the full 3D raymarch path is documented as mounting later in `<ThreeDGlobeView>`.

##### 5.1 Altitude shells (3D, `:36`–43)

| Band | Altitude AGL | Cloud type |
|------|--------------|-----------|
| low | 600–1800 m | stratus / cumulus |
| mid | 2500–5500 m | altocumulus / altostratus |
| high | 7000–12000 m | cirrus |

##### 5.2 2D layers attached (`attachCloudLayers()` `:176`–333)

| # | Layer id | Source id | Data | Paint |
|---|----------|-----------|------|-------|
| 1 | `crep-clouds-gibs-rgb` | `crep-clouds-gibs-rgb-src` | GIBS MODIS True Color, `GIBS_MODIS_RGB_DAY` (`:92`), date = **2-day-back UTC** (`gibsDateStr(2)` `:181`) | `raster-opacity:clamp(opacity)`, `raster-fade-duration:200`, `raster-brightness-min:0.2`, `raster-brightness-max:1.0`, `raster-contrast:0.15`, `raster-saturation:-0.35` (`:212`–217); `tileSize:256`, `minzoom:0`, `maxzoom:9` (overzoom, not a cap) |
| 2 | `crep-clouds-radar` | `crep-clouds-radar-src` | RainViewer global radar, latest `radar.past` frame from `https://api.rainviewer.com/public/weather-maps.json` → `{host}{path}/256/{z}/{x}/{y}/2/1_1.png` (`:103`,`:235`) | `raster-opacity:clamp(opacity+0.1)`, `raster-fade-duration:150`; `maxzoom:12` overzoom |
| 3 | `crep-clouds-shadow-fill` | `crep-clouds-shadow-src` | GeoJSON viewport polygon from `bbox`; weather from `/api/eagle/weather/multi` | `fill-color:#0b1120`, `fill-opacity:shadowOpacity` |

A second GIBS source `GIBS_MODIS_CLOUD_DAY` (cloud-top pressure, `Level7`, `:98`) is defined for a "clouds-only" render but not attached in this scaffold.

##### 5.3 Shadow envelope math (`:289`–322, repeated in 5-min poll `:339`–375)

```
shadowOpacity = clamp( (cover/100) * (1 - max(0,sunAlt)/90) * 0.5, 0, 0.25 )
```
`cover = wx.summary.cloud_cover_pct`, `sunAlt = wx.summary.sun_altitude_deg` (default 90). Query params to `/api/eagle/weather/multi`: `lat`,`lng` (bbox centroid), `fh=forecastHours`, `res=resolutionDeg`, `gpu=gpuMode?"1":"0"` (`:279`–285). Polls every `300_000` ms (5 min) and `setData`s the polygon + updates `fill-opacity`.

##### 5.4 v2 hotfixes (Apr 20, 2026, `:14`–28) and gates

- `raster-brightness-max` clamped 1.1 → **1.0** (MapLibre max; 1.1 crashed validation).
- Per-source `maxzoom` ceilings dropped/repurposed as overzoom hints — the `maxzoom` declaration tells MapLibre to upscale, not stop requesting (removes "zoom level not supported" gray boxes); Morgan: "zoom limited is not allowed".
- GIBS date moved 1 → **2 days UTC back** (NASA publishes previous day 12–18 h UTC → 404/Blob errors each morning).
- Accepts Earth-2 filter inputs (`forecastHours`/`gpuMode`/`resolutionDeg`) forwarded to `/api/eagle/weather/multi`, which routes to the PersonaPlex + 4080a/4080b Earth-2 physics bridge when `MAS_API_URL` is set.
- **Style-readiness guard** `isMapStyleReady()` (`:62`–68) + a `styleReadyTick` rAF bumper on `load`/`style.load`/`styledata`/`idle` (`:125`–143) prevents "Style is not done loading".
- **Disable path** sets all four ids to `visibility:"none"` and clears the poll (`:155`–163); re-enable flips back to `visible`; `loadedRef` guards re-attach (`:165`–174).

##### 5.5 Sibling Earth-2 cloud layer (`components/crep/earth2/cloud-layer.tsx`)

A separate, GeoJSON-polygon (not raster) cloud renderer. `CloudLayer({ map, visible, forecastHours, opacity, resolutionDeg=0.22, showAnimation=true, showShadows=true })`. Source `earth2-clouds-source` → fill layer `earth2-clouds`; shadow source `earth2-clouds-shadow-source` → `earth2-clouds-shadow`. Pulls `tcwv` (total column water vapor) + wind vectors from the Earth-2 client (`getWeatherGrid`/`getWindVectors`), converts humidity→cloud density `(value-20)/45`, builds animated polygons drifting on `requestAnimationFrame` (phase `+=0.02`, `:154`–166). Coverage = % of grid > 25. This is part of the Earth-2 layer suite, distinct from the GIBS-textured `RealisticCloudLayer`.

---

#### 6. Earth-2 layer suite (`components/crep/earth2/*`)

Exported from `earth2/index.ts`. `DEFAULT_EARTH2_FILTER` (`earth2-layer-control.tsx:120`) — all layers default **false**; `selectedModel:"atlas_era5"`, `forecastHours:0`, `stepHours:6`, `opacity:0.7`, `resolution:"native"`, `useHdWeatherTiles:false`, `gpuMode:"off"`, `cpuFallbackEnabled:true`.

**Earth-2 is disabled in production:** `EARTH2_BACKEND_ENABLED = false` (`CREPDashboardClient.tsx:2971`) and an `EARTH2_DISABLED_FILTER` (`:2972`) forces every flag off. The dashboard comment confirms "Earth2 GPU weather overlays intentionally disabled until the GPU service is ready" (`:21826`). Many Earth-2 ids are in `FORCE_OFF_UNTIL_STABLE_LAYER_IDS` (`:2846`–2852).

##### 6.1 EO-relevant Earth-2 components

| Component | Source/layer ids | Tile/data source | Notes |
|-----------|------------------|------------------|-------|
| `Earth2TileRasterLayers` (`earth2-tile-raster-layers.tsx`) | `earth2-tile-{t2m,tp,tcwv}-src` / `earth2-tile-{t2m,tp,tcwv}` | `/api/earth2/tiles/{variable}/{z}/{x}/{y}?hours=…&model=…` (`:80`) | Raster pyramid, `tileSize:256`, `maxzoom:12`; `hours` clamped 0–240 (`:63`); `rasterFadeMs=280`; inserts before first `symbol` layer (`:39`). Real Open-Meteo via MAS/Legion pipeline. |
| `CloudLayer` | `earth2-clouds*` | Earth-2 client `tcwv` | §5.5 |
| Weather/hazard layers | various `earth2-*` | Earth-2 client / hazard feeds | `WeatherHeatmapLayer`, `WindVectorLayer`, `PrecipitationLayer`, `PressureLayer`, `StormCellsLayer`, `HumidityLayer`, `SmokeLayer`, `FireLayer`, `LightningLayer`, `SporeDispersalLayer` |

##### 6.2 Earth-2 models & control (`earth2-layer-control.tsx`)

`Earth2Model` (`:64`): `atlas_era5`, `atlas_gfs`, `stormscope`, `corrdiff`, `healda`, `fourcastnet`. `MODEL_INFO` (`:168`) gives `maxHours`/`minStep` (e.g. Atlas 360 h / 6 h, StormScope 6 h / 0.25 h, CorrDiff 168 h / 1 h). `GpuMode` (`:73`): `"earth2" | "voice" | "physics" | "off"` — only one GPU-intensive service at a time; `RealisticCloudLayer.gpuMode = earth2Filter.gpuMode !== "off"` (`CREPDashboardClient.tsx:22373`). Resolution `"native"(~25km) | "1km" | "250m"` (CorrDiff).

---

#### 7. Sun ↔ Earth Impact space-weather layer (`components/crep/layers/sun-earth-impact-layer.tsx`)

`SunEarthImpactLayer({ map, enabled, showCorrelationLines=true })` (`:30`). Renders live solar-event "earthspots" as GeoJSON points + polygons + lines. Polls `GET /api/oei/sun-earth-correlation` (`cache:"no-store"`) every **60 s** (`:42`,`:201`); a second 30 s interval re-renders the subsolar marker (`:202`).

##### 7.1 Sources & layers

Three GeoJSON sources (`:26`–28): `crep-sun-earthspots` (points), `crep-sun-footprints` (polygons), `crep-sun-correlation-lines` (lines). API response fields mapped: `d.earthspots[]` → points (`:46`) + footprint polygons where `footprint.length>=3` (`:54`); `d.correlationLines[]` → LineString from `sunspotProjection` to `cycloneLocation` (`:62`), gated by `showCorrelationLines`.

| Layer id | Type | Source | Key styling |
|----------|------|--------|-------------|
| `crep-sun-footprint-fill` | fill | footprints | `fill-color` by `kind` match; `fill-opacity` interpolated on `intensity` 0→0.05, 1→0.35 (`:102`) |
| `crep-sun-footprint-line` | line | footprints | dashed `[2,2]`, width 1.5, opacity 0.7 |
| `crep-sun-earthspot-glow` | circle | earthspots | radius interp `intensity` 0→8,1→30; `circle-blur:1.1`, opacity 0.35 |
| `crep-sun-earthspot-dot` | circle | earthspots | radius interp `intensity` 0→3,1→8; white stroke; click→popup (`:157`) |
| `crep-sun-correlation-line` | line | correlation-lines | `#a855f7`, dashed `[4,4]`, opacity 0.5 |

##### 7.2 Event kinds & color scheme (`:93`–116, `:128`–152)

`sub-solar` (yellow `#fde68a`/`#fbbf24`), `flare-dayside` (red `#ef4444`/`#dc2626`), `cme-arrival` (magenta `#d946ef`/`#c026d3`), `aurora-oval-north`/`aurora-oval-south` (green `#4ade80`/`#16a34a`), fallback `#fbbf24`. Click popup shows label, kind, active-region (AR), localized timestamp (`:163`–168).

##### 7.3 Disable / teardown (`:185`–214)

On `!enabled` (with `addedRef`) and on unmount, removes the 5 layers then 3 sources, guarded by `(map as any)?.style` to survive teardown. `addedRef.current` tracks attach state.

##### 7.4 API provenance (`app/api/oei/sun-earth-correlation/route.ts`)

Fuses (`:1`–13): NOAA SWPC `solar_regions.json` (active sunspots), GOES `xray-flares-latest.json` (24 h flares), NASA DONKI `CMEAnalysis` (`NASA_API_KEY` or `DEMO_KEY`, Earth-impact + Enlil arrival/Kp), SWPC `ovation_aurora_latest.json` (hemispheric power GW), NOAA NHC `CurrentStorms.json` (active cyclones). Builds: always-present subsolar earthspot (`getSubsolarPoint`/`getDaysideFootprint`), flares from last 6 h, CME footprints + ovals, baseline auroral ovals where `invLat = max(50, 72 - power/10)` (`:172`), and **hypothesis** correlation lines (Elsner/Jagger/Lei solar↔cyclone — explicitly "exploratory, never predictive", `:205`). 60 s cache (`revalidate=60`).

Registry: `sunEarthImpact` (`CREPDashboardClient.tsx:10236`), **enabled:false** ("OFF by default — too much on load"), opacity 0.8, color `#fbbf24`. Distinct registry id `solar` ("Space Weather", enabled:true, `:10024`) drives event filtering, not this overlay.

---

#### 8. Dashboard wiring & readiness gates (`app/dashboard/crep/CREPDashboardClient.tsx`)

Imports: `GibsBaseLayers` (`:246`), `AuroraOverlay` (`:250`), `SunEarthImpactLayer` (`:269`), `RealisticCloudLayer` (`:274`).

**Stack order** (comment `:21814`): basemap → GIBS → HD tiles → heatmap → wind.

| Overlay | JSX | Mount gate | Enabled source | Opacity |
|---------|-----|-----------|----------------|---------|
| `GibsBaseLayers` | `:21815` | always mounted | `eoImageryFilter.{showModis,showViirs,showLandsat,showAirs}` | fixed `0.4` |
| `AuroraOverlay` | `:21846` | always mounted | `layers.find(id==="auroraOverlay").enabled ?? false` | fixed `0.5` |
| `RealisticCloudLayer` | `:22359` | `!auditAllOffMode && !assetIsolationMode && shouldRenderHeavyOverlays && layers.find(id==="realisticClouds").enabled` | same layer flag | `layers…opacity ?? 0.7` |
| `SunEarthImpactLayer` | `:22583` | `(!isEarthSimulatorRoute || earthSimDeferredDataReady) && !auditAllOffMode && !assetIsolationMode && layers.find(id==="sunEarthImpact").enabled` | same; `showCorrelationLines={true}` | n/a |
| `ProposalOverlays` (satImagery/bathymetry/topography) | `:22291` | `assetIsolationMode !== "funga" && (!isEarthSimulatorRoute \|\| stableEarthOverlayAssetsReady \|\| proposalOverlayAssetsReady \|\| satelliteImageryOverlayReady)` | see below | registry |

**`RealisticCloudLayer` props** (`:22360`–22373): `bbox=cloudOverlayBbox`, `mode3d={false}`, `forecastHours=earth2Filter.forecastHours`, `resolutionDeg=earth2ApiResolutionDeg`, `gpuMode = earth2Filter.gpuMode !== "off"`.

**Base-imagery gates** (`:22305`–22307):
- `bathymetry: stableEarthOverlayAssetsReady && (layers…bathymetry.enabled ?? true)`
- `topography: stableEarthOverlayAssetsReady && (layers…topography.enabled ?? true)`
- `satImagery: satelliteImageryOverlayReady && (layers…satImagery.enabled ?? true)`

All three default to `true` while layer state hydrates (so they paint on refresh). `satImagery` uses its **own** readiness gate (`satelliteImageryOverlayReady`) separate from the general `stableEarthOverlayAssetsReady` — satellite imagery has a dedicated, earlier-firing readiness path. `bbox=detailedOverlayBbox`, `mapZoom`, `searchContextMode=isEmbeddedEarthquakeSearch`.

**`eoImageryFilter` state** (`:9913`): all five EO flags (`showModis/showViirs/showAirs/showLandsat/showEonet`) initialize **false** (GIBS overlays off by default). Reset/preset transitions at `:10430`, `:12393`, `:12498`, `:12576`. EO imagery is "controlled by on-map MapLayersPopup … via eoImageryFilter state + GibsBaseLayers" (`:10084`–10085).

**Earth Simulator boot** (`lib/crep/earth-simulator-boot.ts`): the base EO trio is in `EARTH_SIM_BASE_LAYER_IDS = ["satImagery","bathymetry","topography","fungalAtlasECM"]` (`:32`), visible at US zoom on refresh with AM off. Space-weather `solar` is **excluded** from `EARTH_SIM_EVENT_LAYER_IDS` (`:74`). Default center `[-98.5, 39.8]`, zoom 3.

---

#### 9. Layer registry summary (EO / space-weather entries)

| Registry id | Name | Category | Default enabled | Opacity | Color | Engine |
|-------------|------|----------|-----------------|---------|-------|--------|
| `satImagery` | Satellite Imagery (HD) | environment | true | 1.0 | `#1e40af` | ESRI World Imagery (§3.1) |
| `bathymetry` | Ocean Bathymetry | environment | true | 0.45 | `#0e7490` | ESRI World Ocean Base / GEBCO (§3.2) |
| `topography` | Land Topography | environment | true | 0.55 | `#78350f` | AWS Terrain hillshade (§3.3) |
| `auroraOverlay` | Aurora Forecast | events | true | 0.5 | `#34d399` | SWPC OVATION images (§4) |
| `realisticClouds` | (clouds) | nature/environment | false (force-off until stable) | 0.7 | — | GIBS MODIS + RainViewer (§5) |
| `sunEarthImpact` | Sun→Earth Impact | events | false | 0.8 | `#fbbf24` | sun-earth-correlation (§7) |
| `solar` | Space Weather | events | true | 0.7 | `#fbbf24` | event filtering (not a raster) |
| GIBS `modis/viirs/airs/landsat` | EO imagery | (MapLayersPopup) | false | 0.4 / 0.85 (landsat) | — | NASA GIBS (§2) |

---

#### Key files (absolute paths)

- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\lib\crep\gibs-layers.ts`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\crep\layers\gibs-base-layers.tsx`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\crep\earth2\gibs-eo-overlays.tsx`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\crep\layers\proposal-overlays.tsx` (satImagery/bathymetry/topography raster engine, §3)
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\crep\layers\aurora-overlay.tsx`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\crep\layers\realistic-cloud-layer.tsx`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\crep\layers\sun-earth-impact-layer.tsx`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\crep\earth2\` (index.ts, earth2-tile-raster-layers.tsx, cloud-layer.tsx, earth2-layer-control.tsx, et al.)
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\app\api\crep\tiles\satellite\[basemap]\[z]\[x]\[y]\route.ts`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\app\api\oei\space-weather\aurora\route.ts`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\app\api\oei\sun-earth-correlation\route.ts`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\app\api\eagle\weather\multi\route.ts`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\app\dashboard\crep\CREPDashboardClient.tsx` (wiring + gates)
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\lib\crep\earth-simulator-boot.ts` (boot profile)

---

## 13. Live Movers (Air / Sea / Space)

### Live Movers (Aircraft, Vessels, Satellites)

> **Correction (Jun 13, 2026):** A prior draft of this README stated that live movers stream over an `EntityStreamClient` WebSocket. **That is wrong.** On the public `mycosoft.com` origin, all three live-mover classes — aircraft, vessels, satellites — are driven by **HTTP polling** from a single client-side timer ("the mover pump") in `CREPDashboardClient.tsx`. The `EntityStreamClient` WebSocket is a **local-only fast path that is disabled on public origins** (see [§ The EntityStreamClient WebSocket is disabled in production](#the-entitystreamclient-websocket-is-disabled-in-production)). Satellites are an additional special case: they are polled as **TLE/orbital-element records** and their on-screen motion is computed **client-side via SGP4 propagation**, not re-polled per frame.

Live movers are the moving-asset overlays on the CREP / Earth Simulator globe. There are three classes, each with a distinct transport, registry, classifier, and render path:

| Class | Poll endpoint | Source registry | Client motion model | Render source |
|-------|---------------|-----------------|---------------------|---------------|
| Aircraft | `/api/oei/flightradar24` | `lib/crep/registries/aircraft-registry.ts` | dead-reckoning extrapolation from last poll (deck/MapLibre) | aircraft deck layers |
| Vessels | `/api/oei/aisstream` | `lib/crep/registries/vessel-registry.ts` | dead-reckoning extrapolation from last poll | vessel deck layers |
| Satellites | `/api/oei/satellites?category=active&mode=registry` | satellite registry (TLE/GP) | **SGP4 propagation** in a Web Worker, ~1 Hz rAF loop | MapLibre `crep-live-satellites` source |

#### The mover pump (HTTP polling)

All three classes are fetched by one `useEffect`-scoped async function, `pumpLive`, in `app/dashboard/crep/CREPDashboardClient.tsx` (defined at `CREPDashboardClient.tsx:9428`). It runs the three fetches concurrently via `Promise.allSettled` (`CREPDashboardClient.tsx:9513`), each wrapped in its own try/catch so one dead upstream never blocks the others.

##### Cadence

| Trigger | Timing | Code |
|---------|--------|------|
| Initial burst | timers at **900 ms, 3000 ms, 7000 ms, 15000 ms** after mount | `CREPDashboardClient.tsx:9660` |
| Steady-state interval | `setInterval` every **45 000 ms** (45 s) | `CREPDashboardClient.tsx:9668-9671` |
| Tab return | immediate pump on `visibilitychange` when not paused | `CREPDashboardClient.tsx:9672-9680` |
| External request | `window` event `crep:mover-pump-request` → pump after 250 ms debounce | `CREPDashboardClient.tsx:9675-9681` |

The 45 s interval is a deliberate tradeoff documented inline: "keep live, but avoid starving map interaction and tile loading" (`CREPDashboardClient.tsx:9671`).

##### Gating — when the pump is suppressed

The pump short-circuits at several layers before any fetch fires:

1. **Effect-level guards** (`CREPDashboardClient.tsx:9424-9425`): returns immediately if `!isStreaming`, or if none of `embeddedAllowsAircraft / embeddedAllowsVessels / embeddedAllowsSatellites` is set.
2. **In-flight guard** (`CREPDashboardClient.tsx:9430`): `liveEntityPumpInFlightRef` prevents overlapping pump cycles; set true at `:9451`, reset in `finally` at `:9656`.
3. **`shouldPauseMoverPump()`** (`CREPDashboardClient.tsx:9432-9436`): returns true (skips the whole tick) when `auditAllOffMode`, `assetIsolationMode`, or `document.hidden`.
4. **`shouldPauseLiveWork()`** wraps the interval and visibility handlers (`CREPDashboardClient.tsx:9669, 9673, 9677`) — visibility-aware throttle so a backgrounded tab burns no API calls or `setState`s.
5. **Per-class layer gate** (`CREPDashboardClient.tsx:9444-9450`): in `earthStrictPerfMode` (Earth Simulator), each class is allowed only if its layer toggle is enabled via the `__crep_layers()` snapshot:
   - aircraft ← `aviation` or `aviationRoutes`
   - vessels ← `ships`, `shipRoutes`, `fishing`, or `containers`
   - satellites ← `satellites`
   
   Outside `earthStrictPerfMode`, `earthLayerEnabled` returns `true` unconditionally (`:9438`). If all three classes are disallowed the pump returns early (`:9450`).

##### Per-endpoint circuit breaker

Each class has an independent breaker stored on `window.__crep_pump_<class>_breaker` (`CREPDashboardClient.tsx:9458-9475`). After **3 consecutive failures** the breaker opens for **5 minutes** (`skipUntil = Date.now() + 5*60*1000`), during which `breakerSkip()` causes that class to be skipped while the other two keep polling. Success resets the counter. This was added in the "Apr 21, 2026 Morgan OOM audit" to stop a dead upstream from spamming the console and burning CPU on retries.

##### Persistence / merge (no flicker)

Each successful fetch does **not** replace state; it merges into a persistent session union via `mergeById` from `lib/crep/entity-merge.ts` (imported at `CREPDashboardClient.tsx:219`):

- Aircraft: `idKey = icao24 || icao || id`, `ttlMs = ENTITY_TTL_MS.aircraft` (**15 min**), cap `earthMoverLimits.aircraft` (`:9537-9541`).
- Vessels: `idKey = mmsi || id`, `ttlMs = ENTITY_TTL_MS.vessel` (**90 min** — AIS towers have bigger gaps), cap `earthMoverLimits.vessels` (`:9602-9606`).
- Satellites: `idKey = noradId || norad_id || id`, `ttlMs = ENTITY_TTL_MS.satellite` (**60 min**), cap `earthMoverLimits.satellites` (`:9636-9640`).

`mergeById` keeps any previously-seen entity whose `lastSeen` is within `ttlMs`, overwrites matches with fresh positions, and when the union exceeds `maxEntries` drops the oldest-`lastSeen` entries (`entity-merge.ts:35-96`). TTL constants are defined at `entity-merge.ts:105-109`. Each merge also fires `syncToMINDEX(...)` (best-effort, wrapped in try/catch) to persist what was fetched (`:9543, 9608, 9641`).

##### Working-set caps (`earthMoverLimits`)

The `limit` query param and the merge cap both come from `earthMoverLimits` = `EARTH_SIM_SAFE_RESOURCE_LIMITS` in `earthStrictPerfMode`, else `RESOURCE_LIMITS.normal` (`CREPDashboardClient.tsx:7897`):

| | aircraft | vessels | satellites |
|---|---|---|---|
| `RESOURCE_LIMITS.normal` (`:847`) | 1 500 | 2 500 | 1 200 |
| `RESOURCE_LIMITS.medium` (`:848`) | 1 000 | 1 800 | 900 |
| `RESOURCE_LIMITS.high` (`:849`) | 600 | 1 200 | 600 |
| `EARTH_SIM_SAFE_RESOURCE_LIMITS` (`:851-859`) | 700 | 900 | 240 |

The `normal/medium/high` tier is selected by browser memory pressure. Note the inline comments at `:9588-9601` describe vessel caps having been tuned 6k → 20k → 8k historically; the live cap is whatever `earthMoverLimits.vessels` resolves to at render time. A second render-time cap, `getEarthSimMoverRenderCap(kind, zoom)` (`:861`), further clamps the rendered set per zoom in `earthStrictPerfMode`.

##### Viewport-aware bbox

When the map has bounds and `zoom ≥ 3`, the pump appends a clamped bbox (`lamin/lamax/lomin/lomax`, longitudes clamped to ±180) to the aircraft (`:9529-9531`) and vessel (`:9574-9576`) URLs; otherwise it falls back to a global `?limit=` query. Satellites are always fetched globally (orbital, no viewport cull at fetch time) (`:9621`).

##### Response shape tolerance

`readMoverRows(payload, preferredKey)` accepts any of `payload[preferredKey]`, `payload.entities`, `payload.observations`, or `payload.features` (`CREPDashboardClient.tsx:9476-9485`). Vessels and satellites additionally pass through `dedupeMoverRows` (`:9491-9506`). Satellite dedup prefers a row carrying TLE lines over one without (`satelliteHasTle`, `:9507-9510`, used as the `preferIncoming` predicate at `:9632`).

> **Dead code note:** A second block at `CREPDashboardClient.tsx:10942-10974` references the same three endpoints but every branch is guarded by `false && …`, so it never executes.

#### The EntityStreamClient WebSocket is disabled in production

`lib/crep/streaming/entity-websocket-client.ts` implements a real WebSocket client (`EntityStreamClient`) that connects to the MAS entity stream at `<MAS>/api/entities/stream`, supports binary protobuf + JSON frames, S2-cell viewport filtering, and exponential-backoff reconnection (1.5 s → 24 s, max 10 attempts; `entity-websocket-client.ts:31-33, 152-159`). **It is a local/private-network fast path, not the production transport.**

It is disabled at construction on any public origin:

- `isPublicBrowserOrigin()` (`:43-47`) is true whenever the page host is not in `LOCAL_BROWSER_HOSTS` (`localhost`, `127.0.0.1`, `0.0.0.0`, `::1`, `host.docker.internal`).
- `resolvesToLocalMachine(base)` (`:49-63`) is true when the configured `API_URLS.MAS` host is loopback or RFC-1918 private (`127.*`, `10.*`, `192.168.*`, `172.16–31.*`).
- The constructor (`:82-93`): **if** `isPublicBrowserOrigin() && resolvesToLocalMachine(masUrl)`, it sets `endpointBase = ""` and `disabledReason = "disabled on public origin because the MAS entity WebSocket resolves to a local/private host"` and returns without ever opening a socket. `updateViewport`, `openSocket`, and `scheduleReconnect` all early-return when `disabledReason` is set (`:139, 163-170, 263-266`).

On `mycosoft.com`, where MAS resolves to a private host, this condition is always true → **no production WebSocket traffic for movers**. When it *can* run (developer browsing `localhost` with a reachable MAS), it feeds a separate `streamedEntities` state, not the aircraft/vessel/satellite arrays, via a rAF-batched buffer that flushes once per frame and caps at 50 000 entries (`CREPDashboardClient.tsx:16443-16496`). Its effect is additionally gated off entirely on the Earth Simulator route, in search-embed, in audit/isolation mode, when `!isStreaming`, or when `!embeddedAllowsLiveEntityStream` (`:16444`). On failure or public origin it logs once and notes "Direct API layers remain active" (`entity-websocket-client.ts:167, 249-251, 269`) — i.e., the HTTP pump is the system of record.

#### Aircraft: registry + classification

##### Registry (`lib/crep/registries/aircraft-registry.ts`)

`fetchAllAircraft()` / `fetchAllAircraftWithMeta()` fan out to up to 5 sources in parallel, each isolated by `Promise.allSettled` and per-source timeout (`SOURCE_TIMEOUT_MS` = `CREP_MOVING_SOURCE_TIMEOUT_MS` env, else 1500 ms dev / 5000 ms prod; `:61-67`):

| # | Source | Endpoint / mechanism | Key needed | Notes |
|---|--------|----------------------|-----------|-------|
| 1 | FlightRadar24 | existing connector `getFlightRadar24Client()` | — | Only runs if `CREP_ENABLE_WEBSITE_MINDEX_WRITEBACK=1`, else returns `[]` (`:84-93`) |
| 2 | MINDEX PostGIS | `${MINDEX_URL}/api/mindex/earth/map/bbox?layer=aircraft…` | `X-API-Key` | global bbox, limit 10 000 (`:98-109`) |
| 3 | OpenSky Network | `https://opensky-network.org/api/states/all` | none (free) | longer 15 s timeout; ~6500 global aircraft; custom UA (`:119-155`) |
| 4 | ADS-B Exchange | `https://adsbexchange.com/api/aircraft/v2/all` | `ADSBX_API_KEY` | skipped if no key (`:160-192`) |
| 5 | ADSB.lol | `…/v2/mil` + `…/v2/ladd` | none | `/v2/all` removed 2025; pulls military + LADD subsets (`:202-239`) |

Results are normalized to `AircraftRecord` (`:26-39`), then **deduplicated by ICAO hex** (lowercased; falls back to `cs-<callsign>` then `id`) with field-level merge that prefers newer valid (non-0,0) positions and fills nulls from secondary sources (`deduplicateByICAO` / `mergeAircraft`, `:283-333`). Optional MINDEX write-back is gated on `CREP_ENABLE_WEBSITE_MINDEX_WRITEBACK` (`:410-440`).

> The pump intentionally hits `/api/oei/flightradar24` (identity-rich: callsign, `onGround`) rather than `/api/mindex/proxy/aircraft` (kinematics-only, no callsign) because the category classifier needs callsigns — see the Jun 12, 2026 note at `CREPDashboardClient.tsx:9517-9522`. Without callsigns every plane collapsed into the "private" bucket.

##### Category classification (`moverAircraftPool`, `CREPDashboardClient.tsx:14989-15030`)

Each aircraft is bucketed into exactly one of four categories, evaluated in precedence order:

| Category | Rule | Code |
|----------|------|------|
| **Cargo** | `tags` category `== "Cargo"`, or `aircraftType` contains "F", or callsign prefix in `{FDX, UPS, CGN, GTI, ABX, 5Y, K4, FX, PO}` | `:15008-15009` |
| **Military** | callsign starts with any of `{RCH, REACH, DUKE, EVAC, HURLB, SPAR, AWACS, GAF, IAM, NAF, NAVY, HAF, BAF, RAAF, VADER, HOSS}` | `:15010-15011` |
| **Commercial** | not cargo/military **and** (airline callsign `/^[A-Z]{2,3}\d{1,4}$/`, or category ∈ {Wide-body, Narrow-body, Regional}, or has `origin`+`destination` or `flightNumber`) | `:15013-15017` |
| **Private** | not cargo/military/commercial (the residual) | `:15019` |

An aircraft survives the pool only if its category's toggle (`showCargo / showMilitary / showCommercial / showPrivate`) is enabled (`:15021-15027`), plus airborne/ground (`showAirborne`/`showGround` vs `onGround`) and altitude-band filters (`:14994-15000`). Defaults for these toggles are off at boot on the Earth Simulator path (`:9692-9707`).

##### Identity enrichment (helicopter detection)

The position-sync effect (`:15242`) additionally tags **helicopters** via `isHelicopter()` (`:15255-15262`): authoritative on ICAO emitter **category 8 / "Rotorcraft"**, else a regex on ICAO type codes (`HELO_TYPE_RE`, `:15254` — matches `h145`, `r44`, `as350`, `ec135`, `ah64`, `uh60`, `ch47`, `mi8`, etc.), else an explicit `isHelicopter` boolean. Helicopter IDs feed a separate render path. Position extraction tolerates flat `lat/lng`, `location.*`, and GeoJSON `coordinates` shapes (`:15273-15274`); the Apr 19, 2026 note records the "all planes pinned at null island" bug fixed here.

#### Vessels: registry + classification

##### Registry (`lib/crep/registries/vessel-registry.ts`)

`fetchAllVessels()` / `fetchAllVesselsWithMeta()` fan out to **10 sources** (`:539-556`), each `Promise.allSettled`-isolated with the same `SOURCE_TIMEOUT_MS` (`:79-85`):

| # | Source | Mechanism | Key | Notes |
|---|--------|-----------|-----|-------|
| 1 | AISstream | in-process WebSocket cache `getAISStreamClient().getCachedVessels()` | API key | primary live AIS; empty if no key (`:106-116`) |
| 2 | MINDEX | `…/api/mindex/earth/map/bbox?layer=vessels…` (limit 5000) | internal token / API key | `:121-132` |
| 3 | MarineTraffic | `services.marinetraffic.com/api/exportvessels` | `MARINETRAFFIC_API_KEY` | `:137-164` |
| 4 | VesselFinder | `api.vesselfinder.com/vessels` | `VESSELFINDER_API_KEY` | `:169-196` |
| 5 | BarentsWatch | open positions API | none | `:201-237` |
| 6 | Danish Maritime Authority | `ais.dma.dk/ais-ab/ais-positions` | none | `:242-277` |
| 7 | Global Fishing Watch | events API (last 24 h) | `GLOBAL_FISHING_WATCH_TOKEN` | `shipType: "fishing"` (`:284-346`) |
| 8 | AISHub | community share | `AISHUB_USERNAME` | rate-limited 1 req / 61 s (`:357-397`) |
| 9 | SDR | user RTL-SDR receivers via `getSdrVesselsAsRecords()` | — | local cache (`:550`) |
| 10 | Disk cache | `readVesselsFromDiskCache()` | — | bridges AIS outages (`:555`) |

Records normalize to `VesselRecord` (`:30-43`), **dedup by MMSI** (skips `0`/empty MMSI and 0,0 coords) with newer-position-wins merge (`deduplicateByMMSI` / `mergeVessels`, `:470-513`). Fresh (non-disk) vessels are persisted back to disk cache so the globe survives AIS WebSocket drops (`:599-602`).

> **Pump nuance (`CREPDashboardClient.tsx:9552-9616`):** the live default `/api/oei/aisstream` route goes through the multi-source registry above, which the inline Apr 22, 2026 note records as returning 0 from the keyless sub-sources. The persistent AISstream WebSocket singleton *is* collecting vessels, so the registry endpoint can serve directly from that client's internal cache (`fetchFromAISStream`, source #1). The pump uses the plain `/api/oei/aisstream?…&limit=` form.

##### Ship-type classification (`moverVesselPool`, `CREPDashboardClient.tsx:15055-15099`)

Classification reads the AIS ShipType number (`v.shipType` or `properties.shipTypeNum`, default `0`) plus a lowercased string fallback and `navStatusNum` (`:15059-15063`):

| Category | AIS ShipType range / rule | Code |
|----------|---------------------------|------|
| Cargo | 70–79 or string "cargo" | `:15065` |
| Tanker | 80–89 or "tanker" | `:15066` |
| Passenger | 60–69 or "passenger" | `:15067` |
| Fishing | 30, "fishing", or `navStatusNum === 7` | `:15068` |
| Tug/Towing | 52, 31–32, "tug", or "towing" | `:15069` |
| Military | 35 or "military" | `:15070` |
| Pleasure | 36–39 or "pleasure" | `:15071` |
| **Other / unknown** | none of the above (ShipType `0` or unmapped) | `:15072` |

**Unknown handling (Jun 12, 2026 fix, `:15074-15089`):** raw AIS position reports (message types 1/2/3) carry no ship type, so most live targets are `shipType = 0 → isOther`. These are shown whenever **any** vessel category toggle is on (`anyVesselCategoryOn`), otherwise no boats would paint at all. A vessel also passes a minimum-speed filter (`vesselFilter.minSpeed`, `:15093-15094`).

#### Satellites: TLE polling + SGP4 propagation

Satellites are unique: the pump fetches **orbital elements** once per cycle, but on-screen motion is computed **client-side every ~2.5 s** by propagating those elements — there is no per-frame network poll.

##### Fetch

`/api/oei/satellites?category=active&mode=registry&limit=<cap>` (`CREPDashboardClient.tsx:9621`). Rows are deduped by NORAD ID, preferring rows that carry raw TLE lines (`satelliteHasTle`, `:9507-9510, 9627-9633`). `initialSatelliteLoadDoneRef` flips true after the first fetch (`:9634`).

##### Propagation library (`lib/crep/sgp4-propagator.ts`)

`SGP4Propagator` wraps `satellite.js`:

- `extractOrbitalElements()` (`:356-379`) reads either raw TLE (`line1/line2` or `tle1/tle2`) or individual CelesTrak GP fields (`meanMotion`, `eccentricity`, `inclination`, `raAscNode`, `argPericenter`, `meanAnomaly`, `bstar`, `epoch`, `intlDesignator`), tolerating both camelCase and CelesTrak `UPPER_CASE` keys.
- `loadSatellites()` (`:167-225`) builds and **caches a `SatRec` per entity id**. It prefers raw TLE lines; if absent it synthesizes a TLE from GP elements via `buildTLEFromGP()` (`:60-141`), including correct epoch `YYDDD.DDDDDDDD` formatting, BSTAR exponential notation, and modulo-10 checksums (`tleChecksum`, `:144-152`). SGP4 init failures (decayed/debris objects) are skipped silently.
- `propagateAll(date)` (`:231-286`) runs SGP4 → ECI position/velocity → `eciToGeodetic` (using GMST from `gstime`) → lat/lng/alt_km/velocity_km_s, discarding NaN or sub-surface (`altitude_km < 0`) results.
- `propagateOrbitPath(id, start, minutes=90, step=1)` (`:297-330`) returns a `[lng,lat][]` ground track for ~1 LEO orbit, used for orbit lines.

##### Web Worker offload (perf-critical) — `lib/crep/sgp4-worker-client.ts`

To keep the main thread at 60 FPS with 15k+ satellites, SGP4 math runs **off the main thread** in a dedicated worker (`SGP4WorkerClient`, "Fix E — Apr 18, 2026"):

- Worker script is the static asset `/workers/sgp4.worker.js`, with `satellite.js` at `/workers/satellite.min.js` (so Next.js bundling can't strand them) (`sgp4-worker-client.ts:7-11, 47`).
- Singleton `getSGP4Worker()` (`:153-157`); `isSupported` is false on SSR / no-`Worker` / CSP-blocked / construction-throw (`:44-60`).
- Protocol: main thread posts `load` (only TLE-bearing sats, `:79-84`), `propagate` (with `atIso`, in-flight de-duped to one pending promise, `:90-98`), `clear`. Worker replies `ready` / `loaded` / `positions` / `error` (`:117-149`).

##### Animation controller (`lib/crep/satellite-animation.ts`)

A module-singleton rAF loop (no React dependency) drives the visible motion:

- **Tick interval `TICK_INTERVAL_MS = 2500`** (~1 visible Hz; 10 fps was found to "blink/jump" because per-step deltas were below MapLibre's interpolation threshold) (`:30-33, 147`).
- On each non-throttled tick it skips while the map is moving/zooming/rotating (`:158-161`), then either (a) requests a worker propagation when `useWorker` (de-duped via `workerPropagationInFlight`, `:165-181`), or (b) falls back to main-thread `propagator.propagateAll()` (`:182-201`). Positions are pushed straight into the MapLibre GeoJSON source **`crep-live-satellites`** via `setData` (`:176-179, 190-193`).
- **Orbit paths**: recomputed every `ORBIT_PATH_INTERVAL_MS = 60000` (60 s), for at most `MAX_ORBIT_PATHS = 200` sats, 90-minute span / 1-min step, split at the antimeridian, pushed to **`crep-live-satellite-orbits`** (`:35-48, 96-138, 197-228`). **Orbit paths only render on the main-thread fallback** — the worker doesn't compute tracks yet (`:194-196`).
- `startSatelliteAnimation()` tries the worker first and falls back to the main thread on `!isSupported` (`:240-291`); `updateSatelliteAnimation()` swaps the set without restarting (`:319-340`); `stopSatelliteAnimation()` clears but does not terminate the worker singleton (`:296-313`).

##### Wiring in the dashboard

The SGP4 effect (`CREPDashboardClient.tsx:16387-16434`) merges each satellite's top-level orbital fields **into `.properties`** (the propagator only reads `.properties.*`) before calling `startSatelliteAnimation` / `updateSatelliteAnimation`. In `earthStrictPerfMode` the rAF loop is disabled entirely — static markers only (`:16389-16398`). The loop is torn down on unmount (`:16437-16441`).

##### Approximate orbit-path fallback (`lib/crep/orbit-path.ts`)

A separate, **visualization-only** simplified circular-orbit model, `getOrbitPath(periodMin, inclinationDeg, lng0, lat0)` (`:33-80`), produces an 80-point ground track from period + inclination assuming Earth rotation 0.25°/min. It explicitly does **not** compute real positions (no precession/drag/perturbation) and is used only where full SGP4 tracks aren't available; the dashboard's live satellite motion uses the SGP4 path above.

---

**Authoritative file references:** `app/dashboard/crep/CREPDashboardClient.tsx` (mover pump `:9428-9689`, aircraft classifier `:14989-15030`, vessel classifier `:15055-15099`, helicopter enrichment `:15242-15262`, satellite wiring `:16387-16434`, disabled WS effect `:16443-16496`); `lib/crep/streaming/entity-websocket-client.ts`; `lib/crep/registries/aircraft-registry.ts`; `lib/crep/registries/vessel-registry.ts`; `lib/crep/sgp4-propagator.ts`; `lib/crep/sgp4-worker-client.ts`; `lib/crep/satellite-animation.ts`; `lib/crep/orbit-path.ts`; `lib/crep/entity-merge.ts`.

---

## 14. Cameras / Eagle Eye

### Eagle Eye — Cameras & Live Video Intelligence

Eagle Eye is CREP's dual-plane video-intelligence subsystem: a **permanent camera plane** (fixed-location CCTV / webcam registry) and an **ephemeral event plane** (short-lived social/live-stream sightings). This section documents the cameras domain end-to-end: the map overlay, the 6-preview viewport grid, the full video-wall player, every provider/connector, HLS-vs-snapshot resolution, the image/snapshot proxies, and camera health/iconography.

#### 1. Architecture overview

| Concern | File | Role |
|---|---|---|
| Map overlay (both planes) | `components/crep/layers/eagle-eye-overlay.tsx` | Adds MapLibre sources/layers, fetches & paints cameras + events, wires click/hover events |
| Map glyph + layer defs | `lib/crep/eagle-camera-map-icon.ts` | Canvas-drawn neon camera icon, hit/glow/icon/label layer definitions |
| Camera filtering/normalization | `lib/crep/eagle-camera-normalize.ts` | Drops non-camera sensors, coordinate overrides, displayability gate |
| 6-preview thumbnail grid | `components/crep/eagle-eye/EagleEyeThumbnailGrid.tsx` | Bottom-panel grid of up to 6 live tiles, click-to-open |
| Per-tile live player | `components/crep/eagle-eye/eagle-live-stream.tsx` | Stream resolution + HLS/MJPEG/snapshot/iframe preview players |
| Full video-wall widget | `components/crep/eagle-eye/VideoWallWidget.tsx` | Floating draggable panel, universal player for any stream type |
| Viewport prefetch hook | `lib/crep/use-viewport-eagle-prefetch.ts` | Debounced viewport-scoped prefetch feeding the grid |
| Viewport source loader | `lib/crep/eagle-viewport-sources.ts` | Baked-then-API tiered load, viewport filtering |
| Caltrans HLS resolver | `lib/crep/caltrans-hls-resolve.ts` | Resolves Caltrans m3u8 from district JSON + proxied snapshot |
| Source registry API | `app/api/eagle/sources/route.ts` | MINDEX + baked seeds + live connector fan-out |
| Per-source stream resolver | `app/api/eagle/stream/[sourceId]/route.ts` | Resolves one source → playable URL + stream_type |
| HLS manifest/segment proxy | `app/api/eagle/hls-proxy/route.ts` | Same-origin CORS proxy with manifest rewriting |
| Still-image proxy | `app/api/eagle/cam-image/route.ts` | Same-origin JPEG proxy (CORS / TLS / mixed-content fixes) |
| Headless snapshot service | `app/api/eagle/cam-snapshot/route.ts` | Playwright Chromium screenshots of viewer pages |
| YouTube embed resolver | `app/api/eagle/youtube-embed/route.ts` | Resolves YT URLs → embeddable iframe URL |
| Public webcam connector | `app/api/eagle/connectors/public-webcams/route.ts` | Windy/EarthCam/NPS/USGS/static seed |
| State DOT CCTV connector | `app/api/eagle/connectors/state-dot-cctv/route.ts` | Caltrans/WSDOT/FDOT/NYSDOT/NYCTMC/TxDOT/NDOT/GA-PA-WI 511 |

The overlay paints map pins; clicking a pin dispatches a `crep:eagle:camera-click` (permanent) or `crep:eagle:event-click` (ephemeral) `CustomEvent`. The `VideoWallWidget` (mounted separately) subscribes to those events and opens the player panel. The `EagleEyeThumbnailGrid` is an independent UI element that resolves and previews up to 6 in-viewport cameras directly.

---

#### 2. Toggles, default on/off state, and provider sub-filters

The overlay receives an `enabled: EagleEyeEnabled` prop (`eagle-eye-overlay.tsx:46-62`). The structure has two master toggles and per-provider sub-toggles:

| Toggle | Default semantics | Covers |
|---|---|---|
| `eagleEyeCameras` | Master switch — **must be explicitly true** to paint the permanent plane (`eagle-eye-overlay.tsx:240`) | All permanent cameras |
| `eagleEyeEvents` | Master switch — must be true to paint the ephemeral plane (`:792`) | All ephemeral events |
| `eagleEyeShinobi` | **On unless `=== false`** (`:295`) | provider `shinobi` |
| `eagleEye511Traffic` | **On unless `=== false`** (`:297-304`) | `511*`, `nysdot`, `nyctmc`, `caltrans`, `wsdot`, `fdot`, `txdot` |
| `eagleEyeWeatherCams` | On unless `=== false` (`:305`) | `windy` |
| `eagleEyeWebcams` | On unless `=== false` (`:306`) | `earthcam`, `webcamtaxi`, `hdontap` |
| `eagleEyeNpsUsgs` | On unless `=== false` (`:307`) | `nps`, `usgs` |
| `eagleEyeYoutubeLive` | On unless `=== false` (`:825`) | YouTube Live events |
| `eagleEyeBluesky` | On unless `=== false` (`:828`) | Bluesky video events |
| `eagleEyeMastodon` | On unless `=== false` (`:831`) | Mastodon video events |
| `eagleEyeTwitch` | declared in interface (`:61`) but **not consumed** in this overlay | (reserved) |

**Key behavior:** sub-toggles default *on* — the provider filter `providerFilter(p)` (`:294-309`) only hides a provider when its sub-toggle is strictly `false`. Any provider not matched by a sub-toggle (e.g. `ndot`, `ga511`, `pa511`, `wi511`, `hpwren`, `alertwildfire`, `surfline`, `youtube_live`, `unifi-protect`) falls through to `return true` and is always shown when `eagleEyeCameras` is on.

---

#### 3. Permanent camera plane — load pipeline (`eagle-eye-overlay.tsx:212-786`)

##### 3.1 Source layering (instant → delta)
1. **Baked registry/seed paint (instant).** On first mount, `paintBakedRegistry()` (`:506`) loads 7 GeoJSON seed files via `loadBakedCameraSeedSources()` (`:123-174`), merged by id (later files win on id conflict):
   - `eagle-cameras-registry.geojson` (nightly bake, ~3,900 cams)
   - `eagle-cameras-manual-seed.geojson` (hand-curated: Surfline/HPWREN/Scripps/NOAA/EarthCam/Skyline/CBP/NPS/Border Field/Port of SD)
   - `eagle-cameras-caltrans-san-diego-seed.geojson`
   - `eagle-cameras-border-supplement.geojson`
   - `eagle-cameras-nyc-dc-seed.geojson` (NYSDOT bridges, EarthCam landmarks, VDOT 511, MDOT CHART, White House/Capitol)
   - `eagle-cameras-vegas-seed.geojson` (Strip/Fremont/Bellagio/Sphere/Hoover Dam/Red Rock/Harry Reid/NDOT I-15/US-95/I-215)
   - `eagle-cameras-deployment-sites-seed.geojson` (Yosemite/Zion/Yellowstone NPS, Mendocino AlertWildfire, SpaceX/Yellowstone YouTube Live, South Padre EarthCam)

   All seeds are cache-busted with `?v=20260608-vegas-camera-data-fix` (`EAGLE_CAMERA_SEED_VERSION`, `:102`) and fetched `cache: "force-cache"`.
2. **API delta.** After the baked paint, `fetchAndPaint()` (`:602-746`) calls `/api/eagle/sources` to pick up new cams, `stream_url` changes, and offline status. `mergeFeatureCollections()` (`:341`) unions pending FC + baked FC + API FC by id.

> **Important Earth-Simulator carve-out:** `isEarthSimulatorSurface` (`:209-210`, true on `/natureos/earth-simulator`) **disables the baked-registry instant path** — the gate at `:634` is `!isEarthSimulatorSurface && !loadedRef.current.cams && await paintBakedRegistry(...)`. On the Earth Simulator surface, cameras come from the API only, and the per-zoom paint cap is far lower (see §3.4).

> **Dead code note:** `paintBakedRegistry()` returns at `:526`; the entire second fan-out block (`:527-595`) after the `return true` is unreachable. The live path is the `loadBakedCameraSeedSources()` cache above it.

##### 3.2 API query construction (`:640-648`)
- `fastMode = !loadedRef.current.cams && !bakedPainted` (only when baked path skipped, e.g. Earth Simulator first mount).
- `isTabletViewport = innerWidth <= 1100 || innerHeight <= 820`.
- `limit = isTabletViewport ? 96 : 180`.
- `live = (fastMode || isTabletViewport) ? "0" : "1"`.
- `bbox` set from the live map bounds; `fast=1` added in `fastMode`.
- In `fastMode`, a follow-up `fetchAndPaint()` is scheduled after **4 s** (`:649-654`) to upgrade to the full set.
- Fetch is `AbortController`-guarded with a **10 s** timeout (`:658`).

##### 3.3 Fetch gating & dedupe
- A `requestKey = "{bboxKey}|z{zoom*10/10}"` (`:617`) dedupes: same in-flight key returns (`:620`); the same key within **12 s** with cams already loaded returns (`:621`).
- Background-tab guard: returns early if `document.hidden` (`:604`).
- Refresh triggers: `moveend` + `zoomend` (debounced **220 ms** via `onCameraViewportSettled`, `:749-758`) plus a **5-minute** interval (`camsTimerRef`, `:760-762`).

##### 3.4 Zoom / LOD behavior
- **Camera plane visible only at zoom ≥ 7.** `cameraLodVisible = mapZoom >= 7` (`:208`); below that all four layers are set to `visibility: none` (`:610-613`, `:245-247`). The MapLibre layers themselves carry `minzoom` (hit `7`, glow/icon `8`, label `13` — see §6).
- **Per-zoom paint cap** (`cameraPaintLimitForZoom`, `:267-274`):
  - Non-Earth-Simulator surfaces: **260**.
  - Earth Simulator: z≥14 → 120, z≥12 → 104, z≥10 → 88, z≥8 → 72, else **48**.
- When features exceed the cap, `sortNearestToBboxCenter()` (`:275-292`) keeps the cameras nearest the viewport center (antimeridian-aware longitude delta).

##### 3.5 Provider color
All permanent providers render in one neon cyan `#00f3ff` (`VIDEO_CAMERA_COLOR` / `EAGLE_CAMERA_NEON`) via `PROVIDER_COLOR` (`:80-98`) so cameras read as CCTV, not power plants (`#fbbf24`) or cell towers (`#c084fc`). A per-feature `color` property is set but the icon layer uses status-based icon swapping rather than per-feature tint.

##### 3.6 Counts broadcast
After every paint, `broadcastCameraCounts()` sets `window.__crep_eagle_camera_counts` and dispatches `crep:eagle:camera-counts` (`{ total, by_provider }`, `:362-370`) for the Intel Feed panel.

---

#### 4. Ephemeral event plane (`eagle-eye-overlay.tsx:788-1074`)

Although "events," the cameras domain shares the click/widget plumbing. Polls **every 60 s** (`:1063`), skips while `document.hidden` (`:811`). Each 60 s tick fans out 4 parallel fetches:

| Source | Endpoint | Default confidence | Gate |
|---|---|---|---|
| MINDEX ephemeral | `/api/eagle/events?hoursBack={n}&limit={120\|260}&bbox=` | `inference_confidence ?? 0.5` | always |
| YouTube Live | `/api/oei/youtube-live?bbox=&maxResults=50` | `location_confidence ?? 0.45` | `eagleEyeYoutubeLive !== false` **and** bbox present |
| Bluesky | `/api/eagle/connectors/bluesky?bbox=` | `inference_confidence ?? 0.3` | `eagleEyeBluesky !== false` |
| Mastodon | `/api/eagle/connectors/mastodon?bbox=` | `inference_confidence ?? 0.3` | `eagleEyeMastodon !== false` |

- `hoursBack` reads `window.__crep_eagle_time_window?.hoursBack ?? 6` (`:820`).
- `eventLimit` = 120 (tablet) / 260 (desktop) (`:822`).
- **LOD:** event layers have `minzoom: 3` (pulse + core, `:924`/`:937`); labels `minzoom: 11` (`:955`).
- **Confidence color ramp** (core dot, `:940-949`): ≥0.8 → `#facc15` (native/bright yellow), ≥0.5 → `#f59e0b` (platform/amber), else `#fb923c` (orange, OCR/visual).
- Clicking a core dot dispatches `crep:eagle:event-click` with `embed_url`, `thumbnail`, `confidence`, etc. (`:971-992`).
- Counts: `window.__crep_eagle_event_counts` + `crep:eagle:event-counts` (`:1047-1058`).

---

#### 5. Camera click → widget event contract

`onEagleCamClick` (`:426-456`) and the duplicate handler at `:702-726`:
- De-dupes rapid double-clicks: same id within **450 ms** is ignored (`window.__crepLastCameraClick`, `:435-437`).
- Calls `window.__crep_selectAsset({ type:"camera", id, name, lat, lng, properties })`.
- Dispatches `crep:eagle:camera-click` with the full feature `properties` spread (id/provider/kind/name/stream_url/embed_url/media_url/status) plus name/lat/lng.

Hover (`hoverCamera`, `:375-417`) suppresses while the map is moving/zooming/rotating, throttles to same key within **350 ms**, and calls `window.__crep_hoverAsset`.

`VideoWallWidget` listens on `crep:eagle:camera-click`, `crep:camera:click`, and `crep:eagle:event-click` (`VideoWallWidget.tsx:1234-1241`). Closes on `crep:eagle:close`, Escape, or a click on the map canvas outside the widget (`:1244-1265`, with a 300 ms open-grace window).

---

#### 6. Map icons & camera health (`lib/crep/eagle-camera-map-icon.ts`)

Two 128×128 canvas-drawn icons registered at `pixelRatio: 2` (`ensureEagleCameraMapIcon`, `:101-110`):
- `crep-eagle-camera-neon` — cyan `#00f3ff` body + radial glow.
- `crep-eagle-camera-unavailable` — red `#ef4444` body + red glow.

Four layers per source (prefix `crep-eagle-cams`):

| Layer | id | type | minzoom | Behavior |
|---|---|---|---|---|
| Hit target | `crep-eagle-cams-hit` | circle | 7 | Invisible (`opacity 0.001`), radius interpolated z7→10px … z16→30px. Easier tap than cell-tower dots. |
| Glow halo | `crep-eagle-cams-glow` | circle | 8 | Radius z8→2px … z16→10px. Color/opacity status-driven (red 0.42 if unavailable, else cyan 0.16). `blur 0.85`. |
| Icon | `crep-eagle-cams-icon` | symbol | 8 | `icon-image` switches neon↔unavailable on status; `icon-size` z8→0.1 … z16→0.3; `icon-allow-overlap` + `icon-ignore-placement` true. |
| Label | `crep-eagle-cams-label` | symbol | 13 | Uppercased `provider`; cyan `#e0fdff` (or red `#fecaca` if unavailable); collision-managed (`text-optional`). |

**Health/status semantics:** the status expression is `coalesce(get("status"), get("source_status"), "")` (`:139`,`:176`,`:207`). Any of `offline`, `unavailable`, `retired`, `disabled`, `blocked`, `deprecated`, `temporarily_unavailable` flips the icon to red and label to red. Click layers are all four ids (`EAGLE_CAMERA_CLICK_LAYER_IDS`, `:33-36,237`).

---

#### 7. Camera normalization & displayability (`lib/crep/eagle-camera-normalize.ts`)

`filterEagleVideoSources()` (`:209-213`) maps each source through `normalizeEagleCameraSource` (coordinate overrides) then `isDisplayableEagleCamera`. Applied in the overlay (`paintFromSources`, `:310`), the sources API, and the viewport loader.

**`isDisplayableEagleCamera` gate (`:180-195`):**
1. Reject non-finite lat/lng.
2. Reject `isUnavailableSource` (status in unavailable set, or id in `KNOWN_UNAVAILABLE_SOURCE_IDS`) **unless** the id is in `LOCATION_CONTEXT_SOURCE_IDS` (keep the pin for location context even when offline).
3. Reject `isSensorOnly`.
4. `STREAM_REQUIRED_PROVIDERS` (`nysdot`, `port-of-sd`, `usgs`, `webcamtaxi`) require `stream_url || media_url` (direct media).
5. `INFO_ONLY_PROVIDERS` (`cbp`, `parks-ca`) require direct media.
6. `KNOWN_CAMERA_PROVIDERS` (the full allowlist below) → always show.
7. Unknown providers → require any playable url.

**Sensor exclusion (`:158-164`):** providers `sdapcd`, `ibwc`, `project_oyster`, `sandiego_deh`, `noaa-coops`, `noaa_trnerr`, `navy`; any `noaa*` without a playable url; id prefixes `po-tjne-`, `ibwc-`, `noaa-ndbc-`, `noaa-cdip-`, `sdapcd-`, `beach-`.

**`KNOWN_CAMERA_PROVIDERS` (`:48-77`):** caltrans, shinobi, earthcam, webcamtaxi, hdontap, windy, nps, usgs, alertwildfire, hpwren, surfline, scripps, port-of-sd, skylinewebcams, 511, 511ga, 511sf, nysdot, nyctmc, ndot, wsdot, fdot, txdot, youtube_live, unifi-protect, static-seed, public-webcam, ipcamlive.

**`COORDINATE_OVERRIDES` (`:135-147`):** hand-verified US-side/on-land coords for `cbp-otay-mesa-poe-ref`, `parks-ca-border-field`, `surfline-imperial-beach-pier`, `earthcam-imperial-beach-pier`, and three Caltrans D11 seeds.

**`KNOWN_UNAVAILABLE_SOURCE_IDS` (`:101-115`):** Vegas YouTube live IDs, several EarthCam SD/IB ids, NPS Cabrillo, four Caltrans D11 SR-75 cams, Scripps pier. **`LOCATION_CONTEXT_SOURCE_IDS` (`:117-132`)** overlaps these so the pins persist as location markers even when offline.

---

#### 8. The 6-preview viewport grid (`EagleEyeThumbnailGrid.tsx`)

A 3-column grid of `limit` (default **6**) tiles shown in the CREP bottom panel.

##### 8.1 Data source
- If `prefetchedSources` is passed (the normal path, fed by `useViewportEaglePrefetch`), it uses those directly (`useParentPrefetch`, `:89`).
- Otherwise it self-loads via `loadViewportEagleSources(mapBounds, limit, onUpdate, signal)` keyed on `"{revisionKey}:{bboxKey}"`, gated on `mapBounds && revisionKey && assetsReady` (`:117-151`). Generation counter (`loadGen`) guards stale async.

##### 8.2 Preview priority sort (`previewPriority`, `:27-41`)
Lower value = higher slot priority. Sources are sorted ascending before slotting:
| Priority | Condition |
|---|---|
| 0 | URL has `.m3u8` / `/mjpeg` / `/whep` (direct live) |
| 1 | youtube / youtu.be / hdontap / ipcamlive / webcamtaxi |
| 2 | earthcam with stream_url/media_url |
| 3 | surfline with stream_url/media_url |
| 25 | earthcam/surfline viewer-only |
| 30 | `/api/eagle/cam-image` or `.jpg/.png/.webp` still |
| 40 | `/api/eagle/cam-snapshot` or alertcalifornia/alertwildfire |
| 45 | provider caltrans or `*dot*` |
| 50 | fallback |
| 100 | status unavailable/offline (sinks to bottom) |

##### 8.3 Tile rendering
- Each slot renders `<EagleLivePreviewTile source deferMs={index * 900} />` — tiles stagger their stream resolution by **900 ms × slot index** to avoid a thundering herd (`:215`).
- Empty slots show a spinner (loading) or "—" (`:228-234`).
- Click opens `openEagleCamera(source, onFlyTo)` (`:61-78`): dispatches `crep:eagle:camera-click` with the source's URLs, then after **1.2 s** calls `onFlyTo(lng, lat, 12.5)` to fly the map to the camera at zoom 12.5. Click de-dupe: same id within **500 ms** ignored (`:155-157`).
- Status label (`:168-173`): "loading…", "{n} · updating…", or "{n} in view".

---

#### 9. Viewport prefetch (`use-viewport-eagle-prefetch.ts`) & source loader (`eagle-viewport-sources.ts`)

##### 9.1 Prefetch hook
- `shouldPrefetch = mapBounds && assetsReady && mapZoom >= 7` (`:44`) — **prefetch only at zoom ≥ 7**, matching the camera LOD.
- Default `limit = 12`.
- Reads a per-viewport cache (`getViewportEagleCache`) for instant hydration (`:50-53,107`).
- A `revisionKey` is recomputed only on *significant* viewport change (`isSignificantViewportChange`, `:66-77`), preventing refetch on tiny pans.
- Calls `loadViewportEagleSources`, commits new sources only when materially different (`eagleSourcesEqual` compares id, lat/lng to 1e-6, and the three URLs, `:19-36`), and writes back to the viewport cache (`:121`).
- Returns `{ sources, revisionKey, loading, refreshing, effectiveBounds }`.

##### 9.2 Tiered loader (`loadViewportEagleSources`, `:189-235`)
Three phases via `onUpdate(sources, phase)`:
1. **`instant`** — `loadBakedEagleCameras()` (the same 7 seed files, fetched client-side `force-cache` with `?v=20260608-vegas-camera-data-fix`, `:22-32,117-140`) filtered to viewport.
2. **`fast`** — `/api/eagle/sources?bbox=&limit=max(limit,24)&fast=1&live=0`.
3. **`full`** — `/api/eagle/sources?bbox=&limit=max(limit,48)&live=0`.

For a **focused viewport** (`lngSpan ≤ 5 && latSpan ≤ 5`, `:204`) it runs `fast` and only runs `full` if `fast` returned nothing; otherwise it runs both. `filterSourcesInViewport` (`:92-115`) sorts nearest-to-center (antimeridian-aware) and slices to `limit`. YouTube embed URLs are pre-normalized in `featureToSource` (`:47-50`).

---

#### 10. Per-tile live player & stream resolution (`eagle-live-stream.tsx`)

##### 10.1 `resolveEagleLiveStream(source, {allowResolver})` — the client resolver (`:275-314`)
Ordered resolution:
1. `pickLiveFromUrls(stream_url, embed_url)` (`:191-208`): direct `.m3u8`→`hls` (proxied via `proxiedDotHlsUrl`), `/whep/`→`webrtc`, `/mjpeg/`→`mjpeg`; then non-YT video-embed patterns → `iframe`.
2. `resolveYouTubeFromUrls` (`:210-230`): YT URLs → `/api/eagle/youtube-embed`, falling back to sync normalize → `iframe`.
3. If `allowResolver !== false` **and** media_url is a still **and** `shouldResolveBeforeStill(source)` (caltrans/earthcam/nysdot/`511*` or matching host regex, `:173-185`) → call the server resolver `resolveEagleLiveStreamFromApi(id)` first (60 s TTL cache + in-flight dedupe, 6 s timeout, `:232-273`).
4. Still media_url → `mjpeg` (auto-refresh `<img>`).
5. Snapshot-viewer hosts (alertcalifornia/alertwildfire/hpwren/surfline/skyline/webcamtaxi/windy/caltrans, `:146-157`) and not CBP → `snapshot`.
6. Otherwise the server resolver, then non-still embed_url → `iframe`.

`STILL_IMAGE_PROXY_HOSTS` (`:40-73`) determines which still-image hosts are rewritten to `/api/eagle/cam-image?url=` by `normalizeEagleStillImageUrl` (`:100-122`); a `/api/eagle/cam-snapshot` URL pointing at a still upstream is also rewritten to `cam-image`.

##### 10.2 Preview players
- `HlsLivePlayer` (`:327-480`): native HLS if `canPlayType('application/vnd.apple.mpegurl')`, else dynamic `import("hls.js")`. `preview` mode uses a tighter buffer config; falls back to `MjpegLivePlayer(fallbackUrl)` after `fallbackAfterMs` (preview **12 s**, full **5.5 s**) or on fatal error. Seeks to live edge via `seekVideoToLiveEdge` (`hls-live-config.ts`), drift timer every 12 s (non-preview).
- `SnapshotLivePlayer` (`:504-600`): selector-chain headless snapshots (see §13). `snapshotSelectorChain` (`:482-488`): caltrans/`*dot*` → `["img","video","body"]`, earthcam → `["video","img","canvas","body"]`, surfline → `["video","canvas","img","body"]`, default `["video","img","canvas","body"]`. Refresh **20 s** (earthcam/body **30 s**) + stable jitter (`:498-502`); load watchdog 12 s (18 s fullpage); skips refresh while `document.hidden`.
- `MjpegLivePlayer` (`:602-675`): long-lived `<img>`; auto-refreshes stills/cam-image/cam-snapshot every `refreshIntervalMs` (preview **60 s**, full **12 s**); max 3 retries with backoff.
- `EagleLivePreviewTile` (`:737-845`): resolves on mount (deferred by `deferMs`); shows spinner while loading, "Live stream / Resolving HD feed…" on error, "Open player" for snapshot, the iframe/HLS for video. For HLS tiles, passes a still `fallbackUrl` from `thumbnail_url || media_url`.

---

#### 11. Full video-wall widget (`VideoWallWidget.tsx`)

A floating panel fixed bottom-right (`bottom-4 right-4 w-[420px] h-[300px]`), minimizable (`w-64 h-16`) and maximizable (`inset-4`), `z-[10000]` (`:1544-1554`). Header shows name, provider, lat/lng (6dp), and (for events) confidence %.

##### 11.1 Click → ActiveFeed (`onCamera`, `:1181-1219`)
Builds a `directEmbed` *only* from genuinely-playable URLs and never from "viewer pages" (`.htm`, `cwwp2.dot.ca.gov/vm/`, `bwt.cbp.gov`). For earthcam/skylinewebcams/surfline (non-YT, non-HLS) it **forces** server resolution (`resolveViaStreamApi`, `:1194-1197`) instead of trusting the embed. `sourceStatus` is forced to `temporarily_unavailable` for `KNOWN_UNAVAILABLE_FEED_IDS` ids.

##### 11.2 Resolution cascade (`useEffect`, `:1269-1540`)
Sequenced and `resolveSeq`-guarded:
1. **Unavailable short-circuit:** if `isUnavailableFeedStatus(sourceStatus)`, `isKnownUnavailableFeedId(id)`, or `isTemporarilyUnplayableProvider(provider)` (`navy`) → render error tile.
2. **Live wins:** if `directEmbed` is HLS/WHEP/MJPEG → set that stream_type; Caltrans gets a proxied JPEG snapshot fallback via `proxiedCaltransSnapshot` (`:375-388`).
3. **Surfline:** `surf-report/{slug}/{id}` rewritten to `embed-cam/{id}` iframe (`deriveSurflineEmbed`, `:1327-1332`).
4. **YouTube:** any YT url → iframe (sync-normalized).
5. **Still media_url** (non-caltrans) → `snapshot`.
6. **webcamtaxi/windy** with embed → `snapshot`.
7. Any other `directEmbed` → `pickStreamType`.
8. **Server resolver fallback** (`:1439-1537`): `resolveStream(id, {embed_url, media_url})` hits `/api/eagle/stream/{id}` (12 s timeout). Handles snapshot/live/error responses; for earthcam an error is surfaced rather than guessed; else falls to `resolveEagleLiveStream`; finally falls to the still media_url.

##### 11.3 Player components by `stream_type` (`:1628-1657`)
- **hls** → `HlsWithSnapshotFallback` (`:413-515`): for `provider==="caltrans"` uses `stablePlayback` HLS (no snapshot competition, 30 s no-frame timeout). For other providers it shows the snapshot poster until the first HLS frame arrives (`onFrame`), then crossfades to video; on HLS failure (`onFallback`) it pins the snapshot. `HlsPlayer` (`:166-373`) dynamic-imports hls.js, recovers once on network/media error, shows an error overlay only on fatal failure. `proxiedDotHlsUrl` (`:390-411`) routes Caltrans/EarthCam/HDOnTap/Nevada-ITS/NYSDOT m3u8 through `/api/eagle/hls-proxy`.
- **webrtc** → `WebRTCPlayer` (`:517-559`): WHEP POST handshake, STUN `stun.l.google.com:19302`, recvonly video+audio.
- **iframe** → `IframeEmbed` (`:702-788`): YouTube→`YouTubeEmbedResolver`; whitelisted player URLs (`VIDEO_EMBED_PATTERNS`, `:573-598`)→iframe; else `NoStreamStatusTile`. `INFO_ONLY_PROVIDERS` is **empty** (`:614`) and `headlessSnapshotsEnabled = false` (`:781`), so the in-widget `SnapshotProxyVideo` path is currently disabled here.
- **mjpeg** → `MjpegStream` (`:944-978`): continuous `<img>`, 3 retries.
- **snapshot** → `SnapshotStream` (`:980-1131`): auto-refresh JPEG (20 s, earthcam 30 s, + jitter); rewrites windy/webcamtaxi/skyline viewer pages to `SnapshotProxyVideo`; on failure shows provider-specific copy (e.g. NYSDOT 511ny upstream-404 message). **No external links ever** (per Apr 21, 2026 policy — the `embed_url` link blocks are `false &&` guarded).

`NoStreamStatusTile` (`:619-635`) is the universal terminal failure card — keeps the user in CREP, keeps the map pin, no outbound link.

---

#### 12. Source registry API (`app/api/eagle/sources/route.ts`)

`GET /api/eagle/sources` (`:357-503`). Runtime `nodejs`, `force-dynamic`.

**Query params:** `bbox` (or `west/south/east/north`), `kind`, `provider`, `limit` (capped 180 for map-metadata requests, else 50000/50000), `live` (`1` to allow live fan-out), `fast` (`1` for fast first paint).

**Source precedence:**
1. **`fast=1` + skipLive** (`:390-424`): returns baked seeds only (`fromBakedSeeds`, `:171-175`), filtered by `filterEagleVideoSources`. `Cache-Control: s-maxage=30, swr=120`, `X-Source: baked-eagle-fast`.
2. Otherwise: `fromMindex` (MINDEX `eagle_video_sources` layer, 2 s timeout, `:177-242`) merged with baked seeds (baked is the base, MINDEX/live win on id, `:350-355`).
3. If not skipLive and not fast: `fromStateDotCctv` (always refresh state DOT, 18 s, `:316-348`) merged in.
4. If MINDEX cold (0 rows): `fromLiveConnectors` (`:247-313`) fans out — **FAST tier** (`public-webcams`, `traffic-511`, `border-crossing`, `webcamtaxi`) always; **SLOW tier** (`shinobi`, `state-dot-cctv`) only when `!fast`; each capped 18 s via `Promise.allSettled`.

**Live fan-out gating (`:374-385`):** `live=1` **and** not a "map-metadata request" (`bbox && !kind && !provider`) **and** `EAGLE_WEBSITE_ALLOW_DIRECT_LIVE_FANOUT !== "0"`. So plain bbox map polling never triggers the heavy fan-out (it relies on MINDEX + baked).

**Env:** `MINDEX_API_URL`/`NEXT_PUBLIC_MINDEX_API_URL` (default `http://192.168.0.189:8000`), `MINDEX_INTERNAL_TOKEN(S)`, `MINDEX_API_KEY`, `EAGLE_CONNECTOR_FETCH_BASE`/`EAGLE_INTERNAL_ORIGIN` (loopback base for self-fetches), `MIN_SOURCES = 1`.

Response: `{ source, total, by_provider, by_kind, sources[], generatedAt, baked_seed_used, live_fanout_used, note }`. `Cache-Control: s-maxage=30, swr=120`.

---

#### 13. Per-source stream resolver (`app/api/eagle/stream/[sourceId]/route.ts`)

`GET /api/eagle/stream/{sourceId}?embed_url=&media_url=`. Returns `{ id, provider, kind, stream_url|embed_url, snapshot_url?, stream_type }` where `stream_type ∈ hls|webrtc|iframe|mjpeg|snapshot`.

**Source lookup order (`:617-635`):** baked seed index → MINDEX by-id (`/eagle/video-sources/{id}`, 4 s) → tight-bbox coord-hinted id (`{prefix}-{lat},{lng}`, 3 s) → global 60 s MINDEX bbox cache. If `embed_url`/`media_url` query hints are present, those skip the lookups. `SOURCE_ID_ALIASES` maps one legacy id. **404** if no source and no hints.

**Provider inference (`:669-686`)** from explicit provider, then URL host patterns, then id prefixes (caltrans/surfline/ndot/navy/nysdot/nyctmc/youtube/hdontap/windy/skyline/webcamtaxi/hpwren/alertwildfire/nps/usgs).

**Availability:** unavailable status (when provider can't revalidate) or `navy` → **503**. `providerCanRevalidate` set: caltrans, earthcam, hdontap, ndot, nysdot, nyctmc, skylinewebcams, surfline, youtube_live (`:693-703`).

**Provider-specific resolution:**
| Provider | Behavior |
|---|---|
| **caltrans** | `resolveCaltransHls` (district JSON → m3u8); else proxied JPEG snapshot; 503 if known-unavailable |
| **ndot** | 503 unless HLS or proxied still available |
| **nysdot** | `resolveNysdotHls` via `511ny.org/api/getcameras` → SkyVDN m3u8 |
| **earthcam** | YouTube fallback map; else `resolveEarthCamHls` (scrapes m3u8 from page, scored by landmark hints, probed); else YT fallback; else 503 |
| **hdontap** | `resolveHdontapHls` (base64 backend lookup) |
| **skylinewebcams** | scrape `videoId`→YouTube iframe, or `cdn.skylinewebcams.com/live*.jpg`→snapshot; else 503 |
| **surfline** | `deriveSurflineEmbed`→embed-cam iframe (reachability-checked); else HDOnTap m3u8 fallback page; else iframe fallback map; else 503 |
| **shinobi** | m3u8 direct or MediaMTX `/shinobi/{id}/index.m3u8` |
| **unifi-protect / rtsp://** | MediaMTX WHEP webrtc |
| **youtube_live** (direct) | normalized embed iframe |

Resolved HLS is wrapped in `/api/eagle/hls-proxy?url=` when `shouldProxyHls` matches (caltrans/earthcam/hdontap/ndot/nysdot or host patterns, `:585-599`). `MEDIAMTX_URL` default `https://media.mycosoft.com`. `EARTHCAM_HLS_CACHE_MS = 90 s` (in-flight deduped).

---

#### 14. HLS proxy (`app/api/eagle/hls-proxy/route.ts`)

Same-origin manifest+segment proxy bypassing upstream CORS. **Allowlist (`:10-22`):** `cwwp2.dot.ca.gov`, `wzmedia.dot.ca.gov`, `nysdot.skyvdn.com` (+ suffix), `media.mycosoft.com`, `cams.cdn-surfline.com`, `hpwren.ucsd.edu`, `live.hdontap.com`, `d1wse1.its.nv.gov` (+ `.its.nv.gov` suffix), and `videos-{n}.earthcam.com` (regex). Non-allowlisted host → **403**.

- Manifests (`.m3u8` path or `mpegurl` content-type) are rewritten line-by-line so every segment/sub-manifest URL is re-proxied through the same route (`:29-44`).
- EarthCam hosts get `Referer/Origin: earthcam.com`; HDOnTap gets `portal.hdontap.com` (`:73-74`).
- Timeouts: manifest 5 s, segments 10 s; non-manifest gets one 250 ms retry. `Cache-Control: no-store`.

---

#### 15. Cam-image proxy (`app/api/eagle/cam-image/route.ts`)

Same-origin still-JPEG proxy fixing CORS / mixed-content / expired-TLS. **Allowlist (`:30-79`):** HPWREN, firemap.sdsc, AlertCalifornia, AlertWildfire, NPS, USGS (volcanoes/hvo-api), earthcam, skylinewebcams CDN, camsecure, surfline (+CDN), and state DOT image hosts — 511ny.org, wsdot.wa.gov, fl511.com, drivetexas.org, its.dot.ny.gov, cwwp2.dot.ca.gov, dot.ny.gov, 511va.org, chart.maryland.gov, ddot.dc.gov, webcams.nyctmc.org, nyctmc.org, MTA/Amtrak. Non-allowlisted → **403**.

- `LENIENT_TLS_HOSTS` (HPWREN): rewrites `https://`→`http://` to dodge the expired cert (`:82-116`).
- 4.5 s timeout. Rejects non-`image/*` / non-`multipart` content-types (catches HTML error pages) with **502**. `Cache-Control: no-store`.

---

#### 16. Headless snapshot service (`app/api/eagle/cam-snapshot/route.ts`)

Playwright-Chromium screenshots of viewer pages that block iframing but render a `<video>`/`<img>` element. `GET ?url=&selector=&wait_ms=&mode=element|fullpage`. `maxDuration = 30`.

- **Allowlist** (`:49-92`): AlertCalifornia/AlertWildfire, HPWREN, Surfline (+CDN), EarthCam, HDOnTap, Skyline, Webcamtaxi, NPS, USGS, Windy, state DOTs (cwwp2/wsdot/fl511/511ny/drivetexas), ports (Rotterdam/LA/Panama), resorts/zoos/aquariums (Mammoth/Vail/Northstar/Whistler/SD Zoo/Smithsonian/Monterey Bay/explore.org/africam), airports (SFO/JFK), Pikes Peak. Non-allowlisted → **403**.
- **Direct-still fast path:** if the URL is itself a still image, fetches directly (`fetchDirectImage` → Node `https.Agent({rejectUnauthorized:false})` fallback for redirects/bad certs, `:183-247`).
- **Element mode:** waits up to 2.5 s for the selector, screenshots that element (JPEG q80); selector miss → returns null so the client advances the selector chain. **Fullpage mode:** screenshots viewport (q75) even if navigation timed out.
- Chromium launched headless with `--no-sandbox` etc.; executable discovered across dev/Docker paths; `ignoreHTTPSErrors: true`.
- **Caching/concurrency:** 12 s success cache, 20 s failure cache, in-flight dedupe, **`MAX_HEADLESS_SNAPSHOTS = 2`** concurrent renders (else **503 renderer-busy**). Cache trimmed at >200 entries. Headers carry `X-Snapshot-Source` (cache/render/failure-cache/selector-miss/renderer-busy).

---

#### 17. YouTube embed resolver (`app/api/eagle/youtube-embed/route.ts`)

`GET ?url=` → `{ embed_url, cached }`. Resolution (`:91-115`): sync-normalize direct video ids; extract `channel=UC...`; for `@handle` use `YOUTUBE_HANDLE_CHANNEL_IDS` (cityoflasvegas/yellowstonenps/nasaspaceflight/spacex) or `forHandle` API; then `eventType=live` search → `embed/{videoId}`, falling back to `embed/live_stream?channel=`. Requires `YOUTUBE_API_KEY`/`YOUTUBE_DATA_API_KEY` for live API steps. 1-hour in-memory cache. Embed params: `autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`.

---

#### 18. Camera providers & connectors (complete catalog)

##### 18.1 `public-webcams` connector (`connectors/public-webcams/route.ts`)
Merges a **STATIC_SEED** (~70 hand-curated cams, `:97-218`) with best-effort live pulls. Dedup by `provider:id`, bbox-filtered.
- **STATIC_SEED categories:** HPWREN fire cams (5, San Diego, via `cam-snapshot` of `.jpg` with `img` selector), AlertCalifornia fire-watch (5, `cam-snapshot` with `video` selector), NPS parks (6), USGS volcanoes (6), EarthCam landmarks (~9), Windy seed (2), SkylineWebcams landmarks (~10, tagged provider `earthcam`), beach/surf (~7), stadiums (3), zoos/wildlife (~5), ski resorts (4), city/landmark misc (~5), weather (3), aviation (3), marine/ports (4).
- **Live pulls:** `pullWindy` (needs `WINDY_API_KEY`; v3 `nearby=lat,lng,radiusKm`, 500 limit), `pullEarthCam` (`get_places_with_cams.php`), `pullNPS` (`developer.nps.gov/api/v1/webcams`, optional `NPS_API_KEY`), `pullUSGS` (`volcanoes.usgs.gov/vsc/api`). **`pullAlertWildfire`, `pullHPWREN`, `pullSurfline` are stubs returning `[]`** (rely on STATIC_SEED).
- `GET` (`:380-424`): merges all, bbox-filters, `Cache-Control: s-maxage=600, swr=1800`. `POST` (`:426-478`) syncs into MINDEX `eagle_video_sources`.

##### 18.2 `state-dot-cctv` connector (`connectors/state-dot-cctv/route.ts`)
Each provider gated by `bboxIntersectsExtent` against `PROVIDER_EXTENTS` (`:101-109`) so out-of-region states aren't queried. `Cache-Control: s-maxage=300, swr=900`.

| Provider | Source | Stream output | Notes |
|---|---|---|---|
| **caltrans** | `cwwp2.dot.ca.gov/.../cctvStatusD{NN}.json`, districts 1-12 each gated by `CALTRANS_DISTRICT_EXTENTS` (`:86-99`) | `stream_url`=streamingVideoURL (m3u8) if in-service; `media_url`=proxied JPEG via `cam-image`; `embed_url`=single-cam `/vm/loc/d{N}/{slug}.htm` | `source_status` online/offline by `inService` |
| **wsdot** | `wsdot.wa.gov/.../GetCamerasAsJson` | snapshot only (proxied `ImageURL`) | needs `WSDOT_ACCESS_CODE`/`WSDOT_API_KEY` |
| **fdot** | `fl511.com/map/data/cctvs.json` | `stream_url`=hlsUrl; `media_url`=proxied JPEG | |
| **nysdot** | `511ny.org/api/getcameras` | `stream_url`=VideoUrl (SkyVDN m3u8); no media (511ny GetImage is dead) | filters Disabled/Blocked |
| **nyctmc** | `webcams.nyctmc.org/api/cameras` | snapshot (`/api/cameras/{id}/image` proxied) | ~960 online cams; primary NYC coverage |
| **txdot** | `drivetexas.org/api/cctv-cameras` | `stream_url`=streamURL; snapshot=snapshotURL/imageURL | |
| **ndot** | `nvroads.com/api/v2/get/cameras` | HLS or proxied still per view; skips disabled/no-media | needs `NVROADS_API_KEY`/`NEVADA_511_API_KEY`/etc. |
| **ga511 / pa511 / wi511** | Castle Rock OneStop `https://{host}/map/mapIcons/Cameras` (Jun 12, 2026) | snapshot via `https://{host}/map/Cctv/{itemId}` proxied through `cam-image` | content-type guard bails to `[]` on SPA HTML shell; GA≈4043, PA≈1511, WI cams |

##### 18.3 Other providers surfaced through resolvers/seeds (not their own connector here)
- **EarthCam** — embed pages + scraped m3u8 (`stream/[sourceId]`), YouTube fallbacks, headless snapshot.
- **HPWREN** — STATIC_SEED + `cam-image`/`cam-snapshot` (expired-TLS handled).
- **AlertWildfire / AlertCalifornia** — STATIC_SEED, `cam-snapshot` (`video` selector); live pull stubbed.
- **Surfline** — `surf-report`→`embed-cam` iframe, HDOnTap m3u8 fallback pages (per-id map), snapshot via `cam-snapshot`; seeds carry Imperial Beach/Scripps/La Jolla/Pacific Beach/Mission Beach/Ocean Beach.
- **Scripps** — manual seed (`scripps-pier-sio-cam`), currently in `KNOWN_UNAVAILABLE_SOURCE_IDS` (kept as location pin).
- **YouTube Live** — `youtube_live` provider + `youtube-embed` resolver; Vegas/SpaceX/Yellowstone seeds.
- **Windy** — Windy webcam player iframe / `cam-snapshot`.
- **Shinobi** — MediaMTX HLS (`stream/[sourceId]`).
- **UniFi Protect / RTSP** — MediaMTX WHEP webrtc.

---

#### 19. Known limitations & quirks

- **Camera plane is hard-gated to zoom ≥ 7** in three places (overlay LOD `mapZoom>=7`, live-zoom check, layer minzooms) and prefetch is gated to `mapZoom>=7`; cameras are invisible when zoomed out.
- **Earth Simulator surface disables the instant baked-registry paint** and uses much lower paint caps (48–120 vs 260), so cameras appear more slowly and sparsely there.
- **Unreachable dead-code block** in `paintBakedRegistry` after its early `return true` (`eagle-eye-overlay.tsx:527-595`).
- **`eagleEyeTwitch` toggle is declared but never read** in this overlay; the `connectors/twitch` route exists but isn't wired into the event fan-out here.
- **NYSDOT 511ny is upstream-broken:** `/map/GetImage` 404s for all cams; only SkyVDN `VideoUrl` (m3u8) works, and `SnapshotStream` shows a dedicated "NYSDOT upstream offline" card.
- **AlertWildfire/HPWREN/Surfline live pulls are stubbed** — they depend entirely on STATIC_SEED + the snapshot service; if the seed file is stale these go missing.
- **Headless snapshot concurrency is capped at 2** — high simultaneous viewer-page demand returns 503; this is intentional resource protection but means some tiles fall back to the no-stream card under load.
- **No external links anywhere** (Apr 21, 2026 policy) — failed cameras always render `NoStreamStatusTile`/error copy and keep only the map pin; the old "Open provider site" buttons remain in code but are dead (`false &&` guarded).
- **In-widget `SnapshotProxyVideo` is currently disabled** in `IframeEmbed` (`headlessSnapshotsEnabled = false`); headless rendering reaches the widget only through the `snapshot` `stream_type` path (`SnapshotStream`/`SnapshotLivePlayer`).
- **`navy` provider is permanently unplayable** (sensor-excluded + `TEMPORARILY_UNPLAYABLE_PROVIDERS`).
- **Many providers have only snapshots, not video** (WSDOT/NYCTMC/Castle-Rock 511/most Caltrans without m3u8) — `media_url` JPEGs refresh on a 20–30 s cadence; "live" is near-live frames, not continuous video.

---

## 15. Eagle Eye — Camera Resolution & HLS Pipeline

### Eagle Eye Video Intelligence — Internals & Camera Registries

Eagle Eye is the CREP dashboard's dual-plane video intelligence layer (route `/natureos/earth-simulator`, also rendered on the main `mycosoft.com` CREP map surface). It paints two independent map planes — **permanent cameras** (`eagleEyeCameras`) and **ephemeral video events** (`eagleEyeEvents`) — and resolves a playable URL (HLS, WebRTC, iframe, or auto-refresh JPEG snapshot) per camera on click. This section documents the overlay component, the viewport-source prefetch path, the camera normalization / map-icon / health logic, the Caltrans HLS resolver, the HLS live config, the in-memory CCTV registry, and the full `/api/eagle/*` route surface.

#### 1. Overview: the two planes

| Plane | Toggle | Map source id | Data endpoints | Glyph | Poll cadence | LOD gate |
|-------|--------|---------------|----------------|-------|--------------|----------|
| **Permanent cameras** | `eagleEyeCameras` | `crep-eagle-cams` | `/api/eagle/sources` (+ baked GeoJSON seeds) | Neon-cyan camera icon `#00f3ff` | 5 min (`300_000` ms) + `moveend`/`zoomend` | `mapZoom >= 7` |
| **Ephemeral events** | `eagleEyeEvents` | `crep-eagle-events` | `/api/eagle/events`, `/api/oei/youtube-live`, `/api/eagle/connectors/{bluesky,mastodon}` | Yellow pulse ring + confidence-ramped core dot | 60 s (`60_000` ms) | `minzoom: 3` (pulse/core), 11 (label) |

Both planes live in `components/crep/layers/eagle-eye-overlay.tsx` as a single `EagleEyeOverlay` component (`eagle-eye-overlay.tsx:197`) that renders `null` and drives the MapLibre map imperatively through two `useEffect` hooks. The component's file header (`eagle-eye-overlay.tsx:3-30`) describes the original Phase-1 design (permanent cams glyph `#00f3ff`, ephemeral yellow pulse ring blinking 90 s, click → `window.__crep_selectAsset` with `type="camera"` or `type="video_event"`, consumed by a separate `VideoWallWidget`).

##### Component props (`eagle-eye-overlay.tsx:64-69`)

| Prop | Type | Default | Meaning |
|------|------|---------|---------|
| `map` | `MapLibreMap \| null` | — | Target MapLibre instance; effects no-op while null |
| `enabled` | `EagleEyeEnabled` | — | Layer + provider sub-toggles (see below) |
| `bbox` | `[number,number,number,number]` | `undefined` | `[west, south, east, north]` viewport bbox |
| `mapZoom` | `number` | `0` | Current zoom; drives LOD + paint limits |

##### `EagleEyeEnabled` toggles (`eagle-eye-overlay.tsx:46-62`)

| Field | Plane | Effect when `false` (or unset) |
|-------|-------|-------------------------------|
| `eagleEyeCameras` | permanent | Hides all 4 camera layers, clears 5-min timer |
| `eagleEyeEvents` | ephemeral | Hides 3 event layers, clears 60-s timer |
| `eagleEyeShinobi` | permanent sub | `!== false` → include `shinobi` provider |
| `eagleEye511Traffic` | permanent sub | `!== false` → include `511*`/`nysdot`/`nyctmc`/`caltrans`/`wsdot`/`fdot`/`txdot` |
| `eagleEyeWeatherCams` | permanent sub | `!== false` → include `windy` |
| `eagleEyeWebcams` | permanent sub | `!== false` → include `earthcam`/`webcamtaxi`/`hdontap` |
| `eagleEyeNpsUsgs` | permanent sub | `!== false` → include `nps`/`usgs` |
| `eagleEyeYoutubeLive` | ephemeral sub | `!== false` → fetch `/api/oei/youtube-live` |
| `eagleEyeBluesky` | ephemeral sub | `!== false` → fetch `/api/eagle/connectors/bluesky` |
| `eagleEyeMastodon` | ephemeral sub | `!== false` → fetch `/api/eagle/connectors/mastodon` |
| `eagleEyeTwitch` | ephemeral sub | declared but not yet wired in the fetch fan-out |

All sub-toggles use `!== false` semantics: a provider is **on** unless explicitly set to `false`, so when `eagleEyeCameras` is on, every permanent provider defaults to visible. The provider filter is applied in `paintFromSources`' inner `providerFilter` (`eagle-eye-overlay.tsx:294-309`).

---

#### 2. Permanent camera plane (`crep-eagle-cams`)

The first `useEffect` (`eagle-eye-overlay.tsx:213-786`) owns the permanent plane. Its dependency array (`eagle-eye-overlay.tsx:776-786`) re-runs on `map`, `eagleEyeCameras`, all 5 permanent sub-toggles, `bboxKey`, and `cameraLodVisible`.

##### 2.1 LOD and surface detection

| Constant | Source | Value |
|----------|--------|-------|
| `cameraLodVisible` | `eagle-eye-overlay.tsx:208` | `mapZoom >= 7` |
| `isEarthSimulatorSurface` | `eagle-eye-overlay.tsx:209-210` | `window.location.pathname.includes("/natureos/earth-simulator")` |
| `bboxKey` | `eagle-eye-overlay.tsx:207` | `bbox.map(n => n.toFixed(6)).join(",")` or `""` |

The four camera layer ids (`eagle-eye-overlay.tsx:229-234`) are `crep-eagle-cams-{hit,glow,icon,label}` (from `EAGLE_CAMERA_LAYER_IDS`). Below zoom 7 the layers are forced invisible (`setCameraLayerVisibility(false)` at `:245-247`, and again inside `fetchAndPaint` at `:609-613`). The Earth-Simulator surface gets **tighter** per-zoom paint caps (see 2.4) and **skips the baked-registry instant path** (`:634` — `!isEarthSimulatorSurface && ...`).

##### 2.2 Baked-registry seeds (instant first paint)

To avoid a blank map on first mount, the overlay paints a set of nightly-baked + hand-curated GeoJSON seed files instantly (10s of ms) before the API delta. `loadBakedCameraSeedSources` (`eagle-eye-overlay.tsx:123-174`) fetches seven files in parallel with `cache: "force-cache"`, deduplicates by feature `id` into a `Map`, and memoizes the result (`bakedCameraSeedCache` / `bakedCameraSeedPromise`).

Seed-file URL pattern: `/data/crep/{file}?v=20260608-vegas-camera-data-fix` (`EAGLE_CAMERA_SEED_VERSION`, `eagle-eye-overlay.tsx:102-106`).

| Seed file | Coverage | `counts` key |
|-----------|----------|--------------|
| `eagle-cameras-registry.geojson` | Nightly-baked global registry (~3,900 cams) | `baked` |
| `eagle-cameras-manual-seed.geojson` | Hand-curated SD / border (Surfline / HPWREN / Scripps / NOAA / EarthCam / Skyline / CBP / NPS / Border Field / Port of SD) | `sd` |
| `eagle-cameras-caltrans-san-diego-seed.geojson` | Caltrans D11 San Diego | `caltransSd` |
| `eagle-cameras-border-supplement.geojson` | Border corridor supplement | `border` |
| `eagle-cameras-nyc-dc-seed.geojson` | NYSDOT bridges, EarthCam landmarks, VDOT 511, MDOT CHART, White House/Capitol, NOAA tide/buoy | `nycDc` |
| `eagle-cameras-vegas-seed.geojson` | Strip, Fremont, Bellagio, Sphere, Hoover Dam, Lake Mead, Red Rock, Harry Reid, NDOT I-15/US-95/I-215 | `vegas` |
| `eagle-cameras-deployment-sites-seed.geojson` | Yosemite/Zion/Yellowstone NPS, ALERTWildfire Mendocino, YouTube (SpaceX NSF, Yellowstone wolf), EarthCam South Padre | `deploy` |

`projectBakedCameraFeature` (`eagle-eye-overlay.tsx:108-121`) flattens each GeoJSON feature to a source-like row, reading `properties.source_status ?? properties.status` and pulling `lat`/`lng` from `geometry.coordinates[1]`/`[0]`. A feature is kept only if it has an `id` and finite lat/lng (`:147`).

> Note: `paintBakedRegistry` (`eagle-eye-overlay.tsx:506-600`) contains a `return true` at line 526 followed by dead code (lines 527-595 re-implement the same fan-out inline). Only the cached-seed path (`loadBakedCameraSeedSources` → `paintFromSources`) actually runs; the inline duplicate is unreachable.

##### 2.3 Provider color

All permanent providers share **one cyan video color** so they read as CCTV rather than power plants/cell towers. `VIDEO_CAMERA_COLOR = EAGLE_CAMERA_NEON` (`#00f3ff`) (`eagle-eye-overlay.tsx:78`), and the `PROVIDER_COLOR` map (`eagle-eye-overlay.tsx:80-98`) maps every provider (`shinobi`, `511`, `511ga`, `511sf`, `nysdot`, `nyctmc`, `caltrans`, `wsdot`, `fdot`, `txdot`, `windy`, `earthcam`, `hdontap`, `webcamtaxi`, `nps`, `usgs`, `unifi-protect`) to that one color. The May-24-2026 comment (`:75-77`) records Morgan's rule: camera icons must **not** use solar/power yellow `#fbbf24`.

##### 2.4 `paintFromSources` and viewport paint caps

`paintFromSources` (`eagle-eye-overlay.tsx:293-339`) is the core transform: `filterEagleVideoSources(sources)` → provider filter → `sourceInBbox` filter → GeoJSON features. Each feature carries `{ id, provider, kind, name, stream_url, embed_url, media_url, status, color }`. Critically `media_url` travels with each feature (`:326`) because ~44% of Caltrans cams have `stream_url:null` but a JPEG snapshot in `media_url` — `VideoWallWidget` only picks these up if `media_url` is on the click payload.

When the feature count exceeds the per-zoom cap, features are sorted nearest-to-bbox-center (`sortNearestToBboxCenter`, `:275-292`) and sliced. The cap is from `cameraPaintLimitForZoom` (`:267-274`):

| Surface / zoom | Paint cap |
|----------------|-----------|
| Non-Earth-Simulator (any zoom) | 260 |
| Earth-Sim, zoom ≥ 14 | 120 |
| Earth-Sim, zoom ≥ 12 | 104 |
| Earth-Sim, zoom ≥ 10 | 88 |
| Earth-Sim, zoom ≥ 8 | 72 |
| Earth-Sim, zoom < 8 | 48 |

`sourceInBbox` (`eagle-eye-overlay.tsx:176-185`) handles antimeridian wrap: when `west <= east` it requires `lng` in `[west, east]`; otherwise (dateline-crossing bbox) it accepts `lng >= west || lng <= east`. `getMapBbox` (`:187-195`) reads live bounds via `map.getBounds()`.

##### 2.5 Source + layer creation and the once-only contract

`ensureCameraSourceAndLayers` (`eagle-eye-overlay.tsx:465-504`) is idempotent: it calls `ensureEagleCameraMapIcon(map)`, then either `addSource("crep-eagle-cams", { type:"geojson", data, generateId:true })` (removing any stale layers first, `:474-477`) or `(getSource).setData(fc)`. It then adds the four layer defs (hit, glow, icon, label) via the factory functions, sets `loadedRef.current.cams = true`, attaches click/hover handlers once, and broadcasts counts. On error it resets `loadedRef.current.cams = false` and schedules a retry.

The April-23-2026 fix (`:248-260`) changed the meaning of `loadedRef.current.cams`: it now tracks whether **source + layers exist** (addSource/addLayer must run once per map lifetime), **not** whether a fetch happened. Every bbox/toggle change still calls `fetchAndPaint`, which refreshes the source data via `setData`. The prior bug short-circuited on the first bbox so panning never re-queried `/api/eagle/sources`.

`attachCameraHandlers` (`eagle-eye-overlay.tsx:372-463`) guards against double-binding with `map.__crepEagleCameraHandlersAttached` and binds, for each id in `EAGLE_CAMERA_CLICK_LAYER_IDS` (= `[hit, icon, glow, label]`):
- `click` → `onEagleCamClick` (`:426-456`): de-dupes rapid double-clicks (same id within 450 ms via `window.__crepLastCameraClick`), then calls `window.__crep_selectAsset({ type:"camera", id, name, lat, lng, properties })` and dispatches `crep:eagle:camera-click`.
- `mousemove` → `hoverCamera` (`:375-417`): suppressed while the map is moving/zooming/rotating; throttled to one hover per id per 350 ms; calls `window.__crep_hoverAsset({ type:"camera", ... , x, y, source:provider })`.
- `mouseleave` → `clearHover` (`:418-425`): clears hover + cursor.

##### 2.6 `fetchAndPaint` (camera) — request flow

`fetchAndPaint` (`eagle-eye-overlay.tsx:602-746`) is the camera fetch driver:

1. **Guards**: returns early if cancelled, `document.hidden`, map not ready, or live zoom < 7 (hides layers).
2. **Request key + de-dupe**: `requestKey = "{bboxKey|global}|z{round(zoom*10)/10}"` (`:617`). Skips if same key in-flight (`cameraInFlightKeyRef`) or if last fetch for this key was < 12,000 ms ago and cams already loaded (`:620-621`).
3. **Baked instant paint**: on non-Earth-Sim surface, if not yet loaded, `paintBakedRegistry` paints the merged seeds first, then `ensureCameraSourceAndLayers`.
4. **Mode selection** (`:640-647`): `fastMode = !loaded && !bakedPainted`. Tablet viewport (`innerWidth <= 1100 || innerHeight <= 820`) uses `limit=96` and `live=0`; otherwise `limit=180`. `live=1` only when not fast and not tablet. `fast=1` added in fast mode.
5. **Fast re-poll**: in fast mode, schedules a follow-up `fetchAndPaint` after 4,000 ms (`:649-654`).
6. **Fetch**: `/api/eagle/sources?{query}` with a 10,000 ms abort timeout (`:655-660`); aborts any prior in-flight controller.
7. **Merge + paint**: `mergeFeatureCollections(__crepEaglePendingFc, bakedCameraFcRef, fc)` (`:670-674`, dedupe by id), then `ensureCameraSourceAndLayers(mergedFc)`.
8. **Broadcast counts** (`:732-740`): sets `window.__crep_eagle_camera_counts` and dispatches `crep:eagle:camera-counts` with `{ total, by_provider }` for the Intel Feed panel.

Two timers/listeners drive refresh: `moveend`/`zoomend` → `onCameraViewportSettled` (220 ms debounce, `:749-758`), and a 300,000 ms (5 min) `setInterval` (`:760-762`). Cleanup (`:763-775`) aborts the controller, clears retry timers, removes listeners, and clears the interval.

Query parameters sent to `/api/eagle/sources`:

| Param | Value | Set when |
|-------|-------|----------|
| `limit` | `96` (tablet) / `180` | always |
| `live` | `0` (fast/tablet) / `1` | always |
| `bbox` | `"{w},{s},{e},{n}"` | when bbox present |
| `fast` | `1` | fast mode only |

---

#### 3. Ephemeral event plane (`crep-eagle-events`)

The second `useEffect` (`eagle-eye-overlay.tsx:789-1074`) owns the event plane. Dependency array: `map`, `eagleEyeEvents`, `eagleEyeYoutubeLive`, `eagleEyeBluesky`, `eagleEyeMastodon`, `bboxKey` (`:1067-1074`). Three layer ids: `crep-eagle-events-{pulse,core,label}` (`:791`).

##### 3.1 Four-connector fan-out (`fetchAndPaint`, `:807-1060`)

Skips entirely when `document.hidden` (`:811`). Reads the time window from `window.__crep_eagle_time_window?.hoursBack ?? 6` (`:820`). Event limit: 120 (tablet) / 260 (`:822`). Four parallel fetches via `Promise.all`:

| # | Connector | URL | Provider tag | Default confidence |
|---|-----------|-----|--------------|--------------------|
| 1 | MINDEX ephemeral | `/api/eagle/events?hoursBack={h}&limit={n}&bbox={k}` | `provider \|\| "mindex-ephemeral"` | `inference_confidence ?? 0.5` |
| 2 | YouTube Live | `/api/oei/youtube-live?bbox={k}&maxResults=50` (only if toggle on **and** bbox set) | `"youtube-live"` | `location_confidence ?? 0.45` |
| 3 | Bluesky | `/api/eagle/connectors/bluesky?bbox={k}` | `"bluesky"` | `inference_confidence ?? 0.3` |
| 4 | Mastodon | `/api/eagle/connectors/mastodon?bbox={k}` | `"mastodon"` | `inference_confidence ?? 0.3` |

Each connector's features carry `{ id, provider, observed_at, confidence, thumbnail, title }` (title truncated to 80 chars); YouTube/Bluesky/Mastodon also carry `embed_url`, and Mastodon additionally `video_url` (`:836-915`). No confidence rescaling is done — each connector's native tier feeds the color ramp directly.

##### 3.2 Event layer paint (`:917-1043`)

Created once when `crep-eagle-events` source is absent:

- **`crep-eagle-events-pulse`** (`:920-931`): circle, `minzoom:3`, radius interpolated `3→5, 10→10, 16→18`, color `#fbbf24`, opacity `0.25`, blur `1.0` (the yellow fresh-event ring).
- **`crep-eagle-events-core`** (`:933-950`): circle, `minzoom:3`, radius `3→3, 10→4.5, 16→7`. Color is a confidence-tier `case`:
  - `confidence >= 0.8` → `#facc15` (native: bright yellow)
  - `confidence >= 0.5` → `#f59e0b` (platform place: amber)
  - else → `#fb923c` (text/OCR/visual: orange)
  - stroke width `1.0`, stroke color `#7c2d12`, opacity `0.95`.
- **`crep-eagle-events-label`** (`:951-970`): symbol, `minzoom:11`, `text-field` = `title`, size 10, color `#fde68a`, halo `rgba(0,0,0,0.8)`.

Handlers bound on `crep-eagle-events-core`:
- `click` (`:971-992`) → `window.__crep_selectAsset({ type:"video_event", id, name: title || "{provider} clip", ... })` + dispatch `crep:eagle:event-click`.
- `mousemove` (`:993-1034`) → `window.__crep_hoverAsset({ type:"video event", ... })`, throttled 350 ms/id, suppressed during map motion.
- `mouseleave` (`:1035-1042`) → clear hover.

On subsequent ticks the source is updated via `setData(fc)` (`:1045`). Counts broadcast: `window.__crep_eagle_event_counts` + `crep:eagle:event-counts` event with `{ total, by_provider }` (`:1048-1058`). The 60-s interval is set at `:1063`.

---

#### 4. Camera normalization & display gating (`lib/crep/eagle-camera-normalize.ts`)

This module decides which raw rows are real video cameras, drops mis-ingested environmental sensors, applies coordinate overrides for border POIs, and is shared by the overlay, the viewport prefetch, and `/api/eagle/sources`.

##### 4.1 `EagleCameraLike` shape (`eagle-camera-normalize.ts:12-25`)
`{ id, provider, name, lat, lng, stream_url, embed_url, media_url, status, source_status, kind, category }` (all optional/nullable).

##### 4.2 Provider/id classification sets

| Set / list | Members | Effect |
|------------|---------|--------|
| `SENSOR_ONLY_PROVIDERS` (`:28-36`) | `sdapcd`, `ibwc`, `project_oyster`, `sandiego_deh`, `noaa-coops`, `noaa_trnerr`, `navy` | Treated as env sensors → excluded |
| `SENSOR_ID_PREFIXES` (`:38-45`) | `po-tjne-`, `ibwc-`, `noaa-ndbc-`, `noaa-cdip-`, `sdapcd-`, `beach-` | id-prefix match → env sensor → excluded |
| `KNOWN_CAMERA_PROVIDERS` (`:48-77`) | caltrans, shinobi, earthcam, webcamtaxi, hdontap, windy, nps, usgs, alertwildfire, hpwren, surfline, scripps, port-of-sd, skylinewebcams, 511, 511ga, 511sf, nysdot, nyctmc, ndot, wsdot, fdot, txdot, youtube_live, unifi-protect, static-seed, public-webcam, ipcamlive | Shown even with null stream URL |
| `INFO_ONLY_PROVIDERS` (`:79-82`) | `cbp`, `parks-ca` | Require direct playable media |
| `STREAM_REQUIRED_PROVIDERS` (`:84-89`) | `nysdot`, `port-of-sd`, `usgs`, `webcamtaxi` | Require `stream_url \|\| media_url` |
| `UNAVAILABLE_SOURCE_STATUSES` (`:91-99`) | offline, unavailable, retired, disabled, blocked, deprecated, temporarily_unavailable | Status → hidden (unless location-context id) |
| `KNOWN_UNAVAILABLE_SOURCE_IDS` (`:101-115`) | 12 ids (Vegas YouTube, EarthCam SD bay/Imperial Beach, NPS Cabrillo, 4 Caltrans SR-75, Scripps pier) | Always considered unavailable |
| `LOCATION_CONTEXT_SOURCE_IDS` (`:117-132`) | 14 ids | Kept on map *as location pins* even when unavailable |

##### 4.3 Coordinate overrides (`COORDINATE_OVERRIDES`, `:135-147`)
Hand-verified US-side `[lng, lat]` corrections so pins don't land in Tijuana Slough water / Mexico:

| id | `[lng, lat]` |
|----|--------------|
| `cbp-otay-mesa-poe-ref` | `[-116.9395, 32.5527]` |
| `parks-ca-border-field` | `[-117.1272, 32.538]` |
| `surfline-imperial-beach-pier` | `[-117.1328, 32.5789]` |
| `earthcam-imperial-beach-pier` | `[-117.1328, 32.5789]` |
| `caltrans-d11-c214-sb5-via-de-san-ysidro` | `[-117.0295, 32.5432]` |
| `caltrans-d11-c105-i5-dairy-mart-road` | `[-117.0464, 32.5506]` |
| `caltrans-d11-sr75-palm-ave` | `[-117.126, 32.579]` |

##### 4.4 Predicates & exports

| Function | Logic |
|----------|-------|
| `hasPlayableUrl` (`:149-151`) | `stream_url \|\| embed_url \|\| media_url` |
| `hasDirectPlayableMedia` (`:153-155`) | `stream_url \|\| media_url` (no iframe-only) |
| `isEagleEnvironmentalSensor` (`:158-164`) | provider in sensor set, OR `noaa*` without playable URL, OR id-prefix match |
| `isUnavailableSource` (`:170-176`) | id in `KNOWN_UNAVAILABLE_SOURCE_IDS`, OR normalized `source_status ?? status` in `UNAVAILABLE_SOURCE_STATUSES` |
| `isDisplayableEagleCamera` (`:180-195`) | requires finite lat/lng; rejects unavailable (unless location-context id); rejects sensors; then per-class: `STREAM_REQUIRED`/`INFO_ONLY` need direct media, `KNOWN_CAMERA_PROVIDERS` always pass, unknown providers need any playable URL |
| `normalizeEagleCameraCoords` (`:197-203`) | applies `COORDINATE_OVERRIDES[id]` if present |
| `normalizeEagleCameraSource` (`:205-207`) | alias for coord normalize |
| `filterEagleVideoSources` (`:209-213`) | `map(normalize) → filter(isDisplayable)` — the pipeline used everywhere |

---

#### 5. Map glyph, layers & camera health (`lib/crep/eagle-camera-map-icon.ts`)

Renders the neon-cyan CCTV icon and the four layer definitions, with health (online/offline) baked into color/opacity/icon.

##### 5.1 Colors & ids

| Constant | Value | Notes |
|----------|-------|-------|
| `EAGLE_CAMERA_ICON_ID` | `crep-eagle-camera-neon` | online icon image |
| `EAGLE_CAMERA_UNAVAILABLE_ICON_ID` | `crep-eagle-camera-unavailable` | offline (red) icon image |
| `EAGLE_CAMERA_NEON` | `#00f3ff` | electric neon cyan |
| `EAGLE_CAMERA_GLOW` | `rgba(0,243,255,0.35)` | halo |
| `EAGLE_CAMERA_UNAVAILABLE` | `#ef4444` | red (offline) |
| `EAGLE_CAMERA_LAYER_PREFIX` | `crep-eagle-cams` | layer-id prefix |

`EAGLE_CAMERA_LAYER_IDS` (`:17-22`) = `{hit, glow, icon, label}` suffixed onto the prefix. `eagleCameraClickLayerIds` (`:33-36`) orders them `[hit, icon, glow, label]` → exported as `EAGLE_CAMERA_CLICK_LAYER_IDS` (`:237`).

##### 5.2 Icon rasterization
`buildCameraIcon(color, glow)` (`:59-99`) draws a 128×128 canvas: radial-gradient glow background, a rounded-rect camera body (`#021018` fill, colored stroke), a top "viewfinder" bump, and a concentric lens (`#002833` ring + colored center). `ensureEagleCameraMapIcon(map)` (`:101-110`) registers both the neon and the red-unavailable icons via `map.addImage(..., { pixelRatio: 2 })` if not already present.

##### 5.3 Layer factories — all health-aware

A shared `status` expression `["coalesce", ["get","status"], ["get","source_status"], ""]` drives health styling.

| Factory | Type | minzoom | Health behavior |
|---------|------|---------|-----------------|
| `eagleCameraHitLayer` (`:113-134`) | circle | 7 | Invisible hit target (opacity `0.001`), radius `7→10, 10→16, 12→22, 16→30` — enlarged tap target |
| `eagleCameraGlowLayer` (`:137-172`) | circle | 8 | Color: red if status in unavailable set, else neon. Opacity `0.42` (unavailable) / `0.16` (online). Radius `8→2 … 16→10`, blur `0.85` |
| `eagleCameraIconLayer` (`:174-203`) | symbol | 8 | `icon-image`: unavailable-icon if offline status, else neon-icon. `icon-size` `8→0.1 … 16→0.3`, `icon-allow-overlap`+`icon-ignore-placement` true |
| `eagleCameraLabelLayer` (`:205-235`) | symbol | 13 | `text-field` = `provider` (uppercased), color `#fecaca` (offline) / `#e0fdff` (online), halo black |

Health classification uses the same six unavailable statuses as the normalize module (offline/unavailable/retired/disabled/blocked/deprecated/temporarily_unavailable).

---

#### 6. Viewport-source prefetch (`lib/crep/eagle-viewport-sources.ts` + `use-viewport-eagle-prefetch.ts`)

A parallel, hook-based loader (distinct from the overlay's own `fetchAndPaint`) that supplies viewport-scoped sources to React consumers with an instant→fast→full phasing.

##### 6.1 `eagle-viewport-sources.ts`

- `EagleViewportSource` (`:9-20`): `{ id, name, provider, lat, lng, stream_url, embed_url, media_url, thumbnail_url, source_status }`.
- `BAKED_GEOJSON_URLS` (`:22-30`): the same 7 seed files, version `20260608-vegas-camera-data-fix` (`:32`).
- `featureToSource` (`:36-66`): GeoJSON→source; YouTube providers get `embed_url` rewritten via `normalizeYouTubeEmbedUrlSync`; runs `normalizeEagleCameraCoords` then drops anything failing `isDisplayableEagleCamera`.
- `pointInViewportBbox` (`:68-78`): antimeridian-aware bbox test.
- `mergeEagleSources` (`:80-90`): dedupe by id across groups (later groups win).
- `filterSourcesInViewport` (`:92-115`): bbox-filter, then sort nearest-to-center (antimeridian-aware center-lng math), then `slice(0, limit)`.
- `loadBakedEagleCameras` (`:117-140`): memoized parallel fetch of all 7 seeds (`force-cache`), deduped by id.
- `mapApiSources` (`:142-162`): maps `/api/eagle/sources` rows (accepting `lat/latitude`, `lng/longitude`) through `filterEagleVideoSources`.
- `fetchEagleApi` (`:164-184`): builds `/api/eagle/sources?bbox={w,s,e,n}&limit={n}[&fast=1][&live=0]`, `cache: "no-store"`.

**`loadViewportEagleSources` (`:189-235`)** — the 3-phase loader with `onUpdate(sources, phase)` callback (`phase` ∈ `"instant" | "fast" | "full"`):
1. `instant` — baked seeds filtered to viewport (emitted if non-empty).
2. Determine `focusedViewport = lngSpan <= 5 && latSpan <= 5`.
3. `loadFastApi` — `fetch(... fast:true, live:false, limit:max(limit,24))`, merged + re-filtered, emit `"fast"`.
4. `loadFullApi` — `fetch(... fast:false, live:false, limit:max(limit,48))`, emit `"full"`.
5. For focused viewports, run fast first and only run full if fast returned nothing; for wide viewports run both. `AbortError` is rethrown; empty final → `onUpdate([], "full")`.

`bboxKeyFromBounds` (`:237-239`): 4-decimal bbox key.

##### 6.2 `use-viewport-eagle-prefetch.ts`

`useViewportEaglePrefetch(mapBounds, mapZoom, assetsReady, limit = 12)` (`:38`):
- **Gate**: `shouldPrefetch = Boolean(mapBounds && assetsReady && mapZoom >= 7)` (`:44`) — same zoom-7 LOD as the overlay.
- Seeds initial state from `getViewportEagleCache` (`viewport-eagle-cache`).
- `revisionKey` (`:66-77`): recomputed only on a *significant* viewport change (`isSignificantViewportChange` from `viewport-revision`), avoiding refetch on micro-pans; keyed via `makeViewportRevisionKey`.
- Effect (`:79-135`): aborts prior in-flight controller, serves cached sources immediately if present, calls `loadViewportEagleSources`, commits via `eagleSourcesEqual` diff (compares id, lat/lng to 1e-6, and all 3 URLs, `:19-36`) to skip no-op renders, and writes successful phases back to `setViewportEagleCache`.
- Returns `{ sources, revisionKey, loading: fetching && sources.length===0, refreshing: fetching && sources.length>0, effectiveBounds }`.

---

#### 7. HLS-vs-JPEG-snapshot resolution

##### 7.1 Caltrans resolver (`lib/crep/caltrans-hls-resolve.ts`)

Baked Caltrans rows often have `stream_url:null` while the live Caltrans JSON still publishes `streamingVideoURL`. This resolver recovers the HLS URL (or a proxied JPEG) from embed/snapshot/id hints. District cache TTL `5*60_000` ms (`DISTRICT_TTL_MS`, `:15`).

Hint parsers (`:17-50`): `parseDistrictFromEmbed` (matches `cwwp2.dot.ca.gov/vm/loc/dNN/`), `parseSlugFromEmbed` (`.../dNN/{slug}.htm`), `parseSlugFromSnapshot` / `parseDistrictFromSnapshot` (`.../data/dNN/cctv/image/{slug}/`), `parseDistrictFromSourceId` (`caltrans-dNN-...`). `decodeProxiedSnapshot` (`:52-63`) unwraps a `/api/eagle/cam-image?url=` proxy back to the upstream URL.

`fetchDistrictCams(district)` (`:65-103`): fetches `https://cwwp2.dot.ca.gov/data/dN/cctv/cctvStatusDNN.json` (zero-padded), 12 s timeout, `no-store`; for each `data[].cctv` builds `{ stream_url: imageData.streamingVideoURL, embed_url (derived from snapshot or indexCctv), snapshot_url: imageData.static.currentImageURL }`; caches per district.

`resolveCaltransHls(input)` (`:125-151`): derives slug + district from embed → snapshot → sourceId; if either is missing, returns `input.stream_url` only when it already matches `/\.m3u8/i`; otherwise fetches district cams, `pickBySlug` (`:105-115`), and returns the matched `stream_url` only if it is an m3u8.

`caltransProxiedSnapshot(embedUrl, mediaUrl)` (`:153-169`): if `media_url` decodes to an http URL → `/api/eagle/cam-image?url={enc}`; else derive slug+district from embed and build `.../data/dN/cctv/image/{slug}/{slug}.jpg` → wrap in `/api/eagle/cam-image`. This is the JPEG-snapshot fallback when no HLS exists.

##### 7.2 HLS live player config (`lib/crep/hls-live-config.ts`)

`hlsLivePlayerConfig()` (`:6-18`) returns HLS.js options tuned for **live** feeds (not VOD loops, which caused stuck buffers): `lowLatencyMode:true`, `liveSyncDurationCount:3`, `liveMaxLatencyDurationCount:10`, `maxLiveSyncPlaybackRate:1.5`, `backBufferLength:0`, `maxBufferLength:12`, and 12,000 ms manifest/level/frag loading timeouts. `seekVideoToLiveEdge(video, hls)` (`:21-41`) jumps the `<video>` to `hls.liveSyncPosition` (or the end of the last seekable range) so playback starts at the live edge.

---

#### 8. `/api/eagle/*` route surface

All routes: `runtime = "nodejs"`, `dynamic = "force-dynamic"`.

##### 8.1 `GET /api/eagle/sources` — permanent camera registry (`app/api/eagle/sources/route.ts`)

Returns bbox-scoped permanent cameras. Source priority: **MINDEX `eagle.video_sources` → baked GeoJSON seeds → (optional) live connector fan-out / state-DOT refresh**.

| Query param | Parsing | Default / cap |
|-------------|---------|---------------|
| `bbox` | `"w,s,e,n"`; or `west/south/east/north` individually (`:359-368`) | — |
| `kind` | passthrough filter | — |
| `provider` | passthrough filter | — |
| `limit` | `min(limit, 50000)`; for map-metadata requests (`bbox` set, no `kind`/`provider`) capped to `180` (`:371-373`) | 10000 |
| `live` | `=1` enables live fan-out (and only when not a map-metadata request and `EAGLE_WEBSITE_ALLOW_DIRECT_LIVE_FANOUT !== "0"`) | off |
| `fast` | `=1` → fast-tier-only first paint | off |

Key constants: `MIN_SOURCES = 1` (`:60`, only fan out when MINDEX truly empty); `MINDEX_BASE` from `MINDEX_API_URL`/`NEXT_PUBLIC_MINDEX_API_URL` else `http://192.168.0.189:8000` (`:74-77`); auth header `X-Internal-Token` (`MINDEX_INTERNAL_TOKEN[S]`) or `X-API-Key` (`MINDEX_API_KEY`) (`:79-111`).

- `connectorFetchBase(req)` (`:93-105`): self-fetch base — `EAGLE_CONNECTOR_FETCH_BASE`/`EAGLE_INTERNAL_ORIGIN` override; on Vercel the request origin; otherwise loopback to the Node port (`http://localhost:{port}`), avoiding Docker hairpin/TLS.
- `loadBakedSources` (`:128-169`): reads the 7 seed files from `public/data/crep`, dedupes by id, defaults `source_status` to `"online"` and `permissions` to `{access:"public"}`.
- `fromMindex` (`:177-242`): `GET {MINDEX_BASE}/api/mindex/earth/map/bbox?layer=eagle_video_sources&...`, 2 s timeout; falls back to `properties.*`/`metadata.*` for provider/kind/stream_url (MINDEX stores these in JSON).
- `fromLiveConnectors` (`:247-313`): FAST tier (`public-webcams`, `traffic-511`, `border-crossing`, `webcamtaxi`) + SLOW tier (`shinobi`, `state-dot-cctv`); `Promise.allSettled`, 18 s per-connector timeout.
- `fromStateDotCctv` (`:316-348`): always-refresh Caltrans/NYSDOT (MINDEX cache often stale), 18 s timeout.
- `mergeSourcesLiveWins` (`:350-355`): later sources overwrite by id.

GET flow (`:357-503`): if `fast && skipLive` → return baked-seed-only fast first paint (`X-Source: baked-eagle-fast`). Otherwise `fromMindex` → merge baked seeds → (if live & not fast) merge `fromStateDotCctv` → (if live & MINDEX cold) merge `fromLiveConnectors` → post-filter by kind/provider → `filterEagleVideoSources`. Response: `{ source, total, by_provider, by_kind, sources[], generatedAt, baked_seed_used, live_fanout_used, note }`. Cache header `public, s-maxage=30, stale-while-revalidate=120`; `X-Source` reflects which paths were used.

##### 8.2 `GET /api/eagle/stream/[sourceId]` — playable-URL resolver (`stream/[sourceId]/route.ts`)

Given a `sourceId` (optional `?embed_url=` / `?media_url=` hints), returns a directly-playable URL with a `stream_type`. This is the heart of the HLS-vs-iframe-vs-snapshot decision.

**Lookup chain** (`:617-635`): baked seed index → MINDEX by-id (`/api/mindex/eagle/video-sources/{id}`, O(1), 4 s) → coord-hinted tight-bbox lookup (`caltrans-dNN-lat,lng`, ~200 m, `:245-266`) → 60 s global bbox cache (`:170-192`). If query hints are present these are skipped; if nothing resolves and no hints → 404.

**Provider inference** (`:669-686`): trusts `src.provider` if not "unknown", else infers from URL hints/id prefixes (earthcam, surfline, ndot, navy, nysdot, nyctmc, youtube_live, hdontap, windy, skylinewebcams, webcamtaxi, hpwren, alertwildfire, nps, usgs).

**Availability gating** (`:688-723`): `KNOWN_UNAVAILABLE_SOURCE_IDS` (`:64-74`) + status set → unless provider can revalidate (caltrans/earthcam/hdontap/ndot/nysdot/nyctmc/skylinewebcams/surfline/youtube_live) → 503. `TEMPORARILY_UNPLAYABLE_PROVIDERS = {navy}` → 503. `ndot` without HLS and without proxied still → 503.

**Resolution order** producing `stream_type`:

| Provider / condition | Action | `stream_type` |
|----------------------|--------|---------------|
| `caltrans` (`:725-740`) | `resolveCaltransHls(...)`; if none and known-unavailable → 503 | (continues to HLS branch) |
| `nysdot` no HLS (`:742-745`) | `resolveNysdotHls` (511ny `getcameras` JSON → `VideoUrl` m3u8) | hls |
| YouTube direct (`:747-764`) | `normalizeYouTubeEmbedUrlSync(stream/embed)` | `iframe` |
| `earthcam` no HLS (`:766-800`) | YouTube fallback map → iframe; else `resolveEarthCamHls` (scrape page m3u8, scored hints, probe); else 503 | hls / iframe / 503 |
| `hdontap` no HLS (`:802-805`) | `resolveHdontapHls` (portal backend lookup, base64) | hls |
| `skylinewebcams` no HLS (`:807-833`) | `resolveSkylineWebcams` → YouTube iframe or cdn snapshot; else 503 | iframe / snapshot / 503 |
| resolved m3u8 (`:835-858`) | `shouldProxyHls` (`:585-599`) → wrap `/api/eagle/hls-proxy?url=`; caltrans adds `snapshot_url` | hls |
| `surfline` (`:860-898`) | derive `embed-cam` iframe (reachability-probed); else hdontap fallback-page HLS; else iframe fallback; else 503 | iframe / hls / 503 |
| `shinobi` (`:900-916`) | raw m3u8, else `{MEDIAMTX_URL}/shinobi/{id}/index.m3u8` | hls |
| `unifi-protect` / `rtsp://` (`:918-929`) | `{MEDIAMTX_URL}/{id}/whep` | webrtc |
| `caltrans` no HLS (`:931-944`) | `caltransProxiedSnapshot` JPEG | snapshot |
| proxied still (`:946-957`) | `proxiedStillImageUrl(media_url)` → `/api/eagle/cam-image` | snapshot |
| `embed_url` present (`:959-970`) | YouTube-normalized or raw embed | iframe |
| `media_url` fallback (`:972-986`) | by extension | hls / mjpeg / iframe |
| nothing playable (`:988-991`) | — | 404 |

`MEDIAMTX_URL` defaults to `https://media.mycosoft.com` (`:42`). Helper scrapers each have bounded timeouts (3-10 s) and a 90 s EarthCam HLS cache (`:377-379`). Maps for aliases / YouTube fallbacks / Surfline fallback pages are at `:76-94`.

##### 8.3 `GET /api/eagle/hls-proxy` (`hls-proxy/route.ts`)

Same-origin HLS manifest+segment proxy (DOT/Caltrans m3u8 feeds block browser CORS). Host allowlist (`:10-22`): `cwwp2.dot.ca.gov`, `wzmedia.dot.ca.gov`, `nysdot.skyvdn.com`, `media.mycosoft.com`, `cams.cdn-surfline.com`, `hpwren.ucsd.edu`(+www), `live.hdontap.com`, `d1wse1.its.nv.gov`; suffixes `.nysdot.skyvdn.com`, `.its.nv.gov`; plus regex `videos-\d+.earthcam.com`. Rejects non-http(s) (400), non-allowlisted host (403). For manifests (`.m3u8` path or `mpegurl` content-type) it rewrites every non-comment line through `/api/eagle/hls-proxy?url=` (only for allowlisted absolute URLs) (`:29-44`); segments are streamed through as-is. EarthCam/HDOnTap hosts get spoofed `Referer`/`Origin` headers (`:72-74`). Timeout 5 s (manifest) / 10 s (segment), one retry on non-manifest failure; upstream failure → 502. `Cache-Control: no-store, max-age=0`.

##### 8.4 `GET /api/eagle/cam-image` (`cam-image/route.ts`)

Lightweight image proxy (no headless browser) for direct still/JPEG cam endpoints — fixes HPWREN's expired TLS cert, HTTP-only cams over HTTPS (mixed content), and CORS. Allowlist (`:30-79`) covers HPWREN, ALERTCalifornia/Wildfire, NPS, USGS volcanoes, EarthCam, Skyline CDN, Surfline, 511NY/WSDOT/FL511/DriveTexas/Caltrans/NYC-TMC/VDOT/MD-CHART/DDOT, MTA/Amtrak. `LENIENT_TLS_HOSTS` (`:82-85`) = HPWREN (+www): https is swapped to http to bypass the expired cert (`:113-116`). 4,500 ms timeout; rejects non-`image/*`/`multipart` content-type as 502 (likely HTML error page). Returns the image bytes with `Content-Type` from upstream, `Cache-Control: no-store, max-age=0`, `X-Proxied-From` header.

##### 8.5 `GET /api/eagle/cam-snapshot` (`cam-snapshot/route.ts`)

Headless-Chromium (Playwright) snapshot service for viewer pages that block iframing (`X-Frame-Options: DENY`) but render a `<video>` on their own page (ALERTCalifornia, HPWREN, fire-watch portals). `maxDuration = 30`.

| Param | Default | Meaning |
|-------|---------|---------|
| `url` | — | viewer page (must be allowlisted) |
| `selector` | `null` | CSS selector for the video element |
| `wait_ms` | clamped `0..2000`, default 500 | settle delay |
| `mode` | `element` (or `fullpage`) | element-screenshot vs full-page fallback |

Large allowlist (`:49-92`) of public providers (fire/surf/EarthCam/HDOnTap/Skyline/Webcamtaxi/NPS/USGS/Windy/state-DOTs/ports/resorts/zoos/aquariums/airports). For direct still URLs (`STILL_IMAGE_RE`) it skips Chromium and fetches the image (with a Node-http fallback that tolerates bad TLS and follows redirects, `:183-247`). Browser is launched once (`getBrowser`, `:103-125`) with Chromium discovery across dev/Docker paths, `--no-sandbox`, `ignoreHTTPSErrors`. Concurrency: `MAX_HEADLESS_SNAPSHOTS = 2` (503 "renderer busy" if exceeded), in-flight de-dupe per cacheKey, success cache `CACHE_TTL_MS = 12_000`, failure cache `FAILURE_TTL_MS = 20_000` (404), cache trimmed at 200 entries. Returns JPEG (quality 75 fullpage / 80 element) with `X-Snapshot-Source` ∈ `cache`/`render`/`failure-cache`/`selector-miss`/`renderer-busy`.

##### 8.6 `GET /api/eagle/youtube-embed` (`youtube-embed/route.ts`)

Resolves any YouTube URL (watch / youtu.be / `/live/` / `@handle` / `?channel=UC…`) to an autoplay embed URL. API key from `YOUTUBE_API_KEY`/`YOUTUBE_DATA_API_KEY` (`:11-14`); 1-hour in-memory cache (`:18`). `appendEmbedParams` (`:24-36`) sets `autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`. `resolveYouTubeEmbed` (`:91-115`): direct video embeds resolve synchronously; `@handle` resolves via `YOUTUBE_HANDLE_CHANNEL_IDS` map or the Data API `channels?forHandle=`; a channel id then resolves the current live video via `search?eventType=live` (else falls back to `embed/live_stream?channel=`). Non-YouTube input → 400; resolver errors swallowed to a 200 `{ embed_url: null, error }`. Cache header `public, s-maxage=300, stale-while-revalidate=600`.

---

#### 9. In-memory CCTV registry (`lib/crep/cctv-registry.ts`)

A separate, **operator-push** registry (the SDR-camera pattern) distinct from MINDEX `eagle.video_sources` and the baked seeds. Architectural rule (Morgan 2026-04-17, `:8-13`): camera *locations* are permanent map assets; *stream URLs* may be live RTSP/HLS on select; the register issues a device token like the SDR vessel receiver. **Non-durable** — tokens + cameras clear on container restart (`:22-23`).

Types: `CctvStreamProtocol = rtsp | hls | dash | mjpeg | webrtc | iframe` (`:32`); `CctvCamera` (`:34-71`, incl. `bearingDeg`, `fovDeg`, `rangeM`, `ptz`, `hasAudio`, `provenance: registered|scraped|official`); `CctvDevice` (`:73-81`).

| Function | Behavior |
|----------|----------|
| `registerCctvDevice` (`:90-106`) | mints `cctv_…` token + `cctv-op-…` id |
| `isCctvTokenValid` (`:108-116`) | 30-day TTL (`DEVICE_TOKEN_TTL_MS`), deletes expired |
| `listCctvDevices` (`:118-124`) | strips token, returns `tokenPrefix` |
| `registerCamera` (`:154-211`) | validates coords (rejects 0/0), name, protocol; generates `cam-…` id; links device + bumps `cameraCount`; provenance defaults `registered` (if device) else `official` |
| `touchCamera` (`:213-218`) | keep-alive `lastSeenAt` |
| `getCamera` / `deleteCamera` (`:220-247`) | by id |
| `listCameras` (`:224-243`) | filters by bbox / tags / operator |
| `getCctvRegistryStats` (`:249-262`) | counts by provenance + protocol |

---

#### 10. Cross-cutting window hooks & events

| Hook / event | Direction | Payload |
|--------------|-----------|---------|
| `window.__crep_selectAsset(asset)` | overlay → app | `{ type:"camera"\|"video_event", id, name, lat, lng, properties }` |
| `window.__crep_hoverAsset(asset\|null)` | overlay → app | hover card (adds `x, y, source`) |
| `window.__crepLastCameraClick` | overlay internal | double-click de-dupe `{ id, ts }` (<450 ms) |
| `window.__crep_eagle_time_window.hoursBack` | app → overlay | event time window (default 6) |
| `window.__crep_eagle_camera_counts` / event `crep:eagle:camera-counts` | overlay → Intel Feed | `{ total, by_provider }` |
| `window.__crep_eagle_event_counts` / event `crep:eagle:event-counts` | overlay → Intel Feed | `{ total, by_provider }` |
| events `crep:eagle:camera-click` / `crep:eagle:event-click` | overlay → app | full props + lat/lng |
| `map.__crepEaglePendingFc` | overlay internal | baked FC stashed before source exists |
| `map.__crepEagleCameraHandlersAttached` | overlay internal | once-only handler guard |

---

Files documented: `components/crep/layers/eagle-eye-overlay.tsx`, `lib/crep/cctv-registry.ts`, `lib/crep/caltrans-hls-resolve.ts`, `lib/crep/hls-live-config.ts`, `lib/crep/eagle-camera-normalize.ts`, `lib/crep/eagle-camera-map-icon.ts`, `lib/crep/eagle-viewport-sources.ts`, `lib/crep/use-viewport-eagle-prefetch.ts`, and `app/api/eagle/{sources,stream/[sourceId],hls-proxy,cam-image,cam-snapshot,youtube-embed}/route.ts`.

---

## 16. Devices & Telemetry

### Devices & Telemetry

The Devices & Telemetry domain covers the physical and registered MycoBrain hardware fleet that surfaces as markers on the CREP/Earth Simulator globe, the multi-tier device-discovery/telemetry APIs behind those markers, the per-device control plane, and the eight device-category map layers. Every Mycosoft device has a MycoBrain (ESP32-S3 + BME688 gas sensors + MQTT/MDP/MMP) inside; the feature's `device_type` selects which on-click widget opens.

#### 1. Data Sources & Merge Hierarchy

`/api/earth-simulator/devices` is the canonical device-marker endpoint. It merges up to five sources into a single `byId` map (`app/api/earth-simulator/devices/route.ts:18-24, :570-751`), where **later sources win** for the same id:

| Order | Source | `source` tag | Backend | Works on prod w/o LAN? |
|-------|--------|--------------|---------|------------------------|
| 1 | `KNOWN_DEVICE_CATALOG` (device-type roster) | `catalog` | Static — `lib/devices/catalog.ts` | Yes |
| 2 | `FIELD_MYCOBRAIN_DEPLOYMENTS` (3 fixed sites) | `field` | Static — `lib/devices/field-deployments.ts` | Yes |
| 3 | MAS device registry (MQTT/heartbeat) | `mas` | `GET {MAS}/api/devices?include_offline=true` | Yes |
| 4 | LAN operator probes (`:8787`) | `operator` | `probeAllOperatorAgents()` → `GET {agent}/api/status` | LAN only |
| 5 | Local MycoBrain serial service (`:8003`) | `live` | `GET {mycobrain}/devices` | LAN/host only |

- **MAS base URL** resolves to `http://192.168.0.188:8001` by default; loopback env values are rewritten to the LAN VM on the server unless `ALLOW_LOOPBACK_MAS=1` (`lib/mas-server-url.ts:9, :20-37`).
- **Local MycoBrain service URL**: `process.env.MYCOBRAIN_SERVICE_URL || MYCOBRAIN_API_URL || "http://localhost:8003"` (`route.ts:571-574`). The standalone resolver defaults to `http://192.168.0.196:8003`, also loopback-guarded (`lib/mycobrain-service-url.ts:24, :41-51`).
- **Operator URLs**: `MYCOBRAIN_OPERATOR_URLS`, default `http://192.168.0.228:8787,http://192.168.0.123:8787` (`lib/devices/operator-probe.ts:5-11`).

##### Caching, refresh, and bootstrap (`route.ts:59, :80-81, :803-897`)
- TTL: `DEVICES_CACHE_TTL_MS = 25_000` (25 s). Single in-flight refresh guarded by `devicesInFlight`.
- Query params: `?refresh=1` forces a background refresh; `?wait=1` or `?blocking=1` awaits the fresh payload before responding.
- **Cold start** returns a synchronous **bootstrap payload** (catalog + field seeds with a location, `cache.bootstrap:true`) and kicks off the real refresh (`buildBootstrapDevicesPayload`, `route.ts:554-568, :864-875`).
- Stale-while-revalidate: a cache older than TTL is returned immediately with `cache.stale:true, revalidating:true` while a refresh runs.
- Response envelope: `{ success, devices[], count, sources:{mas, operator, field_deployments}, mas_url, timestamp, cache }`.

##### Status stabilization / "online grace" (perf + flap suppression) (`route.ts:60-61, :753-793`)
- `stabilizeDevicePayload` keeps a module-level `lastConnectedDevices` map. A device that flips to `offline`/`stale`/`""` is held at its last `connected`/`online` status (with remembered telemetry/lastSeen/source) within a grace window:
  - **10 min** (`DEVICE_ONLINE_GRACE_MS`) for the 3 field operator devices (`FIELD_OPERATOR_DEVICE_IDS = {mushroom-1, hyphae-1, psathyrella-buoy-com4}`).
  - **2 min** for all other devices.
- Devices that are currently `connected`/`online` refresh their remembered snapshot each pass.
- Field rows without useful telemetry are pinned to `connected` rather than degraded to `offline` (`mergeMasDevice` `expectedFieldStatus`, `route.ts:483-496`; local-serial branch `:633-640`).

#### 2. The Three Physical Field MycoBrain Devices

Defined once server-side in `FIELD_MYCOBRAIN_DEPLOYMENTS` (`lib/devices/field-deployments.ts:24-70`) and mirrored client-side in `FIELD_MYCOBRAIN_SEED_DEVICES` (`CREPDashboardClient.tsx:1747-1813`). These seeds are the initial `devices` state, so the three field units render on first paint before any fetch resolves (`CREPDashboardClient.tsx:8094`).

| Field | Mushroom 1 | Hyphae 1 | Psathyrella Aquatic Buoy |
|-------|-----------|----------|--------------------------|
| `catalog_id` / marker id | `mushroom-1` | `hyphae-1` | `psathyrella-buoy-com4` |
| `registry_id` | `mycobrain-mushroom1-jetson-123` | `mycobrain-hyphae1-jetson-228` | `mycobrain-COM4` |
| `role` / `device_type` | `mushroom1` | `hyphae1` | `psathyrella` |
| `host_ip` | `192.168.0.123` | `192.168.0.228` | `192.168.0.241` |
| `agent_port` | `8787` | `8787` | `8003` |
| `agent_url` | `http://192.168.0.123:8787` | `http://192.168.0.228:8787` | `http://192.168.0.241:8003` (client seed uses `http://localhost:8003`) |
| `openclaw_url` | `http://192.168.0.123:18789` | `http://192.168.0.228:18789` | `""` |
| `location` (lat,lon) | `32.715736, -117.161087` | `32.640278, -117.085833` | `32.56289, -117.13570` |
| `location_label` | "San Diego, CA (Jetson WiFi)" | "Southwestern College, 900 Otay Lakes Rd, Chula Vista, CA" | "Project Oyster - North Reef buoy position" |
| `mdp_device_id` | `mycobrain-sidea-10b41d` | `mycobrain-sidea-10b41d` | `mycobrain-COM4` |
| `board_type` | `jetson_orin` | `jetson_orin` | "Psathyrella Aquatic MycoBrain buoy" |
| `page_href` | `/devices/mushroom-1` | `/devices/hyphae-1` | `/natureos/mycobrain?device=mycobrain-COM4` |
| Connection type (client) | `wifi` | `ethernet` | `usb-serial` |
| `gpsLockState` (client seed) | `locked` | `locked` | `site` |

Notes & known quirks:
- **Mushroom 1 / Hyphae 1 coordinate swap.** The catalog (`catalog.ts:27, :47`) assigns Mushroom 1 the Chula Vista coords (`32.640278, -117.085833`) and Hyphae 1 the San Diego coords (`32.715736, -117.161087`) — the **opposite** of `field-deployments.ts`. Because field seeds (order 2) override the catalog (order 1) by `catalog_id`, the field-deployment coordinates win in the merged output. The two units also share the same `mdp_device_id` (`mycobrain-sidea-10b41d`).
- **Seeded connected status.** All three field seeds ship `status: "connected"` (client) / are seeded `connected` (server `seedBaseDeviceRows`, `route.ts:530-549`). They only degrade to `offline` once a live source reports them down AND the grace window expires.
- The Psathyrella seed carries a `sensorData.marine` block (positionMode "Project Oyster position", wave/water/hydrophone fields null/"standby") even before telemetry (`CREPDashboardClient.tsx:1801-1811`).

##### Telemetry shape (BME688 + marine)
The client `Device.sensorData` type (`CREPDashboardClient.tsx:1701-1737`) carries flattened ambient metrics plus:
- `bmeChannels[]` — one entry per BME688 sensor: `{ id, label, address, bus, present, beginOk, subscribed, temperature, humidity, pressure, iaq, co2Equivalent, vocEquivalent }`. Psathyrella exposes two: **BME688 A — I2C-1 AMB @ 0x77** and **BME688 B — I2C-2 ENV @ 0x76** (`CREPDashboardClient.tsx:2043-2074, :8217-8248`).
- `marine` — `{ positionMode, waveHeightM, waterTemperatureC, wavePeriodS, hydrophoneLow, hydrophoneHigh, transducer }` (Psathyrella only).

Server-side BME normalization (`route.ts:210-289`) maps many firmware spellings into a canonical slot: `temperature_c` (← `temp_c`/`temperature`), `humidity_pct`, `pressure_hpa`, `gas_ohm` (← `gas_resistance_ohm`/`gas_resistance`), `iaq`, `co2_equivalent` (← `co2eq`/`eco2_ppm`), `voc_equivalent` (← `voc`/`bvoc_ppm`). `hasUsefulTelemetry()` (`route.ts:393-411`) gates whether a reading is "real" (drives status pinning and refresh attempts).

##### Psathyrella envelope/serial decoding (a domain-specific complexity)
Because the COM4 buoy ships **MDP `mycosoft.envelope.v1`** packets (sometimes truncated mid-wire), the route has a dedicated decode stack used only when a field device lacks useful telemetry:
- `buildPsathyrellaTelemetryFromSensorResponse` (`route.ts:335-370`) tries, in order: envelope regex extraction by unit (`normalizeBmeSlotFromEnvelopeRegex`, `:229-251`), JSON-fragment scan of mixed serial output (`parseJsonObjectsFromMixedSerial`, `:170-208`), `pack[]` array decoding by unit + id-suffix heuristics (`normalizeBmeSlotFromEnvelopePack`, `:254-289`), and legacy `bme688.a/b` / `bme1/bme2` slots.
- Telemetry-fetch fallback chain for Psathyrella (`route.ts:664-712`): local `/devices/{registry}/telemetry` → local `/devices/{serial}/telemetry` → re-parse `raw`/`envelope` → **sensor command snapshot** `POST /devices/{id}/command?command=read_sensors` (unless `EARTH_SIM_DEVICES_DISABLE_SENSOR_COMMAND_SNAPSHOT=1`) → network MAS snapshot.
- This fallback only runs when the buoy is connected, unless `EARTH_SIM_DEVICES_ENABLE_COM4_TELEMETRY_FALLBACK=1` (`route.ts:75-79, :671-676`).
- Each generic field deployment also gets one network-snapshot top-up attempt by `registry_id` then `mdp_device_id` when its telemetry isn't useful (`route.ts:714-735`).

##### Configurable timeouts (`route.ts:95-127`, bounded 250 ms–10 s)
| Env var | Default |
|---------|---------|
| `EARTH_SIM_DEVICES_TELEMETRY_TIMEOUT_MS` | 4500 |
| `EARTH_SIM_DEVICES_SENSOR_COMMAND_TIMEOUT_MS` | 3500 |
| `EARTH_SIM_DEVICES_LIST_TIMEOUT_MS` | 1200 |
| MAS device list fetch | 1200 (hardcoded, `:434`) |
| MAS per-device telemetry snapshot | 700 (hardcoded, `:105`) |

#### 3. Device-Type Catalog (`KNOWN_DEVICE_CATALOG`, `lib/devices/catalog.ts:18-119`)

The roster seeds the marker map with every device type even when no unit is live. `default_location` is `null` until a real unit reports GPS — so these never render as ghost pins (filtered by `d.location != null`, `route.ts:555, :737`).

| id | name | type | role | status | default_location |
|----|------|------|------|--------|------------------|
| `mushroom-1` | Mushroom 1 | `ground_droid` | mushroom1 | Development | `32.640278, -117.085833` |
| `sporebase` | SporeBase | `aerosol_collector` | sporebase | In production | null |
| `hyphae-1` | Hyphae 1 | `edge_io` | hyphae1 | In production | `32.715736, -117.161087` |
| `myconode` | MycoNode | `mesh_probe` | myconode | Enterprise | null |
| `psathyrella` | Psathyrella | `marine_buoy` | psathyrella | Program | null |
| `alarm` | ALARM | `indoor_safety` | alarm | Coming soon | null |
| `mycobrain-gateway` | MycoBrain gateway | `gateway_service` | gateway | Always-on (host) | null |
| `agaric-mini` | Agaric Mini | `uav` | agaric_mini | Development | null |
| `agaric-standard` | Agaric Standard | `uav` | agaric_standard | Development | null |
| `agaric-heavy` | Agaric Heavy-Lift | `uav` | agaric_heavy | Development | null |

All share `firmware_repo: "mycobrain/firmware"` (Agaric variants: `mycobrain/firmware/features/mycodrone`). Source of truth per file header: MAS repo `docs/DEVICES_REGISTRY_MAY03_2026.md` + `@device-tracker` agent.

#### 4. Device Telemetry API — `/api/natureos/devices/telemetry`

`force-dynamic` route (`app/api/natureos/devices/telemetry/route.ts`) that aggregates **real connected-device telemetry** across three backends and returns a flat array (no envelope). `fetchRealDeviceTelemetry` order (`:225-345`):

1. **Local MycoBrain service** `GET {mycoBrainUrl}/devices` → deviceId `mycobrain-{port}`, reads `sensor_data.bme688_1/_2`, `device_info.uptime/lora_status/firmware/mdp_version` (`:234-283`). Timeout `MYCOBRAIN_SERVICE_TIMEOUT_MS` (1200).
2. **Wi-Fi operator endpoints** (`OPERATOR_DEVICE_URLS`, default the two `:8787` Jetsons) — `fetchOperatorDevice` reads `GET /api/status` (parses `lastLines[]` JSON telemetry frames + `lastSensorReading`) and `GET /api/sensor`, deduped by `sensor_slot|address|node_id|device_id` (`:167-222`). `normalizeOperatorReading` resolves the site via `deploymentByHost` and surfaces compensated metrics (`temperature_c_comp`, `humidity_pct_comp`, `gas_resistance_ohm_comp`, `iaq_static`, `iaq_accuracy`, `gas_percentage`, `eco2_ppm`, `bvoc_ppm`, `valid`) (`:114-165`). Timeouts: status 4500 ms, sensor 1800 ms.
3. **MINDEX** `GET {mindexUrl}/api/devices?type=mycobrain` (offline devices included), only if not already present (`:294-329`). Timeout `MINDEX_DEVICE_TIMEOUT_MS` (1500).
4. **Earth Simulator registry fallback** `GET /api/earth-simulator/devices` normalized via `normalizeEarthSimDevice` (`:46-112`), deduped against existing ids/registryIds. Timeout `EARTH_DEVICE_FALLBACK_TIMEOUT_MS` (1200). This is also the top-level catch-all if the whole pass throws.

Output per device: `{ deviceId, deviceType, timestamp, location:{latitude,longitude,source}, status:"active"|"inactive", metrics:{temperature, humidity, pressure, iaq, eco2, bvoc, gasResistance, sensor2:{...}|null, uptime, ...}, port, firmware, connected, lastSeen, source, registryId, locationLabel }`.

**Default location fallbacks (hardcoded):**
- Earth-sim normalizer / operator normalizer default to **`32.6401, -117.0842`** (Chula Vista) with `source:"site-default"` (`:31-33, :64-65`).
- MycoBrain-service and MINDEX paths default to **`40.7128, -74.006`** (NYC) when a device has no location (`:252, :313`) — an inconsistency with the Chula Vista default elsewhere.

Debug logging is gated on `CREP_DEBUG_DEVICE_TELEMETRY=1`.

#### 5. MINDEX Devices BFF — `/api/mindex/devices`

Thin proxy to the MINDEX FastAPI device registry with an Earth-Simulator fallback (`app/api/mindex/devices/route.ts`).
- Query params: `page` (default 1), `pageSize` (default 50), `type`.
- If `env.integrationsEnabled` is false (requires `INTEGRATIONS_ENABLED=true` **or** `MINDEX_API_KEY` + a MINDEX URL — `lib/env.ts:61-63`), it falls back to `/api/earth-simulator/devices?refresh=1&wait=1` (6.5 s timeout), client-filters by `type`/`role`/`device_type`, and returns `{ data, devices, meta, total, source:"earth-simulator-devices-fallback", dataSource, upstream }` with header `X-MINDEX-Warning: mindex-devices-unavailable-using-earth-simulator-devices` (`:19-72`).
- When enabled it calls `getDevices({page,pageSize})` (`lib/integrations/mindex.ts:106-113` → `GET /devices?page&page_size`), filters by `type`, and on error repeats the same Earth-Simulator fallback. MINDEX auth uses `X-API-Key` (+ optional `x-internal-token`), base URL `resolveMindexServerBaseUrl()` → `http://192.168.0.189:8000` (loopback-guarded, `lib/mindex-base-url.ts:25, :51-76`). Debug: `CREP_DEBUG_MINDEX_DEVICES=1`.

#### 6. Mycosoft-Devices proxy — `/api/crep/mycosoft-devices`

The endpoint named in the map source comment (`CREPDashboardClient.tsx:18927`). `nodejs`/`force-dynamic` (`app/api/crep/mycosoft-devices/route.ts`). Pulls from `GET /api/mindex/proxy/devices?limit=10000` and shapes each into `{ id, device_type, mycobrain_id, name, lat, lng, status, last_seen, firmware, mqtt_topic, owner }`. `device_type` is derived from an explicit tag or the id prefix `<type>-<serial>` (`deriveDeviceType`, `:46-57`), constrained to `mushroom1|hyphae1|sporebase|myconode|alarm|psathyrella|mycobrain`. Default `mqtt_topic`: `mycosoft/devices/{id}/telemetry`. Returns `{ source, total, by_type, devices, generatedAt, note }`; cache `s-maxage=15, swr=60`. **Known limitation:** returns an empty list until devices auto-register with MINDEX over the Jetson-MycoBrain MQTT bridge; the CREP filter toggles exist regardless (Morgan rule: "filters must exist").

#### 7. MQTT / MDP / MMP Backend

MQTT config and topic templates live in `lib/devices/mqtt-config.ts`:
- Broker: `MQTT_BROKER_HOST` (default `localhost`), `MQTT_BROKER_PORT` (1883), `MQTT_PROTOCOL` (`mqtt`), optional user/pass; clientId `natureos-{env}-{ts}` (`:40-48`).
- Wildcard subscriptions (`:49-55`): telemetry `natureos/devices/+/telemetry`, commands `natureos/devices/+/commands`, status `natureos/devices/+/status`, discovery `natureos/discovery`, events `natureos/events/#`.
- QoS: telemetry 0, commands 1, events 1 (`:56-60`).
- Per-device templates (`:72-92`): `natureos/devices/{id}/{telemetry|commands|status|config}` and MycoBrain-specific `mycobrain/{id}/{telemetry|sensors|commands|response}`.
- Telemetry message schema (`TelemetryMessage`, `:97-129`): `{ deviceId, timestamp, type:"sensor"|"status"|"event"|"heartbeat", data:{temperature, humidity, pressure, gasResistance, iaq, co2, voc, uptime, freeHeap, wifiRssi, batteryLevel, ...}, metadata:{firmwareVersion, hardwareVersion, location} }`.

Note: the `defaultMQTTConfig` topics use the `natureos/...` namespace while the mycosoft-devices proxy emits `mycosoft/devices/...` topics — the two namespaces coexist.

#### 8. Per-Device Control Plane

The device widget routes commands through `sendSelectedDeviceControl` / `DeviceMarker.sendControl` (`CREPDashboardClient.tsx:4304-4341, :8269-8304`). Routing:
- **COM4 / Psathyrella** (registry `mycobrain-COM4` or port `COM4`) → `POST /api/mycobrain/{port|registry}/control` with `{ peripheral, action, ...params }` (local serial).
- **All other registry devices** → `POST /api/devices/network/{registryId}/command` with `{ command, params, timeout:5 }`.

`/api/devices/network/[deviceId]/command/route.ts` (`requireAdmin` gated, `:213-214`) resolves the command via `networkCommandToOperator` and tries, in order:
1. **Local serial** for `:8003` field deployments — guarded by `isSafeLocalSerialCommand` (`:23-64`): blocks `flash/erase/factory/bootloader/ota/format` and GPIO/pin/I²C-reconfig; allows status/sensor/scan + actuator commands (`beep`, `led rgb/brightness/pattern rainbow`, `coin`, `bump`, `1up`, `morgio`, etc.). A blocked low-level command returns **HTTP 423** "COM4 safety interlock active" (`:148-161`).
2. **Field operator** `:8787` `POST /api/cmd` `{cmd}` (`forwardFieldOperatorCommand`, `:66-136`) — the fast path for the two Jetsons; no delayed MAS fallback is queued (to avoid commands physically firing late).
3. **MAS** `POST {MAS}/api/devices/{id}/command`, with field-operator fallback on failure (`:243-281`).

`MAS_API_URL` here is the raw `process.env.MAS_API_URL || "http://localhost:8001"` (not the loopback-guarded resolver). `/api/devices/network/[deviceId]/telemetry/route.ts` mirrors this: field-operator probe first, then MAS per-device telemetry, then MAS registry snapshot.

Control-result handling: `earthDeviceControlResultOk` accepts `success`/`status:"ok"`/`ok`/`result.ok!==false`; failures toast a context-aware message — auth failures (401/403 or "admin"/"unauthorized") → "Admin sign-in required…"; field devices → "Command relay did not confirm. This field device still reports online." (`CREPDashboardClient.tsx:1902-1928`). The `earthSimControlToOperatorCommand` mapper distinguishes neopixel rainbow/off, buzzer beep, and raw `cmd` actions (`:4312-4317`).

#### 9. Client-Side Device State, Fetch Loop & Markers

##### State and fetch loops
- `devices` state initialized to the 3 field seeds (`CREPDashboardClient.tsx:8094`); also mirrored to `window.__crep_field_mycobrain_devices`, `__crep_devices`, `__crep_mycosoft_devices` for QA hooks.
- **Primary fetch loop** (`:8102-8150`): first call hits `EARTH_DEVICE_LIST_FAST_URL = /api/earth-simulator/devices` (cached), subsequent calls hit `EARTH_DEVICE_LIST_LIVE_URL = …?refresh=1`. Interval **30 s**, plus a one-shot **7.5 s** startup refresh and a refresh on `visibilitychange`. List fetch timeout 5000 ms (`EARTH_DEVICE_LIST_FETCH_TIMEOUT_MS`); control fetch 6500 ms. Skipped when `auditAllOffMode`, `isEmbeddedEarthquakeSearch`, or `assetIsolationMode`.
- **Secondary loop** inside the broader CREP data pass (`:10904-10929`): also hits the `refresh=1` URL but **circuit-breaks after 3 consecutive failures** (`window.__crep_mycobrain_fails`) and is skipped entirely on the Earth Simulator route or when the `mycobrain` layer is disabled.
- Incoming rows pass through `normalizeFieldMycoBrainDevices` (`:1975-2099`) then `mergeFieldMycoBrainDevices` (`:1872-1890`). The merge re-seeds the 3 field devices each cycle, `stabilizeFieldDevice` (`:1857-1870`) restores seed lat/lng when an incoming row reports near-zero coords (`|coord| ≤ 0.1`) and forces connected-like statuses to `connected`. `canonicalFieldMycoBrainKey` (`:1820-1839`) dedupes the field trio across id/registryId/port aliases (including legacy `bench-com4`).

Location validity guard (`:1985-1987`): a row needs finite lat/lng with `|lat|>0.1 && |lng|>0.1` and is rejected if it lands on the Null-Island-ish Vancouver default (`~49,−123`) — except Psathyrella, which is always pinned to `PSATHYRELLA_COM4_LOCATION = {32.56289, −117.13570}`.

##### Map rendering (two parallel renderers)
1. **MapLibre GeoJSON source + circle layers** `crep-mycosoft-devices` with `crep-mycosoft-devices-glow` and `-core` (`:18932-18986`). Created with an empty FC; populated by an effect that builds features only for enabled device types (`:16219-16293`).
   - **Zoom/LOD (interpolated circle-radius):** glow `[zoom 2→4, 6→6, 10→9, 14→14]`; core `[zoom 2→1.6, 6→2.5, 10→4, 14→6.5]` (`:18939, :18965`).
   - **Color by status then type:** offline/stale/inactive/unknown/error → `#ef4444`; else `match device_type`: mushroom1 `#a855f7`, hyphae1 `#f97316`, sporebase `#10b981`, myconode `#06b6d4`, alarm `#ef4444`, psathyrella `#38bdf8`, default `#22c55e` (`:18940-18954, :18966-18980`). Core has a white 1.2px stroke (MycoBrain signature).
   - **Per-type filter:** a MapLibre `["in", ["get","device_type"], ["literal", enabledTypes]]` expression hides feature types whose sub-layer toggle is off; whole source hidden when `mycobrain` is off or `enabledTypes` is empty (`:16206-16215`).
   - **Click** → reads `device_type` (or id-prefix regex `^(mushroom1|hyphae1|sporebase|myconode|alarm|psathyrella)`), calls `window.__crep_openDeviceWidget(payload)`, falling back to the generic InfraAsset panel, and dispatches `crep:device:click` (`:18995-19032`).
2. **DOM `<DeviceMarker>` markers** (`:21972-22007`), rendered only when `shouldRenderDeviceDomMarkers` (`= !auditAllOffMode && !isEmbeddedEarthquakeSearch && !assetIsolationMode`, `:13720`) **and** the `mycobrain` layer is enabled. Dedupes by id and drops `(0,0)` / non-finite positions. Field MycoBrain markers render a larger boxed `<Box>` icon with a stronger glow; others use a type emoji. Selecting a marker mounts `<DeviceWidget>` (`components/crep/devices/DeviceWidget.tsx`) with GPS-state badge, status orb, signal bars, sparkline telemetry cards, and quick-control buttons fed by a per-device in-memory history ring buffer.

`__crep_openDeviceWidget` (`:8155-8263`) either selects a matching device by id/registryId/port or synthesizes a `Device` from the click payload (full BME-channel + marine reconstruction for Psathyrella, `:8217-8257`).

#### 10. Device-Category Map Layers

Eight `category: "devices"` `LayerConfig` entries, **all `enabled: true` by default** (`CREPDashboardClient.tsx:9994-10002`):

| Layer id | Name | Icon | Color | Opacity | Data status / source | Notes |
|----------|------|------|-------|---------|----------------------|-------|
| `mycobrain` | MycoBrain Devices | Radar | `#22c55e` | 1 | **real** / "MAS Devices" | Master device-layer gate — when off, the GeoJSON source and all DOM markers are hidden |
| `devMushroom1` | Mushroom 1 | Cpu | `#a855f7` | 1 | (no metadata entry) | Adds `mushroom1` to enabled types |
| `devHyphae1` | Hyphae 1 | Cpu | `#f97316` | 1 | (no metadata entry) | Adds `hyphae1` |
| `sporebase` | SporeBase | Cpu | `#10b981` | 1 | **planned_real** / "SporeBase" | Adds `sporebase` |
| `devMycoNode` | MycoNode | Wifi | `#06b6d4` | 1 | (no metadata entry) | Adds `myconode` (Jetson + MQTT/MDP/MMP bridge) |
| `devAlarm` | Alarm | Shield | `#ef4444` | 1 | (no metadata entry) | Adds `alarm` |
| `devPsathyrella` | Psathyrella (Buoy) | Waves | `#38bdf8` | 1 | (no metadata entry) | Adds `psathyrella` |
| `partners` | Partner Networks | Wifi | `#06b6d4` | 0.8 | **planned_real** / "Partner Networks" | Third-party research stations |
| `smartfence` | Smart Fence Network | Shield | `#06b6d4` | 1 | **planned_real** / "MycoBrain Fence" | MycoBrain fence sensors for wildlife corridors |

`layerMetadataById` (`:9934-9981`) tags `mycobrain` as **real** ("MAS Devices") and `sporebase`/`partners`/`smartfence` as **planned_real**. The six `devMushroom1/devHyphae1/devMycoNode/devAlarm/devPsathyrella` (and `sporebase` as a sub-type) act purely as per-type **filters** of the `mycobrain` GeoJSON source — only `mushroom1|hyphae1|sporebase|myconode|alarm|psathyrella` map to enabled `device_type`s (`:16199-16204`); **`partners` and `smartfence` have no marker rendering wired and are toggle-only placeholders** (no live source). `mycobrain` is the master gate: with it off, `vis="none"` for the whole source regardless of sub-toggles (`:16197, :16206-16217`).

##### `groundFilter` ↔ `layers` toggle plumbing
A subset of device layers is also driven by the `groundFilter` object (voice/MYCA control + embedded modes):
- `groundFilter → layers` sync (`:13105-13144`): `mycobrain↔showMycoBrain`, `sporebase↔showSporeBase`, `smartfence↔showSmartFence`, `partners↔showPartnerNetworks`. (`devMushroom1/devHyphae1/devMycoNode/devAlarm/devPsathyrella` are **not** in this map — they are toggled only from the layer panel.)
- Voice/MYCA command aliases (`:13161-13162`): `mycobrain`, `sporebase`, `smartfence`, `partners`.
- Default `groundFilter` "Sensors — on by default": `showMycoBrain/showSporeBase/showSmartFence/showPartnerNetworks: true` (`:9799-9802`).
- **Audit/all-off default** flips all four sensor flags to `false` (`makeAllOffGroundFilter`, `:3260-3263`).
- Embedded-mode device gating: `embeddedAllowsDevices = embeddedAllowsAny("mycobrain","devMushroom1","devHyphae1","sporebase","devMycoNode","devAlarm","devPsathyrella")` (`:7941`); embedded `groundFilter` derives `showMycoBrain/showSporeBase/showSmartFence/showPartnerNetworks` from the allowed layer set (`:10517-10520`).

#### 11. Known Limitations & Edge Cases

- **MINDEX device registry is effectively empty in current deployments** — both `/api/mindex/devices` and `/api/crep/mycosoft-devices` fall back to (or return) empty/Earth-Sim data; the device fleet shown is the 3 seeded field units plus whatever the MAS registry / LAN agents report.
- **`partners` and `smartfence` layers have no backing data source or marker renderer** — they are deliberate UI placeholders.
- **Mushroom 1 / Hyphae 1 coordinate disagreement** between `catalog.ts` and `field-deployments.ts` (field wins); both share one `mdp_device_id`.
- **Inconsistent default coordinates** in the telemetry route: Chula Vista (`32.6401,−117.0842`) vs NYC (`40.7128,−74.006`) depending on which backend produced the row.
- **LAN-dependence:** operator (`:8787`) and local-serial (`:8003`) sources only resolve from a host on the lab LAN; on prod the map relies on catalog + field seeds + MAS-VM registry. Loopback env values for MAS/MINDEX/MycoBrain are silently rewritten to LAN VM IPs unless the matching `ALLOW_LOOPBACK_*` escape hatch is set.
- **COM4 safety interlock** blocks firmware/GPIO/I²C-reconfig commands (HTTP 423); all network commands require an admin session.
- **Status "stickiness":** the 10-min (field) / 2-min (other) online-grace window means a marker can read `connected` for minutes after a device actually drops — intentional flap suppression, but it can mask short outages.
- **Map-source comment drift:** the GeoJSON source comment references `/api/crep/mycosoft-devices` as the populator, but the live client effect actually fills `crep-mycosoft-devices` from the `devices` React state (sourced from `/api/earth-simulator/devices`).

Relevant files: `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\app\api\earth-simulator\devices\route.ts`, `…\app\api\natureos\devices\telemetry\route.ts`, `…\app\api\mindex\devices\route.ts`, `…\app\api\crep\mycosoft-devices\route.ts`, `…\app\api\devices\network\[deviceId]\command\route.ts`, `…\app\api\devices\network\[deviceId]\telemetry\route.ts`, `…\lib\devices\field-deployments.ts`, `…\lib\devices\catalog.ts`, `…\lib\devices\operator-probe.ts`, `…\lib\devices\dev-bench-location.ts`, `…\lib\devices\mqtt-config.ts`, `…\lib\integrations\mindex.ts`, `…\lib\mas-server-url.ts`, `…\lib\mindex-base-url.ts`, `…\lib\mycobrain-service-url.ts`, and `…\app\dashboard\crep\CREPDashboardClient.tsx`.

---

## 17. Device Ingestion, Sensors, Transit & Jurisdiction

### Device Telemetry, Environmental Sensors, Live Transit & Jurisdiction Engine

This section documents the device data path (MycoBrain telemetry ingestion → device-widget mapping → live map status), the environmental-sensor plumbing (AirNow AQI, NDBC buoys, viewport caches), the live transit aggregation layer, and the jurisdiction/boundary engine (country/state/county/FEMA boundaries, government seals, country government profiles) used by the CREP dashboard at `/natureos/earth-simulator` (route source: `app/dashboard/crep/CREPDashboardClient.tsx`).

---

#### 1. MycoBrain Device Telemetry Ingestion

##### 1.1 Ingestion topology (MQTT / MDP / MMP → event bus)

The device telemetry plane has three ingest surfaces, fanning into the OEI event bus and the CREP map source `crep-mycosoft-devices`.

| Surface | Transport | Source file | Notes |
|---|---|---|---|
| MQTT broker bridge | `mqtt://` (MQTT.js) | `lib/devices/mqtt-service.ts` | Subscribes to device topics, normalizes payloads to OEI observations/entities/events |
| Operator HTTP probe | HTTP `GET /api/status` + `/api/sensor` | `app/api/natureos/devices/telemetry/route.ts:167` (`fetchOperatorDevice`) | Wi-Fi boards exposing direct serial-bridge JSON on the LAN |
| MycoBrain service / registry | HTTP `GET {service}/devices`, MINDEX `/api/devices` | `app/api/natureos/devices/telemetry/route.ts:225` (`fetchRealDeviceTelemetry`) | Includes offline devices; merged by `deviceId` |
| SSE stream (client) | `EventSource` `/api/mycobrain/stream` | `lib/mycobrain-connector.ts:23` | Browser-side live event stream; payload requires `{type, timestamp}` |

###### MQTT topic templates (`lib/devices/mqtt-service.ts:61`, `MQTT_TOPICS`)

| Group | Telemetry | Status | Command | Event/Uplink |
|---|---|---|---|---|
| `MYCOBRAIN` | `mycobrain/+/telemetry` | `mycobrain/+/status` | `mycobrain/{deviceId}/command` | `mycobrain/+/event` |
| `IOT` | `iot/+/telemetry` | `iot/+/status` | `iot/{deviceId}/command` | `iot/+/event` |
| `LORAWAN` (ChirpStack) | — | `application/+/device/+/event/status` | `application/{appId}/device/{devEUI}/command/down` | `application/+/device/+/event/up` (uplink), `.../event/join` |
| `HOMEASSISTANT` | — | `homeassistant/+/+/state` | `homeassistant/+/+/set` | `homeassistant/+/+/+/config` (discovery) |
| `NATUREOS` | `natureos/observation/+` | — | `natureos/command/+` | `natureos/event/+`, `natureos/entity/+` |

- Broker config defaults: `MQTT_BROKER_URL` (default `mqtt://localhost:1883`), `MQTT_USERNAME`, `MQTT_PASSWORD`, `reconnectPeriod=5000ms`, `keepalive=60s`, `cleanSession=true`, random `clientId` `natureos_<hex8>` (`mqtt-service.ts:118-129`). Subscriptions use `qos:1` (`mqtt-service.ts:245`). Publishing queues messages while disconnected and flushes on connect (`mqtt-service.ts:313`, `flushMessageQueue` at `:648`).
- `subscribeToAllDevices()` (`:284`) subscribes to MycoBrain telemetry/status/event, IOT telemetry/status/event, LoRaWAN uplink/join, and Home Assistant state/discovery.
- **Message routing** (`handleMessage` `:362`): pattern-matched handlers (`+`/`#` wildcards via `topicMatches` `:626`) plus a topic-substring switch — `/telemetry` → `processTelemetry`, `/status` → `processStatus`, `/event` → `processEvent`, `homeassistant/` → `processHomeAssistant`, `/event/up` → `processLoRaWAN`.

###### Telemetry → OEI observation mapping (`mqtt-service.ts:554`, `telemetryToObservations`)

Topic `<deviceType>/<deviceId>/telemetry` is parsed; each reading becomes an `Observation` with `entityId = "<deviceType>_<deviceId>"`, `reliability: 1.0`. Reading keys are normalized to observation types and units:

| Reading key(s) | Obs type (`mapReadingType` `:580`) | Unit (`mapReadingUnit` `:604`) |
|---|---|---|
| `temp`, `temperature` | `temperature` | `celsius` |
| `humidity`, `hum` | `humidity` | `percent` |
| `pressure` | `pressure` | `hPa` |
| `co2` | `co2` | `ppm` |
| `voc` | `voc` | `ppb` |
| `iaq` | `iaq` | `index` |
| `gas` | `gas_resistance` | `ohms` |
| `pm25`, `pm10` | `air_quality` | `µg/m³` |
| `light` | `light` | `lux` |
| `motion`, `door` | `motion`/`door` | — |
| `battery` | `battery` | `volt` |
| (unmapped) | `custom` | `""` |

Non-reading keys (`timestamp`, `location`, `metadata`, `deviceId`) are excluded. Status messages publish a `device` entity with `status: active/inactive` from `status.online`. LoRaWAN uplinks decode `uplink.object` into per-key observations (`reliability: 0.95`, `source: "chirpstack"`).

###### MDP / MMP (firmware protocol versions)

The MDP (MycoBrain Data Protocol) version is surfaced from device telemetry but not parsed in the web layer — it is read as a passthrough field. In `app/api/natureos/devices/telemetry/route.ts:270`, firmware is resolved as `device.device_info?.firmware || device.device_info?.mdp_version`. The operator-probe path consumes raw serial JSON lines where only objects with `type === "telemetry"` are kept (`:186`), keyed by `sensor_slot || address || node_id || device_id`. The dual-sensor (BME688 A/B) shape is read from `bme688.a/b`, `bme1/bme2`, or `bme688_1/bme688_2` (`:54-56`, `:245-246`).

##### 1.2 Operator telemetry normalization (`fetchOperatorDevice` / `normalizeOperatorReading`)

- Operator device URLs come from `MYCOBRAIN_OPERATOR_URLS` (default `http://192.168.0.228:8787,http://192.168.0.123:8787`, `route.ts:8`).
- Timeouts (env-tunable): service `MYCOBRAIN_SERVICE_TIMEOUT_MS=1200`, operator status `=4500`, operator sensor `=1800`, MINDEX device `=1500`, earth-sim fallback `=1200` (`route.ts:15-19`).
- `normalizeOperatorReading` (`:114`) maps firmware fields → metrics: `temperature_c_comp`/`ambient_temperature_c`/`temperature_c` → `temperature`; compensated humidity/gas; `iaq`, `iaq_static`, `iaq_accuracy`, `eco2_ppm`, `bvoc_ppm`, `gas_percentage`, `uptime_s`, `sensor_slot`, `address`, `valid`. Device identity & location resolve from `deploymentByHost(host)` (`lib/devices/field-deployments.ts`) with catalog_id/role/location/registry_id; falls back to default coordinates `32.6401, -117.0842` (Imperial Beach lab) (`:31`, `:64-65`).
- Merge order in `fetchRealDeviceTelemetry` (`:225`): (1) MycoBrain service `/devices`, (2) operator HTTP, (3) MINDEX `/api/devices?type=mycobrain` (offline included, deduped by `deviceId`), (4) Earth Simulator registry fallback (`/api/earth-simulator/devices`). On total failure it returns the earth-sim fallback only (`:343`).

##### 1.3 Live device map source (`/api/crep/mycosoft-devices`)

Source file: `app/api/crep/mycosoft-devices/route.ts`. `runtime="nodejs"`, `dynamic="force-dynamic"`.

- **Pipeline (documented in header `:14`):** (1) MINDEX devices layer `/api/mindex/proxy/devices?limit=10000` (canonical registry), (2) MQTT broker bridge overlay (live telemetry by `mycobrain_id`), (3) Home Assistant bridge.
- `deriveDeviceType` (`:46`): uses the tagged type if in the allowed set, else the ID prefix `^<type>-` (e.g. `mushroom1-a3f2`), else `"mycobrain"`. Allowed `device_type` union: `mushroom1 | hyphae1 | sporebase | myconode | alarm | psathyrella | mycobrain`.
- Output device shape (`MycoDevice`, `:32`): `id, device_type, mycobrain_id, name, lat, lng, status (online|offline|unknown), last_seen, firmware, mqtt_topic, owner`. `mqtt_topic` defaults to `mycosoft/devices/<id>/telemetry` (`:77`).
- Response: `{ source: "mycosoft-devices", total, by_type: {…}, devices, generatedAt, note }`. Returns empty list when registry is empty (filter toggles remain active by Morgan's "filters must exist" rule). Cache header `public, s-maxage=15, stale-while-revalidate=60`, `X-Source: mindex`.
- **Map wiring** (`CREPDashboardClient.tsx`): source `crep-mycosoft-devices` (geojson, `generateId: true`) added at `:18932`; layers `crep-mycosoft-devices-glow` (`:18935`) and `crep-mycosoft-devices-core` (`:18961`); click opens device widget (`:18995`); hover preview bound (`:19033`); per-device-type `setFilter` (`:16213`). Feature properties pushed include marine fields (`wave_height_m`, `water_temperature_c`, `wave_period_s`, `hydrophone_low/high`, `transducer`) and dual-BME688 B-side fields (`bme_b_iaq`, `bme_b_eco2_ppm`, `bme_b_bvoc_ppm`) — `:16280-16289`.

##### 1.4 Device-type → widget mapping (`lib/crep/device-widget-mapper.tsx`)

Maps a device-type string to a visualization config and icon. **NO MOCK DATA** — all device data comes from the MAS/MINDEX registry (header `:9`).

**Device roles** (`MycoBrainDeviceRole`, `:34`): `mushroom1`, `hyphae1`, `sporebase`, `psathyrella`, `gateway`, `science_comms`, `side_a`, `side_b`, `portable`, `standalone`, `unknown`.

**`parseDeviceRole(deviceType?)`** (`:265`): lowercases and strips non-alphanumerics, then substring-matches. Default with no input → `standalone`; no match → `unknown`. Match table:

| Input contains | Role |
|---|---|
| `mushroom` / `mushroom1` | `mushroom1` |
| `hyphae` / `hyphae1` | `hyphae1` |
| `spore` / `sporebase` | `sporebase` |
| `psathyrella` / `buoy` / `aquatic` / `marine` | `psathyrella` |
| `gateway` | `gateway` |
| `science` / `comms` / `sciencecomms` | `science_comms` |
| `sidea` | `side_a` |
| `sideb` | `side_b` |
| `portable` / `mobile` / `field` | `portable` |
| `standalone` / `generic` | `standalone` |

**`DEVICE_WIDGET_CONFIG`** (`:77`) per role — icon (lucide), emoji, color/bg/border/glow, label, description, primary metric, secondary metrics, capability flags:

| Role | Emoji | Glow | Primary metric | Secondary metrics | Key capabilities |
|---|---|---|---|---|---|
| `mushroom1` | ▣ | `#22c55e` | `iaq` | temperature, humidity, co2Equivalent | BME688, WiFi |
| `hyphae1` | ▣ | `#06b6d4` | `iaq` | temperature, humidity, co2Equivalent | BME688, WiFi |
| `sporebase` | 🦠 | `#a855f7` | `sporeCount` | humidity, temperature, airflow | BME688, Spectroscopy, WiFi |
| `psathyrella` | ◈ | `#2dd4bf` | `iaq` | hydrophoneLow, hydrophoneHigh, waveHeight | BME688, LoRa, GPS, Motion |
| `gateway` | 📡 | `#06b6d4` | `connectedDevices` | signalStrength, uptime, bandwidth | LoRa, WiFi, Bluetooth |
| `science_comms` | 🛰️ | `#3b82f6` | `dataRate` | latency, packetLoss, range | LoRa, WiFi, GPS |
| `side_a` | 🧪 | `#f59e0b` | `temperature` | humidity, co2, lightLevel | BME688, UV, WiFi |
| `side_b` | 🔬 | `#ec4899` | `temperature` | humidity, co2, lightLevel | BME688, Camera, WiFi |
| `portable` | 📻 | `#22c55e` | `battery` | temperature, humidity, gps | BME688, LoRa, GPS, Bluetooth |
| `standalone` | 🖥️ | `#6b7280` | `temperature` | humidity, uptime | BME688, WiFi |
| `unknown` | ❓ | `#4b5563` | `status` | (none) | (none) |

**Helpers:**
- `getDeviceWidgetConfig` / `getDeviceIcon` / `getDeviceEmoji` (`:288-305`).
- `getDeviceMarkerStyle(deviceType, isOnline=true)` (`:310`): online uses config colors; offline forces red (`bg-red-500/20`, `border-red-500`, glow `#ef4444`, `text-red-400`) — this is the **live status source** for marker color (online vs offline).
- `formatSensorValue(metric, value)` (`:323`): units — `°C`, `%`, `hPa`, `IAQ N`, `ppm` (co2/co2Equivalent), `ppb` (voc/vocEquivalent), `kΩ` (gasResistance, ÷1000), `%` (battery), uptime via `formatUptime` (`s/m/h/d`, `:361`), `dBm` (signalStrength), `kbps` (dataRate), `N devices` (connectedDevices). Missing → `N/A`.
- `getIAQQuality(iaq)` (`:371`): ≤50 Excellent (green), ≤100 Good (emerald), ≤150 Moderate (yellow), ≤200 Poor (orange), else Hazardous (red).
- `getDeviceWidgetType(deviceType)` (`:393`) → which specialized widget renders: `environmental` (mushroom1/standalone), `spore-analysis` (sporebase), `marine-buoy` (psathyrella), `network` (gateway), `scientific` (science_comms), `chamber` (side_a/side_b), `portable`, else `basic`.

---

#### 2. Environmental Sensor Plumbing

##### 2.1 AirNow AQI hook (`lib/crep/use-airnow-aqi.ts`)

Client hook (`"use client"`) giving widgets live EPA AirNow AQI for the nearest monitor — no manual refresh, pauses while backgrounded.

- **Signature:** `useAirNowAQI(lat?, lng?, radiusMi = 25)` → `AirNowHookState`.
- **States** (`:48`): `idle | loading(data?) | ok(data, updated_at) | err(message, data?) | unavailable` (HTTP 501 = key not configured).
- **Refresh:** `REFRESH_MS = 10 * 60_000` (10 min; `:55`). Fetches on mount; re-fetches every 10 min only while `!document.hidden`; on `visibilitychange` returning to foreground, refreshes immediately if away > `REFRESH_MS` (`:103-107`).
- **Request:** `GET /api/crep/airnow/current?lat=&lng=&distance=<radiusMi>` with `AbortSignal.timeout(15_000)` (`:75`). Guards non-finite lat/lng → `idle`. Never throws (returns `err`).
- **Data shape** (`AirNowData`, `:37`): `reporting_area, state, observations[], dominant, site_count, cached_at, ttl_s, coordinates{lat,lng,radius_mi}`. Each `AirNowObservation`: `parameter, parameter_raw, aqi, category{number,name,color}, observed_at, lat, lng, agency, state`.

###### AirNow proxy route (`app/api/crep/airnow/current/route.ts`)

`runtime="nodejs"`, `dynamic="force-dynamic"`. Key via `getAirNowApiKey()` (`lib/airnow-key.ts`); missing → **501** `{error:"AIRNOW_API_KEY not configured"}`.

- **Params:** `lat`/`latitude`, `lng`/`lon`/`longitude`, `distance` (miles, clamped 1–100, default 25), `ttl` (seconds; clamped to 60s–3600s, default 600s) (`:115-119`).
- **Upstream:** `https://www.airnowapi.org/aq/observation/latLong/current/?format=application/json&latitude=&longitude=&distance=&API_KEY=`, `User-Agent: MycosoftCREP/1.0`, timeout 12s (`:134-144`). Upstream error → 502 with `upstream_body` (first 400 chars).
- **Two-tier cache** (`:39-76`): in-memory `Map` + disk JSON under `var/cache/airnow/current-<base64url key>.json`, keyed `lat(3dp),lng(3dp)|distanceMi`. Cache hit → `X-AirNow-Cache: hit`; miss writes both tiers, `X-AirNow-Cache: miss`. Response `Cache-Control: public, max-age=60`.
- **EPA AQI category** (`categoryFromAQI` `:90`): ≤50 Good `#00e400`; ≤100 Moderate `#ffff00`; ≤150 Unhealthy for Sensitive Groups `#ff7e00`; ≤200 Unhealthy `#ff0000`; ≤300 Very Unhealthy `#8f3f97`; else Hazardous `#7e0023`.
- **Parameter labels** (`:99`): `O3→Ozone`, `PM25/PM2.5→PM2.5`, `PM10`, `CO`, `NO2→NO₂`, `SO2→SO₂`.
- `dominant` = observation with max AQI (`:169`).

On the dashboard, AQI is painted by `LiveAqiLayer` gated by `liveAqiLayerReady && mapZoom >= 5.5 && layers["liveAqi"].enabled` and the off-modes (`CREPDashboardClient.tsx:22501`).

##### 2.2 NDBC Buoys (`/api/oei/buoys` + disk cache)

Source: `app/api/oei/buoys/route.ts` (`dynamic="force-dynamic"`).

- **Sources (parallel):** (1) NOAA NDBC `https://www.ndbc.noaa.gov/data/latest_obs/latest_obs.txt` (free, no key, ~1300 buoys; 6s timeout, `:171`), (2) MINDEX `${MINDEX_URL}/api/mindex/earth/map/bbox?layer=buoys&...&limit=2000` (`:192`, 2.5s timeout, `X-API-Key`). `MINDEX_URL` resolves `MINDEX_API_URL || NEXT_PUBLIC_MINDEX_URL || http://192.168.0.189:8000`; key `MINDEX_API_KEY || "local-dev-key"` (`:54-59`).
- **NDBC parser** (`parseNDBCText` `:73`): whitespace-delimited, 2 header rows (names + units), `MM` = missing; column index map for `STN, LAT, LON, YYYY/YY, MM, DD, hh, mm, WDIR, WSPD, GST, WVHT, DPD, ATMP, WTMP, PRES, VIS, DEWP`. Invalid/out-of-range coords skipped. `parseNDBCFloat` (`:161`) treats `MM/999/99.0/999.0/9999.0/99.00` as null.
- **`BuoyObservation` shape** (`:22`): `id, station_id, lat, lng, wind_speed (m/s), wind_direction (deg), wind_gust (m/s), wave_height (m), dominant_wave_period (s), water_temp (°C), air_temp (°C), pressure (hPa), visibility (nmi), dew_point (°C), timestamp (ISO), source ("ndbc"|"mindex")`.
- **Dedup:** by `station_id`, NDBC overwrites MINDEX (`:305-316`).
- **In-memory cache:** 5 min TTL (`CACHE_TTL_MS`, `:50`); `?refresh=true` bypasses. Cache hit logs age and returns `source:"cache"`.
- **MINDEX write-back** (`ingestBuoysToMINDEX` `:230`): fire-and-forget POST to `/api/mindex/proxy/buoys` (entity_type `buoy`). Gated by `ENABLE_BUOY_MINDEX_WRITEBACK` (`OEI_ENABLE_LIVE_MINDEX_WRITEBACK=1` OR prod && not `OEI_DISABLE_LIVE_MINDEX_WRITEBACK=1`, `:224`). Base `NEXT_PUBLIC_BASE_URL || http://localhost:3010`.
- **Disk persistence:** on fresh fetch, `saveBuoysToDiskCache(combined)` (`:337`). Logs via `logDataCollection`/`logAPIError` (`lib/oei/mindex-logger`).
- **Fallback order on error** (`:357`): MINDEX-alone (`mindex-recovery`) → disk cache (`disk-cache`) → empty `{success:false, source:"none"}`.
- **Response cache headers:** `public, s-maxage=300, stale-while-revalidate=1800`.
- **Dashboard fetch:** `CREPDashboardClient.tsx:11096` `fetch("/api/oei/buoys", {cache:"no-store"})`.

###### Buoy disk cache (`lib/crep/buoy-disk-cache.ts`)

Parallel to vessel cache; survives NDBC 503s / empty MINDEX.

- **File:** `<getCrepRuntimeCacheDir()>/buoys.json` (`:26`). `CacheFile = { version:1, written_at, buoys: Record<station_id, Cached> }`.
- **`saveBuoysToDiskCache(buoys)`** (`:80`): keyed by `station_id`, stamps `cached_at`, returns stored count; triggers debounced write.
- **`readBuoysFromDiskCache()`** (`:94`): returns entries fresher than `BUOY_MAX_AGE_MS = 6h` (`:28`); ages out (deletes) entries older than 6h or with NaN age, then schedules a write.
- **Writes:** debounced `WRITE_DEBOUNCE_MS = 5_000` (`:29`, `scheduleWrite` `:59`), guarded by `dirty` flag; lazy load into `memCache` on first access.
- **`getBuoyDiskCacheStats()`** (`:115`): `{ total, fresh, expired, file }`.

##### 2.3 Viewport environment cache (`lib/crep/viewport-environment-cache.ts`)

Client-side bounds-keyed memo for viewport environment payloads (May 24, 2026).

- **In-memory** `Map<string, {data, fetchedAt}>`; TTL `WEEK_MS = 7 days` (`:7`).
- **Key** (`buildViewportEnvironmentCacheKey` `:16`): `"env|north|south|east|west|zoom"` where bounds are rounded to a zoom-dependent precision — `zoom>=12 → 3dp`, `zoom>=8 → 2dp`, else `1dp`; zoom to 1 decimal.
- **`getViewportEnvironmentCache`** (`:32`) deletes & returns null on expiry; **`setViewportEnvironmentCache`** (`:46`) stores with `fetchedAt = Date.now()`.

---

#### 3. Live Transit Layer

##### 3.1 Map component (`components/crep/layers/live-transit-layer.tsx`)

`"use client"`. Renders live vehicle positions from every connected transit agency as MapLibre native circle layers, polling `/api/transit/all?bbox=`.

- **Source/layers:** source `crep-live-transit` (`SOURCE_ID`, `promoteId: "id"`); layers `crep-live-transit-glow` (halo, blur 0.9, opacity 0.25) and `crep-live-transit-dot` (white stroke). Zoom-interpolated radii: glow `4→2 … 16→14`, dot `4→1.5 … 16→7` (`:99-141`).
- **Color by `vehicle_type`** (`TYPE_COLORS` `:32`): subway `#3b82f6`, rail `#06b6d4`, bus `#10b981`, tram `#14b8a6`, ferry `#6366f1`, other `#9ca3af` (default via `coalesce`).
- **Props** (`:72`): `map, visible, bbox?, pollMs?, onSelect?`. **Note an inconsistency:** the JSDoc and inline comments say polls every **15 s**, but the actual default is `pollMs = 45_000` (45 s; `:81`). The dashboard mounts it without overriding `pollMs` (`CREPDashboardClient.tsx:22491`, passing `map`, `visible`, `bbox={liveOverlayBbox}`), so the live cadence is 45 s.
- **Readiness:** robust multi-event attach (`isStyleLoaded` || `once("load"|"styledata"|"idle")` + immediate idempotent attempt) (`:159-166`).
- **Poll loop** (`:192`): `waitForSource` retries every 500 ms up to 30 s if the source spawned after the first tick; fetch `AbortSignal.timeout(15_000)`, `cache:"no-store"`; features normalized (`normalizeTransitFeature` ensures stable `id`); `promoteTransitLayers` re-raises layers; writes `window.__crep_last_transit_count` (QA hook) and logs `[CREP/LiveTransit] first paint: N vehicles`. Error breaker logs up to 3 warns. Skips polling when `document.hidden` (`:265`).
- **Interaction:** click on dot bubbles `feature.properties` to `onSelect` (vehicle widget); pointer cursor on hover. Hover popup fields (per header `:24`): agency, route_short_name, vehicle_id, occupancy, current_status, last-seen age.

##### 3.2 Aggregator route (`app/api/transit/all/route.ts`)

`runtime="nodejs"`, `dynamic="force-dynamic"`. Aggregates every connected agency into one GeoJSON FeatureCollection; each agency fetched in parallel, a failing agency does not break the aggregate.

- **Params:** `bbox=w,s,e,n` (viewport cull, applied per-agency by the sub-route), `agencies=mta,wmata,…` (comma-separated subset; omit for all).
- **Agencies** (`AGENCIES` `:37`) — order is the legend order; earliest wins on dedupe:

| id | path | key env (skip if unset) | region [W,S,E,N] | national |
|---|---|---|---|---|
| `mta` | `/api/transit/mta` | — | -74.35,40.45,-71.65,41.25 | |
| `wmata` | `/api/transit/wmata` | `WMATA_API_KEY` | -77.65,38.55,-76.65,39.35 | |
| `bart` | `/api/transit/bart` | — | -122.65,37.45,-121.65,38.15 | |
| `mbta` | `/api/transit/mbta` | — | -71.45,42.05,-70.65,42.65 | |
| `511-bay` | `/api/transit/511-bay` | `TRANSIT_511_API_KEY` | -123.0,36.8,-121.1,38.6 | |
| `cta-train` | `/api/transit/cta-train` | `CTA_TRAIN_TRACKER_API_KEY` | -88.0,41.55,-87.35,42.15 | |
| `trimet` | `/api/transit/trimet` | `TRIMET_API_KEY` | -123.0,45.25,-122.2,45.75 | |
| `marta` | `/api/transit/marta` | `MARTA_API_KEY` | -84.75,33.45,-84.05,34.05 | |
| `amtrak` | `/api/transit/amtrak` | — | -125,24,-66,50 | **yes** |
| `septa` | `/api/transit/septa` | — | -75.75,39.65,-74.75,40.35 | |
| `metrolink` | `/api/transit/metrolink` | `METROLINK_API_KEY` | -118.95,32.45,-116.5,34.8 | |
| `dart` | `/api/transit/dart` | `DART_API_KEY` | -97.15,32.45,-96.35,33.25 | |

- **Viewport scoping** (`defsForViewport` `:65`): explicit `agencies` wins; else `bbox` selects regional agencies intersecting the box plus intersecting national agencies (`intersects` `:59`); no bbox → all agencies. Empty if nothing intersects.
- **Per-agency fetch** (`fetchAgency` `:75`): skips with `err="<KEY> not configured"` if `keyEnv` unset; origin-fetch `${internalBase}${path}?bbox=` with **2.5 s** timeout, `cache:"no-store"`; non-OK → `err="upstream <status>"`. `internalBase` from `resolveInternalBaseUrl(origin)`.
- **Response:** `{ type:"FeatureCollection", features[], agencies:[{id,vehicles,ok,err?}], vehicles_total, vehicles_in_bbox, generated_at, errors? }`. Features deduped by vehicle `id`. Property set (`:114`): `id, agency, agency_name, route_id, route_short_name, trip_id, vehicle_id, bearing, speed_mps, timestamp, vehicle_type (default "other"), occupancy, current_status, stop_id`. `TransitVehicle` type from `@/lib/transit/gtfs-realtime`. Cache `public, s-maxage=10, stale-while-revalidate=30`.

---

#### 4. Jurisdiction / Boundary Engine

##### 4.1 Boundary layers (`lib/crep/jurisdiction-layers.ts`)

Adds country/state/county borders (from the Carto vector basemap, OpenMapTiles schema) and FEMA region overlays (custom GeoJSON). Critical for FUSARIUM/IC anchoring (header `:11`).

- **Layer groups** (`JURISDICTION_LAYER_GROUPS` `:24`, kept in sync with dashboard `setVis`):

| Group | Layer ids |
|---|---|
| `country` | `crep-boundaries-country` |
| `state` | `crep-boundaries-state`, `crep-state-labels` |
| `county` | `crep-boundaries-county` |
| `fema` | `crep-fema-regions-fill`, `crep-fema-regions-line`, `crep-fema-labels-text` |

- **`addJurisdictionLayers(map, options?)`** (`:120`) — default options `showCountry:true, showState:true, showCounty:true, showFema:false` (dashboard calls it with `{showFema:false}` at `CREPDashboardClient.tsx:18232`). `findVectorSource` (`:103`) picks `carto` or the first vector source. `LAND_BOUNDARY_FILTER = ["==","maritime",0]` (Carto maritime is 0/1, `:114`). `safeAdd`/`safeLayer` are idempotent (re-add/replace).

  | Layer | type | source-layer / filter | minzoom | style |
  |---|---|---|---|---|
  | `crep-boundaries-country` | line | `boundary`, `admin_level==2` + land | 1 | green `#4ade80`, dashed `[4,2]`, width interp 1→1.4…8→3.2, opacity 0.9 |
  | `crep-boundaries-state` | line | `boundary`, `admin_level==4` + land | 4 | sky `#7dd3fc`, width 2→1.2…12→3.5, opacity 1 |
  | `crep-state-labels` | symbol | `place`, `class=="state"` | 7 (max 12) | uppercase `name_en`/`name`, color `#e0f2fe`, halo `#020617`, fades in 7→7.5 |
  | `crep-boundaries-county` | line | `boundary`, `admin_level 6 OR 8` + land | 9 | violet `#c4b5fd`, dashed `[2,2]`, opacity 0.65 |
  | `crep-fema-regions-fill` | fill | geojson `crep-fema-regions` | 3 (max 10) | per-region `color`, opacity 3→0.08…10→0.02 |
  | `crep-fema-regions-line` | line | geojson `crep-fema-regions` | 5 | per-region `borderColor`, dashed `[6,3]`, opacity 0.5 |
  | `crep-fema-labels-text` | symbol | geojson `crep-fema-labels` | 6 (max 9) | `FEMA <n>`, white, halo black, fades in 6→6.5 |

  If no vector source is found, a warning is logged and vector boundary layers are skipped (`:245`).

- **FEMA regions** sourced from `FEMA_REGIONS` (`./geo-regions`). `femaRegionToFeature` (`:54`) builds a bbox polygon per region (not state-accurate; visual grouping only). `femaRegionLabels` (`:81`) places a point at the bbox center. Per-region fill/border colors `FEMA_COLORS`/`FEMA_BORDER_COLORS` (regions 1–10, `:32`/`:45`). A one-time click handler on `crep-fema-regions-fill` logs region name/HQ/states (`map.__crepFemaClickBound` guard, `:282`).
- **`toggleJurisdictionLayer(map, group, visible)`** (`:329`) flips `visibility` for each layer in the group. **`removeJurisdictionLayers(map)`** (`:345`) removes all four groups' layers plus sources `crep-fema-regions` and `crep-fema-labels`.

##### 4.2 Jurisdiction seals (`lib/crep/jurisdiction-seals.ts`)

Curated seals/coats-of-arms shown beside the country flag in the Viewport Intelligence header, resolved at the appropriate LOD (city → county → state → country).

- **Seal dictionaries:** `CITY_SEALS` keyed `"<city lc>|ST"` (San Diego, Imperial Beach, Chula Vista, Los Angeles, San Francisco, New York|NY, Washington|DC; `:69`); `COUNTY_SEALS` keyed `"<county> county|ST"` (San Diego County, Los Angeles County `|CA`; `:101`); `STATE_SEALS` keyed 2-letter (CA, NY, TX, FL; `:113`); `COUNTRY_SEALS` keyed ISO-2 / `EU` (US, CA, MX, CN, JP, GB, EU, IN, AU, BR; `:132`). All URLs are Wikimedia Commons.
- **Helpers:** `STATE_NAME_TO_CODE` full 50-state + DC map (`:14`); `resolveStateCode` accepts 2-letter or full name (`:175`); `cityKey`/`countyKey` normalize and auto-append "county" (`:189`/`:194`). `isOfficialPortraitUrl` (`:201`) excludes person-portrait sources (bioguide, ballotpedia, gravatar, avatar, `/photo/`) so media-gallery fallback yields emblems not faces; `sealsFromMediaGallery` (`:213`) returns at most 1 non-portrait, non-person image.
- **LOD targeting** (`resolveLodTarget` `:229`): `facility|city → city`, `county → county`, contains `state → state`, else `country`. `JurisdictionSealLod = country | state / region | county | city | facility`.
- **`resolveJurisdictionSeal(input)`** (`:244`) — input `{place?, jurisdictionStack?, lodLabel, mediaGallery?}`. Resolves city/county/state names from `place` or the `jurisdictionStack` (levels `city/county/union/country`). Cascade per target with fallthrough to broader/narrower seals then media gallery: city → `tryCity → tryCounty → tryState → gallery`; county → `tryCounty → tryCity → tryState → gallery`; state → `tryState → tryCounty → tryCity → gallery`; country → EU (if `union==="European Union"`) → `COUNTRY_SEALS[countryCode]` → state → gallery → null.
- **`resolveJurisdictionSealUrls(input)`** (`:281`) returns up to **3** distinct seal URLs (EU first if present, then each country in the stack — UK by name special-case, then place country code, then the primary resolved seal). **`resolveJurisdictionSealAlt`** (`:301`) returns the primary seal alt or `"Seal of <city>"`/`"Government seal or emblem"`.

##### 4.3 Country government profiles (`lib/crep/country-government-profiles.ts`)

Embassy/government profile data shown when the viewport resolves to a country.

- **Coverage (25 profiles):** US, CA, MX, CN, JP, EU, GB, IN, AU, BR, FR, DE, IT, ES, BE, NL, ZA, NG, EG, TR, KR (`COUNTRY_GOVERNMENT_PROFILES` `:114`).
- **`CountryGovernmentProfile` shape** (`:41`): `key, name, countryCode, aliases[], flagUrl, sealUrls[], governmentType, politicalSystem, leadership[], politics[], governmentTabs[]`. Flags from `FLAG_BASE = https://flagcdn.com/w80` (`:55`); seals are Wikimedia Commons URLs.
  - **`leadership`** (`CountryGovernmentOfficial` `:3`): `id, name, office, party?, jurisdiction_name, urls?, phones?, emails?, address?, image_url?, term_start?, term_end?`. Current heads of state/government are embedded (e.g. US: Trump/Vance; GB: Starmer/Charles III; CA: Carney/Simon/Charles III; JP: Takaichi/Naruhito; etc.).
  - **`politics`** (`CountryGovernmentPoliticsItem` `:33`): `kind: election | legislation | office | institution`, with title/subtitle/url (e.g. usa.gov/elections, congress.gov).
  - **`governmentTabs`** (`CountryGovernmentTab` `:25`): branch tabs (Executive/Legislature/Judiciary/Federalism etc.) each with `items[]` of `{id,title,subtitle,url}` linking official portals.
- **`LEADER_IMAGE_URLS`** (`:57`): name→portrait map; `countryGovernmentOfficialWithDefaults` (`:102`) fills empty `urls/phones/emails` arrays and resolves `image_url ?? LEADER_IMAGE_URLS[name] ?? null`.
- **Resolvers:**
  - `normalizeToken` (`:1238`) lowercases/trims/collapses whitespace.
  - `profileMatches` (`:1242`): matches on country code, name, or alias — short aliases (≤3 chars) require exact match, longer aliases allow substring containment.
  - **`resolveCountryGovernmentProfile(value)`** (`:1254`): first profile matching the normalized token, else null.
  - **`resolveGovernmentProfilesForViewport({place, jurisdictionStack, macroRegion})`** (`:1260`): collects tokens from place `countryCode/country/displayName` and every stack entry's `code/name`; adds `macroRegion` only when no explicit country. Dedupes by `key`. Special expansions: Europe/EU token → push EU then GB; if nothing resolved and token has `"north america"` → push US, CA, MX.

---

#### 5. Cross-References

- **Dashboard route/component:** `app/dashboard/crep/CREPDashboardClient.tsx` — imports `LiveTransitLayer` (`:309`), `addJurisdictionLayers`/`JURISDICTION_LAYER_GROUPS` (`:431`); device source `crep-mycosoft-devices` add/populate (`:18932`, `:16292`); buoys fetch (`:11096`); transit mount (`:22491`); AQI layer mount (`:22501`).
- **Library barrel:** `lib/crep/index.ts` re-exports `device-widget-mapper`.
- **Runtime caches on disk:** AirNow → `var/cache/airnow/`, buoys → `<crep runtime cache dir>/buoys.json`.
- **Key env vars:** `AIRNOW_API_KEY`; `MQTT_BROKER_URL/USERNAME/PASSWORD`; `MYCOBRAIN_OPERATOR_URLS`, `MYCOBRAIN_*_TIMEOUT_MS`; `MINDEX_API_URL`/`NEXT_PUBLIC_MINDEX_URL`/`MINDEX_API_KEY`; `OEI_ENABLE_LIVE_MINDEX_WRITEBACK`/`OEI_DISABLE_LIVE_MINDEX_WRITEBACK`; transit `WMATA_API_KEY`, `TRANSIT_511_API_KEY`, `CTA_TRAIN_TRACKER_API_KEY`, `TRIMET_API_KEY`, `MARTA_API_KEY`, `METROLINK_API_KEY`, `DART_API_KEY`.

> **Known doc/code drift:** `live-transit-layer.tsx` comments cite a 15 s poll, but the effective default is `pollMs = 45_000` (45 s) and the dashboard does not override it. Treat 45 s as authoritative for the live transit refresh cadence.

---

## 18. Regional Projects, Civic & Defense

### Regional Projects, Civic & Defense Overlays

This domain covers the CREP dashboard's geographically-scoped project bundles (Tijuana Estuary/Project Oyster, Mojave/Goffs, Project NYC/DC/Vegas + nature/industrial deployment sites), the per-metro OSM infrastructure bundles, military installations (point pins + exact perimeter polygons), civic facilities (OSM-derived hospitals/fire/police/universities/libraries/civic), jurisdiction boundaries (country/state/county/FEMA), ports-of-entry & border posts, and radar sites.

All overlays attach to the MapLibre instance via `window.__crep_selectAsset` (the generic InfraAsset side-panel hook) or via dispatched `CustomEvent`s consumed by dedicated React widgets. Layer rows live in the `layers` registry inside `app/dashboard/crep/CREPDashboardClient.tsx`; component mounting and gating happen in the same file's JSX (≈ lines 22291–22550).

#### Mounting & Global Gating

Every overlay in this domain is suppressed when `auditAllOffMode`, `assetIsolationMode`, or `isEmbeddedEarthquakeSearch` is active. The project-scoped layers additionally gate on a *viewport-intersection* boolean and a *hasEnabledLayer* set check, so they never mount unless the relevant project is in view AND at least one of its layers is toggled on.

| Component | File | Mount condition (`CREPDashboardClient.tsx`) |
|-----------|------|--------------------------------------------|
| `TijuanaEstuaryLayer` | `components/crep/layers/tijuana-estuary-layer.tsx` | `canRenderEarthStaticProjectDetails && oysterProjectInViewport && hasEnabledLayer(layers, OYSTER_PROJECT_LAYER_IDS)` — line 22398 |
| `MojavePreserveLayer` | `components/crep/layers/mojave-preserve-layer.tsx` | `canRenderEarthProjectDetails && mojaveProjectInViewport && hasEnabledLayer(layers, MOJAVE_PROJECT_LAYER_IDS)` — line 22442 |
| `SdtjCoverageLayer` | `components/crep/layers/sdtj-coverage-layer.tsx` | `canRenderEarthStaticProjectDetails && mountSdtjCoverageLayers` — line 22476 |
| `ProjectNycDcLayer` | `components/crep/layers/project-nyc-dc-layer.tsx` | `canRenderEarthStaticProjectDetails && mountMetroProjectLayers` — line 22509 |
| `ProposalOverlays` | `components/crep/layers/proposal-overlays.tsx` | mounted broadly unless `assetIsolationMode === "funga"` — line 22291 |
| `V3Overlays` | `components/crep/layers/v3-overlays.tsx` | `hasEnabledLayer(layers, V3_OVERLAY_LAYER_IDS)` — line 22538 |
| Jurisdiction layers | `lib/crep/jurisdiction-layers.ts` | mounted unconditionally at style-load via `addJurisdictionLayers(map, { showFema: false })` — line 18232/18237; visibility driven by toggles |
| Military bases | inline in `CREPDashboardClient.tsx` | source/layers created with live-entity layers (≈ 18797); data pumped by effect at line 16126 |

---

#### 1. Project Oyster / Tijuana Estuary

`components/crep/layers/tijuana-estuary-layer.tsx`. Renders the Project Oyster operational zone (MYCODAO + MYCOSOFT) over the Tijuana Estuary on the SD–Mexico border, plus federated pollution / environmental feeds from `/api/crep/tijuana-estuary`.

**Data flow.** Fetches `/api/crep/tijuana-estuary` once on mount when the master `tijuanaEstuary` toggle is on (and `liveDataEnabled`), then auto-refreshes every **6 h** (`refreshMs = 6 * 60 * 60 * 1000`, line 191), skipping the refresh when `document.hidden`. A `mountedRef` (lines 151–155) and `fetchAttemptedRef` (line 144) guard against the React-18 strict-mode double-mount + infinite-fetch loop documented in the header comments. `liveDataEnabled` is passed as `canRenderEarthProjectDetails && shouldRenderHeavyOverlays` (line 22400).

**Static geometries (baked into the component, not fetched):**
- **Project Oyster perimeter** — `PROJECT_OYSTER_PERIMETER_GEOJSON` (lines 79–105). A 12-vertex Polygon from the IB pier west edge (≈ −117.1380, 32.5350) east to **Saturn Blvd** (≈ −117.0510), spanning both river banks. Source: `tj-perimeter`. Layers `tj-estuary-perimeter-fill` (`#0d9488` @ 0.08 opacity) + `tj-estuary-perimeter-line` (`#5eead4`, width 2, dasharray `[2,2]`). Inserted *before* the first symbol layer so labels stay on top.
- **Tijuana River course** — `TJ_RIVER_COURSE_GEOJSON` (lines 108–129). 8-point LineString from Tecate (−116.6356, 32.5773) to Pacific outflow (−117.1330, 32.5390). Source `tj-river-course`; layers `tj-river-course-glow` (`#fbbf24`, blur 3) + `tj-river-course-line` (`#f59e0b`).

**Station layers** (source `tj-stations`, populated from `data.geojson`, filtered by `category` property, lines 296–426):

| Layer id | Category filter | Style |
|----------|-----------------|-------|
| `tj-h2s-heat` | `air-quality` | heatmap; radius 30→80, color ramp green→yellow→orange→red |
| `tj-stations-discharge` | `river-flow` | circle `#0ea5e9` (IBWC discharge marker) |
| `tj-stations-h2s` | `air-quality` | circle `#f43f5e` |
| `tj-stations-oyster` | `project-oyster` | circle `#14b8a6` / stroke `#5eead4` |
| `tj-stations-navy` | `navy-training` | circle `#fbbf24` |
| `tj-stations-beach` | `beach-closure` | circle `#dc2626` |
| `tj-stations-monitor` | `estuary-monitor` | circle `#22d3ee` |
| `tj-stations-labels` | (all) | symbol, `minzoom: 11`, white text + halo |

Station clicks dispatch `crep:tijuana:station-click` (consumed by `TijuanaStationWidget`).

**v2 expansion (Apr 21, 2026)** — 11 sub-layer categories + plume/EMIT polygons, each defensively guarded (`safeAddSource`/`safeAddLayer`, lines 463–467). Click handlers dispatch `crep:oyster:site-click` (consumed by `OysterSiteWidget`).

- **Oyster anchor** (`data.oyster`) — `oyster-anchor-halo` (`#14b8a6`, zoom-scaled), `oyster-anchor-dot` (`#5eead4`), `oyster-anchor-label` ("OYSTER · MYCODAO", `minzoom: 3`).
- **UCSD PFM plume** (`data.plume.outer`/`.core`) — `oyster-plume-outer-fill` (`#b91c1c` @ 0.18) + `-line` (dashed), `oyster-plume-core-fill` (`#dc2626` @ 0.34) + `-line`.
- **NASA EMIT plumes** (`data.emit_plumes`) — `oyster-emit-heatmap` (`minzoom: 9, maxzoom: 15`, orange ramp) + `oyster-emit-dot` (`#f97316`, `minzoom: 5`).
- **Cameras** (`data.cameras`, `minzoom: 8`) — filtered to **live-stream-only**: `has_stream === true` OR `stream_url` matching `/\.m3u8|surfline|earthcam|windy|skylinewebcams|cwwp2\.dot|hpwren|alertwildfire|nps\.gov|usgs/i` (lines 600–603). Color by `provider` (surfline `#06b6d4`, caltrans `#0ea5e9`, cbp `#3b82f6`, noaa `#22d3ee`, earthcam `#8b5cf6`, windy `#a855f7`).
- **Broadcast** (`data.broadcast`, `minzoom: 7`) — color by `band` (am `#a855f7`, fm `#8b5cf6`, tv `#7c3aed`).
- **Cell towers** (`data.cell_towers`, `minzoom: 8`) — color by `carrier` (Verizon `#ef4444`, AT&T `#3b82f6`, T-Mobile `#ec4899`, FirstNet `#22c55e`, DoD `#f59e0b`).
- **Power** (`data.power`, `minzoom: 7`) — radius by `capacity_mw`; color by `kind` (solar `#facc15`, gas `#f97316`, gas-retired `#78350f`, nuclear-retired `#84cc16`, substation `#fbbf24`, battery `#a855f7`).
- **Rails** (`data.rails`, `minzoom: 8`) — `#a1a1aa`.
- **Caves** (`data.caves`, `minzoom: 8`) — `#78350f` / stroke `#f59e0b`.
- **Government** (`data.government`, `minzoom: 7`) — color by `agency` (CBP `#3b82f6`, USN `#0284c7`, USCG `#0891b2`, NPS `#84cc16`, NOAA `#14b8a6`, IBWC `#f59e0b`, EPA `#22c55e`, CDFW `#84cc16`, CA SP `#10b981`).
- **Tourism** (`data.tourism`, `minzoom: 8`) — `#f9a8d4`.
- **Sensors** (`data.sensors`, `minzoom: 7`) — color by `kind` (aqi, tide, streamflow, waterquality, oceanography, plume, crossborder, emit, buoy, noise, light, soil). Click routes by `kind` to plume/crossborder/emit/air-quality/sensor widget category (lines 748–752).
- **iNat observations** (`data.inat_observations`, `minzoom: 9`) — color by `iconic_taxon`.
- **Combined heatmap** (`data.heatmaps` pollution/biodiversity/noise, `minzoom: 10, maxzoom: 15`) — hard `minzoom: 10` to stop "fake heat circles" appearing on the globe (Apr 21 fix, line 787).

**Anti-overlap jitter** (lines 492–504): a deterministic per-id hash spreads co-located points by ≈ ±0.0006° (≈ 65 m) so e.g. IB Pier's ~6 sensors at identical coords visibly fan out instead of collapsing to one un-clickable dot. Applied to cameras, broadcast, cell, power, rails, caves, gov, tourism, sensors, iNat.

**Default on/off:** registry rows (`CREPDashboardClient.tsx` lines 10261–10283) all default `enabled: true` (`tijuanaEstuary`, `projectOysterPerimeter`, `projectOysterSites`, `h2sHotspot`, `tjRiverFlow`, `tjBeachClosures`, `tjNavyTraining`, `tjEstuaryMonitors`, `oysterCameras`, `oysterBroadcast`, `oysterCell`, `oysterPower`, `oysterNature`, `oysterPlume`, `oysterEmit`, `oysterCrossBorder`, `oysterRails`, `oysterCaves`, `oysterGovernment`, `oysterTourism`, `oysterSensors`, `oysterHeatmap`). The `oysterHeatmap` row defaults `opacity: 0.55`. Visibility uses `!== false` semantics for the original 8 categories (so they show even if undefined) and `!!` for the v2 categories (lines 809–841). `oysterAnchor` is wired to the master `tijuanaEstuary` toggle (line 22411).

---

#### 2. Project Goffs / Mojave National Preserve

`components/crep/layers/mojave-preserve-layer.tsx`. Renders NPS Mojave Preserve (MOJA) boundary + the Goffs MYCOSOFT anchor + wilderness/climate/iNat + a 9-category v2 expansion.

**Data flow.** Fetches `/api/crep/mojave` (`APPROX_BOUNDARY_PATH`, line 52) once when *any* sub-toggle is on, refreshing every **6 h** (line 120), hidden-tab-skipped. Same `mountedRef`/`fetchAttemptedRef` strict-mode guards. The render effect gates on `map.isStyleLoaded()` and retries on `idle`/`style.load` (lines 142–161; May 21 fix to stop Goffs vanishing after one fast-refresh cycle). Each `safeAddSource`/`safeAddLayer` is independently guarded so a single failure can't cascade (lines 171–190).

**Layers:**
- **Boundary** (`data.preserve.boundary_geom`) — `mojave-boundary-fill` (`#ca8a04`, opacity interpolated by zoom 0.35→0.06) + `mojave-boundary-line` (`#facc15`, dashed `[3,2]`).
- **Goffs anchor** (`data.goffs`) — `mojave-goffs-halo` (`#14b8a6`), `mojave-goffs-dot` (`#22d3ee`, white stroke), `mojave-goffs-label` ("GOFFS · MYCOSOFT", `minzoom: 3`). Bumped large/bright so it's visible at world view.
- **Wilderness POIs** (`data.wilderness_pois`, `minzoom: 4`) — `#fbbf24` dots + labels (`minzoom: 7`).
- **Climate stations** (`data.climate_stations`, `minzoom: 4`) — color by `category` (asos `#06b6d4`, raws `#f97316`, coop `#a78bfa`) + id labels.
- **iNat** (`data.inat_observations`, `minzoom: 5`) — color by `iconic_taxon`.

**v2 expansion (each guarded by array-presence):**
- **Cameras** (`minzoom: 4`) — color by `provider` (hpwren `#ef4444`, alertwildfire `#f97316`, caltrans `#06b6d4`, nps `#84cc16`, windy `#a855f7`).
- **Broadcast** (`minzoom: 4`) — band-colored.
- **Cell towers** (`minzoom: 4`) — carrier-colored.
- **Power** (`minzoom: 3`) — radius by `capacity_mw` (uses `to-number` coercion); kind colors (solar/wind/coal-retired/substation/hvdc).
- **Rails** (`minzoom: 4`) — `#a1a1aa`.
- **Caves** (`minzoom: 5`) — `#78350f`.
- **Government** (`minzoom: 4`) — agency colors (NPS, BLM, CBP, US Army, USAF, USGS, FAA).
- **Tourism** (`minzoom: 5`) — `#f9a8d4`.
- **Sensors** (`minzoom: 4`) — kind colors (aqi, streamflow, weather, wildlife, snow, seismic, light, solar).
- **Heatmap** (`data.heatmaps` fireRisk/biodiversity/aridity) — `minzoom: 9, maxzoom: 14` (hard floor to stop globe-scale fake circles, line 618).

Clicks dispatch `crep:mojave:site-click` via `bindOnce` (window-flag dedupe across HMR remounts, lines 194–209). Same ±65 m jitter applied to wilderness, climate, iNat, cameras, tourism, sensors.

**Default on/off** (`CREPDashboardClient.tsx` lines 10289–10298): `mojavePreserve`, `mojaveGoffs`, `mojaveWilderness`, `mojaveClimate`, `mojaveCameras`, `mojavePower` default ON; `mojaveINat`, `mojaveBroadcast`, `mojaveCell` default **OFF**. (Visibility uses `!!enabled.*` semantics throughout — lines 650–670.)

---

#### 3. Project NYC / DC / Vegas + Nature Deployment Sites

`components/crep/layers/project-nyc-dc-layer.tsx`. Two effects: (A) project anchors/perimeters/POIs, (B) per-metro OSM regional bundles.

**`resolveMap` accepts EITHER a `Map` instance OR a `RefObject<Map>`** (lines 142–147). This fixes the Apr 23 regression where `map?.current` returned `undefined` for a direct Map instance, silently dropping all baked NYC/DC layers.

**(A) Project anchors + perimeters + POIs** (effect at line 211). Iterates a `projects` array (lines 215–233), each fetching `/data/crep/project-{id}.geojson`:

| Project | id | File | Anchor / Perimeter color | Toggle |
|---------|-----|------|--------------------------|--------|
| NYC | `nyc` | `project-nyc.geojson` | `#06b6d4` / `#22d3ee` | `projectNyc` |
| DC | `dc` | `project-dc.geojson` | `#facc15` / `#fbbf24` | `projectDc` |
| Vegas | `vegas` | `project-vegas.geojson` | `#f43f5e` / `#fb7185` | `projectVegas` |
| Yosemite | `yosemite` | `project-yosemite.geojson` | `#10b981` / `#34d399` | `projectYosemite` |
| Zion | `zion` | `project-zion.geojson` | `#fb923c` / `#fdba74` | `projectZion` |
| Yellowstone | `yellowstone` | `project-yellowstone.geojson` | `#eab308` / `#facc15` | `projectYellowstone` |
| Mendocino | `mendocino` | `project-mendocino.geojson` | `#16a34a` / `#22c55e` | `projectMendocino` |
| Starbase | `starbase` | `project-starbase.geojson` | `#64748b` / `#94a3b8` | `projectStarbase` |
| Home (Acero) | `home-acero` | `mycosoft-home-devices.geojson` | `#d946ef` / `#e879f9` | `projectHomeAcero` |

Per project, one source `crep-project-{id}-src` feeds four layers filtered by feature `kind`:
- `crep-project-{id}-perim-fill` — `kind == "project-perimeter"`, fill @ 0.08.
- `crep-project-{id}-perim-outline` — line, dasharray `[4,2]`.
- `crep-project-{id}-poi` — `kind == "project-poi"`, circle (`minzoom: 6`); click → `__crep_selectAsset({ type: p.category || "project_poi", ... })`.
- `crep-project-{id}-anchor` + `-anchor-label` — `kind == "project-anchor"`; anchor click → `__crep_selectAsset({ type: "mycosoft-project", properties: { project, owner, thesis, partners, status } })`.

The nature/industrial sites (Yosemite/Zion/Yellowstone/Mendocino/Starbase/Home) have **no per-site registry toggle**; they render via `!!enabled.project*` which is currently always falsey unless set externally (parked as distinct from the urban NYC/DC/Vegas stack — header note lines 219–232).

**(B) Per-metro OSM regional bundles** (effect at line 356). `makeCategories(region)` (lines 99–130) produces 11 categories per region, multiplied across `METRO_INFRA_REGION_IDS` (17 metros: atlanta, austin, boston, chicago, dallas, denver, dc, houston, la, miami, nyc, philly, phoenix, seattle, sf, slc, vegas — from `lib/crep/metro-infra-layer-bridge.ts` lines 20–38). Files: `/data/crep/{region}-{category}.geojson`.

| Category suffix | layerId | Color | selectType | minzoom | Notes |
|-----------------|---------|-------|-----------|---------|-------|
| Hospitals | `crep-{r}-hospitals` | `#f43f5e` | `hospital` | 7 | |
| Police | `crep-{r}-police` | `#3b82f6` | `police` | 8 | |
| Sewage | `crep-{r}-sewage` | `#a16207` | `sewage_works` | 7 | polygon (fill+outline+centroid circle) |
| CellTowers | `crep-{r}-cell` | `#ec4899` | `cell_tower` | 9 | `cellSmall` → radius halved (1→2.25→3.5) |
| AmFmAntennas | `crep-{r}-amfm` | `#a855f7` | `broadcast_antenna` | 7 | |
| Military | `crep-{r}-mil` | `#10b981` | `military_installation` | 6 | polygon |
| DataCenters | `crep-{r}-dc` | `#06b6d4` | `data_center` | 7 | |
| TransitSubway | `crep-{r}-subway` | `#f59e0b` | `subway_station` | 10 | |
| TransitRail | `crep-{r}-rail` | `#eab308` | `rail_station` | 8 | |
| Airports | `crep-{r}-air` | `#8b5cf6` | `airport` | 5 | |
| GovtEmbassy | `crep-{r}-gov` | `#14b8a6` | `government` | 9 | |

iNat was **removed** from this layer (header note lines 113–130); baked per-city iNat now loads into the shared `fungalObservations` React state and renders through the same FungalMarker/popup as the live SSE stream — "one icon, one widget, one truth."

**Viewport gating (perf-critical).** `syncVisibleRegions` (lines 428–435) runs on `moveend`/`zoomend`. A category renders only if its toggle is on **AND** `viewportIntersectsRegion(m, cat.region)` returns true. That function (lines 169–189) returns false below zoom 5, and pads the region's `REGION_BBOX` (hardcoded per metro, lines 149–167) by 1.25° (z<7), 0.65° (z<9), or 0.25° (z≥9). Polygon categories add fill/outline/centroid-circle; the `applyVisibility` helper toggles the `""`, `-fill`, `-outline` suffix layers (lines 422–427).

**Driving the toggles.** The per-metro detail layers are *hidden from the filter panel* (`isHiddenFromLayerPanel`, `metro-infra-layer-bridge.ts` line 181) and instead follow generic parent toggles via `deriveMetroProjectLayerEnabled` / `deriveRegionInfraEnabled` (lines 250–295). E.g. all `{region}Hospitals` follow the parent `hospitals` toggle; `{region}Military` follows `militaryBases`; `{region}CellTowers` follows `cellTowers`/`cellTowersG`; `{region}GovtEmbassy` follows `civicFacilities`/`events_human`/`universities`; `{region}Airports` follows `aviation`/`aviationRoutes`. The three project anchors (`projectNyc`/`projectDc`/`projectVegas`) keep their own panel toggles. `mountMetroProjectLayers` = `shouldMountMetroProjectLayers` (true if any project anchor OR any parent infra toggle is on, line 211).

**Default on/off:** the three project anchors + all NYC/DC/Vegas detail rows default `enabled: true` (`CREPDashboardClient.tsx` lines 10170–10226).

---

#### 4. SD + TJ Coverage Bundle

`components/crep/layers/sdtj-coverage-layer.tsx`. Loads 8 category GeoJSONs baked by `scripts/etl/crep/bake-sdtj-coverage.mjs` from OSM Overpass (refreshed weekly by `.github/workflows/sdtj-coverage-weekly.yml`).

**Categories** (`CATEGORIES`, lines 58–67):

| id | layerId | File | Label | Color | Glyph | Polygon? | selectType |
|----|---------|------|-------|-------|-------|----------|-----------|
| `sdtjHospitals` | `crep-sdtj-hospitals` | `sdtj-hospitals.geojson` | Hospital | `#f43f5e` | 🏥 | | hospital |
| `sdtjPolice` | `crep-sdtj-police` | `sdtj-police.geojson` | Police / Fire / Border | `#3b82f6` | 🚔 | | police |
| `sdtjSewage` | `crep-sdtj-sewage` | `sdtj-sewage.geojson` | Sewage works | `#a16207` | 🟫 | ✓ | sewage_works |
| `sdtjCellTowers` | `crep-sdtj-cell-towers` | `sdtj-cell-towers.geojson` | Cell tower | `#ec4899` | 📶 | | cell_tower |
| `sdtjAmFmAntennas` | `crep-sdtj-am-fm` | `sdtj-am-fm-antennas.geojson` | AM/FM antenna | `#a855f7` | 📡 | | broadcast_antenna |
| `sdtjMilitary` | `crep-sdtj-military` | `sdtj-military.geojson` | Military (OSM) | `#10b981` | 🛡️ | ✓ | military_installation |
| `sdtjDataCenters` | `crep-sdtj-data-centers` | `sdtj-data-centers.geojson` | Data center | `#06b6d4` | 🖥️ | | data_center |
| `sdtjCivicFacilities` | `crep-sdtj-civic` | `sdtj-civic.geojson` | Civic facility | `#14b8a6` | C | | civic |

**Icons.** Canvas-drawn SDF-style icons (`drawSdtjIcon`, lines 145–271) registered via `ensureSdtjIconImages` (pixelRatio 2): hospital cross, fire-station flame, police badge, library books, cell tower, broadcast antenna, military shield, data-center rack, sewage swirl, civic building. Each point renders three layers: the circle (`{layerId}`), the symbol icon (`{layerId}-icon`, icon-size 0.44→0.76).

**Polymorphic glyph/selectType resolution.** For `sdtjPolice` and `sdtjCivicFacilities`, `resolvePointGlyph` (118–128) and `resolveSelectType` (130–139) re-classify each feature from its tags: fire (🚒/`fire_station`), border/CBP/customs/POE (🛂/`border_crossing`), library (📚/`library`), hospital (🏥), police (🚔), city-hall/courthouse (🏛️). `enrichCoverageGeoJson` (297–315) bakes `glyph`/`icon_image`/`select_type`/`category_label` into properties.

**LOD floors** (`minZoomForCategory`, lines 361–366, using `lib/crep/lod-policy.ts`): data centers → `DATA_CENTER_MIN_ZOOM` (= `INFRA_COUNTRY_REVEAL_MIN_ZOOM` = **2.7**); cell towers + AM/FM → `TELECOM_CITY_MIN_ZOOM` (**8**); civic → **9**; everything else → `TELECOM_DETAIL_MIN_ZOOM` (**5**).

**Polygon categories** (sewage, military) render fill (@ 0.18) + dashed outline (`[3,1.5]`) + a centroid clickability circle. Military's point-circle opacity is 0.18 vs 0.28 for others (line 381). Clicks → `__crep_selectAsset` with `select_type` and merged tags (lines 332–359).

**Driving the toggles.** Like the metro bundle, the 8 SDTJ ids are hidden from the panel (`SDTJ_COVERAGE_DETAIL_LAYER_IDS`, `metro-infra-layer-bridge.ts` lines 65–74) and follow parent toggles via `deriveSdtjCoverageEnabled` (lines 231–242): hospitals←`hospitals`; police←`policeStations`/`fireStations`; sewage←`waterPollution` OR the Oyster project toggles (`tijuanaEstuary`/`projectOysterPerimeter`/`projectOysterSites`); cellTowers←`cellTowers`/`cellTowersG`; amFm←`radioStations`; military←`militaryBases`; dataCenters←the unified DC ids; civic←`civicFacilities`/`events_human`/`universities`. The SDTJ panel rows (`CREPDashboardClient.tsx` lines 10159–10165) are nominally `enabled: true` but their actual visibility is the derived value. `mountSdtjCoverageLayers` = `shouldMountSdtjCoverageLayers` (true if any of those parents is on).

---

#### 5. Military Installations (Point Pins + Exact Perimeter Polygons)

Defined inline in `CREPDashboardClient.tsx`. Two parallel representations, both under the single `militaryBases` panel toggle (registry line 10047, `enabled: true`, category `military`, color `#16a34a`).

**Sources & layers (created ≈ line 18797):**
- `crep-live-military` (source) → `crep-live-military-dot` (symbol, `military-shield` canvas icon — a white shield with star cutout, icon-color `#dc2626`, icon-size 0.4→1.4 by zoom). Holds **point-only** facilities (no polygon).
- `crep-military-perimeters` (source) → `crep-military-perimeters-fill` (`#dc2626` @ 0.15) + `crep-military-perimeters-line` (`#dc2626`, width 1.5→4 by zoom, opacity 0.9). Holds **exact OSM boundary polygons** ("restricted zone" outlines).

**Data ingestion.** A separate effect (line 11134) fetches `/api/oei/military` and `setMilitaryBases(data.facilities)`. The primary path, however, bypasses the API: `loadMilitaryGeoJson` (line 21207) reads static files in two passes — `/data/military-bases-seed.geojson` ("seed", +250 ms) then `/data/military-bases.geojson` ("full-static", idle-loaded, +2.5 s on Earth-Simulator). It computes a cheap centroid (average of ring vertices) for Polygon/MultiPolygon features and preserves the original geometry (lines 21218–21247).

**Split rendering** (`renderMilitary`, line 20874). `militaryGeometry(e)` returns the Polygon/MultiPolygon if present (or builds one from `e.polygon` if length > 2). Facilities **with** geometry → `crep-military-perimeters` (fill + boundary line); facilities **without** → `crep-live-military` (shield icon). `setMilitaryBases` stores each with `hasPolygon` flag.

**Data pump + visibility** (effect at line 16126). Pushes `militaryBases` (filtered to `!hasPolygon` points with valid lat/lng) into `crep-live-military`; clears both sources under `auditAllOffMode`/`assetIsolationMode`. Toggles all three layers' visibility from `militaryBases` enabled state. `window.__crep_military` is exposed for click-handler lookup.

**Clicks** (lines 18887–18901) open the InfraAsset side panel via `openMilitaryFacilityPopup` (line 18839) with `type: "military"` and properties (facility_type, operator, country, military). Hover preview bound via `bindFeatureHoverPreview` for all three layers.

**Known limitations:** the perimeter polygons are only as accurate/complete as OSM `military=*` / `landuse=military` mapping; the centroid is a naive vertex average (not area-weighted), so for irregular shapes the shield/click point may be off-center. Per-metro `{region}Military` polygons (section 3) are a *separate* OSM bake driven by the same `militaryBases` parent toggle, plus `sdtjMilitary` (section 4) — so three independent military polygon sources can coexist.

**Military *sub-types*** (aircraft/naval/ground/drones) are NOT polygons — they're handled in `V3Overlays` (section 8) by deriving from live ADS-B/AIS callsign patterns.

---

#### 6. Civic Facilities (Hospitals / Fire / Police / Universities / Libraries / Civic)

`components/crep/layers/v3-overlays.tsx` (one-shot setup ≈ lines 772–842). Six OSM-derived facility families, each with a circle dot + a canvas-drawn SDF symbol icon + click-to-InfraAsset.

| Toggle | Source | Dot layer | Icon layer | Dot color | Glyph | selectType |
|--------|--------|-----------|-----------|-----------|-------|-----------|
| `hospitals` | `crep-hospitals` | `crep-hospitals-dot` | `crep-hospitals-icon` | `#ec4899` | 🏥 | hospital |
| `fireStations` | `crep-firestations` | `crep-firestations-dot` | `-icon` | `#ef4444` | 🚒 | fire_station |
| `universities` | `crep-universities` | `crep-universities-dot` | `-icon` | `#6d28d9` | 🎓 | university |
| `policeStations` | `crep-policestations` | `crep-policestations-dot` | `-icon` | `#38bdf8` | 🚔 | police |
| `libraries` | `crep-libraries` | `crep-libraries-dot` | `-icon` | `#facc15` | 📚 | library |
| `civicFacilities` | `crep-civicfacilities` | `crep-civicfacilities-dot` | `-icon` | `#14b8a6` | 🏛️ | civic |

**Zoom gating.** All six are gated at `FACILITY_ICON_MIN_ZOOM = 9` (line 374). Visibility = `enabled && zoom >= 9` (lines 1004–1016). Icons render via `ensureSymbolIconLayer` (icon-size 0.46→0.78). Canvas glyphs drawn by `facilityIconImage` (lines 170–244): hospital cross, fire-station flame, police badge+dot, library twin-shelf, university mortarboard+building, civic roofed-building fallback.

**Data sources (3-tier):**
1. **Viewport-intel/MINDEX facilities** (the `facilities` prop, classified by `classifyViewportFacility` lines 567–583 via regex on type/name/agency/address). Painted immediately at zoom ≥ 9 (effect line 1081) so civic icons don't wait on Overpass. The civic regex matches "city hall|town hall|courthouse|government|civic|municipal|county|port of entry|border|customs|cbp|ibwc".
2. **OSM Overpass** (effect line 1126) at zoom ≥ `FACILITY_OSM_FETCH_MIN_ZOOM = 10` only. `facilityQueryFragment` (470–501) builds amenity queries — hospital adds `clinic` + `healthcare=hospital`; university adds `college`; civic queries `townhall` + `office=government` + `courthouse`. Results capped at `FACILITY_OSM_MAX_POINTS_PER_KIND = 900`, merged with viewport-intel by identity, LRU-cached (96 bbox keys). 6 s timeout; **skipped entirely on the Earth-Simulator route** (`isEarthSimulatorRoute`, line 1128).

**Default on/off:** all six default `enabled: true` (`CREPDashboardClient.tsx` lines 10098–10103). Note police/libraries descriptions mention "OSM and baked civic data."

**Known limitation:** Overpass is best-effort — large bboxes can time out, and at zoom < 9 nothing renders even when toggled. Each facility family ALSO drives the hidden `{metro}{Family}` and `sdtj{Family}` bundles (sections 3–4), so the same toggle can paint OSM-overpass dots, baked-metro dots, and SDTJ dots simultaneously at different zooms.

---

#### 7. Jurisdictions (Country / State / County / FEMA)

`lib/crep/jurisdiction-layers.ts`, mounted via `addJurisdictionLayers(map, { showFema: false })` at style-load (`CREPDashboardClient.tsx` line 18232/18237). Vector-tile boundary lines come from the Carto basemap (`findVectorSource`, lines 103–111 — prefers source `"carto"`, else first vector source); FEMA from synthesized GeoJSON.

**Layer groups** (`JURISDICTION_LAYER_GROUPS`, lines 24–29):

| Toggle | MapLibre layers | Source-layer / filter | Style | minzoom |
|--------|-----------------|----------------------|-------|---------|
| `jurisdictionCountry` | `crep-boundaries-country` | `boundary`, `admin_level==2` + land filter | `#4ade80` dashed `[4,2]` | 1 |
| `jurisdictionState` | `crep-boundaries-state`, `crep-state-labels` | `boundary` `admin_level==4`; labels from `place` `class==state` | `#7dd3fc` solid lines; uppercase `#e0f2fe` labels | 4 (lines) / 7 (labels, maxzoom 12) |
| `jurisdictionCounty` | `crep-boundaries-county` | `boundary` `admin_level==6 OR ==8` + land | `#c4b5fd` dashed `[2,2]` @ 0.65 | 9 |
| `jurisdictionFema` | `crep-fema-regions-fill`, `crep-fema-regions-line`, `crep-fema-labels-text` | synthesized GeoJSON | per-region fill/border colors | fill 3–10, line 5+, labels 6–9 |

**Land filter** `LAND_BOUNDARY_FILTER = ["==", "maritime", 0]` (line 114) — Carto encodes maritime as 0/1, not boolean.

**FEMA regions** (lines 32–97) are built as bounding-box rectangles from `FEMA_REGIONS` (`lib/crep/geo-regions.ts`) — explicitly "Not state-accurate but provides visual jurisdictional grouping" (line 52). 10 regions, each with its own fill (`FEMA_COLORS`, 50%-alpha) and border (`FEMA_BORDER_COLORS`) color, plus a center-point label ("FEMA 1"–"FEMA 10"). FEMA fill click logs HQ city + states (no widget; lines 284–291).

**Visibility** (`CREPDashboardClient.tsx` lines 13085–13088): a `setVis` effect maps each `jurisdiction*` toggle's `enabled` flag to its layer group, ANDed with `!auditAllOffMode`. Layer-id `startsWith("jurisdiction")` is also treated as "other" in the audit categorizer (line 16842).

**Default on/off** (`CREPDashboardClient.tsx` lines 10245–10248): `jurisdictionCountry`, `jurisdictionState`, `jurisdictionCounty` default **ON**; `jurisdictionFema` defaults **OFF** ("OFF at startup" — Morgan May 24, also in `auditAllOffMode` exclusion list line 2858–2859). State opacity 0.9, county 0.3, FEMA 0.4.

**Place/jurisdiction stack.** Separately, the viewport-intel panel resolves a `jurisdiction_stack` (city→county→state→country) from reverse-geocode + the civic API (`JURISDICTION_LEVEL_META` line 5478; stack assembly lines 6113–6154), rendered with per-level accent colors. This is informational text, not a map layer.

---

#### 8. Defense / Military Sub-Types & Human Heatmaps (V3)

`components/crep/layers/v3-overlays.tsx`. Beyond civic facilities, V3 also wires the military sub-type and human-activity layers relevant to defense overlays.

**Military sub-types** (setup lines 905–923; derive effect 1199–1236) — NOT OSM, derived every 30 s from live `window.__crep_aircraft` / `__crep_vessels`:
- `crep-militaryair-dot` (`#f59e0b`) — aircraft matching `militaryCallsignPrefixes` (RCH/REACH/DUKE/EVAC/SPAR/AWACS/NAVY/… regex) or `adsb.lol` MLAT.
- `crep-militarydrones-dot` (`#fbbf24`) — callsigns matching FORTE/RANGER/PREDATOR/REAPER/GLOBAL HAWK/GRAY EAGLE/HERON/MALE/HUNTER.
- `crep-militarynavy-dot` (`#eab308`) — vessels whose operator/name matches `navy|coast guard|military|uscg|usn|royal navy|marine nationale`.
- `crep-tanks-dot` (`#d97706`) — starts empty (OSM `military=tank_trap` deemed too niche).

Tab-hidden ticks are skipped. Default `enabled: true` (registry lines 10048–10051, category `military`).

**Human-activity heatmaps** (setup lines 884–902): `crep-population-heat`, `crep-humanmovement-heat`, `crep-events_human-heat`, `crep-signalheatmap-heat` — empty sources by default with per-type color ramps; toggles flip visibility even when upstream is unwired. `population`/`humanMovement`/`events_human` default ON (registry lines 10041–10043); note `population`, `humanMovement`, `events_human` are in `REMOVED_FROM_INFRA_PANEL_IDS` (`metro-infra-layer-bridge.ts` line 141) so they're hidden from the infra panel.

**Event circle layers** (`crep-{earthquakes…tornadoes}-dot`) are created but **permanently hidden** (lines 996–1002, Jun 12 fix) — events render as DOM `<EventMarker>` widgets in `CREPDashboardClient` instead, to avoid duplicate "bare USGS dot" markers.

---

#### 9. Ports, Radar, Radio, Border (Proposal Overlays)

`components/crep/layers/proposal-overlays.tsx`. Army-contract deliverable overlays attached directly to the map. Each does its own `idleLoad → fetch → addSource/addLayer`, gates on `isMapStyleReady`, and uses a `styleReadyTick` bump-loop with one-shot retries at 150/700/1800/3200/6200 ms (lines 241–271) to survive HMR style races.

**Ports** (effect line 274). Fetches `/data/crep/ports-global.geojson` (`force-cache`). Layer `crep-ports-global-dot` (`#14b8a6`, radius 2→7, `applyInfraPointIconMinZoom`). Click → `__crep_selectAsset({ type: "seaport", ... })`. Registry `ports` (line 10108) "3,600+ seaports (WPI/NGA + UNCTAD + MarineCadastre + MINDEX)", default ON.

**Radar sites** (effect line 351). Sourced from `getNexradStations()` (`lib/crep/registries/radar-registry.ts`) — **160 NEXRAD WSR-88D stations bundled inline** (lines 41–202), including CONUS, Alaska (PA*), Hawaii (PH*), Puerto Rico (TJUA), and OCONUS DoD sites (RKJK Kunsan, RKSG Camp Humphreys, RODN Kadena). Each station carries `range_km: 460`, `frequency_mhz: 2800` (S-band), `bandwidth_mhz: 300`, dual polarization, `lastObservationUrl` to `radar.weather.gov/ridge/standard/{id}_0.gif`, operator "NOAA NWS". The full `getAllRadarSites` aggregator (line 259) also pulls Mycosoft passive-SDR devices (`/api/ground-station/hardware?capability=radar,sdr`) but the map layer only uses the NEXRAD set. Two layers: `crep-radar-range` (`#38bdf8` @ 0.08 coverage ring, radius scales to 60 at z14) + `crep-radar-dot` (`#0ea5e9`). Click → `__crep_selectAsset({ type: "radar_site", ... })`. Registry `radar` (line 10132) "NEXRAD + Mycosoft SDR + FAA ASR coverage rings", default ON.

**Radio stations** (effect line 428). Fetches `/api/oei/radio-stations?limit=20000` (route hard cap). Layer `crep-radio-dot` — rendered as **hollow band-colored rings** (transparent fill until hover, via feature-state) to read distinctly from the solid neon-green cell-tower dots: FM `#a855f7`, AM `#ec4899`, TV `#f59e0b`, PUBLIC_SDR `#22d3ee` (lines 469–528). Registry `radioStations` (line 10133) "44,000+ AM/FM/TV + KiwiSDR + Mycosoft SDR nodes", default ON.

**Ports of Entry & Border.** There is no dedicated POE/border-wall map layer in this domain — border/POE coverage is surfaced through (a) the SDTJ `sdtjPolice` category re-classified to `border_crossing`/🛂 (section 4), (b) the Oyster `government` category (CBP San Ysidro POE — section 1), and (c) the V3 civic regex matching "port of entry|border|customs|cbp|ibwc" (sections 6/7). The TJ river/perimeter geometry encodes the international boundary visually.

**Other proposal overlays** (out of primary scope but co-resident): global power plants (PMTiles), factories, orbital debris + statistical debris cloud, global transmission lines (bbox-scoped), global cell towers (bbox-scoped, neon-green `#39ff14` dots gated at `TELECOM_DETAIL_MIN_ZOOM = 5`), bathymetry/topography/sat-imagery rasters, railway tracks/trains, drone no-fly, CCTV. The bbox-scoped tx-line and cell-tower fetchers debounce (1.2 s desktop / 2.5 s tablet), abort stale requests, key on a zoom-banded bbox string, and **skip detail fetches on tablet-sized Earth-Simulator viewports** (`shouldSkipEarthSimulatorTabletBboxDetail`, lines 219–223).

---

#### LOD / Perf Reference (this domain)

From `lib/crep/lod-policy.ts`:
- `INFRA_POINT_ICON_MIN_ZOOM = 5`, `INFRA_COUNTRY_REVEAL_MIN_ZOOM = 2.7`, `DATA_CENTER_MIN_ZOOM`/`POWER_PLANT_MIN_ZOOM = 2.7`, `TELECOM_DETAIL_MIN_ZOOM = 5`, `TELECOM_CITY_MIN_ZOOM = 8`, `DATA_CENTER_LABEL_MIN_ZOOM = 12`, `RAILWAY_MIN_ZOOM = 5`.
- The 6-tier LOD ladder (`LOD_TIERS`, lines 160–223) governs event/mover/nature caps but **not** these static project/civic/infra layers directly — those rely on per-layer `minzoom`, viewport-intersection (metro bundle), and bbox-scoped fetching (proposal overlays).
- Heatmaps (Oyster, Mojave) carry hard `minzoom` floors (9–10) specifically to stop "fake heat circles" ballooning at globe scale.

#### Known Limitations / Caveats
- **No per-site toggle** for the 6 nature/industrial deployment projects (Yosemite/Zion/Yellowstone/Mendocino/Starbase/Home) — they render only if `enabled.project*` is set, which the panel never does.
- **Metro detail layers** only paint when both the parent infra toggle is on AND the metro's hardcoded `REGION_BBOX` intersects the (padded) viewport above zoom 5 — outside those 17 metros there is no city-detail coverage.
- **Military centroid** is a naive vertex average; **FEMA regions** are bounding-box rectangles, not state-accurate.
- **OSM Overpass** facility/pollution fetches are best-effort (time out on large bboxes; civic facilities skipped on the Earth-Simulator route).
- **Three overlapping military polygon sources** (`crep-military-perimeters`, `{metro}-mil`, `sdtj-military`) and **two cell/civic sources** can co-render at the same location under one parent toggle — by design, but a source of visual density.
- React-18 strict-mode double-mount previously discarded Oyster/Mojave fetch data; fixed via `mountedRef`/`fetchAttemptedRef` patterns (do not reintroduce `let cancelled` cleanup in the fetch effects).

---

Key files: `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\crep\layers\{tijuana-estuary-layer,mojave-preserve-layer,project-nyc-dc-layer,sdtj-coverage-layer,proposal-overlays,v3-overlays}.tsx`; `lib\crep\{metro-infra-layer-bridge,jurisdiction-layers,lod-policy}.ts`; `lib\crep\registries\radar-registry.ts`; `components\crep\controls\fly-to-projects.tsx`; military bases + jurisdiction mounting inline in `app\dashboard\crep\CREPDashboardClient.tsx`.

---

## 19. Viewport Prefetch Architecture & Web Workers

### Viewport Prefetch Architecture: Four Debounced Hooks + Off-Main-Thread GeoJSON Worker

The CREP dashboard (route `/natureos/earth-simulator`, client `app/dashboard/crep/CREPDashboardClient.tsx`) hydrates its right-panel intelligence and on-map overlays through a **four-hook viewport prefetch system**. Each hook independently watches `(mapBounds, mapZoom)`, debounces on "significant" viewport change, and writes into a per-hook week-TTL in-memory cache so panning back to a recent jurisdiction is instant (stale-while-revalidate). A separate, currently-standalone **Web Worker client** (`lib/crep/geojson-worker-client.ts`) exists to move large baked-GeoJSON `JSON.parse` off the main thread — the counterpart to the DOM-marker main-thread-starvation problem the dashboard fights elsewhere.

#### 1. The Four Hooks at a Glance

| Hook | File | Fetches | Cache module | Readiness gate (caller) | Default limit/zoom gate |
|------|------|---------|--------------|--------------------------|--------------------------|
| `useViewportIntelPrefetch` | `lib/crep/use-viewport-intel-prefetch.ts` | Reverse-geocode + `/api/crep/viewport-intel` (civic/officials/facilities/elections/legislation) | `viewport-intel-cache.ts` (bounds key **and** jurisdiction key) | `viewportDataPrefetchReady` | — |
| `useViewportEnvironmentPrefetch` | `lib/crep/use-viewport-environment-prefetch.ts` | `/api/crep/viewport-environment` (weather/AQI/alerts/USGS quakes/OSM features) | `viewport-environment-cache.ts` (bounds key) | `rightPanelPrefetchReady` | — |
| `useViewportSensorPrefetch` | `lib/crep/use-viewport-sensor-prefetch.ts` | `/api/crep/viewport-sensors` via `loadViewportSensors` (NDBC/CO-OPS/USGS/SDAPCD/IBWC live readings) | none (no client cache) | `viewportSensorPrefetchReady` | `limit = 8` |
| `useViewportEaglePrefetch` | `lib/crep/use-viewport-eagle-prefetch.ts` | Baked camera GeoJSON + `/api/eagle/sources` via `loadViewportEagleSources` | `viewport-eagle-cache.ts` (bounds key) | `rightPanelPrefetchReady && eagleEyeAssetsReady` | `limit = 12` (caller passes `24`); **`mapZoom >= 7`** |

All four are wired in `CREPDashboardClient.tsx` between lines 14252–14395; imports at lines 427–430.

#### 2. Shared Debounce / Significant-Change Engine

Every hook reuses the same change-detection primitives from `lib/crep/viewport-revision.ts`:

- **`isSignificantViewportChange(prev, next)`** (`viewport-revision.ts:21`) — returns `true` when:
  - zoom delta `>= 0.45` (`Math.abs(prev.zoom - next.zoom) >= 0.45`), **or**
  - the viewport center shifts **> 22 %** of the current viewport span on either axis (`latShift > 0.22 || lngShift > 0.22`), with antimeridian-aware longitude span. (The header comment says "25%/0.45"; the code threshold is `0.22`.) A null `prev` always refreshes.
- **`makeViewportRevisionKey(bounds, zoom)`** (`viewport-revision.ts:41`) — a coalescing key built by rounding bounds to a zoom-dependent precision: **3 decimals at zoom ≥ 12, 2 at zoom ≥ 8, else 1**, with zoom pinned to 1 decimal (`zoom.toFixed(1)`). This is the same precision ladder used by all three bounds cache keys (see §5), so cache granularity and refresh granularity match.

**Debounce mechanism (per hook):** each hook holds three refs — `snapshotRef` (last `{bounds, zoom}`), `revisionKeyRef` (last revision string), and `inFlightRef` (the current `AbortController`). On every render/effect:
1. Compute `next = {bounds: effectiveBounds, zoom: mapZoom}`.
2. If `snapshotRef.current` exists **and** `!isSignificantViewportChange(snapshot, next)`, **bail** (micro-pan churn is ignored).
3. Else write the snapshot, compute the revision key, and if `revisionKeyRef.current === revisionKey`, **bail** (identical coalesced viewport — second-level dedupe).
4. Otherwise abort any in-flight request and start a new one.

The sensor and eagle hooks fold this into a `useMemo`-computed `revisionKey` (returns `null` when not ready), and the effect keys on `[revisionKey, ...]`; the intel and environment hooks run the comparison inside the effect itself, keyed on `[enabled, effectiveBounds, mapZoom, ...]`.

#### 3. Per-Hook Behavior

##### 3a. `useViewportIntelPrefetch` (`use-viewport-intel-prefetch.ts`)

- **Bounds fallback:** `resolveEffectiveBounds` defaults to `DEFAULT_US_BOUNDS = {north:50, south:24, east:-66, west:-125}` (CONUS) when `mapBounds` is null (`:40-50`).
- **Optimistic seeding:** on a significant change it immediately sets an `optimisticPlace` from `resolveLocalViewportPlaceHint(center)` or a `"<LOD> viewport resolving"` placeholder (`:170-179`), so MYCA never renders a blank panel while the network resolves.
- **Two parallel fetches** via `Promise.allSettled` (`:197-206`), both `cache:"no-store"` and sharing one `AbortController.signal`:
  1. `GET /api/crep/reverse-geocode?lat&lng&zoom` — zoom passed through `nominatimZoomForGeographyLod(geoLod)`; fills `optimisticPlace` (`:208-220`).
  2. `GET /api/crep/viewport-intel?north&south&east&west&zoom` — the civic intel payload (`:202-205`).
- **Civic-facility fallback merge:** `mergeCivicFacilityHints` (`:52-79`) injects `resolveCivicFacilityHintsForViewport(...limit:12)` into `intel.facilities` (status `"civic-fallback"`) **only when** the payload returned zero facilities — applied to both cached hits and fresh responses.
- **Dual-cache write on success** (`:230-235`): `setViewportIntelCacheForBounds(bounds, zoom, hydratedIntel)` **and**, if a jurisdiction key resolves, `setViewportIntelCache(jurisdictionKey, hydratedIntel)`.
- **No-abort-on-cleanup quirk (`:247-249`):** unlike the other three hooks, the effect deliberately **does not** return an abort cleanup. The comment explains: small map-state churn can re-run the effect without a significant change, and aborting there "leaves MYCA stuck on empty stale intel until the next large move." Abort happens only on the next significant change or on unmount (`:117-121`).
- **Returns** `{ intel, optimisticPlace, loading, refreshing, effectiveBounds, lodLabel }` where `loading = fetching && !hasDisplayContent` and `refreshing = fetching && hasDisplayContent`.

##### 3b. `useViewportEnvironmentPrefetch` (`use-viewport-environment-prefetch.ts`)

- Same `DEFAULT_US_BOUNDS` fallback (`:33-43`).
- **Explicit debounce timer + hard timeout** (the only hook with `setTimeout`-based debounce, `:105-137`):
  - **Hard request timeout:** `6_500 ms` — aborts the controller and clears `fetching`.
  - **Debounce delay:** `1_200 ms` when a cached value already shows, **`350 ms`** on a cold viewport (`const debounce = cached ? 1_200 : 350`). The fetch is scheduled inside that debounce timer.
  - Fetch uses `cache:"default"` (unlike intel/sensor's `no-store`).
- **Cleanup returns** `() => { clearTimeout(timer); clearTimeout(debounceTimer); controller.abort() }` (`:139-143`) — so a fast re-pan cancels both the pending debounce and any in-flight request.
- **On success:** `setEnvironment(payload)` + `setViewportEnvironmentCache(bounds, zoom, payload)`.
- **`hasDisplayContent`** (`:146-154`) is true if any of `weather.current`, `airQuality.current`, non-empty `features.water/ecosystems/geology`, `alerts.items`, or `live.usgsEarthquakes` exist — driving `loading` vs `refreshing`.

##### 3c. `useViewportSensorPrefetch` (`use-viewport-sensor-prefetch.ts`)

- **No bounds fallback** — `effectiveBounds` is the raw `mapBounds` (may be null); gated entirely on `assetsReady` (`:34-45`). When `!assetsReady || !effectiveBounds`, `revisionKey` is `null`, the effect tears everything down and clears sensors.
- Delegates to **`loadViewportSensors(bounds, limit, onUpdate, signal)`** (`viewport-sensor-sources.ts:37`), which calls `GET /api/crep/viewport-sensors?bbox=W,S,E,N&limit=max(limit,12)` (`cache:"no-store"`), then **client-side re-filters** the returned array through `filterSensorsInViewport` (`pointInViewportBbox` + `.slice(0, limit)`).
- **Identity-stable commit** (`:76-85`): `onUpdate` only calls `setSensors` when the new id-sequence differs from the previous (length + per-index `id` equality), avoiding redundant React re-renders during overlapping fetches.
- **Catalog & sources:** the candidate stations come from `viewport-sensor-catalog.ts` (`VIEWPORT_SENSOR_CATALOG`, 15 fixed-coordinate stations across San Diego / TJ-border) with `kind ∈ {aqi, h2s, tide, buoy, streamflow, river-flow, beach-closure, project-oyster}`:

  | Provider/agency | Kind | Example stations |
  |---|---|---|
  | IBWC / USIBWC | `river-flow` | `ibwc-11013300` Tijuana River |
  | SDAPCD | `h2s` | Imperial Beach Pier, Nestor, Iris Ave, Saturn Blvd, TJ Slough |
  | NOAA CO-OPS | `tide` | 9410230 La Jolla, 9410170 SD Harbor, 9410162 Zuniga Pt |
  | USGS | `streamflow` | 11013500 TJ River @ NERR, 11015000 Sweetwater R |
  | NOAA NDBC | `buoy` | 46232 Pt Loma S, 46225 Torrey Pines, 46231 N Coronado |

  Per the catalog header (`viewport-sensor-catalog.ts:1-7`), **live readings are attached server-side in `/api/crep/viewport-sensors`, and only stations with confirmed live data are returned** — the `ViewportSensorSource.live` field (`viewport-sensor-sources.ts:4-25`) is therefore always populated for returned rows.
- **Returns** `{ sensors, revisionKey, loading, refreshing, effectiveBounds }`.

##### 3d. `useViewportEaglePrefetch` (`use-viewport-eagle-prefetch.ts`)

- **Zoom gate:** `shouldPrefetch = Boolean(mapBounds && assetsReady && mapZoom >= 7)` (`:44`) — Eagle Eye camera prefetch is suppressed below zoom 7.
- **Three-phase progressive load** via `loadViewportEagleSources` (`eagle-viewport-sources.ts:189`):
  1. **`instant`** — baked GeoJSON registry (7 seed files in `BAKED_GEOJSON_URLS`, version-pinned `?v=20260608-vegas-camera-data-fix`, `cache:"force-cache"`), filtered + distance-sorted to the viewport.
  2. **`fast`** — `GET /api/eagle/sources?bbox&limit&fast=1&live=0` (metadata only).
  3. **`full`** — same endpoint without `fast`, larger limit. For a focused viewport (`lngSpan<=5 && latSpan<=5`) the `full` phase is skipped unless `fast` returned nothing.
- Each phase's `onUpdate` runs through **`eagleSourcesEqual`** (`:19-36`, id + 1e-6 coord epsilon + URL equality) so unchanged sources don't re-render, and writes non-empty results to `setViewportEagleCache(bounds, zoom)` (`:121`).
- **Returns** `{ sources, revisionKey, loading, refreshing, effectiveBounds }`.

#### 4. Readiness Gates (how the dashboard arms each hook)

Defined in `CREPDashboardClient.tsx` (~14244–14395). On the Earth Simulator route the gates are intentionally conservative to avoid competing with the WebGL globe during animation:

| Gate | Definition (file:line) | Effect |
|------|------------------------|--------|
| `rightPanelPrefetchReady` | `:14244` — `shouldMountRightPanelContent && (!isEarthSimulatorRoute \|\| earthSimDeferredDataReady \|\| rightPanelOpen)` | Base gate for environment + eagle |
| `lightweightViewportDataReady` | `:14246` — `!auditAllOffMode && !assetIsolationMode && (!isEarthSimulatorRoute \|\| !isMapAnimationActive \|\| rightPanelOpen)` | Earth-Sim variant for intel |
| `viewportDataPrefetchReady` | `:14250` — `isEarthSimulatorRoute ? lightweightViewportDataReady : rightPanelPrefetchReady` | Arms `useViewportIntelPrefetch` (`:14252-14256`); also gates `viewportOverlayFacilities` (`:14258`) and `V3Overlays` (`:22538`) |
| `eagleEyeAssetsReady` | `:14374` — `!auditAllOffMode && !isEmbeddedEarthquakeSearch && !assetIsolationMode && (!isEarthSimulatorRoute \|\| !isMapAnimationActive)` | Combined with `rightPanelPrefetchReady` to arm eagle (`:14381-14386`) |
| `viewportSensorPrefetchReady` | `:14387` — `viewportDataPrefetchReady && (!isEarthSimulatorRoute \|\| (earthSimDeferredDataReady && !isMapAnimationActive))` | Arms `useViewportSensorPrefetch` (`:14390-14395`); also passed as `mapBounds = ready ? mapBounds : null` so the hook tears down when disarmed |

The "disarm" pattern is uniform: when a gate is false the caller passes `null` bounds and/or `enabled=false`, and each hook's effect resets refs, aborts in-flight requests, and clears state (e.g. intel `:124-133`, sensor `:48-58`, eagle `:80-88`).

#### 5. Cache Layers

Three independent module-scoped `Map` caches, all with a **7-day TTL** (`WEEK_MS = 7*24*60*60*1000`) and lazy expiry on read:

| Cache module | Key namespace | Key builder | Notes |
|---|---|---|---|
| `viewport-intel-cache.ts` | `bounds\|…` **and** jurisdiction `cc\|state\|county\|city\|lod` | `buildViewportBoundsCacheKey` (`:82`) + `buildViewportJurisdictionKey` (`:18`) | **Dual-keyed.** Bounds key gives an instant hit before reverse-geocode resolves; jurisdiction key enables `findStaleViewportIntelCache` (`:52`) to walk up city→county→state→country prefixes for a stale-while-revalidate hit when panning within the same jurisdiction. |
| `viewport-environment-cache.ts` | `env\|…` | `buildViewportEnvironmentCacheKey` (`:16`) | Single bounds key. |
| `viewport-eagle-cache.ts` | `eagle\|…` | `buildViewportEagleCacheKey` (`:17`) | Stores `EagleViewportSource[]`. |

All three bounds keys use the **identical zoom-precision ladder** as `makeViewportRevisionKey` (3/2/1 decimals at zoom ≥12/≥8/else, zoom `toFixed(1)`), so a cache key and a revision key for the same viewport are co-granular. The sensor hook has **no cache** — sensor liveness is volatile, so it always re-fetches on a significant change.

**SWR flow (intel/environment/eagle):** on a significant change the hook synchronously reads its bounds cache; if hit, it renders that immediately (`refreshing` mode) while the network call revalidates in the background and overwrites the cache on success. This is why panning back to a recently-viewed area is visually instant.

#### 6. Server Routes Backing the Hooks

##### `/api/crep/viewport-intel/route.ts`
- `dynamic = "force-dynamic"`, `revalidate = 86400`. Params: `north, south, east, west, zoom` (each `finiteNumber(...)` with fallback `0`; zoom default `4`). Bounds are normalized so `north = max, south = min`.
- **MINDEX-first:** proxies `${MINDEX_API}/api/mindex/civic/viewport-intel` with `X-Internal-Token` (first of comma-split `MINDEX_INTERNAL_TOKEN(S)`) and `X-API-Key` (`MINDEX_API_KEY` or `local-dev-key`), under a **900 ms** abort budget (`MINDEX_TIMEOUT_MS`).
- In parallel it runs `enrichPlaceFromBounds` (local hint → `reverseGeocodePlace` only when LOD-specific enrichment is needed via `placeNeedsLodEnrichment`).
- **Three response tiers:** (a) MINDEX-live merged with country-government profiles + civic fallback (`:502-549`, sets `Server-Timing` and `Cache-Control: public, s-maxage=86400, stale-while-revalidate=604800`); (b) upstream-down → `fetchFallbackForViewport` (country profiles or `fetchCivicFallback`) (`:361-419`); (c) total failure → `buildEmptyCivicResponse` (`:255-300`). US-vs-international routing is decided by `shouldUseUnitedStatesFallback` / `centerAppearsInsideUnitedStates`. Every tier reports `meta.timings` against a **1200 ms** budget.

##### `/api/crep/viewport-environment/route.ts`
- `dynamic = "force-dynamic"`, `revalidate = 900`. Accepts either `bbox=W,S,E,N` or discrete `north/south/east/west` + `zoom` (default `4`).
- **Imperial-vs-metric** decided by `isUSLocation(center)` (CONUS + AK + HI + PR boxes, `:56-62`) → drives °F/mph vs °C and whether NWS alerts/observation run at all.
- **Six concurrent upstreams** in `Promise.all`, each wrapped in `softTimeout(promise, fallback, ms)` (resolves a fallback rather than rejecting):

  | Source | Function | Soft timeout | Per-fetch `AbortSignal.timeout` / `revalidate` |
  |---|---|---|---|
  | Open-Meteo forecast+archive | `openMeteoEnvironment` | 1800 ms | 2500 ms; 900/3600 s |
  | Open-Meteo air quality (us_aqi, pm, gases, uv) | `openMeteoAirQuality` | 1200 ms | 2000 ms; 900 s |
  | Overpass/OSM water·geology·ecosystems | `overpassEnvironment` | 1200 ms | 2000 ms; 1800 s; dual-endpoint failover |
  | USGS earthquakes (zoom→radius/min-mag) | `fetchUsgsEarthquakes` | 1200 ms | 2000 ms; 600 s |
  | NWS active alerts (US only) | `fetchNwsAlerts` | 1200 ms | 2000 ms; 300 s |
  | NWS latest observation (US only) | `fetchNwsObservation` | 1200 ms | 1500 ms; 3600/300 s |

- Overpass switches between an `around:radius` query (`bboxArea>25 || zoom<7`, radius `6 k–80 k m` via `overpassRadiusMeters`) and a `bbox` query for tight viewports. `lod` label is derived from zoom (`regional/watershed/local ecosystem/site`). Response carries `Cache-Control: public, s-maxage=300, stale-while-revalidate=900`; failures return `{ok:false}` with HTTP 200 so the client hook never throws.

#### 7. Off-Main-Thread GeoJSON Worker

**Client:** `lib/crep/geojson-worker-client.ts` · **Worker:** `public/crep-geojson-worker.js`.

- **Singleton worker** lazily constructed from `/crep-geojson-worker.js` (`getWorker`, `:18`); returns `null` in SSR or when `Worker` is undefined. `fetchGeoJsonInWorker(url, opts)` (`:50`) assigns a monotonic `id`, registers a `{resolve, reject}` in a `pending` Map, posts `{id, url, minFeatureCount=1, maxBytes}`, and arms a **30 s timeout** (`opts.timeoutMs ?? 30_000`). It resolves the parsed `FeatureCollection` or — by design — **`null` on any failure** (`.then(fc => fc, () => null)`), so it is a pure optimization: the caller falls back to its prior synchronous loader.
- **Worker protocol** (`crep-geojson-worker.js:22`): the worker **fetches the URL itself** (`cache:"force-cache"`), enforces a `maxBytes` cap (default `500 MB`) against both `content-length` and body length, runs `JSON.parse`, validates `type === "FeatureCollection"`, and does cheap in-worker cleanup (drops features with no geometry; drops `Point` features with non-finite coords). It posts back `{id, ok, featureCollection, bytes, featureCount, durationMs}`; the client logs `parsed N features (KB) in MS ms`.

**Why it exists — the main-thread-starvation perf story.** The worker header (`crep-geojson-worker.js:1-20`) records the motivation verbatim: *Morgan: "crep locally is supper laggy"* — parsing the **76k-substation / 52k-txlines / 27k-EIA** GeoJSON on the main thread blocks paints **200–500 ms apiece**. Moving `JSON.parse` + shape validation into the worker keeps `maplibre-gl` + React responsive during initial data load; the only residual main-thread cost is structured-cloning the FeatureCollection back across the thread boundary (~30 ms for a 4 MB FC).

This is the **parse-side** half of a broader main-thread budget the dashboard manages. The **render-side** half is the DOM-marker ceiling: `CREPDashboardClient.tsx` documents that above ~1200 React `FungalMarker` DOM nodes "the main thread starves MapLibre WebGL" (`:2863`), enforced by hard caps `EVENT_DOM_MARKER_CAP = 800`, `NATURE_DOM_MARKER_CAP = 1400`, `EARTH_SIM_DOM_MARKER_CAP = 900` (`:2862-2866`), plus the Jun 12 2026 viewport-first prune that "unpaints" stale off-screen markers to escape the unbounded-store freeze (`:1521-1528`). The two mechanisms are complementary: the **worker** prevents the *load* from blocking the main thread, while the **marker caps + viewport-first prune** prevent the *steady-state DOM* from starving the WebGL render loop. Note: as of this audit, `fetchGeoJsonInWorker` is implemented and self-tested via its docstring example but has **no production call site** in `CREPDashboardClient.tsx` — the baked Eagle GeoJSON and `crep-txlines`/substation sources are still loaded through synchronous `fetch().json()` + `map.addSource(...)` paths (e.g. `:20009`), consistent with the worker's stated "pure optimization / fall back to the synchronous loader" contract.

#### 8. End-to-End Sequence (single significant pan)

1. Map emits new `mapBounds`/`mapZoom`.
2. Each armed hook computes `next`; non-significant churn (`isSignificantViewportChange` false) and identical revision keys are dropped.
3. On a real change: abort prior request → read bounds cache → render cached payload immediately (`refreshing`) or show optimistic placeholder (`loading`).
4. Fire debounced/parallel fetches (intel: geocode+intel `no-store`; environment: 350/1200 ms-debounced `default`; sensor: `viewport-sensors` `no-store`; eagle: baked→fast→full).
5. On success: hydrate (civic-facility merge for intel), `setState`, and write the per-hook 7-day cache (intel writes both bounds + jurisdiction keys).
6. Server routes apply their own short revalidate windows + `stale-while-revalidate` CDN headers and per-source soft timeouts so a slow upstream degrades gracefully rather than blocking the panel.

**Source files documented:** `lib/crep/use-viewport-intel-prefetch.ts`, `use-viewport-environment-prefetch.ts`, `use-viewport-sensor-prefetch.ts`, `use-viewport-eagle-prefetch.ts`, `viewport-intel-cache.ts`, `viewport-environment-cache.ts`, `viewport-eagle-cache.ts`, `viewport-revision.ts`, `viewport-sensor-catalog.ts`, `viewport-sensor-sources.ts`, `eagle-viewport-sources.ts`, `geojson-worker-client.ts`, `public/crep-geojson-worker.js`, `app/api/crep/viewport-intel/route.ts`, `app/api/crep/viewport-environment/route.ts`, and consumer wiring in `app/dashboard/crep/CREPDashboardClient.tsx`.

---

## 20. MYCA Panel & Full API Index

### MYCA Analysis Panel + Complete API Route Index

The right-side panel of the CREP / Earth Simulator dashboard is a 3-tab overlay. The MYCA tab hosts the **MYCA Analysis** viewport-intelligence panel, the Environment tab hosts the **Environment & Sensors** intel panel, and the Intel tab hosts the Viewport Civilization panel. All three are mounted in `app/dashboard/crep/CREPDashboardClient.tsx` and shared across `/dashboard/crep`, `/natureos/crep`, and the canonical `/natureos/earth-simulator` route (`app/natureos/earth-simulator/page.tsx:1-20`).

#### 1. Right-panel container, tabs, and gating

The right panel is an absolutely-positioned slide-in overlay rendered only when `!embedded` (`CREPDashboardClient.tsx:22874-23000`).

| Property | Value | Reference |
|---|---|---|
| Container width / position | `w-80`, `absolute right-3 top-3 bottom-3`, `z-[90]` | `CREPDashboardClient.tsx:22875-22881` |
| Open/closed animation | `translate-x-0 opacity-100` (open) ↔ `translate-x-[calc(100%+1rem)] opacity-0 pointer-events-none` (closed), `transition-all duration-300` | `:22879-22881` |
| Open state | `rightPanelOpen` (mobile toggled via bottom MYCA/Intel buttons) | `:22877`, `:23004-23018` |
| Content mount gate | Body only rendered when `shouldMountRightPanelContent` is true (deferred on Earth Sim until budget allows) | `:22894` |
| Active tab state | `rightPanelTab` / `setRightPanelTab` | `:22894` |

**Tab set (exactly 3, since May 21 2026 — the old "Data Layers" tab was removed and folded into the left Intel Feed + the ALL ON / ALL OFF toolbar chips, per the comment at `:22885-22893`):**

| Tab value | Trigger icon | Title attr | Active color | Content component |
|---|---|---|---|---|
| `myca` | `Bot` | "MYCA Viewport" | purple | `MycaViewportPanel` | 
| `intel` | `Users` | "Viewport Intelligence" | blue | `ViewportCivilizationPanel` |
| `environment` | `Leaf` | "Environment" | emerald | `EnvironmentIntelPanel` |

(`CREPDashboardClient.tsx:22903-22925`). All three `TabsContent` use `forceMount` + `data-[state=inactive]:hidden` so panels keep their fetch/prefetch state alive when not visible (`:22929`, `:22957`, `:22983`).

#### 2. MYCA Analysis panel — `components/crep/panels/MycaViewportPanel.tsx`

The MYCA tab renders `<MycaViewportPanel>` (`CREPDashboardClient.tsx:22930-22954`). This is the viewport-intelligence room: an AI-written situational summary, two relevance-ranked analysis section cards, a rotating fly-to chip strip, a live environmental sensor grid, and an Eagle Eye camera thumbnail grid.

##### 2.1 Props / wiring (parent → panel)

| Prop | Source in dashboard | Reference |
|---|---|---|
| `mapBounds` / `mapZoom` | live MapLibre viewport | `:22931-22932` |
| `assetsReady` | `mycaAssetsReady` — on Earth Sim, gated behind an asset-ready delay timer (`EARTH_SIM_ASSET_READY_DELAY_MS`, +2.5 s on first load), set false during map animation | `:22933`, def `:14289-14312` |
| `latestViewportEvents` | `mycaLatestViewportEvents` = `selectMycaLatestViewportEvents(typeFilteredEvents, eventBounds, 20)`; empty when `auditAllOffMode` or events disabled | `:22934`, def `:14232-14243` |
| `visibleFungalObservations` | viewport-culled nature observations | `:22935` |
| `aircraftCount` | `filteredAircraft.length` | `:22936` |
| `vesselCount` | `filteredVessels.length` | `:22937` |
| `satelliteCount` | `filteredSatellites.length` | `:22938` |
| `selectedContext` | `mycaAnalysisContext` = `sustainedHoverContext ?? mycaHoverContext ?? mycaSelectedContext` | `:22939`, def `:14396-14472` |
| `prefetchedIntel` / `prefetchedIntelLoading` | `useViewportIntelPrefetch(...)` | `:22940-22941`, def `:14252-14256` |
| `prefetchedEnvironment` / `…Loading` | `useViewportEnvironmentPrefetch(...)` | `:22942-22943`, def `:14284-14288` |
| `prefetchedEagleSources` / `…Loading` / `prefetchedRevisionKey` | `useViewportEaglePrefetch(...)` (limit 24) | `:22944-22946`, def `:14381-14386` |
| `prefetchedSensors` / `…Loading` | `useViewportSensorPrefetch(...)` (limit 8) | `:22947-22948`, def `:14387-14395` |
| `onFlyTo(lng,lat,zoom)` | `mapRef.flyTo({center, zoom: zoom ?? max(mapZoom,11), duration:650})` | `:22949-22953` |

The panel honors a "parent-prefetch wins" pattern: if the parent supplies a prop (`prefetchedEnvironment !== undefined`, etc.) the panel uses it; otherwise it self-fetches locally (`MycaViewportPanel.tsx:411-451`). On the Earth Simulator route the parent always prefetches, so the panel's local fetch effects are inert.

##### 2.2 `selectedContext` derivation (what "Selected" reports)

`mycaSelectedContext` (`CREPDashboardClient.tsx:14396-14463`) maps the current selection to a typed context, in priority order:

1. `selectedEvent` → kind `event`, zoom 10, facts from `buildEventMycaFacts`.
2. `selectedFungal` → kind `species`, zoom 13, label = common name/species, facts from `buildFungalMycaFacts`.
3. Otherwise the first set asset: `selectedAircraft` (kind `aircraft`, z9), `selectedVessel` (`vessel`, z10), `selectedSatellite` (`satellite`, z6), `selectedDevice` (`device`, z13), `selectedPlant` (`power plant`, z12), `selectedInfraAsset` (`infrastructure`, z12), `selectedOther` (`asset`, z12).
4. Fallback to `selectedMapWidgetContext`.

Hover overrides selection: `mycaAnalysisContext = sustainedHoverContext ?? mycaHoverContext ?? mycaSelectedContext` (`:14472`); the hover variant prefixes kind with `hovered ` (`:14464-14471`).

##### 2.3 What the panel reports — the AI summary

The summary box (`MycaViewportPanel.tsx:1298-1316`) shows, in order of preference: an error (`aiError`), a "waiting for stable viewport" placeholder, a "Reading viewport context…" loader, or `summaryText`. `summaryText` is the AI summary **only if** the last-analyzed signal matches the current `analysisSignal`, else it falls back to a locally-composed `localSummary` (`:1271-1273`).

**`localSummary`** (`:694-725`) is the deterministic fallback string. Its lead sentence reports the full count tuple:
> `"{place} viewport: {events} events, {species} biodiversity records, {aircraft} aircraft, {vessels} vessels, {satellites} satellites, {cameras} cameras, and {sensors} sensors."`

then optionally prepends `Selected {kind}: {label} ({detail}). {facts}`, and appends `Event focus: …` (top 3 event titles) and **`Nature focus: …`** (`topSpecies.slice(0,4)`). `topSpecies` is the top-6 species by visible-observation frequency (`:649-659`).

**AI summary fetch** (`fetchAiSummary`, `:754-868`) POSTs to **`/api/crep/viewport-ai-summary`** with a JSON `context` carrying: `revision`, `reason`, `zoom`, `center`, `bounds`, `place` (from `placeLabel(viewportIntel)`), `selected` (kind/label/detail/facts), a **`counts`** object `{events, species, aircraft, vessels, satellites, cameras, sensors}`, `topEvents` (≤6), `topSpecies`, and a `weather` snapshot (`temp`, `humidity`, `cloud_cover`, `aqi`, `wind`). 12 s client abort timeout.

##### 2.4 Analysis cadence / trigger engine (perf gate)

The panel does NOT re-analyze on every render. It is throttled by an interval+settle scheduler (`scheduleAiSummary` `:870-891`, driver effect `:893-944`):

| Constant | Value | Meaning | Ref |
|---|---|---|---|
| `ACTIVE_ANALYSIS_MIN_MS` | 30 000 ms | min interval for active triggers | `:147` |
| `IDLE_ANALYSIS_MIN_MS` | 300 000 ms (5 min) | min interval for `data`-reason triggers | `:148` |
| `INITIAL_ANALYSIS_SETTLE_MS` | 2 800 ms | first-read settle | `:149` |
| `INTERACTION_ANALYSIS_SETTLE_MS` | 260 ms | selection/interaction settle | `:150` |
| `CAMERA_ANALYSIS_SETTLE_MS` | 1 250 ms | viewport-move ("camera") settle | `:151` |

Trigger reasons, in priority (`:905-933`): `initial` (never analyzed) → `interaction` (user action nonce bump, or event-signal change) → `selection` (selectedContext key + signal change) → `camera` (significant spatial viewport change via `isSignificantViewportChange`) → `data` (any other signal change, throttled to 5 min). Effective delay = `max(settleDelay, cooldownDelay)`. Interaction nonce bumps fire on `myca-search-action`, `crep:flyto`, `crep:eagle:camera-click`, `crep:analysis:select-event` window events (`:467-480`).

The header cadence label reads `Reading {reason}` / `Next {Xs}` / `Read {Xs} ago` / `Ready` (`:1264-1269`).

##### 2.5 Analysis section cards (events / biodiversity / movers / civic / sensors)

`analysisSections` builds 6 candidate cards (`:1120-1239`); `visibleAnalysisSections` sorts by `sectionRelevance` and shows the **top 2** (`:1258-1262`). Relevance (`:331-388`) boosts the card matching the selected entity kind, otherwise ranks non-zero metric cards (events→nature→sensors→civic→motion).

| Card id | Title | Metric shown | Detail | Facts | Tone |
|---|---|---|---|---|---|
| `selected` | selectedContext label (≤22ch) | selected `kind` | detail or inline facts | up to 6 facts | fuchsia/`selection` |
| `events` | "Events" | `latestViewportEvents.length` | top-3 event titles | Active / Top severity / Type | orange |
| `nature` | "Nature" | `visibleFungalObservations.length` | top-4 species | Visible / Focus species | emerald |
| `motion` | "Movers" | `aircraft/vessel/satellite` (e.g. `3/1/0`) | "{a} aircraft, {v} vessels, {s} satellites in the active viewport." | Aircraft / Vessels / Sats | sky |
| `civic` | "Civic" | `officials+facilities` (`...` while loading) | "{place}: {officials} officials, {facilities} facilities." | Officials / Facilities / Place | violet |
| `sensors` | "Sensors" | `sensors + cameras` | "{cameras} cameras, {sensors} sensors, AQI {aqi}." | Cameras / Sensors / AQI | cyan |

Civic counts come from `viewportIntel` (officials = `intel.officials` + `intel.civic.officials`; facilities = `intel.facilities.facilities`) (`:1207-1208`). Sensor count = `prefetchedSensors.length + eagleSources.length`; AQI from `displayAirQuality` (`:1224-1237`). Each card with coords renders a **"Fly"** button calling `handleMentionClick` (`:1349-1359`).

##### 2.6 Fly-to chips

Below the cards, a **rotating fly-to chip strip** (`:1365-1411`). Chips are built by `analysisMentions` (`:949-1071`) in this order:

1. **Selected** target (if coords) — kind mapped via `selectedKindToMentionKind`, zoom `selectedContext.zoom ?? max(12,mapZoom)`.
2. **Viewport center** — kind `viewport`, label "Viewport center", detail = lat/lng, zoom `max(8,mapZoom)`.
3. **Events** — up to 6 with finite coords, zoom 10.
4. **Species** — up to 5 distinct species names, zoom 12.
5. **Cameras** — up to 4 Eagle Eye sources, zoom 14, carries the `camera` object.
6. **Aircraft** aggregate chip (`"{n} aircraft"`, zoom `max(9,mapZoom)`) if `aircraftCount>0`.
7. **Vessels** aggregate chip (zoom `max(8,…)`) if `vesselCount>0`.
8. **Satellites** aggregate chip (zoom `max(6,…)`) if `satelliteCount>0`.

Per-kind icon (`mentionIcon` `:227-246`: Radio/Leaf/Camera/Crosshair/Plane/Ship/Satellite) and color (`mentionTone` `:248-267`). **Rotation:** 2 chips visible at a time (`mentionSlotCount=2`); auto-advances every **3 200 ms** with a 140 ms fade (`:1108-1118`); a `1/N` page counter shows when more than 2 chips exist (`:1371-1376`).

**Click behavior** (`handleMentionClick` `:1073-1090`): camera chips call `openEagleCamera(camera, onFlyTo)` (fly + open live video); other chips call `onFlyTo(lng,lat,zoom)`; event chips additionally dispatch `crep:analysis:select-event` with the eventId.

##### 2.7 Embedded sub-grids in the MYCA tab

- **Live environmental sensor grid** — `<ViewportSensorGrid>` rendered only when parent prefetches sensors and there is ≥1 sensor or it's loading (`:1415-1426`), limit 8, non-video providers only.
- **Eagle Eye thumbnails** — `<EagleEyeThumbnailGrid>` (`:1429-1443`), limit 6, with caption "Tap a feed to fly there and open live video".

##### 2.8 Local fetch fallbacks (when not parent-prefetched)

If a prefetch prop is absent, the panel self-fetches:
- Viewport intel → `GET /api/crep/viewport-intel?north&south&east&west&zoom` (`:508-531`), refreshed on significant viewport change, abortable, `cache: no-store`.
- Environment → `GET /api/crep/viewport-environment?…` plus two direct Open-Meteo calls (air-quality-api for `us_aqi,pm2_5,pm10`; forecast for `cloud_cover`), 320 ms debounce (`:563-605`).
- Eagle sources → `loadViewportEagleSources(...)` limit 8 (`:623-647`).

AQI display logic (`displayAirQuality` `:613-621`): prefers Open-Meteo `us_aqi`, else falls back to the highest-value `aqi`-kind prefetched sensor.

#### 3. Environment & Sensors tab — `EnvironmentIntelPanel` (`CREPDashboardClient.tsx:6433-6679`)

The `environment` tab renders `<EnvironmentIntelPanel>` (`:22983-22994`) with `mapBounds`, `mapZoom`, `filteredEvents`, `visibleFungalObservations`, and the same `viewportEnvironmentPrefetch` payload. Data source: `useViewportEnvironmentPrefetch` → **`/api/crep/viewport-environment`** (self-fetch fallback at `:6468`). The unit-system badge shows °F/°C from `environment.unitSystem`.

**Header strip** (`:6546-6567`): ENVIRONMENT title, live/loading/updating status, and a 4-up metric grid: **Temp** (`temperature_2m`), **Humidity** (`relative_humidity_2m`), **AQI** (`airQuality.us_aqi`), **Eco** (`ecosystems.length`).

**Collapsible sections** (each an `<EnvironmentSection>` with a badge):

| Section | Badge | Reports | Source / fields | Ref |
|---|---|---|---|---|
| ACTIVE ALERTS (only if any) | `{n} NWS` | top-6 NWS alerts (title, severity·area) | `alertItems` (NWS) | `:6569-6580` |
| AIR QUALITY | `airQuality.status` or "live" | US AQI, PM2.5, Ozone, UV Index | `airQuality.*` + `airQualityUnits` | `:6582-6589` |
| LIVE EVENTS IN VIEW | `{filteredEvents.length} total` | up to 12 viewport events with type icon + severity badge; empty-state text | `filteredEvents`, `eventTypeConfig`, `severityColors` | `:6591-6613` |
| WEATHER | `{weatherEvents.length} events` | NWS station obs text; Precipitation, Wind, Pressure, Weather-event count | `current.*`, `nwsObservation`, storm/flood-filtered events | `:6615-6628` |
| CLIMATE | "history / projected" | 14-day history temp, 14-day projected temp, avg historic precip, projected humidity + MYCA sensor-planning note | `forecastDaily` series averages | `:6630-6640` |
| GEOLOGY | `{geologyEvents+usgsEarthquakes} live` | quake/volcano events + USGS quakes (M, place) + OSM geology features | `geologyEvents`, `usgsEarthquakes`, `features.geology` | `:6642-6662` |
| WATER | "rivers / lakes / creeks / reservoirs" | OSM water features (name/type/operator) | `features.water` | `:6664-6666` |
| ECOSYSTEM | `{visibleFungalObservations.length} nature obs` | habitats / species / funga 3-up; ecosystem feature list | `ecosystems`, `visibleFungalObservations` (funga = kingdom matches `/fung/i`) | `:6668-6675` |

Feature lists show up to 8 items at zoom ≥12, else 5 (`:6530`). Earth-2 GPU modeling controls are intentionally disabled (`:6677`).

#### 4. Intel-feed counts shared across the dashboard

The "Movers" / nature counts surfaced in MYCA also appear in the compact intel widgets. The `ViewportCivilizationPanel` mini-stat grid (`:6422-6425`) shows **air** (`aircraftCount`), **sea** (`vesselCount`), and **nature** (`visibleFungalObservations.length`). The left-side status line shows `Nature: {n}` colored amber when 0, green otherwise (`:17195-17196`, `:17269`), and the bottom NATURE chip toggles between filtered/total counts (`:22769-22782`). All movers counts trace to `filteredAircraft/Vessels/Satellites` lengths.

---

#### 5. Complete API route index

Every `route.ts` under the six base directories. HTTP methods in parentheses where non-trivial. Paths are relative to `app/api/`.

##### 5.1 `app/api/crep/*` — CREP map data, tiles, viewport intelligence

| Route | Methods | Purpose |
|---|---|---|
| `crep/airnow/bbox` | GET | AirNow AQI monitors in a bbox (live EPA AQI proxy) |
| `crep/airnow/current` | GET | AirNow current-observations proxy for a point/station |
| `crep/biodiversity-hotspots` | GET | Biodiversity hotspot density from GBIF + iNaturalist |
| `crep/border-wait-times` | GET | US-MX/border crossing wait-time feed |
| `crep/buoy/[station]` | GET | NDBC NOAA buoy observations for one station |
| `crep/fungal-atlas` | GET | MINDEX Fungal Atlas layer (atlas index) |
| `crep/fungal-atlas/deployment` | GET | Fungal Atlas deployment/coverage status from MINDEX |
| `crep/fungal-atlas/samples` | GET | Fungal Atlas point samples from MINDEX |
| `crep/fungal-atlas/tiles/[layer]/[z]/[x]/[y]` | GET | Fungal Atlas raster/vector map tiles |
| `crep/fungal` | GET | **PRIMARY biodiversity data endpoint** — observation data for CREP nature layers |
| `crep/geocode` | GET | Forward geocode place names → coords (fly-to) |
| `crep/health` | GET | CREP dashboard health probe |
| `crep/infra/viewport-stats` | GET | Infrastructure asset counts/stats for current viewport |
| `crep/mojave` | GET | Mojave National Preserve + Goffs environmental aggregator |
| `crep/mycosoft-devices` | GET | Registered Mycosoft MycoBrain devices with live telemetry |
| `crep/nature-stream` | GET (SSE) | Server-Sent Events stream of live nature observations |
| `crep/nature/preloaded` | GET | Preloaded/permanent nature cache (fast cold-start path) |
| `crep/oyster/emit` | GET | NASA EMIT methane/mineral-dust plume feed |
| `crep/oyster/plume` | GET | UCSD PFM sewage-plume forecast (scrape fallback) |
| `crep/preferences` | GET/POST | Persist user map prefs (bounds, zoom, layers, kingdom filter) |
| `crep/reverse-geocode` | GET | Reverse-geocode + at-point lookup for map clicks |
| `crep/sdapcd/h2s` | GET | Imperial Beach Pier (SDAPCD) H₂S monitor readings |
| `crep/sdapcd/h2s/chart` | GET | Cached H₂S chart PNGs from collector |
| `crep/sdapcd/h2s/collect` | GET/POST | H₂S collector job (5-min scrape/ingest) |
| `crep/services` | GET | Pings known service endpoints → real health status |
| `crep/species/search` | GET | MINDEX species search by common/scientific name |
| `crep/status` | GET | Aggregate CREP service status |
| `crep/tijuana-estuary` | GET | Tijuana Estuary / Project Oyster environmental aggregator |
| `crep/tile-render/[layer]/[z]/[x]/[y]` | GET | GPU-rendered raster tile proxy |
| `crep/tiles/[...tile]` | GET | Static tile passthrough (prod tile-bug workaround) |
| `crep/tiles/satellite/[basemap]/[z]/[x]/[y]` | GET | Satellite/HD imagery tile cache proxy (Mapbox etc.) |
| `crep/unified` | GET | Single cached endpoint for all CREP data |
| `crep/viewport-ai-summary` | **POST** | **MYCA viewport AI summary** — builds prompt from counts/events/species/weather, calls MAS `/api/myca/chat`, deterministic fallback |
| `crep/viewport-environment` | GET | Viewport weather/AQI/water/geology/ecosystem aggregate (Environment tab + MYCA) |
| `crep/viewport-intel` | GET | Viewport place/civic/officials/facilities intel (reverse-geocode + jurisdiction stack) |
| `crep/viewport-sensors` | GET | Live environmental sensors in bbox (AQI, H₂S, tide, buoy, streamflow, IBWC) — live-only, no placeholders |
| `crep/waypoints` | GET/POST | List/create map waypoints |
| `crep/waypoints/[id]` | PATCH/DELETE | Update/delete a single waypoint |

##### 5.2 `app/api/eagle/*` — Eagle Eye live video/camera network

| Route | Methods | Purpose |
|---|---|---|
| `eagle/cam-image` | GET | Proxy a remote camera image URL (CORS/mixed-content shield) |
| `eagle/cam-snapshot` | GET | Headless snapshot capture of a camera stream |
| `eagle/connectors/bluesky` | GET | Bluesky Jetstream ephemeral video posts |
| `eagle/connectors/border-crossing` | GET | Tijuana/US-MX border crossing camera + data feed |
| `eagle/connectors/mastodon` | GET | Mastodon timeline ephemeral video posts |
| `eagle/connectors/public-webcams` | GET/POST | Windy + EarthCam + NPS + USGS + ALERTWildfire + HPWREN + Surfline + static-seed webcams |
| `eagle/connectors/shinobi` | GET/POST | Shinobi NVR monitor list (MAS 188 instance) |
| `eagle/connectors/state-dot-cctv` | GET | State DOT CCTV camera connector |
| `eagle/connectors/traffic-511` | GET/POST | Union of three 511 traveler-info camera feeds |
| `eagle/connectors/twitch` | GET | Twitch live streams (geo) connector |
| `eagle/connectors/webcamtaxi` | GET | Webcamtaxi public webcam map connector |
| `eagle/events` | GET | Ephemeral video events (social clips) from MINDEX `eagle.video_events` |
| `eagle/hls-proxy` | GET | Same-origin HLS (m3u8 + segment) proxy for DOT feeds that block CORS |
| `eagle/sources` | GET | **Permanent camera source registry** (MINDEX `eagle.video_sources` + live connector fan-out) — feeds MYCA camera chips/thumbnails |
| `eagle/stream/[sourceId]` | GET | Resolve a video_source_id → playable stream URL |
| `eagle/weather/multi` | GET | Multi-source weather aggregator for camera overlays |
| `eagle/youtube-embed` | GET | YouTube embed/metadata resolver for live broadcasts |

##### 5.3 `app/api/oei/*` — OEI Earth-intelligence connectors (live world feeds)

| Route | Methods | Purpose |
|---|---|---|
| `oei/aisstream` | GET | Real-time AIS vessel tracking (multi-source vessel registry) |
| `oei/buoys` | GET | Ocean buoy observations (NOAA NDBC + MINDEX cache) |
| `oei/carbon-mapper` | GET | Carbon Mapper methane/CO₂ emission plumes |
| `oei/cctv` | GET | CCTV/webcam live-stream feeds |
| `oei/cell-towers-global` | GET | Global cell towers (OpenCelliD + FCC ASR + OSM + MINDEX) |
| `oei/debris` | GET | Tracked orbital debris + statistical sub-catalog |
| `oei/drone-no-fly` | GET | Drone no-fly zone airspace polygons |
| `oei/ebird` | GET | eBird bird observations |
| `oei/eonet` | GET | NASA EONET natural-event tracker (fires/volcanoes/storms/floods) |
| `oei/events` | GET/POST | Recent events from the event bus (query/publish) |
| `oei/factories` | GET | Industrial facilities (OSM + GEM + Climate TRACE) |
| `oei/fishing` | GET | Global Fishing Watch fishing events (24 h) |
| `oei/flight-history/[id]` | GET | Historical flight track for one aircraft |
| `oei/flightradar24` | GET | Aircraft positions from all available flight sources |
| `oei/gbif` | GET | GBIF biodiversity observations |
| `oei/military` | GET | Military installations/bases/airfields/ranges |
| `oei/nws-alerts` | GET | NWS weather alerts (published to event bus) |
| `oei/obis` | GET | OBIS marine-species observations |
| `oei/openaq` | GET | OpenAQ air-quality measurements |
| `oei/opensky` | GET | OpenSky real-time aircraft positions |
| `oei/orbital-objects` | GET | Full orbital catalog (active + rocket bodies + debris + analyst) |
| `oei/overpass` | GET | OpenStreetMap Overpass query proxy |
| `oei/ports` | GET | Global seaport registry (multi-source) |
| `oei/power-grid` | GET | Power grid (HIFLD + EIA ArcGIS feature services) |
| `oei/power-plants` | GET | Global power plants (multi-source registry) |
| `oei/radar` | GET | Radar sites (NEXRAD + ECCC + FAA + Mycosoft SDR) |
| `oei/radio-stations` | GET | Global AM/FM/TV/SDR stations (Radio-Browser + KiwiSDR) |
| `oei/railway-live` | GET | Live trains (Amtrak Track-A-Train GeoJSON) |
| `oei/railways` | GET | Railway stations + infrastructure |
| `oei/satellites` | GET | Satellite tracking (real data only) |
| `oei/sdr/listen` | GET | SDR audio-tuning endpoint (3 modes) |
| `oei/space-weather` | GET | Space-weather conditions (NOAA SWPC) |
| `oei/space-weather/aurora` | GET | Aurora oval / probability overlay |
| `oei/submarine-cables` | GET | Submarine communication cable routes |
| `oei/sun-earth-correlation` | GET | Live solar events mapped to terrestrial impact |
| `oei/transmission-lines-global` | GET | Global electric transmission lines (multi-source) |
| `oei/usgs-volcano` | GET | USGS volcanic-activity alerts |
| `oei/youtube-live` | GET | Geospatial YouTube Live broadcast search |

##### 5.4 `app/api/natureos/*` — NatureOS platform BFF (MINDEX, devices, lab, NLM, MATLAB)

| Route | Methods | Purpose |
|---|---|---|
| `natureos/activity-topology` | GET | Activity/agent topology graph |
| `natureos/activity` | GET | Aggregated platform activity |
| `natureos/activity/recent` | GET | Recent activity from n8n + MAS + system |
| `natureos/aerosol/chemicals` | GET | Airborne chemical aerosol layer |
| `natureos/aerosol/dust` | GET | Atmospheric dust layer (CREP/MINDEX bbox) |
| `natureos/aerosol/pollen` | GET | Pollen hits (MINDEX unified-search) |
| `natureos/aerosol/radiation` | GET | Airborne radiation layer |
| `natureos/aerosol/spores` | GET | Airborne spore-dispersal layer |
| `natureos/aerosol/virus` | GET | Airborne virus/pathogen layer |
| `natureos/analytics/biodiversity` | GET | Species counts + observation metrics from MINDEX |
| `natureos/analytics/reports/biodiversity` | GET | Biodiversity analytics report |
| `natureos/analytics/timeseries` | GET | Aggregated event counts over time |
| `natureos/biology-simulator/unreal-bridge` | GET | Unreal biology-sim bridge config (feature-flag) |
| `natureos/bluesight/[[...path]]` | GET/POST | BlueSight subsystem catch-all proxy |
| `natureos/devices/[id]/telemetry` | GET | Telemetry for one device |
| `natureos/devices/mycobrain` | GET/POST | MycoBrain device list / commands |
| `natureos/devices/telemetry` | GET | Aggregate device telemetry |
| `natureos/devices/twin` | GET/POST | Digital-twin device telemetry sync |
| `natureos/earth2` | GET/POST | NVIDIA Earth-2 proxy to MAS Earth-2 endpoints |
| `natureos/export/json` | GET | Export event/observation data as JSON |
| `natureos/feeds/openaq/measurements` | GET | OpenAQ measurements feed |
| `natureos/functions/stats` | GET | Edge-function invocation stats (api_usage_log) |
| `natureos/global-events` | GET | Real-time worldwide event aggregation |
| `natureos/intel-reports` | GET | Defense/environmental intel reports (military acronyms) |
| `natureos/lab/chemputer/plan` | POST | Chemputer synthesis-plan generation |
| `natureos/lab/growth/instrument-summary` | GET | Growth-instrument summary |
| `natureos/lab/protocols` | GET | Lab protocols (NatureOS backend proxy) |
| `natureos/lab/samples` | GET/POST | Lab samples list/create |
| `natureos/lab/samples/[id]` | GET | Single lab sample |
| `natureos/live-stats` | GET | Live biodiversity stats for all kingdoms |
| `natureos/matlab/analysis` | POST | Generic MATLAB analysis execution |
| `natureos/matlab/anomaly-detection` | POST | MATLAB anomaly detection |
| `natureos/matlab/classification` | POST | MATLAB fungal-morphology classification |
| `natureos/matlab/forecast` | POST | MATLAB environmental forecast |
| `natureos/matlab/health` | GET | MATLAB integration status |
| `natureos/matlab/visualization` | POST | MATLAB visualization render |
| `natureos/mindex/compounds` | GET | MINDEX compounds proxy |
| `natureos/mindex/console` | GET | MINDEX admin console BFF (stats/ETL/NAS/earth) |
| `natureos/mindex/containers` | GET | Docker containers (user-visibility filtered) |
| `natureos/mindex/data-ai-summary` | POST | AI summary of MINDEX data view |
| `natureos/mindex/devices` | GET/POST | MINDEX device registry |
| `natureos/mindex/etl-status` | GET | MINDEX ETL status |
| `natureos/mindex/etl/run` | POST | Trigger MINDEX ETL run |
| `natureos/mindex/genes/[species]` | GET | Gene/sequence features for a species |
| `natureos/mindex/genomes` | GET | Genome sequence data for visualization |
| `natureos/mindex/health` | GET | MINDEX comprehensive health check |
| `natureos/mindex/ledger` | GET | MINDEX integrity ledger entries |
| `natureos/mindex/ledger/anchor` | POST | Anchor a ledger record |
| `natureos/mindex/library` | GET | MINDEX media/data library index |
| `natureos/mindex/library/classify` | POST | Classify a library item |
| `natureos/mindex/library/file` | GET | Fetch a library file |
| `natureos/mindex/library/human-identification` | GET/POST | Human-in-loop identification queue |
| `natureos/mindex/library/wave-annotation` | GET/POST | Waveform annotation read/write |
| `natureos/mindex/mwave` | GET | MWave signal data |
| `natureos/mindex/observations` | GET | MINDEX observations proxy |
| `natureos/mindex/phylogeny` | GET | Taxonomy/phylogeny hierarchy |
| `natureos/mindex/search` | GET | Unified search (taxa/observations/compounds/research) |
| `natureos/mindex/sine/training/human-tags` | GET | SINE human training tags |
| `natureos/mindex/stats` | GET | MINDEX statistics (BFF) |
| `natureos/mindex/sync` | GET/POST | MINDEX sync/ETL control |
| `natureos/mindex/taxa` | GET | MINDEX taxa list |
| `natureos/mindex/taxa/[id]` | GET | Single taxon |
| `natureos/mycelium/network` | GET | Mycelium network data (MAS + topology) |
| `natureos/n8n` | GET | n8n status/proxy |
| `natureos/n8n/import` | POST | Import an n8n workflow |
| `natureos/n8n/workflows-list` | GET | List known MAS-repo n8n workflows |
| `natureos/network/symbiosis` | GET/POST | FUNGA symbiosis-network analysis |
| `natureos/nlm-training` | GET/POST | NLM training jobs |
| `natureos/nlm-training/mindex` | GET | NLM training data from MINDEX |
| `natureos/nlm-training/models` | GET/POST | NLM model list/create |
| `natureos/nlm-training/models/[id]` | PATCH | Update one NLM model |
| `natureos/nlm-training/mycobrain` | GET | NLM MycoBrain training feed |
| `natureos/nlm-training/preferences` | GET/PUT | NLM training preferences |
| `natureos/nlm-training/runs` | GET/POST | NLM training runs |
| `natureos/nlm-training/runs/[id]` | GET/PATCH | Single training run |
| `natureos/nlm-training/status` | GET | NLM training status |
| `natureos/nlm-training/variants` | GET/POST | NLM model variants |
| `natureos/petri/[[...path]]` | GET/POST | Virtual Petri Dish engine catch-all proxy |
| `natureos/pipeline-status` | GET | Data-pipeline status |
| `natureos/population` | GET | Live world-population estimate (animated counters) |
| `natureos/settings` | GET/POST/PUT | NatureOS settings |
| `natureos/settings/changelog` | GET/POST | Settings change log |
| `natureos/shell/mindex` | POST | MINDEX cloud-shell command exec |
| `natureos/simulation` | POST | Simulation via MATLAB analysis endpoint |
| `natureos/spores` | GET/POST | FUNGA spore-dispersal model |
| `natureos/status` | GET | Ecosystem-health status for MAS NatureOSSensor |
| `natureos/storage/artifacts` | GET/POST | Storage artifacts list/upload |
| `natureos/summary` | GET | High-level NatureOS state summary (MYCA context) |
| `natureos/system/metrics` | GET | Real system metrics (MAS + system) |
| `natureos/telemetry` | GET | NatureOS telemetry stream |
| `natureos/tools-hub/health` | GET | Tools-hub health probe |

##### 5.5 `app/api/mindex/*` — MINDEX cryptographic data platform BFF

| Route | Methods | Purpose |
|---|---|---|
| `mindex/[[...path]]` | GET/POST/PUT/DELETE | MINDEX API catch-all proxy (`/api/mindex/*`, no mock fallback) |
| `mindex/agents/anomalies` | GET | Detected anomalies from MAS/MINDEX agents |
| `mindex/agents/commands/queue` | GET | Agent command queue |
| `mindex/agents/insights/publish` | POST | Publish an agent insight |
| `mindex/agents/telemetry/latest` | GET | Latest agent telemetry |
| `mindex/anchor` | POST | Anchor data to integrity chain |
| `mindex/anchor/status` | GET | Anchor status |
| `mindex/compounds/detail` | GET | Compound detail by name/id |
| `mindex/devices` | GET | MINDEX device endpoints proxy |
| `mindex/etl/improvement` | POST | Submit ETL improvement |
| `mindex/fungal-atlas/status` | GET | Fungal Atlas status |
| `mindex/genetics` | GET | DNA sequences from MINDEX |
| `mindex/genetics/detail` | GET | Genetics detail by id/accession |
| `mindex/genetics/ingest-background` | POST | Background genetics ingest (accessions) |
| `mindex/genome-tracks` | GET | Genome browser tracks |
| `mindex/graft` | GET/POST/PUT | Data grafting — auto-ingest external search hits |
| `mindex/graphql` | GET/POST | MINDEX GraphQL endpoint |
| `mindex/health` | GET | MINDEX health |
| `mindex/ingest/[type]` | GET/POST | Typed CREP-data ingestion gate |
| `mindex/integrity/proof/[id]` | GET | Cryptographic proof for a record |
| `mindex/integrity/record/[id]` | GET | Integrity record by id |
| `mindex/integrity/records/recent` | GET | Recent integrity records |
| `mindex/integrity/verify/[id]` | GET | Verify one record |
| `mindex/integrity/verify` | POST | Verify a batch/record |
| `mindex/observations` | GET | MINDEX observations |
| `mindex/playback` | GET/POST | Time-series data playback |
| `mindex/proxy/[source]` | GET/POST | **Unified cache proxy for all CREP map layers** (bbox params) |
| `mindex/registry/devices` | GET/POST/PUT | Mycosoft device registry |
| `mindex/registry/events` | GET/POST/DELETE | Event registry CRUD |
| `mindex/research/search` | GET | Research-paper/document search |
| `mindex/sine/blobs/[id]/analysis` | GET | SINE blob analysis result |
| `mindex/sine/blobs/[id]/analyze` | POST | Trigger SINE blob analysis |
| `mindex/sine/blobs/[id]/visualisation` | GET | SINE blob visualization |
| `mindex/sine/detectors` | GET | SINE detector list |
| `mindex/sine/library/blobs` | GET | SINE library blobs |
| `mindex/sine/library/blobs/[id]/stream` | GET | Stream a SINE library blob |
| `mindex/sine/models` | GET | SINE model list |
| `mindex/sine/models/[model_id]` | GET | Single SINE model |
| `mindex/sine/prototypes` | GET | SINE prototype list |
| `mindex/sine/status` | GET | SINE subsystem status |
| `mindex/smells` | GET/POST | Smell/VOC signature data |
| `mindex/species` | GET | Curated species quick-access list |
| `mindex/species/detail` | GET | Species/taxonomy detail by name/id |
| `mindex/species/ingest-background` | POST | Background species ingest |
| `mindex/stream/channels` | GET | Live stream channel list |
| `mindex/stream/publish` | POST | Publish to a stream channel |
| `mindex/stream/subscribe` | GET (SSE) | Subscribe to a stream channel |
| `mindex/taxa` | GET | MINDEX taxa proxy |
| `mindex/telemetry` | GET/POST | Telemetry read/write |
| `mindex/telemetry/latest` | GET | Latest telemetry |
| `mindex/telemetry/samples` | GET | Telemetry samples |
| `mindex/unified-search/earth` | GET | **Unified earth search** for Fluid Search / Earth Simulator |
| `mindex/verify/[id]` | (handler) | Verify a record by id |
| `mindex/visualization/circos` | GET/POST | pyCirclize circular-genomics render |
| `mindex/waypoints` | GET/POST | MINDEX-backed waypoints |
| `mindex/wifisense` | GET/POST | WiFiSense radio-based presence/motion sensing |

##### 5.6 `app/api/earth-simulator/*` — Earth Simulator grid / tiles / aggregation

| Route | Methods | Purpose |
|---|---|---|
| `earth-simulator/aggregate` | **POST** | Aggregate all data sources for a viewport → probabilities |
| `earth-simulator/cell/[cellId]` | GET | Detailed data for one grid cell |
| `earth-simulator/devices` | GET | Devices on the Earth Simulator grid |
| `earth-simulator/gee` | GET/POST | Google Earth Engine API proxy |
| `earth-simulator/gee/tile/[type]/[z]/[x]/[y]` | GET | GEE (or fallback) imagery tiles |
| `earth-simulator/grid` | GET/POST | Grid cell data for a viewport + zoom |
| `earth-simulator/heat-tiles/[z]/[x]/[y]` | GET | Temperature heat raster tiles |
| `earth-simulator/inaturalist` | GET/POST | iNaturalist organism-observation proxy |
| `earth-simulator/land-tiles` | GET | Land-cover/classification tiles |
| `earth-simulator/layers` | GET | Aggregated multi-source layer data |
| `earth-simulator/mycelium-probability` | GET/POST | Per-cell mycelium-probability calculation |
| `earth-simulator/mycelium-tiles/[z]/[x]/[y]` | GET | Mycelium-network probability raster tiles |
| `earth-simulator/search` | GET | Search locations/species/observations |
| `earth-simulator/tiles/[z]/[x]/[y]` | GET | Tile-based data for a z/x/y coordinate |
| `earth-simulator/weather-tiles/[z]/[x]/[y]` | GET | Weather-overlay raster tiles |

#### 6. Known limitations / notes in this domain

- **MYCA summary is throttled, not live.** Active triggers cap at one analysis per 30 s; `data`-reason refreshes are capped at one per 5 minutes (`MycaViewportPanel.tsx:147-148`). On the Earth Simulator route the panel additionally waits on `mycaAssetsReady` (a 4–6.5 s post-load timer) and is suppressed entirely during map animation, so the panel can show only the deterministic `localSummary` for several seconds after load.
- **AI summary safety filter.** `/api/crep/viewport-ai-summary` rejects any MAS response containing hardware/provider/infra terms (`rtx`, `gpu`, `nemotron`, `claude`, `openai`, `redis`, IP/localhost fragments, "fallback", error-y phrases) and substitutes a deterministic summary (`route.ts:79-109`, `201-207`). The MAS call has a 3.5 s server timeout; any non-OK or empty response also falls back deterministically (`:186-195`).
- **Counts are viewport-filtered, not global.** `aircraftCount`/`vesselCount`/`satelliteCount` are `filtered*` lengths; events are capped at 20 via `selectMycaLatestViewportEvents` and zeroed under `auditAllOffMode`; nature observations are zeroed at `mapZoom < 5` (`CREPDashboardClient.tsx:13407`).
- **`mindex/verify/[id]`** exports no detectable standard HTTP-method function via the comment/export scan — confirm its handler signature before relying on it.
- **Earth-2 controls disabled.** The Environment tab's Earth-2 GPU modeling block is intentionally commented out until the GPU service is ready (`CREPDashboardClient.tsx:6677`).
- **Right-panel "Data Layers" tab removed** (May 21 2026) to end duplicate filter authority with the left Intel Feed; filtering now lives in the left panel + toolbar ALL ON/ALL OFF chips (`:22885-22893`).

---
