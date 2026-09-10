# Fusarium Droid Path / C2 / Earth Sim — September 10, 2026

**Date:** September 10, 2026  
**Status:** Implemented on ITDX worktree `website-itdx-codex-v13`  
**Classification:** UNCLASSIFIED  
**Scope:** Device movement paths, coordination, triangulation depiction, hypothesis path tree, Command & Control mechanical controls, Earth Simulator filters.

## What shipped

- Live positions come only from `/api/earth-simulator/devices` rows that are **online/connected** and sourced from `live` / `mas` / `operator` / `mindex`. Catalog and silent field seeds are not a convoy.
- Movement snapshot: `GET /api/fusarium/movement/snapshot`.
- C2: `/fusarium/command-control` mounts `DeviceMovementPanel` under the catalog coordination panel.
- Earth Sim: `/fusarium/earth-simulator` Nature → Environment / Conditions toggles plus a collapsible movement/C2 panel. ITDX chrome stays Earth-Sim-only.
- Devices: `/fusarium/devices` adds a public OSINT equipment library labeled **not on-hand** unless the live registry names the same id.

## Live vs hypothesis vs NOT_SUPPLIED

| Surface | Truth |
|---|---|
| Device fix | **Live** when heartbeat/registry/MINDEX reports an online position |
| Movement path | **Live polyline** only from recorded telemetry history (≥2 fixes). Else **NOT_SUPPLIED** |
| Coordination (range/bearing) | **Live** when ≥2 live devices. Formula: haversine + forward azimuth on a WGS-84 sphere |
| Triangulation | **Live geometric fix** only with ≥3 live observers. Otherwise **hypothesis / live: false** (unqualified proposal). Never a fake lock |
| Path tree | Always **hypothesis**. ITDX Weka receipt has no movement proposals → **NOT_SUPPLIED**; local kinematic tree is labeled hypothesis |
| Waypoint / mission send | **Propose only**. Existing `/api/devices/network/[deviceId]/command` is ping/sensors, not waypoints. Receipt **NOT_SUPPLIED** |
| Aerosol smoke on Earth Sim | Filter exists; renderer **NOT_SUPPLIED** (stochastic SmokeLayer stays quarantined) |

## Routes changed

- `app/api/fusarium/movement/snapshot/route.ts` (new)
- `app/dashboard/crep/CREPDashboardClient.tsx` (Environment / Conditions layers + mounts)
- `app/fusarium/(dashboard)/earth-simulator/page.tsx`
- `app/fusarium/(dashboard)/devices/page.tsx`
- `components/fusarium/command-control/command-control-dashboard.tsx`

## APIs used

- `/api/earth-simulator/devices?refresh=1` — MAS registry, MINDEX, operator probes, local :8003
- `/api/fusarium/movement/snapshot` — movement COP contract
- `/api/devices/network/[deviceId]/command` — cited as health-only; not used to task motion
- `/api/crep/environment/air-quality` — aerosol PM filter reuse
- `/api/earth2/spore-dispersal`, Earth-2 wind vectors — aerosol layers on Earth Sim
- OpenTopoMap tiles — public OSM + SRTM overlay (cited)

## How to verify on 3010

1. `/fusarium/command-control` — movement panel shows live count or honest empty.
2. `/fusarium/earth-simulator` — Nature tab → Environment / Conditions: path, coordination, triangulation, path tree, OpenTopo, aerosol PM/wind/dispersal/smoke.
3. Zero live devices → empty copy, no fake convoy. Path tree / triangle remain labeled hypothesis.
4. Real devices → paths only if telemetry history exists; otherwise path NOT_SUPPLIED.

Fort Stewart AO default for unqualified geometry: **-81.6072, 31.8697**.
