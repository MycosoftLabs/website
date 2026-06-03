# Earth Simulator Runtime / Nature / Camera Audit - 2026-05-27

## Fixes Applied

- Added route-scoped MapLibre error guards for the non-fatal `continuePlacement` crash:
  - `TypeError: Cannot read properties of undefined (reading 'get')`
  - Stack: `new It -> continuePlacement -> _updatePlacement -> Map._render`
- Expanded non-fatal PMTiles/AJAX handling so missing or late PMTiles sources do not trigger the Next.js dev overlay or block controls.
- Added Eagle Eye HLS thumbnail fallback: if a live Caltrans HLS preview does not reach `readyState >= 2`, the tile falls back to the configured still-image proxy instead of staying black.
- Fixed broad all-life nature queries so North America `kingdom=all` no longer returns an empty observation set.
- Preserved CBP border wait-time rows as metadata only; they are not rendered as broken CCTV/video cameras unless they have a direct public media stream.

## Local Verification

- `cmd /c npx tsc --noEmit --pretty false` passed.
- `GET /natureos/earth-simulator` returned HTTP 200 on local port 3010.
- Browser reload at `lat=32.6413&lng=-117.0850&zoom=12` showed no Next.js unhandled runtime overlay and no red error badge after the MapLibre guard.
- Eagle Eye thumbnail click selected a Caltrans camera, updated MYCA Analysis to camera context, and did not freeze or blank the map.
- Healthy Caltrans preview verified as HLS video at `640x480`.
- Failed Caltrans preview verified as fallback image through `/api/eagle/cam-image`, resolving to `320x260`.

## Nature API Regression Results

Before the broad all-life fix:

- North America `kingdom=all`: `0` observations after ~18-28s.
- North America `kingdom=Fungi`: returned observations, proving the data path was not globally dead.

After the fix:

- North America `kingdom=all`: `747` observations in `18.8s`.
  - Sources: `747` iNaturalist, `0` MINDEX, `0` GBIF.
  - Kingdoms returned: `Fungi: 182`, `Aves: 370`, `Insecta: 195`.
- San Diego `kingdom=all`: `810` observations in `9.1s`.
  - Kingdoms included fungi, plants, insects, reptiles, birds, mollusks, mammals, fish, and amphibians.

## Camera Audit Results

- San Diego border camera audit rerun:
  - Total sources: `71`
  - Playable: `52`
  - Failing: `16`
  - Embed-only: `3`
- US-MX border seed coverage remains incomplete:
  - California border segment: `105` sources
  - Arizona border segment: `0` sources
  - New Mexico border segment: `0` sources
  - Texas border segment: `3` sources

## Remaining Issues

- MINDEX is not returning nature rows for these tested broad/city paths; the currently visible recovery comes from bounded iNaturalist reads. MINDEX ETL/writeback still needs service-side repair so the website is not doing durable crawling work.
- Dev-server logs still show background service problems outside this patch:
  - Vessel registry batches returning `401 Invalid internal service token`.
  - Satellite/TLE/SatNOGS/CelesTrak fetch failures and timeouts.
  - MycoBrain operator device timeout.
- Browser automation channel timed out on one final frame-tree request after the last reload, but the local web server remained healthy at HTTP 200.

## Evidence

- `screenshots/earth-maplibre-beforeinteractive-guard-2026-05-27.png`
- `screenshots/earth-eagle-eye-click-2026-05-27.png`
- `screenshots/earth-eagle-eye-fallback-2026-05-27.png`
- `docs/reports/eagle-camera-audit-san-diego-border-2026-05-27.json`
- `docs/reports/eagle-camera-audit-us-mx-border-2026-05-27.json`
