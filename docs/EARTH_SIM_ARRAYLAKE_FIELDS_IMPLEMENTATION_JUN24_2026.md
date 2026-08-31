# Earth Simulator ← Arraylake animated fields — implementation record (Jun 24 2026)

Full record of the work that wired Mycosoft's 10 Arraylake (Earthmover) ARCO cubes into Earth
Simulator as animated layers, with "Nature & Climate" filter buttons and radar-grade LOD. Companion
to the contract (`EARTH_SIM_ARRAYLAKE_WIRING.md`) and the Cursor task brief
(`CURSOR_ARRAYLAKE_FIELDS_DATAPLANE_JUN24_2026.md`).

**Status:** view plane built + type-clean + adversarially reviewed; data plane = scripts delivered
(Cursor runs them). Flag-gated **OFF** (`NEXT_PUBLIC_ES_ARRAYLAKE_FIELDS`). Additive (toggle off =
byte-for-byte v1). **No mock data. Uncommitted, not deployed.**

---

## 1. What we own (the `mycosoft` Arraylake org, locked Jun 24 2026)

Accessed via `arraylake.Client().get_repo("mycosoft/<x>").readonly_session(branch="main")` →
`zarr.open_group(session.store, zarr_format=3)`. 10 ARCO (Zarr v3 / Icechunk) cubes:

| # | repo | id | render | what it animates |
|---|------|----|--------|------------------|
| 1 | `era5` | era5 | raster + wind | ECMWF reanalysis — temp heatmap, wind flow, precip ("the past") |
| 2 | `noa-hrrr-forcast48hr` | hrrr | raster + wind | NOAA HRRR 48h forecast, 3km CONUS ("the next") |
| 3 | `helios-solar-irradiance` | helios | raster | Zeus AI solar GHI (ties to EIA solar plants) |
| 4 | `ALIVE-hourly` | alive | raster | GPP — photosynthesis / **carbon-IN** |
| 5 | `canopy-height` | canopy-height | raster (static) | Meta/WRI 1m canopy — structure |
| 6 | `global-sentinel2-mosaics` | sentinel2 | raster | 10m NDVI + true-color |
| 7 | `GEO-stero-wind` | geo-stereo-wind | wind | observed height-resolved wind (showcase) |
| 8 | `biomass-atlas-sample` | biomass-sample | raster (static) | AGB sample |
| 9 | `global-aboveground-biomass` | biomass-global | raster (static) | AGB — **carbon-STORED** |
| 10 | `noaa-mrms-conus-hourly` | mrms | raster | 1km observed radar ("the now") |

**The differentiated story:** ALIVE GPP (carbon-IN) × biomass (STORED) × canopy (structure) ×
Sentinel-2 (condition) = a full forest-carbon model. The one term no commercial platform has is
**decomposition (carbon-OUT) = fungi**, which Mycosoft owns (MINDEX/MycoBrain). Earth Sim is the only
globe that can animate the **complete carbon cycle including the fungal arm**.

---

## 2. Architecture — two planes, one contract

`arraylake`/`zarr`/`icechunk` are server-side Python (heavy, auth'd) — they never enter the Next.js
browser bundle. So:

```
DATA PLANE (Cursor / server)                       VIEW PLANE (website repo)
arraylake → readonly Icechunk → zarr v3             lib/crep/fields/registry.ts   (FIELD_REGISTRY)
 → introspect.py (schemas)                          app/api/crep/field/[...path]  (BFF: _catalog + manifest)
 → bake_field.py: PNG frames (scalar) /             components/crep/layers/field-raster-layer.tsx
   velocity-grid JSON (wind) + manifest             components/crep/layers/field-wind-layer.tsx
 → ARRAYLAKE_FIELD_OUT storage  ───manifest+frames──► registered in CREPDashboardClient (Nature category)
```

The data plane bakes pre-rendered animation frames (not raw Zarr) so the globe stays GPU-cheap — the
exact pattern as our RainViewer radar (per-timestep raster frames) and the v2 volumetric-smoke plan.

---

## 3. Files (every file touched)

### View plane — NEW (this repo, type-clean)
| File | What it does |
|------|--------------|
| `lib/crep/fields/registry.ts` | `FIELD_REGISTRY` — the 10 cubes × animatable variables, color ramps, `valueRange`, `render`, per-dataset `minZoom`, `VERIFY`-marked `zarrVar`/`timeDim`. `FIELD_GROUP_CATEGORY` (→ `nature`), `fieldLayerId()`, `ARRAYLAKE_FIELDS_FLAG`. The single source of truth. |
| `app/api/crep/field/[...path]/route.ts` | BFF. `GET /_catalog` → the registry (the bake job reads it). `GET /{dataset}/{variable}` → frame manifest (registry metadata + baked frames, relative paths → absolute). Graceful-degrades to `frames:[]` 200 when unbaked/unset — same as the feed proxy. |
| `components/crep/layers/field-raster-layer.tsx` | Animated scalar layer — RainViewer-style frame opacity-cycle + crossfade; image-source (global) or raster-tile (regional) frames; **`minZoom` teardown + viewport-intersection gate**. |
| `components/crep/layers/field-wind-layer.tsx` | Animated wind layer — geo-space particle advection on a canvas overlay; **`minZoom` floor + pause-rAF-on-move + device-class particle cap + dt-scaled speed**. |

### View plane — EDITED
| File | Change |
|------|--------|
| `app/dashboard/crep/CREPDashboardClient.tsx` | (a) imports; (b) registers field layers into the `layers` state, flag-gated; (c) new **`nature`** category in 4 hardcoded sites (`LayerConfig.category` union, `layerCategories`, `groups`, `expandedCategories`); (d) mounts `<FieldRasterLayer>`/`<FieldWindLayer>` behind `shouldRenderHeavyOverlays` (radar gate) with `minZoom` passed from the registry. |

### Data plane — NEW (Cursor runs these)
| File | What it does |
|------|--------------|
| `scripts/arraylake/introspect.py` | Read-only dump of every cube's schema (arrays, dims, coords, time extent) → `arraylake_cubes.json`. Confirms the `VERIFY` names. |
| `scripts/arraylake/bake_field.py` | Reads the BFF `_catalog`; bakes per-timestep equirectangular RGBA PNGs (scalar, ramp-colorized) / velocity-grid JSON (wind) + `manifest.json` → `ARRAYLAKE_FIELD_OUT`. Handles lat-flip, 0–360→±180 roll, decimation-with-coords, NaN→transparent. Raises loud on projected grids; skips the Sentinel-2 truecolor stub. |

### Docs — NEW
| File | What |
|------|------|
| `docs/EARTH_SIM_ARRAYLAKE_WIRING.md` | The contract + env + per-cube render map + Cursor sequence. |
| `docs/CURSOR_ARRAYLAKE_FIELDS_DATAPLANE_JUN24_2026.md` | The directive Cursor task brief (run the data plane). |
| `docs/EARTH_SIM_ARRAYLAKE_FIELDS_IMPLEMENTATION_JUN24_2026.md` | This record. |

---

## 4. Data contract (bake → BFF → layers, verified end-to-end consistent)

- **Catalog:** `GET /api/crep/field/_catalog` → `{ datasets: FIELD_REGISTRY }`.
- **Manifest:** `GET /api/crep/field/{dataset}/{variable}` → `{ render, ramp, valueRange, minZoom,
  bounds:[w,s,e,n], frames:[...] }`.
- **Frame:** scalar `{ t, image:"{i}.png" }` (or `tiles` XYZ template); wind `{ t, grid:"{i}.json" }`.
- **Wind grid JSON:** `{ width, height, bounds:[w,s,e,n], u:[], v:[] }` row-major **north→south**.
- **Bounds** are `[west,south,east,north]` everywhere; PNGs are **north-row-first**; image-source
  coordinates are `[[w,n],[e,n],[e,s],[w,s]]`. (All three reviewed and confirmed to agree.)

---

## 5. Nature filter buttons

All 10 cubes' ~14 variables appear as toggles under a new **"Nature & Climate"** panel category
(lime, thermometer icon), below "Biodiversity & Environment". Category keys are **hardcoded in 4
sites in `CREPDashboardClient.tsx` that must agree** (an unlisted key is silently dropped):
1. `LayerConfig.category` union, 2. `layerCategories` (label/icon/color), 3. the `groups` bucket map,
4. `expandedCategories` (starts expanded). `FIELD_GROUP_CATEGORY` points every field group at
`nature`. Buttons auto-render from the `layers` state (same mechanism as the feed layers),
default-OFF.

---

## 6. LOD / viewport — same rules as live radar

Live radar (RainViewer) gating, established by review: mount behind `shouldRenderHeavyOverlays`
(defers past first-paint + pauses during camera animation), native MapLibre tile culling, `maxzoom`
overzoom; it is governor-**exempt** (PROTECTED in `FpsAutoGovernor.tsx`). Matched, plus the floor
radar gets free from tiles but image/canvas sources don't:

| Gate | raster | wind |
|------|--------|------|
| `shouldRenderHeavyOverlays` mount (defer + pause-on-move) | ✅ | ✅ |
| Per-dataset `minZoom` floor (teardown below) | ✅ | ✅ |
| Viewport-intersection gate (regional cubes only) | ✅ | n/a |
| Pause rAF on `movestart/zoomstart/…`, resume on settle | n/a | ✅ |
| Device-class cap (40/70/100% by screen width) | n/a | ✅ |
| dt-scaled advection (device-independent speed) | n/a | ✅ |

Field layers are **not** governor-protected (unlike radar) — they're shed-able, which is correct
since the wind canvas isn't life-safety.

---

## 7. Verification done

- **TypeScript:** `tsc --noEmit` — **zero errors** in any new field file; `CREPDashboardClient` has
  only its one pre-existing `showSubstations` error (unrelated). Both Python scripts `py_compile` OK.
- **3 independent adversarial reviews** (contract consistency / React layers / Python + registration).
  View plane came back clean (lifecycle teardown, key/bounds/orientation consistency, flag-gating
  zero-v1-impact). **Fixes applied** from the reviews:
  - wind/scalar **decimation-vs-bounds desync** (bounds now from the decimated grid);
  - **OOM**: default `valueRange` no longer materializes the whole cube (derived from baked slices);
  - **projected grids** now **raise loud** (degree-range assertion) instead of silently mis-baking;
  - wind advection made **frame-rate-independent** (dt factor);
  - `datetime.utcnow()` → tz-aware; `xarray>=2024.9` pin; dropped an unused import.

---

## 8. How to test locally

1. Enable the flag in `.env.local` (build-time):
   ```
   NEXT_PUBLIC_ES_ARRAYLAKE_FIELDS=1
   ```
2. Start the dev server (port 3010, 6 GB heap — already configured):
   ```bash
   npm run dev
   ```
3. Open **http://localhost:3010/natureos/earth-simulator**
4. Open the layer panel → the **"Nature & Climate"** category → the 14 toggles are there, default OFF.
   - **Without baked data** (now): toggling a layer mounts it but it renders nothing (graceful — no
     mock data). You're verifying the buttons, the category, and the LOD/teardown behavior.
   - **With baked data** (after Cursor runs the data plane and `ARRAYLAKE_FIELD_BASE` points at the
     baked output): toggling animates the field. To test data locally, run `bake_field.py` with
     `ARRAYLAKE_FIELD_OUT` pointing at a locally-served dir and set `ARRAYLAKE_FIELD_BASE` to it.

---

## 9. Guardrails honored
Additive + flag-gated (no flag → no category, no buttons, no mounts, byte-for-byte v1) · no mock data
· fungal data untouched · uncommitted + not deployed (awaiting Morgan + the data plane).

## 10. Follow-ups (non-blocking)
XYZ tile pyramids (crisper than single equirectangular PNG) · globe-locked WebGL wind via BlueSite ·
time-scrubber UI (the raster layer already accepts `scrubIndex`) · FPS-dynamic wind downshift via the
governor · the GPP×biomass×canopy×fungal-decomposition carbon-cycle analysis surface.
