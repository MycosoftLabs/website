# CREP Dashboard Fixes – Feb 18, 2026

## Summary

Fixes applied so planes, boats, and satellites all show and move correctly on the CREP map, with correct counts and icons.

## Changes

### 1. Satellite filter defaults (`CREPDashboardClient.tsx`)

- **Before:** `showComms`, `showGPS`, `showStarlink`, `showDebris` were `false`; `orbitTypes: ["LEO", "GEO"]` could exclude many satellites.
- **After:** All category toggles default to `true` (showStations, showWeather, showComms, showGPS, showStarlink, showDebris, showActive). `orbitTypes` set to `[]` so no orbit filter is applied by default.
- **Effect:** All fetched satellite categories are shown; Sats count and purple satellite icons appear when data is loaded.

### 2. Vessel filter defaults

- Vessel filters were already defaulting to show cargo, tanker, passenger, fishing, tug, pleasure (only showMilitary false). No change needed; vessels should show when API returns data.

### 3. Defensive coordinate handling in `deckEntities`

- **Vessels:** Coordinates are read from both `location.longitude`/`location.latitude` and `location.coordinates` (GeoJSON `[lng, lat]`) so API response shape does not drop vessels.
- **Satellites:** Same pattern: `location` and `estimatedPosition` (and optional `coordinates`) are used so satellites always get valid coordinates when available.
- **Vessel state:** `cog`, `sog`, and timestamp are taken from top-level or `properties` so heading/velocity and time work for AISstream-shaped data.

### 4. Vessel velocity and time from `properties`

- AISstream connector puts `cog`, `sog` in `properties`. Deck entity state now uses `vesselEntity.cog ?? vesselEntity.properties?.cog` (and same for `sog`), and `vesselEntity.timestamp ?? vesselEntity.lastSeenAt ?? vesselEntity.properties?.timestamp` for time.
- **Effect:** Vessel icons can show heading and motion trails when the API only exposes these fields in `properties`.

## Files touched

- `app/dashboard/crep/CREPDashboardClient.tsx` – filter defaults, `deckEntities` coordinate and vessel state handling.

## Verification

1. Open `/dashboard/crep`.
2. Wait for initial load and 30s refresh.
3. Header should show non-zero **Planes**, **Boats**, **Sats** when the respective APIs return data.
4. Map should show amber plane icons, blue vessel icons, and purple satellite icons; vessels and aircraft can show motion trails when velocity is present.

## Notes

- If **Boats** or **Sats** stay 0, the cause is upstream: `/api/oei/aisstream` or `/api/oei/satellites` not returning data (e.g. API keys, timeouts, or empty cache). Caching and error handling for those routes are unchanged in this pass.
- `EntityDeckLayer` already uses `IconLayer` with distinct icons and colors for aircraft, vessel, and satellite; no changes were required there.
