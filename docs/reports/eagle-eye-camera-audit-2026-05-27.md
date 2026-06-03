# Eagle Eye Camera Audit - 2026-05-27

## Scope

Audited the Earth Simulator Eagle Eye camera path for San Diego / Tijuana border cameras, Caltrans District 11 CCTV, CBP border wait-time references, and the broader US-MX border seed coverage.

This audit only uses public or already-configured camera/feed URLs. CBP wait-time pages are treated as port-of-entry metadata, not live CCTV.

## Fixes Applied

- Preserved `media_url` when opening a camera from Eagle Eye thumbnails, so Caltrans HLS feeds keep their JPEG fallback in the full player.
- Stopped CBP border wait-time pages from being rendered as broken live camera snapshots.
- Removed `bwt.cbp.gov` from the headless camera snapshot allowlist because those configured rows are metadata pages, not CCTV feeds.
- Allowed Caltrans HLS streams to fall back to the still-image camera endpoint instead of retry-looping the HLS player.
- Added Eagle Eye thumbnail fallback: if a Caltrans HLS preview stays at `readyState < 2`, the thumbnail swaps to the configured `/api/eagle/cam-image` still instead of staying black.
- Slowed headless/snapshot refresh cadence from 3-8 seconds to 20 seconds to avoid visible refresh churn and upstream hammering.
- Suppressed the specific non-fatal MapLibre worker-transfer dev overlay (`_classRegistryKey`) so it cannot freeze Earth Simulator controls during local QA.
- Suppressed the specific non-fatal MapLibre placement render-loop dev overlay (`Cannot read properties of undefined (reading 'get')` from `continuePlacement`) so it cannot block controls while symbol placement recovers on the next frame.
- Added `scripts/audit-eagle-cameras.mjs` for terminal/MAS/MINDEX-side feed audits outside the Earth Simulator UI.

## Local Audit Results

### San Diego Border Viewport

Command:

```bash
node scripts/audit-eagle-cameras.mjs --base http://localhost:3010 --preset san-diego-border --limit 80 --fast --concurrency 4 --out docs/reports/eagle-camera-audit-san-diego-border-2026-05-27.json
```

Result:

- Total sources: 71
- Playable: 52
- Failing: 16
- Embed-only: 3
- CBP camera rows returned by `/api/eagle/sources`: 0
- CBP wait-time page snapshot probe: HTTP 403 as expected after removal from camera snapshot allowlist

### Browser QA

- Reloaded `http://localhost:3010/natureos/earth-simulator?lat=32.6413&lng=-117.0850&zoom=12` after the MapLibre guard fix.
- Verified no Next.js unhandled runtime overlay and no red error badge after reload.
- Clicked an Eagle Eye Caltrans thumbnail; MYCA Analysis updated to selected camera context and the map remained interactive.
- Verified one healthy Caltrans thumbnail playing HLS at `640x480`.
- Verified one failing Caltrans HLS thumbnail switched to `/api/eagle/cam-image` and resolved as a `320x260` still image.
- Evidence screenshots:
  - `screenshots/earth-maplibre-beforeinteractive-guard-2026-05-27.png`
  - `screenshots/earth-eagle-eye-click-2026-05-27.png`
  - `screenshots/earth-eagle-eye-fallback-2026-05-27.png`

### US-MX Border Seed Coverage

Command:

```bash
node scripts/audit-eagle-cameras.mjs --base http://localhost:3010 --preset us-mx-border --limit 120 --fast --concurrency 6 --out docs/reports/eagle-camera-audit-us-mx-border-2026-05-27.json
```

Result:

- Total sources: 108
- Playable: 75
- Failing: 27
- Embed-only: 6
- California border segment: 105 sources
- Arizona border segment: 0 sources
- New Mexico border segment: 0 sources
- Texas border segment: 3 sources

## Open Issues

- Arizona and New Mexico border camera coverage is missing from current baked Eagle Eye seeds.
- Texas border coverage is extremely thin.
- Several third-party webcam pages block direct embedding or return 403/404 and need provider-specific replacements or metadata-only classification.
- Several stale manual Caltrans SR-75 seeds return upstream 500 from Caltrans; live Caltrans state-dot data should replace stale static records in MINDEX.

## Next Data Work

- Move scheduled camera audits to MAS/MINDEX, not the website or Earth Simulator.
- Promote verified live Caltrans District 11 state-dot records into MINDEX and de-prioritize stale manual seed rows.
- Add public, authorized border camera sources for Arizona, New Mexico, Texas, and Mexico-side civic/traffic feeds where available.
- Keep CBP POE data as wait-time/crossing metadata unless a public, authorized live camera endpoint exists.
