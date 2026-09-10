# Earth Sim Env and Live Data Layer Test — September 10, 2026

**Date:** September 10, 2026  
**Status:** 3010 Live Data binds ready. ITDX Instant Deploy owner includes these files in the same SHA. This agent did **not** cut 187.  
**Routes:** `/fusarium/earth-simulator`, `/natureos/earth-simulator`, `/fusarium/aerosol`  
**RJ Ricasata = CFO.** No mock plumes. Do not gut `/fusarium/itdx`.

## What was broken

Opening and closing every **Live Data** chip did nothing on the globe.

1. Capture-phase `pointerdown` only toggled items in `nativeLegendItemByKey`.
2. That index listed Environment / infra / devices — **not** Live Data.
3. Capture-phase `click` swallowed the button `onClick`, so the React handler never ran.
4. Arraylake `FieldRasterLayer` / `FieldWindLayer` were also gated on `NEXT_PUBLIC_ES_ARRAYLAKE_FIELDS === "1"` and `shouldRenderHeavyOverlays`.

Chrome was already there. The bind was dead.

## What was fixed

- Live Data items are in `nativeLegendItemByKey` so pointerdown sets `layers[].enabled`.
- Field overlays always mount; `enabled` adds/removes only that source/layer id.
- Aerosol wind / dispersal no longer wait on `shouldRenderHeavyOverlays`.
- Same BFF as `/fusarium/aerosol`: `/api/crep/field/{dataset}/{variable}`, `/api/crep/environment/air-quality`.
- Radar and field rasters use `interactive: false` so they do not steal ECM/AM/fungi events.
- AM/ECM first paint generates 512px tiles to match `tileSize: 512` (no 96→512 blur).

## ECM / AM first paint

AM/ECM SPUN rasters declare `tileSize: 512`. Generating 96px at boot zoom stretched into a blurry first frame. `fungalTileSize` now returns **512** for `am` and `ecm` so the first paint is nearest-neighbor native, not an upscale.

## Pass 1 — Environmental Conditions (one by one)

On `/fusarium/earth-simulator`, Nature filter column, **Environment / Conditions**:

| Step | Action | Pass |
|---|---|---|
| 1 | AM ON | Green chip. Sharp AM raster in first ~5s. |
| 2 | AM OFF | AM overlay gone. Other layers stay. |
| 3 | ECM ON | Green chip. Sharp ECM raster. |
| 4 | ECM OFF | ECM gone. |
| 5 | Other env chips one-by-one | Only that overlay changes. |

## Pass 2 — Live Data (on → source/pixels → off)

**Live Data** sits immediately under Environmental Conditions. Default all OFF.

| Step | Action | Pass |
|---|---|---|
| 1 | PM / Aerosol particulates ON | Chip green. Map source `fusarium-aerosol-particulate` exists within ~2s. Heatmap pixels if BFF has PM features; honest empty if `features=[]`. |
| 2 | PM OFF | That source/layer removed. ECM/AM/planes/ships untouched. |
| 3 | ERA5 2 m Temperature ON | Chip green. BFF `/api/crep/field/era5/t2m` has 12 baked frames (`0.png` ~579KB). Map sources `crep-field-era5-t2m-src-0`…`src-11` exist within ~2s and opacity cycles like RainViewer. |
| 4 | That chip OFF | Only those ids removed. Sibling Live Data stays. |
| 5 | FIRMS / MINDEX AQ | Same: own `idBase`, no `removeSource` of siblings. |
| 6 | Empty bake | Chip stays ON (green). No invented plume. |

## Aerosol must still work

`/fusarium/aerosol` shared-earth view already mounted `FieldRasterLayer` without the Earth Sim flag. Do not regress that path. Toggle Arraylake / PM there: fetches + draws + animates when the BFF has frames/features.

## Repeatable 3010 proof

```powershell
# From website-itdx-codex-v13
Invoke-RestMethod http://localhost:3010/api/crep/field/_catalog
Invoke-RestMethod "http://localhost:3010/api/crep/environment/air-quality?bbox=-125,24,-66.5,50&limit=200"
# Browser: toggle Live Data → map.getSource('crep-field-era5-t2m-src-0') or fusarium-aerosol-particulate
```

## 3010 proof — September 10, 2026

Playwright on `http://localhost:3010/natureos/earth-simulator` (same CREP globe as Fusarium Earth Sim; Fusarium route is owner-login):

- Live Data chips visible (22). ERA5 2 m Temperature → **On**.
- `window.__crep_live_data.enabled` = `crep-field-era5-t2m`.
- Map sources `crep-field-era5-t2m-src-0`…`src-11` present. Layer 0 opacity **0.72**.
- BFF `GET /api/crep/field/era5/t2m` 200 + frames `0.png`…`11.png` 200.
- Repeat: `node scripts/_earth_sim_livedata_proof.mjs`

`/fusarium/earth-simulator` is the same `CREPDashboardLoader` behind owner sign-in. Do not hide ITDX tabs. RJ Ricasata = CFO.

## 3010 bind results — September 10, 2026 (this agent)

Catalog `GET /api/crep/field/_catalog` `base_configured=true`. Ships+sats+radar were **not** enabled together.

| Layer | Source | Baked frames | 3010 draw |
|---|---|---|---|
| era5/t2m | `/api/crep/field/era5/t2m` | 12 | **yes** — green chip; `crep-field-era5-t2m-src-0` + `src-1` (2-slot animation) |
| era5/wind10m | `/api/crep/field/era5/wind10m` | 12 | **yes** — `canvas.crep-wind-era5-wind10m` |
| era5/tp | `/api/crep/field/era5/tp` | 12 | **yes** — raster sources |
| hrrr/t2m | `/api/crep/field/hrrr/t2m` | 12 | **yes** |
| hrrr/refc | `/api/crep/field/hrrr/refc` | 12 | **yes** |
| hrrr/wind10m | `/api/crep/field/hrrr/wind10m` | 12 | **yes** — wind canvas |
| helios/ghi | `/api/crep/field/helios/ghi` | 18 | **yes** |
| alive/gpp | `/api/crep/field/alive/gpp` | 24 | **yes** |
| canopy-height/height | `/api/crep/field/canopy-height/height` | 1 | **yes** |
| sentinel2/ndvi | `/api/crep/field/sentinel2/ndvi` | 1 | **yes** |
| sentinel2/truecolor | `/api/crep/field/sentinel2/truecolor` | 1 | **yes** |
| geo-stereo-wind/wind | `/api/crep/field/geo-stereo-wind/wind` | 12 | **yes** — wind canvas |
| biomass-sample/agb | `/api/crep/field/biomass-sample/agb` | 12 | **yes** |
| biomass-global/agb | `/api/crep/field/biomass-global/agb` | 1 | **yes** |
| mrms/refc | `/api/crep/field/mrms/refc` | 24 | **yes** |
| mrms/precip_rate | `/api/crep/field/mrms/precip_rate` | 24 | **yes** |
| aerosolParticulate | `/api/crep/environment/air-quality` | live AQ | same BFF as `/fusarium/aerosol`; empty = no pixels, not UNBOUND |

`mrms/refl` is not a catalog key (use `refc` / `precip_rate`).

Root cause of “only ERA5 looked live”: globe `getBounds()` AABB + registry `minZoom` tore CONUS rasters down. Bind now: poll for `__crep_map`, no viewport/minZoom tear-down, 2-slot image overlay, wind polls for map.

### Files for the ITDX Instant Deploy SHA

- `components/crep/layers/field-raster-layer.tsx`
- `components/crep/layers/field-wind-layer.tsx`
- `components/fusarium/aerosol/aerosol-particulate-layer.tsx`
- `components/fusarium/aerosol/aerosol-shared-earth-view.tsx`
- `scripts/_earth_sim_all_livedata_proof.mjs`
- this doc

Repeat: `node scripts/_earth_sim_all_livedata_proof.mjs` from `website-itdx-codex-v13` against `http://localhost:3010`.

## 187 live — September 10, 2026

- PR #309 `ba8c5a83` · Instant Deploy 34521730309 success
- Slot **green**, image `manual-ba8c5a83…`, NAS assets **ro**
- Origin + mycosoft.com + sandbox **200**
- Catalog `base_configured=true`; ERA5 t2m **12 baked frames**
- `/fusarium/itdx` and `/fusarium/aerosol` **200**; briefing stays SYNTHETIC EXERCISE / `live: false`
