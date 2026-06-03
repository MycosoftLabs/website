# Earth Simulator Border Cameras + Wait Times Audit - 2026-06-01

## Scope
- Local-only implementation for the San Ysidro / Tijuana border area.
- No production deploy was performed.
- User-facing target: missing border cameras and live CBP wait times on the San Ysidro government facility widget.

## Sources Audited
- AllTrafficCams San Ysidro page: `https://alltrafficcams.com/live/border-crossings/mexico/united-states/tijuana-san-ysidro/`
- VI Ads border camera page: `https://vi-ads.com/bordertrafficcams/`
- Windy San Ysidro camera: `https://www.windy.com/-Webcams-Tijuana-San-Ysidro-Border-Crossing/webcams/1748557784?32.603,-117.046,12,m:ezhacT6`
- Windy Avalon camera: `https://www.windy.com/-Webcams-Avalon-Avalon-Bay-Casino-Point-Dive-Park/webcams/1365090866?33.172,-117.558,9,m:ezVacTG`
- Official CBP wait-time feed: `https://bwt.cbp.gov/api/waittimes`

## Findings
- The Windy San Ysidro camera is the same camera exposed through the VI Ads / IPCamLive path. It resolves to Windy webcam ID `1748557784` and IPCamLive alias `66da1260b3dca`.
- AllTrafficCams embeds camera pages and a wait-time iframe, but the authoritative wait-time data is available from the official CBP JSON feed.
- CBP San Ysidro live rows are grouped by child ports:
  - `250401` - San Ysidro Point of Entry
  - `250409` - San Ysidro Cross Border Express
  - `250407` - San Ysidro PedWest
- The Avalon Windy camera endpoint was reachable during audit but did not expose a usable live stream, so it was added as a tracked but `temporarily_unavailable` camera marker instead of pretending it is live.
- Local AirNow is configured and returns `Border Area, CA` observations for the San Ysidro area. If production still says the AirNow key is missing, that is a live environment/config drift issue, not a local UI wiring issue.

## Implemented Locally
- Added `/api/crep/border-wait-times?port=san-ysidro`.
- Added `lib/crep/border-wait-times.ts` to normalize CBP San Ysidro, CBX, and PedWest lane groups.
- Retitled `gov-cbp-sanysidro` to `San Ysidro Point of Entry`.
- Added live CBP wait times inside the San Ysidro government facility widget.
- Added a border camera supplement GeoJSON with:
  - Windy / IPCamLive San Ysidro border crossing camera.
  - Windy Avalon camera as a known unavailable marker.
- Added the border supplement to the Eagle Eye API and local overlay baked seed loaders.
- Added Windy stream-wrapper and IPCamLive iframe recognition to Eagle Eye video resolution.
- Changed iframe-based Eagle Eye preview tiles so embeddable Windy/IPCamLive feeds can show live thumbnails instead of only "Tap to open player".
- Made the lightweight Oyster detail widget listener always available in Earth Simulator so CBP / border sub-layer clicks reliably open the detail panel.
- Updated the border-crossing connector San Ysidro POE seeds to use child CBP port IDs and added CBX/PedWest POE seeds.

## Local Validation
- `npm.cmd run lint` passed for the changed border/wait/camera files. Existing project warnings remain in legacy CREP and Eagle Eye files.
- `GET /api/crep/border-wait-times?port=san-ysidro` returned 3 crossings: `250401`, `250409`, `250407`.
- `GET /api/eagle/sources?bbox=-117.08,32.50,-116.98,32.58&fast=1&limit=30` returned the new Windy San Ysidro source.
- `GET /api/crep/tijuana-estuary?live=0` returned `San Ysidro Point of Entry` with wait-time metadata and the new Windy camera.
- `GET /api/crep/airnow/current?lat=32.5435&lng=-117.0298&distance=25&ttl=60` returned Border Area observations.
- Browser smoke opened Earth Simulator over San Ysidro and confirmed:
  - Eagle Eye shows the Windy San Ysidro camera.
  - The Windy tile renders an iframe live preview locally.
  - The San Ysidro Point of Entry widget renders live passenger, SENTRI, ready-lane, pedestrian, CBX, and PedWest rows.
- Screenshot proof: `screenshots/earth-border-sanysidro-wait-widget-2026-06-01.png`

## Remaining Gaps
- Caltrans cameras can still report "Temporarily unavailable" when their HLS source or proxy path is down. This change does not fabricate video when the source is failing.
- The IBWC river-flow widget still needs a separate data-path audit. This work focused on the CBP San Ysidro POE widget and cameras.
- More Windy/Baja/coastal cameras should be added in a follow-up pass after this local proof is visually approved.
- Production has not been changed.
