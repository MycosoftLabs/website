# Earth Simulator ← Arraylake gridded fields (wiring)

**Status:** view plane built (this PR), data plane pending (Cursor). Flag-gated OFF; not deployed.
**Date:** Jun 24 2026 · **Owner:** Earth Sim (website) + Cursor (data plane)

Wire the 10 owned `mycosoft` Arraylake cubes into Earth Simulator as **animated** layers.
`arraylake`/`zarr`/`icechunk` are server-side Python and never enter the Next.js browser
bundle, so this is a **two-plane** integration bound by one contract.

```
DATA PLANE (Cursor / server, authed Python)          VIEW PLANE (this repo, TS/React)
────────────────────────────────────────────         ────────────────────────────────
arraylake.get_repo("mycosoft/<x>")                    lib/crep/fields/registry.ts   (FIELD_REGISTRY)
 → readonly_session → zarr v3 group                   app/api/crep/field/[...path]  (BFF: _catalog + manifest)
 → scripts/arraylake/introspect.py  (schemas)         components/crep/layers/field-raster-layer.tsx (scalar loop)
 → scripts/arraylake/bake_field.py  (frames)          components/crep/layers/field-wind-layer.tsx    (wind particles)
 → ARRAYLAKE_FIELD_OUT storage  ───────manifest+frames────►  registered in CREPDashboardClient (flag-gated)
```

## The 10 cubes (owned, locked Jun 24 2026)

| repo | id | render | key variables | notes |
|------|----|--------|---------------|-------|
| `mycosoft/era5` | `era5` | raster + wind | t2m, 10m wind, tp | reanalysis "time machine" |
| `mycosoft/noa-hrrr-forcast48hr` | `hrrr` | raster + wind | t2m, composite reflectivity, 10m wind | **Lambert-projected → reproject** |
| `mycosoft/helios-solar-irradiance` | `helios` | raster | GHI | overlay EIA solar plants |
| `mycosoft/ALIVE-hourly` | `alive` | raster | GPP | carbon-IN (photosynthesis) |
| `mycosoft/canopy-height` | `canopy-height` | raster (static) | canopy height | fungal habitat |
| `mycosoft/global-sentinel2-mosaics` | `sentinel2` | raster | NDVI, **truecolor (RGB stub)** | 10 m optical |
| `mycosoft/GEO-stero-wind` | `geo-stereo-wind` | wind | u/v | observed wind showcase |
| `mycosoft/biomass-atlas-sample` | `biomass-sample` | raster (static) | AGB | fast-iteration sample |
| `mycosoft/global-aboveground-biomass` | `biomass-global` | raster (static) | AGB | carbon-STORED |
| `mycosoft/noaa-mrms-conus-hourly` | `mrms` | raster | reflectivity, precip rate | **projected → reproject**; 1 km radar |

## Contract

**Catalog** (single source of truth, served by the view plane):
`GET /api/crep/field/_catalog` → `{ datasets: FIELD_REGISTRY }`. The bake job reads this.

**Manifest** (per dataset+variable):
`GET /api/crep/field/{dataset}/{variable}` → registry metadata (`render`, `ramp`, `valueRange`,
`unit`, `minZoom`) merged with the baked frames:
```jsonc
{ "dataset":"era5","variable":"t2m","render":"raster","ramp":[...],"valueRange":[233,318],
  "bounds":[w,s,e,n],"updated":"...","baked":true,
  "frames":[ {"t":"2026-06-24T00:00:00Z","image":"0.png"}, ... ] }   // scalar
{ "...":"...", "frames":[ {"t":"...","grid":"0.json"} ] }            // wind
```
The BFF resolves relative `image`/`grid`/`tiles` paths to absolute URLs on
`ARRAYLAKE_FIELD_BASE`. **Until a cube is baked (or the base is unset) it returns
`frames: []` with 200** and the layer renders nothing — the same graceful-degrade
contract as the feed proxy. **No mock data, ever.**

**Baked artifacts** (written by `bake_field.py` to `ARRAYLAKE_FIELD_OUT/{dataset}/{variable}/`):
- scalar → `{i}.png` (equirectangular RGBA, colorized by the ramp) + `manifest.json`
- wind   → `{i}.json` (`{width,height,bounds,u[],v[]}`, row-major N→S) + `manifest.json`

## Env vars

| var | plane | purpose |
|-----|-------|---------|
| `NEXT_PUBLIC_ES_ARRAYLAKE_FIELDS=1` | view (build) | master flag — without it the whole framework is dark (no panel entries, no mounts) |
| `ARRAYLAKE_FIELD_BASE` | view (server) | base URL the BFF reads manifests/frames from (CDN or asset mount) |
| `ARRAYLAKE_FIELD_TOKEN` | view (server) | optional `X-Internal-Token` for the manifest fetch |
| `ARRAYLAKE_FIELD_OUT` | data | dir the bake job writes to (= what `ARRAYLAKE_FIELD_BASE` serves) |
| `ARRAYLAKE_CATALOG_URL` | data | catalog endpoint (default `https://mycosoft.com/api/crep/field/_catalog`) |
| `ARRAYLAKE_TOKEN` | data | Arraylake auth (or `arraylake auth login`) |

## Cursor sequence (data plane)

1. `pip install "arraylake" "zarr>=3" "icechunk" "xarray>=2024.9" "numpy" "pillow" "rioxarray" "pyproj"`
2. `arraylake auth login`
3. **Introspect** → `python scripts/arraylake/introspect.py` → `arraylake_cubes.json`.
   **Confirm every `VERIFY` field in `lib/crep/fields/registry.ts`** (`zarrVar`, `zarrVarV`,
   `timeDim`, `valueRange`) against the real array/coord names; fix the registry where they differ.
4. **Reproject the projected grids**: HRRR (Lambert-conformal) and MRMS are NOT regular lat/lon —
   add `da = da.rio.reproject("EPSG:4326")` before `to_latlon_2d()` in `bake_field.py`.
5. **Sentinel-2 true-color**: implement the `truecolor` stub — compose B04/B03/B02 → RGB PNG
   (8-bit stretch), not a scalar ramp.
6. `export ARRAYLAKE_FIELD_OUT=/opt/mycosoft/media/website/assets/fields` (or a Supabase/R2 bucket)
   and `python scripts/arraylake/bake_field.py` (all) — verify `manifest.json` + frames land.
7. **Cron** the live cubes (era5/hrrr/helios/alive/sentinel2/geo-stereo-wind/mrms) to re-bake;
   static cubes (canopy-height, biomass-*) bake once. (`.github/workflows/` or server cron.)
8. Set `ARRAYLAKE_FIELD_BASE` (+ `ARRAYLAKE_FIELD_TOKEN`) on the website server, and
   `NEXT_PUBLIC_ES_ARRAYLAKE_FIELDS=1` at build, then deploy. The layers appear in the panel,
   default OFF; toggling one streams its baked frames and animates.

## Panel UI + LOD (matches live radar)

- **Filter buttons:** all 10 cubes' variables appear as toggles under a new **"Nature & Climate"** panel category (`category: "nature"`). The category is registered in the 4 hardcoded sites in `CREPDashboardClient.tsx` — the `LayerConfig.category` union, `layerCategories`, the `groups` bucket map, and `expandedCategories` — and `FIELD_GROUP_CATEGORY` (registry) points every field group at it. Buttons auto-render from the `layers` state, default-OFF.
- **LOD / viewport — same rules as live radar (RainViewer):** the field layers mount behind `shouldRenderHeavyOverlays` (defers past first-paint + pauses during camera animation). Because image/canvas sources lack native tile culling, the layers add the floor radar gets free from tiles: enforce the registry per-dataset `minZoom` (tear down below it); the raster layer adds a viewport-intersection gate for **regional** cubes (HRRR/MRMS — drops the source when panned away; global cubes skip it); the wind layer pauses its rAF on movement and caps particle count by device class. Radar is governor-*exempt*; these field layers are not.

## Guardrails honored

- **Additive + flag-gated:** no flag → no panel entries, no mounts, no network. Toggle off =
  byte-for-byte v1. Fungal layers untouched.
- **No mock data:** layers render only real baked frames; empty manifest → nothing.
- **Not deployed:** PR only, awaiting Morgan + the data plane.

## Follow-ups (not blocking)

- XYZ tile pyramids (rio-tiler/gdal2tiles) instead of single equirectangular PNGs → crisp at all
  zooms + correct globe drape (current single-image is fine regionally / at moderate zoom).
- Globe-locked WebGL wind particles via the BlueSite harness (`lib/crep/bluesite`) — the current
  canvas overlay is geo-space-accurate at low/moderate tilt.
- Time scrubber UI (the raster layer already accepts `scrubIndex`).
- Derived layers: ALIVE GPP × biomass × canopy × fungal decomposition = the full carbon cycle.
