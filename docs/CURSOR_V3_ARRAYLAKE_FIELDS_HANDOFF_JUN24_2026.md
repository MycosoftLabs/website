# Handoff to Cursor — Arraylake "Nature & Climate" fields ↔ v3 globe (Jun 24 2026)

**From:** Claude (v2 Arraylake-fields work) · **To:** Cursor (building v3 Google-Earth 3D globe)
**TL;DR: the fields are already in v3 — there is no port. v3 reuses the same dashboard + the same
MapLibre `mapRef`, so the registry, BFF, data plane, Nature buttons, toggle state, AND both field
render layers already mount and draw on the v3 globe. Don't rebuild them. Verify + (optionally)
enhance with true 3D, reusing the same data contract.**

---

## Why there's nothing to port

`app/natureos/earth-simulator/v3/page.tsx` renders the **same** `CREPDashboardClient` via
`CREPDashboardLoader globeEngine="v3"`. v3's "Google-Earth 3D" is that same MapLibre map with:
`applyV3GlobeProjection(mapRef)` (globe), `crepBasemapInstall`/`ensureV3BasemapVisible` (photoreal
basemap), `v3Photo3dOn` / `mapbox3dOn` / `v3CityZoomBuildings` (3D tiles + buildings at city zoom),
and cinematic fly via `flightSession`. **`mapRef` is MapLibre in v3 too.**

The field work I added is engine-agnostic by construction:
- **Data plane** (`scripts/arraylake/*`, the bake) writes PNG/JSON frames + manifests to
  `ARRAYLAKE_FIELD_BASE` — no engine assumptions.
- **BFF** (`app/api/crep/field/[...path]/route.ts`) serves `_catalog` + per-variable manifests.
- **Registry** (`lib/crep/fields/registry.ts`) `FIELD_REGISTRY` — the 10 cubes.
- **Filter buttons** — registered into `CREPDashboardClient`'s shared `layers` state under a new
  **"Nature & Climate"** category. The v3 route uses the same component → **the buttons already
  appear in v3's panel.**
- **Render layers** — `components/crep/layers/field-raster-layer.tsx` (scalar frame-loop) and
  `field-wind-layer.tsx` (wind particles) take the MapLibre `mapRef` and mount via
  `shouldRenderHeavyOverlays` with no `!isV3GlobeEngine` gate → **they already render on the v3
  globe.** One bake feeds v1/v2/v3 from the same CDN.

So: **don't duplicate any of this in v3.** It's wired.

---

## What's done (the shared stack)

| File | Role | Engine |
|------|------|--------|
| `lib/crep/fields/registry.ts` | `FIELD_REGISTRY` — 10 cubes × variables, ramps, `valueRange`, `minZoom`, `reproject`/`nativeCrs` | shared |
| `app/api/crep/field/[...path]/route.ts` | BFF: `_catalog` + manifest (graceful-degrade) | shared |
| `components/crep/layers/field-raster-layer.tsx` | scalar frame-loop (RainViewer-style); `minZoom` + viewport gates | MapLibre (works in v3) |
| `components/crep/layers/field-wind-layer.tsx` | wind particles (geo-space, projected per-frame); pause-on-move, device cap | MapLibre (works in v3) |
| `app/dashboard/crep/CREPDashboardClient.tsx` | "Nature & Climate" category (4 sites) + flag-gated registration + mounts behind `shouldRenderHeavyOverlays` | shared |
| `scripts/arraylake/*`, `.github/workflows/arraylake-field-bake.yml` | data plane (Cursor's lane) | shared |

**Contract (the stable seam — any renderer reuses it):**
`GET /api/crep/field/{dataset}/{variable}` → `{ render, ramp, valueRange, minZoom, bounds:[w,s,e,n],
frames:[{t,image}|{t,grid}] }`. Toggle state lives in `layers[].enabled` keyed by
`fieldLayerId(dataset, varKey)` = `crep-field-{dataset}-{varKey}`. Flag: `NEXT_PUBLIC_ES_ARRAYLAKE_FIELDS=1`.

---

## What Cursor should do for v3

### 1. Verify (once you bake) — don't rebuild
With `NEXT_PUBLIC_ES_ARRAYLAKE_FIELDS=1` + `ARRAYLAKE_FIELD_BASE` set, open
`/natureos/earth-simulator/v3`, panel → **Nature & Climate** → toggle e.g. `era5/t2m`. It should
drape on the v3 photoreal globe and animate. Confirm:
- it sits **above the basemap but below labels** (the raster inserts before the first symbol layer);
- during a **cinematic fly** it stays mounted (v3 keeps heavy overlays during animation) and the wind
  layer pauses its rAF on `movestart` + resumes on `moveend` (already implemented);
- `minZoom` teardown still holds (HRRR/MRMS only above zoom 2) and aircraft/FPS are unaffected.

### 2. v3 polish (only if needed)
- **Z-order vs 3D buildings / photo-3D tiles:** at city zoom v3 adds 3D buildings + Google photo
  tiles. Decide whether a field raster should draw over or under those (it currently goes under the
  first symbol layer). If you want fields under buildings but over the basemap, pass an explicit
  `beforeId` — the raster layer already computes one; extend it for the v3 building layer ids if
  desired.
- **Drape over terrain/3D:** image sources drape flat; if v3 enables terrain, the scalar fields will
  drape on it automatically (MapLibre handles raster-on-terrain). Wind particles are screen-space
  streaks — fine at low/moderate tilt; see §3 for the true-3D upgrade.

### 3. OPTIONAL — true volumetric/3D fields via BlueSite (your call, reuse the contract)
If you want the fields rendered as **real 3D** to match the Google-Earth feel (volumetric temperature
shells, 3D wind stream-tubes at altitude, extruded biomass), do it through the **existing BlueSite
Three.js harness** that already locks to the pitched MapLibre globe:
- `lib/crep/bluesite/three-maplibre-layer.ts` (`createBlueSiteStack` — one WebGL context, globe-locked
  through pitch) and `lib/crep/bluesite/mover-altitude-layer.ts` (THREE.Points precedent for 3D
  particles on the globe).
- A 3D **wind** layer = a BlueSite particle sub-layer that fetches the **same** `frames[].grid`
  velocity JSON (`{width,height,bounds,u,v}`) and advects GPU particles on the sphere at an altitude
  shell — the globe-locked upgrade of the current canvas layer (which I flagged as the BlueSite
  follow-up).
- A 3D **scalar** layer = a textured shell / extruded surface reading the same `frames[].image` PNGs.
- **Critical:** consume the SAME BFF manifests and the SAME `layers[].enabled` toggle state. Branch
  the mount on `isV3GlobeEngine` (v2 → the MapLibre layers; v3 → the BlueSite 3D layers) so each
  engine gets the right renderer from one registry + one bake. **Do not fork the data layer.**

This is exactly the v2 master-plan pattern (Phase 1 movers / Phase 2-3 volumetric smoke+clouds all
register into the same BlueSite stack) — fields slot in the same way.

---

## Status / guardrails
- Flag-gated **OFF** (`NEXT_PUBLIC_ES_ARRAYLAKE_FIELDS`), additive, no mock data, fungal data
  untouched. Uncommitted; not deployed.
- Data plane blocked on **Arraylake auth** (Morgan sets `ARRAYLAKE_TOKEN` / `arraylake auth login`);
  then introspect → confirm registry `VERIFY` names → bake → set `ARRAYLAKE_FIELD_BASE`.
- CI cron (`arraylake-field-bake.yml`) bakes to an ephemeral runner with **no publish step** — wire it
  to the VM/NAS or object storage that `ARRAYLAKE_FIELD_BASE` serves before relying on it, and deploy
  the view plane before enabling the cron (the catalog URL 404s until then).

Full detail: `docs/EARTH_SIM_ARRAYLAKE_FIELDS_IMPLEMENTATION_JUN24_2026.md`,
`docs/EARTH_SIM_ARRAYLAKE_WIRING.md`, `docs/CURSOR_ARRAYLAKE_FIELDS_DATAPLANE_JUN24_2026.md`.
