# Earth Sim Aerosol Filter Verify — September 10, 2026

**Date:** September 10, 2026  
**Status:** Classifier + label fix on ITDX worktree `website-itdx-codex-v13`  
**Related:** `docs/EARTH_SIM_AEROSOL_LAYERS_SEP10_2026.md`, `docs/LIVE_AEROSOL_ARRAYLAKE_FILTERS_SEP10_2026.md`

UNBOUND is reserved for a missing required env, mount, or BFF 404. Empty features and `upstream: unavailable` are NOT_SUPPLIED / no data. Optional 8765/8766 lab stays its own NOT_SUPPLIED banner.

## Matrix

| Layer | Aerosol app | Earth Sim filter | Toggle result |
|---|---|---|---|
| PM / particulate | `/api/crep/environment/air-quality` | `aerosolParticulate` | On/Off + draw or no-data. Empty FeatureCollection is no-data, not unbound. |
| Air quality | same AQ BFF + AirNow | `mindexAirQuality` | On/Off + data or empty. Unbound only if `AIRNOW_API_KEY` is the required missing env. |
| Wind | `/api/earth2/layers/wind` | `aerosolWind` | On/Off. Real u/v grid draws. `available:false` is no-data. |
| Modeled dispersal | `/api/earth2/spore-dispersal` | `aerosolModeledDispersal` | On/Off. `{runs:[]}` / missing meteorology is no-data, not unbound. |
| FIRMS | `/api/crep/environment/wildfires` | `mindexFirms` | On/Off + data or empty. |
| Smoke | quarantined | `aerosolSmoke` | NOT_SUPPLIED. No mock plume. Not an Arraylake/PM/wind/AQ unbound banner. |
| Arraylake cubes | `/api/crep/field/{ds}/{var}` | `crep-field-*` | Catalog 200 binds the BFF. Empty bake = no data. 404 = unbound. |
| 8765/8766 lab | ITDX only | not these filters | Stays NOT_SUPPLIED. Do not reuse for aerosol/Arraylake. |

## How to verify

1. `/fusarium/aerosol` — layer badges read **on**, **off**, or **no data**. **unbound** only when you can cite a missing env or BFF 404.
2. `/fusarium/earth-simulator` Live Data toggles — On/Off (smoke = NOT_SUPPLIED). **On must draw a radar-like overlay** (ERA5 t2m = 12 animated frames, sources `crep-field-era5-t2m-src-*`). Labels alone fail. Wind draws when the wind BFF returns grids. Empty bake stays no-data, not unbound.
3. No mock plumes. No 187 blue-green from this lane.
