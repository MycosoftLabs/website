# Cursor task — bake the 10 Arraylake cubes for Earth Simulator (data plane)

**Goal:** make the 10 `mycosoft/*` Arraylake cubes render as animated layers on Earth Simulator
by running the **data plane** (introspect → confirm → reproject → bake → serve → deploy). The
**view plane is already built** in `MycosoftLabs/website` (registry + BFF + animated layers +
"Nature & Climate" filter buttons + radar-grade LOD) — it renders nothing until you bake frames.
This is the only remaining work to light it up. **You (Cursor) have the arraylake auth + infra;
the website Claude env does not — that's why this is your lane.**

Repo: `MycosoftLabs/website` (local: `D:/Users/admin2/Desktop/MYCOSOFT/CODE/WEBSITE/website`).
Scripts already written for you: `scripts/arraylake/introspect.py`, `scripts/arraylake/bake_field.py`.
Contract reference: `docs/EARTH_SIM_ARRAYLAKE_WIRING.md`. Full build record:
`docs/EARTH_SIM_ARRAYLAKE_FIELDS_IMPLEMENTATION_JUN24_2026.md`.

---

## The contract you must satisfy (don't change the view plane)

The website BFF `app/api/crep/field/[...path]/route.ts` serves, per dataset+variable, a manifest:
```jsonc
{ "render":"raster|wind", "ramp":[...], "valueRange":[min,max], "minZoom":N,
  "bounds":[west,south,east,north], "frames":[ ... ] }
```
Your bake job must write, into `ARRAYLAKE_FIELD_OUT/{dataset}/{variable}/`:
- **scalar (`render:"raster"`)** → `{i}.png` (equirectangular RGBA, **row 0 = north**, colorized by
  the registry ramp+valueRange) and `manifest.json` with `frames:[{t,image:"{i}.png"}]`.
- **wind (`render:"wind"`)** → `{i}.json` = `{width,height,bounds:[w,s,e,n],u:[],v:[]}` (row-major,
  **north→south**) and `manifest.json` with `frames:[{t,grid:"{i}.json"}]`.
- `bounds` is **always `[west,south,east,north]`** and must describe the **decimated** grid exactly
  (the helper `to_latlon_2d` already does this — don't reintroduce a full-res/decimated mismatch).

`bake_field.py` already does all of this. Your job is to (a) confirm the variable names, (b) handle
the 2 cubes that need reprojection, (c) implement the 1 RGB stub, (d) run it, (e) wire env + cron.

---

## Steps

### 1. Install + auth
```bash
pip install "arraylake" "zarr>=3" "icechunk" "xarray>=2024.9" "numpy" "pillow" "rioxarray" "pyproj"
arraylake auth login          # or export ARRAYLAKE_TOKEN=...
```

### 2. Introspect — learn the real cube schemas
```bash
cd D:/Users/admin2/Desktop/MYCOSOFT/CODE/WEBSITE/website
python scripts/arraylake/introspect.py        # → arraylake_cubes.json (+ prints to stdout)
```
Open `arraylake_cubes.json`. For each repo note the **array names**, their **dims**, and the **time
coordinate** name + extent.

### 3. Confirm / fix the `VERIFY` fields in `lib/crep/fields/registry.ts`
The registry's `zarrVar` / `zarrVarV` / `timeDim` are best-guesses marked `VERIFY`. Correct any that
don't match `arraylake_cubes.json`. Current guesses:

| dataset id | repo | var.key | zarrVar (verify) | wind v (verify) | timeDim |
|---|---|---|---|---|---|
| `era5` | `mycosoft/era5` | t2m | `2m_temperature` | — | `time` |
| | | wind10m | `10m_u_component_of_wind` | `10m_v_component_of_wind` | `time` |
| | | tp | `total_precipitation` | — | `time` |
| `hrrr` ⚠ | `mycosoft/noa-hrrr-forcast48hr` | t2m | `temperature_2m` | — | `time` |
| | | refc | `composite_reflectivity` | — | `time` |
| | | wind10m | `u_component_of_wind_10m` | `v_component_of_wind_10m` | `time` |
| `helios` | `mycosoft/helios-solar-irradiance` | ghi | `ghi` | — | `time` |
| `alive` | `mycosoft/ALIVE-hourly` | gpp | `GPP` | — | `time` |
| `canopy-height` | `mycosoft/canopy-height` | height | `canopy_height` | — | (static) |
| `sentinel2` | `mycosoft/global-sentinel2-mosaics` | ndvi | `ndvi` | — | `time` |
| | | truecolor ⚠ | `B04,B03,B02` (RGB stub) | — | `time` |
| `geo-stereo-wind` | `mycosoft/GEO-stero-wind` | wind | `u` | `v` | `time` |
| `biomass-sample` | `mycosoft/biomass-atlas-sample` | agb | `agb` | — | (static) |
| `biomass-global` | `mycosoft/global-aboveground-biomass` | agb | `agb` | — | (static) |
| `mrms` ⚠ | `mycosoft/noaa-mrms-conus-hourly` | refc | `MergedReflectivityQCComposite` | — | `time` |
| | | precip_rate | `PrecipRate` | — | `time` |

Also sanity-check the `valueRange` per variable (registry has defaults; tighten to the cube's real
units — e.g. ERA5 `tp` is meters of accumulation, Helios `ghi` is W/m², GPP units, AGB Mg/ha).

### 4. ⚠ Reproject the projected grids (HRRR + MRMS)
HRRR (Lambert-conformal) and MRMS are **not** regular lat/lon — `to_latlon_2d` will (by design)
**raise** "not degrees … reproject to EPSG:4326 first". Add a reprojection before it in
`bake_field.py` (e.g. a small branch keyed on `ds["coverage"] == "conus"` or a per-dataset flag):
```python
import rioxarray  # noqa
def ensure_latlon(da):
    if "latitude" in da.coords and da["latitude"].ndim == 1:
        return da
    da = da.rio.write_crs(da.rio.crs or "EPSG:...")        # HRRR/MRMS native CRS from introspection
    return da.rio.reproject("EPSG:4326")
```
Call `ensure_latlon(slice_da)` before `to_latlon_2d(...)` for `hrrr`/`mrms`. Keep global cubes as-is.

### 5. ⚠ Implement the Sentinel-2 `truecolor` stub
`bake_field.py` `main()` currently `continue`s on `v["key"] == "truecolor"`. Replace with a real
RGB bake: read B04/B03/B02, 8-bit stretch (e.g. 2–98th percentile), stack to an RGB(A) PNG per
timestep, write `{i}.png` + manifest `frames:[{t,image}]` exactly like the scalar path (no ramp).

### 6. Bake + verify
```bash
export ARRAYLAKE_FIELD_OUT=/opt/mycosoft/media/website/assets/fields   # or a Supabase/R2 bucket
python scripts/arraylake/bake_field.py                 # all
# or one at a time while iterating:
python scripts/arraylake/bake_field.py era5 t2m
```
Verify each `{dataset}/{variable}/manifest.json` exists with non-empty `frames` and a valid
`bounds`, and that the PNG/JSON frames are present and look right (open a PNG; check a wind JSON has
`u.length == width*height`).

### 7. Wire env on the website server
Set so the BFF can read what you baked:
```
ARRAYLAKE_FIELD_BASE=https://<cdn-or-asset-host>/fields     # serves ARRAYLAKE_FIELD_OUT
ARRAYLAKE_FIELD_TOKEN=<optional X-Internal-Token>
NEXT_PUBLIC_ES_ARRAYLAKE_FIELDS=1                           # build-time — surfaces the buttons
```
`ARRAYLAKE_FIELD_BASE` must serve the manifest at `{BASE}/{dataset}/{variable}/manifest.json` and the
frames at the relative paths in it. The asset mount `/opt/mycosoft/media/website/assets` is already
volume-mounted into the website container (see the blue-green deploy step) → served at `/assets/...`.

### 8. Cron the live cubes
Static cubes (`canopy-height`, `biomass-sample`, `biomass-global`) bake ONCE. Re-bake the live cubes
(`era5`, `hrrr`, `helios`, `alive`, `sentinel2`, `geo-stereo-wind`, `mrms`) on a schedule (a
`.github/workflows/*.yml` cron calling `bake_field.py`, or a server cron) so new timesteps appear.

### 9. Deploy
Merge → `main` triggers the Mycosoft CI/CD blue-green cutover (the established flow). **Get Morgan's
go-ahead before deploying** — the website-side code is additive + flag-gated, so it's a no-op until
`NEXT_PUBLIC_ES_ARRAYLAKE_FIELDS=1` + `ARRAYLAKE_FIELD_BASE` are set.

---

## Acceptance criteria
- [ ] `arraylake_cubes.json` produced; every `VERIFY` field in `registry.ts` confirmed/corrected.
- [ ] HRRR + MRMS reproject cleanly (no "not degrees" raise); Sentinel-2 truecolor bakes RGB.
- [ ] For all 10 cubes: `{dataset}/{variable}/manifest.json` + frames exist in `ARRAYLAKE_FIELD_OUT`.
- [ ] `GET https://<site>/api/crep/field/era5/t2m` returns `baked:true` with non-empty `frames`.
- [ ] On Earth Simulator with the flag on: the **Nature & Climate** category shows the toggles; turning
      one on animates the field; aircraft/FPS unaffected (LOD gating holds); toggle off = v1.
- [ ] Live cubes on a cron; static cubes baked once.

## Gotchas (already handled in the scripts — don't regress)
- `bounds` is `[w,s,e,n]` and must match the **decimated** grid (don't downsample after computing bounds).
- Don't call `.values` on a whole multi-decade cube (OOM) — derive range from baked slices (already done).
- `to_latlon_2d` raises on projected grids on purpose — reproject; don't loosen the guard.
- Frame JSON keys are exactly `t` / `image` / `grid` / `tiles`; grid JSON keys exactly
  `width,height,bounds,u,v`. The layers read these verbatim.
- Everything is read-only on the cubes (`readonly_session`).
