# Earth Sim Env and Live Data Layer Test — September 10, 2026

**Date:** September 10, 2026  
**Status:** Bind fix on worktree `website-itdx-codex-v13`  
**Routes:** `http://localhost:3010/fusarium/earth-simulator`, `http://localhost:3010/natureos/earth-simulator`, `http://localhost:3010/fusarium/aerosol`  
**RJ Ricasata = CFO.** No mock plumes. No 187 until Instant Deploy `34513430565` completes and this packet works on 3010.

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

Do not claim done until Morgan can turn Live Data ON and see overlay/animation on the globe.
