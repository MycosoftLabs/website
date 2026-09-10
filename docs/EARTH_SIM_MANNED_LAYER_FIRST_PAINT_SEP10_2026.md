# Earth Sim Manned Layer First Paint — September 10, 2026

**Date:** September 10, 2026  
**Status:** Client first-paint gates removed in `website-itdx-codex-v13`. 187 not cut.  
**Routes:** `/fusarium/earth-simulator`, `/natureos/earth-simulator` (same CREP globe)  
**RJ Ricasata = CFO.** No mock tracks. Do not revert ITDX tabs, Live Data rasters, or personnel work.

Supersedes the “0 means missing” section of `CREP_PLANES_BOATS_SATELLITES_FEB12_2026.md` for Earth Sim first paint.

## Bug

Aviation / AIS / satellites toggles ON, but the globe stayed empty (or late) at first paint.

Root causes in `CREPDashboardClient.tsx`:

1. **Zoom floor 3.5** — Earth Sim default zoom is **3** (CONUS). rAF + source-sync emptied `crep-live-aircraft` / `crep-live-vessels` when `zoom < 3.5`. MapLibre `minzoom: 3.5` hid the layers even if GeoJSON had features.
2. **Deferred first fetch** — pump timers started at 900 ms; `earthLayerEnabled()` returned **false** when `window.__crep_layers` was not registered yet (Earth Sim strict mode).
3. **Globe AABB** — `east > west` + `zoom >= 3` skipped viewport bbox; tilt worldwide bounds starved the fetch or culled everything.
4. **Invisible fallback** — aircraft/vessel glow circles had `radius: 0`, so a late SVG icon looked like “no data.”
5. **Honest empty** — chips rendered only when `length > 0`, so a dead upstream looked like a missing layer.

## Fix (this worktree)

- If aviation / ships / satellites (or related) are ON, fetch **immediately** (0 / 400 / 1500 ms). Toggle ON dispatches `crep:mover-pump-request` with no 250 ms wait.
- Layer enablement reads `moverEnabledIdsRef` (synced from `layers`), not a missing `__crep_layers` snapshot.
- Fetch bbox = `getLogicalViewportBounds()` (CONUS cull OK). Fallback `EARTH_SIM_US_BBOX`. Dateline wrap allowed.
- Aircraft: `/api/oei/flightradar24` + `/api/oei/opensky` (registry already includes ADS-B).
- Vessels: `/api/oei/aisstream` + `publish=true` (AIS cache) + disk last-known on the BFF.
- Satellites: registry first; stations/legacy + `/api/crep/unified?type=satellites` failover. Chip shows **empty** if all 200 with 0 rows.
- No `zoom < 3.5` wipe. Symbol + circle layers have no minzoom floor. Tilt does not clear in-view movers. Fly buttons still use `crepMapFlyTo`.
- Governor drops **off-view** / oldest **animated rasters** first. In-view planes/ships/sats the user turned on stay.

## BFF URLs and 3010 counts — September 10, 2026

CONUS: `lamin=24&lamax=50&lomin=-125&lomax=-66.5`

| Layer | BFF | HTTP | Features | Source |
|---|---|---|---|---|
| Planes | `GET /api/oei/flightradar24?lamin=24&lamax=50&lomin=-125&lomax=-66.5&limit=400` | 200 | **400** | opensky |
| Planes failover | `GET /api/oei/opensky?lamin=24&lamax=50&lomin=-125&lomax=-66.5&limit=400` | 200 | **400** | OpenSky |
| Vessels | `GET /api/oei/aisstream?lamin=24&lamax=50&lomin=-125&lomax=-66.5&limit=400` | 200 | **177** | disk last-known |
| Satellites | `GET /api/oei/satellites?category=active&mode=registry&limit=200` | 200 | **200** | satnogs |
| Satellites failover | `GET /api/oei/satellites?category=stations&mode=legacy&limit=200` | **503** | — | Celestrak timeout (honest empty if registry also empty) |
| Satellites cache | `GET /api/crep/unified?type=satellites&limit=200` | 200 | 0 in this probe (registry already 200) | CREP unified |

First-paint rule: if the chip is ON, these features must land in `crep-live-aircraft` / `crep-live-vessels` / `crep-live-satellites` on the globe at z≈3. Probe: `window.__crep_mover_status()` and `window.__crep_live_stats()`.

## Test (3010)

1. Open `http://localhost:3010/natureos/earth-simulator` (or Fusarium Earth Sim).
2. Turn **planes** ON → aircraft icons/circles in CONUS view.
3. Turn **vessels** ON → ships in view (or chip **empty** if AIS+disk are dry).
4. Turn **sats** ON → sats in view (registry 200) or chip **empty** if every BFF is empty/503.
5. Tilt the globe. Fly buttons still work. Movers in view stay.

No 187 race until this + FIRMS/AQ/radar + governor share one Instant Deploy SHA.
