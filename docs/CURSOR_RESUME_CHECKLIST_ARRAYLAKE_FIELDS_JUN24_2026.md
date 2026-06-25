# Cursor resume checklist — Arraylake fields (after the invoice clears)

Single "start here" doc for when Cursor is back. Claude used the down-window to remove the
deterministic blockers + hand you ready building blocks; everything below is in dependency order.
References: `CURSOR_V3_ARRAYLAKE_FIELDS_HANDOFF_JUN24_2026.md` (why it's already in v3),
`CURSOR_ARRAYLAKE_FIELDS_DATAPLANE_JUN24_2026.md` (data-plane brief),
`EARTH_SIM_ARRAYLAKE_FIELDS_IMPLEMENTATION_JUN24_2026.md` (full record).

## What Claude added during the down-window
1. **CI publish gap FIXED** (`.github/workflows/arraylake-field-bake.yml`): the cron now reuses the
   prod deploy's Cloudflare-tunnel SSH (`./.github/actions/setup-ssh`) to **rsync the baked frames to
   `/opt/mycosoft/media/website/assets/fields` on the VM** (served at `/assets/fields`). Default
   `ARRAYLAKE_FIELD_OUT=fields_out`, publish gated to `main`. So a cron run now actually delivers data.
2. **3D wind-field module** (`lib/crep/bluesite/field-altitude-layer.ts`): the true-3D-globe upgrade
   of the 2D canvas wind layer — `THREE.Points` advected by the same velocity-grid manifest, on the
   BlueSite harness. **Type-clean, UNMOUNTED** (so it can't affect your live v3 work). You mount + tune.

## Do this in order

### 1. Unblock auth (Morgan)
`arraylake auth login` in a terminal, or set `ARRAYLAKE_TOKEN` in `.env.local` + the GitHub secret.
(Claude cannot handle the token.)

### 2. Introspect → confirm the registry
```
cd D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website
.\scripts\arraylake\run_dataplane.ps1 -IntrospectOnly
```
Open `arraylake_cubes.json`; correct any `VERIFY` `zarrVar`/`zarrVarV`/`timeDim`/`valueRange` in
`lib/crep/fields/registry.ts`. Set `nativeCrs` on `hrrr`/`mrms` if the reproject can't auto-detect CRS.

### 3. Bake + publish
```
.\scripts\arraylake\run_dataplane.ps1            # bake all (writes ./public/assets/fields locally)
```
Local test env: `ARRAYLAKE_FIELD_OUT=./public/assets/fields`,
`ARRAYLAKE_FIELD_BASE=http://localhost:3010/assets/fields`. Prod: the CI cron (now) rsyncs to the VM;
set website `ARRAYLAKE_FIELD_BASE=https://mycosoft.com/assets/fields`. **Deploy the view plane before
enabling the cron** (the catalog URL 404s until the field BFF route is live).

### 4. Verify (both globes — already wired, just confirm)
Restart dev (flag is in `.env.local`), open the panel → **Nature & Climate**:
- v2: `http://localhost:3010/natureos/earth-simulator`
- v3: `http://localhost:3010/natureos/earth-simulator/v3`
Toggle `era5/t2m` → drapes + animates on both (same `mapRef`). Confirm `minZoom` teardown + FPS.

### 5. (Optional) mount the 3D wind on v3
In `CREPDashboardClient`, where the field layers mount, branch on `isV3GlobeEngine`:
```ts
// v2 → the MapLibre canvas wind (FieldWindLayer, current). v3 → 3D BlueSite particles:
useEffect(() => {
  if (!isV3GlobeEngine || !mapRef) return;
  const on = layers.find(l => l.id === fieldLayerId("geo-stereo-wind","wind"))?.enabled;
  if (!on) return;
  const { mountFieldWindAltitude } = await import("@/lib/crep/bluesite/field-altitude-layer");
  const dispose = mountFieldWindAltitude(mapRef, {
    dataset: "geo-stereo-wind", variable: "wind",
    stack: theSharedBlueSiteStack,      // prefer the SHARED stack (one WebGL context)
    particles: 6000, altitudeMeters: 15000,
  });
  return dispose;
}, [isV3GlobeEngine, mapRef, layers]);
```
Then **visually tune** the two TODOs in that file: the GLOBE-WARP positioning (start: accept the
mercator approximation; upgrade later to a globe-warp vertex shader) and particle count / altitude /
size / speed-scale for FPS + look on the photoreal basemap. Do the same for ERA5/HRRR wind variables.

### 6. (Optional) 3D SCALAR fields spec (temp/precip/GHI/GPP/NDVI/biomass/canopy)
The 2D raster already drapes fine on the v3 globe; a true-3D version, if you want it:
- **Textured shell:** a thin `THREE.Mesh` sphere shell (radius = globe + small altitude) with the
  baked PNG frame as an equirectangular texture (`THREE.TextureLoader`), crossfading textures across
  frames (two materials + opacity lerp) — the 3D analog of the raster opacity-cycle. Mask to
  `manifest.bounds` for regional cubes (UV clamp / discard outside).
- **Extruded surface (biomass/canopy):** displace a lat/lon grid mesh by the scalar value for a
  literal 3D "carbon relief." Heavier; gate to city/region zoom.
- Reuse `field-altitude-layer.ts`'s manifest-fetch + BlueSite-register scaffold; swap `THREE.Points`
  for the shell/mesh. Same contract, same toggle state.

### 7. (Optional) forecast-time scrubber
`FieldRasterLayer` already accepts a `scrubIndex` prop (freezes a frame; no interval). Add a slider in
the panel (0…`frames.length-1`) → state → pass `scrubIndex` to the mounted field layers. ERA5 scrubs
the past, HRRR scrubs +48h forecast, MRMS the recent radar. (Add the same `scrubIndex` to the wind
module if you want synced wind.)

### 8. Commit
When Morgan says, commit the whole set (view plane + Nature buttons + LOD + your data plane + CI fix +
3D module + docs) to a branch and open the PR. Deploy to sandbox only on Morgan's go-ahead.

## Heads-up — v3 type errors to clean up (yours, not the fields)
`tsc --noEmit` shows 4 errors in your in-progress v3 globe code (the field stack is clean):
- `lib/geo/v3-photorealistic-maplibre-layer.ts:67` (TS2322 number→string), `:172` (TS2339 `.stats` on TilesRenderer)
- `app/dashboard/crep/CREPDashboardClient.tsx:13735` (TS2345 `crepMapTiltFlyTo` arg not a `FlyToCapableMap`)
- `app/dashboard/crep/CREPDashboardClient.tsx:24192` (TS2551 `pitch3d` — did you mean `pitch`?)
The build tolerates them (pre-existing-error policy), but worth a sweep.
