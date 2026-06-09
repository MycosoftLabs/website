# Earth Simulator Camera, Lag, And Satellite Audit - Jun 8, 2026

## Scope

Local-only Earth Simulator maintenance on `http://localhost:3010/natureos/earth-simulator`.

No deployment was performed. The user explicitly asked not to deploy until all local camera, lag, and satellite issues are fixed.

## Latest Continuation - Jun 8, 2026 Late Afternoon

Focus: requested Las Vegas/Nevada source sweep for WorldCams, EarthCam Las Vegas, NVroads, and SmartVegasDeals, plus the widget freezing/black-tile behavior.

Additional local-only fixes:

- Added 11 verified Las Vegas YouTube-backed live rows from SmartVegasDeals and WorldCams, including Fremont Street, Sphere, Strip north/south/central, High Roller skyline, City Hall, Civic Center roof, and Harry Reid airport.
- Added/kept current EarthCam Las Vegas rows for Sphere, Bellagio Fountains, Bellagio Conservatory, Welcome Sign, Wedding Chapel, Cat's Meow Karaoke, and unavailable Fremont/Lake Mead context rows.
- Fixed the provider mismatch that made Skyline Fremont fail: if a row has a YouTube URL, the widget and `/api/eagle/stream/[sourceId]` now route it as a YouTube iframe even when the source provider label is `skylinewebcams`.
- Added a short in-memory EarthCam HLS resolver cache and in-flight de-dupe. Repeat EarthCam clicks now avoid re-fetching/probing the same EarthCam page every time.
- Hardened the NDOT/NVroads connector against the official documented camera response shape and common wrapped shapes. It parses `Views[].VideoUrl` HLS rows when a valid NVroads developer key is configured.
- Restarted local `3010` with dev-server stdout/stderr redirected outside the watched repo: `C:\Users\Owner1\AppData\Local\Temp\mycosoft-codex-dev-logs\earth-3010.out.log` and `.err.log`. This avoids repo-root log writes contributing to local Fast Refresh churn.

Current local proof:

- `npx.cmd tsc --noEmit --pretty false` passed.
- Vegas source inventory: `24` rows in the requested Vegas bbox: `earthcam:7`, `skylinewebcams:3`, `ndot:3`, `youtube_live:11`.
- API stream checks:
  - `vegas-skyline-fremont`: `200 iframe` after the YouTube-first provider fix.
  - `vegas-smartvegas-fremont-street`: `200 iframe`.
  - `vegas-worldcams-strip-cam-1`: `200 iframe`.
  - `vegas-earthcam-sphere`: `200 hls`.
  - `vegas-earthcam-bellagio`: `200 hls`.
  - `vegas-earthcam-bellagio-conservatory`: `200 hls`.
  - `vegas-earthcam-fremont`: safe `503 temporarily_unavailable` because the current EarthCam Fremont HLS candidate returned upstream 404.
  - `vegas-ndot-i15-sahara`: safe `503 temporarily_unavailable` because the local env does not contain a valid NVroads key for the official cameras API.
- EarthCam cache timing after warmup: Sphere `912ms -> 158ms`; Bellagio `284ms -> 173ms`.
- Clean Bellagio widget proof after compiler warmup: real `<video>`, `1920x1080`, `readyState 4`, playback advanced `7.428s -> 12.405s`, close detached in `192ms`.
- Widget matrix proof:
  - Skyline Fremont and SmartVegas Fremont rendered the YouTube live iframe `ZvYvZLfPatQ` and closed cleanly.
  - EarthCam Sphere rendered a real `1920x1080` HLS video and closed cleanly.
  - Skyline Las Vegas rendered the proxied live JPEG `live810.jpg` at `344x193` and closed cleanly.
  - NDOT I-15 @ Sahara rendered the safe unavailable tile and closed cleanly.

Current source limitations:

- NVroads official docs require `key` for `https://www.nvroads.com/api/v2/get/cameras`; the local generic `TRANSIT_511_API_KEY` returned HTTP 400 against NVroads. Full NDOT camera population needs a valid `NVROADS_API_KEY` / `NEVADA_511_API_KEY` / `NV_511_API_KEY`.
- EarthCam Fremont and Lake Mead are not claimed live. Their markers remain visible as context, but the widget fails safely rather than pretending a broken feed is live.
- In-app Browser automation still times out attaching to the existing heavy tab via `Page.enable`; local Playwright against the same `localhost:3010` route was used for proof. Manually use `http://localhost:3010/...`, not `127.0.0.1`, because the dev server is listening on `::1`.

## Fixes Applied

- Restored live HLS behavior for Caltrans, HDOnTap, EarthCam, and NYSDOT-style HLS paths through the Eagle stream resolver and HLS proxy.
- Added server-side live stream resolution for EarthCam and HDOnTap embeds so cameras such as Hotel del Coronado do not fall back to stale still images.
- Added HLS proxy allowlist and request-header handling for EarthCam video hosts, HDOnTap, Caltrans/DOT, and NYSDOT-style hosts.
- Filtered providers and rows that are known stale, blocked, static-only, or temporarily unavailable before they reach map clicks.
- Marked the old Cabrillo NPS camera row as temporarily unavailable instead of showing a broken live widget.
- Kept satellite imagery mounted through zoom and map animation so `crep-satimagery-raster` does not disappear at higher zoom.
- Reduced Earth Simulator first-load pressure by keeping optional live entity and voice command WebSocket bridges from auto-connecting on the Earth Simulator route.
- Gated optional warning logs that were creating terminal noise for fallback or unavailable upstream sources.
- Fixed a Mojave preserve layer expression that could throw during map style evaluation.

## Local Verification

## Continuation Update - Jun 8, 2026 Afternoon

Additional local-only follow-up was performed after user reports that Las Vegas EarthCam rows were only showing short native clips, Fremont rows disappeared, Hotel Del worked intermittently, and camera widgets could freeze controls.

New fixes in this continuation:

- Added a guarded `VideoWallWidget` stream resolver sequence so stale or failing async resolves cannot leave the widget stuck on `Resolving stream...`.
- Kept EarthCam and HDOnTap HLS video controls hidden and surfaced the small `LIVE` badge so native browser controls no longer advertise a misleading short playlist duration.
- Changed the HLS proxy manifest rewrite to same-origin relative `/api/eagle/hls-proxy?...` URLs. This fixes chunk playback under both `localhost:3010` and `127.0.0.1:3010`; before this, a `127.0.0.1` page could receive `http://localhost:3010/...` segment URLs and CSP-block every chunk.
- Expanded and corrected the Vegas camera seed to 16 curated rows, including named EarthCam rows for Sphere, Bellagio, Welcome Sign, Wedding Chapel, Cat's Meow Karaoke, visible Fremont context, Skyline context, and NDOT context rows. Removed the bad generic airport/Strip row that was mixing locations.
- Preserved unavailable-but-important context rows such as Fremont, SR75/Silver Strand, Cabrillo, Ocean Beach/Skyline, and stale EarthCam San Diego Bay without letting them enter the live video path as broken streams.
- Added 465 Vegas iNaturalist observations across Aves, Mammalia, Insecta, Plantae, Actinopterygii, Fungi, Reptilia, and Amphibia.
- Added/filled Vegas civic support datasets for airports, government/library/civic points, sewage/water reclamation, and transit/Loop points.
- Removed the baked iNat prefilter so non-fungi Vegas species are not discarded before the visible marker/filter pipeline can use them.

Current terminal proof:

- `npx.cmd tsc --noEmit --pretty false` passed.
- `vegas-earthcam-sphere`, `vegas-earthcam-bellagio`, `vegas-earthcam-welcome-sign`, `earthcam-coronado-hotel-del`, and `hoteldel-coronado-beach-north` returned `200`, `stream_type: hls`, and proxied manifests beginning with `#EXTM3U`.
- `vegas-earthcam-fremont`, `vegas-skyline-fremont`, `caltrans-d11-sr75-silverstrand`, and `nps-cabrillo-ref` returned safe `503 source temporarily unavailable`; these should remain visible as context where configured but must not be represented as working live video.
- Vegas camera inventory now returns 10 central fast rows and 11 larger Vegas rows on `/api/eagle/sources`; San Diego test bbox returns 168 rows including SR75, Surfline/coastal rows, Hotel Del, Ocean Beach, and Cabrillo context.
- Vegas iNat data file contains 465 features: Aves 75, Mammalia 55, Insecta 75, Plantae 80, Actinopterygii 35, Fungi 70, Reptilia 50, Amphibia 25.
- HLS proxy manifest rewrite probe showed relative chunklist URLs and no absolute `localhost:3010` or `127.0.0.1:3010` references.
- Cross-provider spot check outside Vegas/San Diego: `earthcam-times-square-1` and `earthcam-world-trade` returned HLS `#EXTM3U`; `nyctmc-broadway-45` and `nyctmc-brooklyn-bridge-hub` returned snapshot streams, which is the current supported NYCTMC behavior.

Current browser proof:

- In-app browser API still timed out on its own `Page.navigate` to localhost, so local Playwright was used as fallback.
- Playwright tablet viewport `1024x768` passed for `127.0.0.1:3010`:
  - `vegas-earthcam-sphere`: 1920x1080, readyState 4, `0.101s -> 4.561s`, controls hidden, close worked.
  - `vegas-earthcam-bellagio`: 1920x1080, readyState 4, `0.000s -> 4.460s`, controls hidden, close worked.
  - `earthcam-coronado-hotel-del`: 1920x1080, readyState 4, `0.009s -> 4.516s`, controls hidden, close worked.
  - `hoteldel-coronado-beach-north`: 1920x1080, readyState 4, `0.000s -> 4.506s`, controls hidden, close worked.
  - `vegas-earthcam-fremont`: no video, safe "Stream unavailable" status tile, close worked.
- Playwright `localhost:3010` spot check passed for Sphere: readyState 4, 1920x1080, `0.001s -> 3.461s`, no CSP failures, no console errors.
- The continuation screenshot for the working Sphere video is `D:/Users/admin2/Desktop/MYCOSOFT/CODE/WEBSITE/website/screenshots/earth-vegas-sphere-live-video-post-proxy-2026-06-08.png`.

Remaining caveats from this continuation:

- Fremont EarthCam is not proven live; the current HLS candidate was unavailable upstream. Keep the marker/context, but do not claim live playback until a real advancing HLS/video URL is found.
- SkylineWebcams, Surfline, NDOT, NPS/Cabrillo, and the SR75 Silver Strand legacy row are still provider/stale limitations, not fixed live videos.
- The dev stderr still shows repeated `luma.gl: This version of luma.gl has already been initialized` warnings from startup. This is not a stream playback failure, but it is still terminal noise.
- No deployment was performed.

## System-Wide Provider Follow-Up - Jun 8, 2026 Evening

The follow-up moved the work from city-specific camera rows to provider-class handling across the Eagle stream route and `VideoWallWidget`. No deployment was performed.

Additional fixes:

- Removed the remaining stream-route `surfline` provider block long enough to test it, then confirmed Surfline's current `embed-cam` and `surf-report` iframe targets return `403` in both server fetch and browser iframe tests. Surfline rows now short-circuit in the widget as safe unavailable context instead of loading a blocked iframe or emitting browser 503 noise.
- Fixed `VideoWallWidget` so resolver errors stop fallback resolution. Before this, a provider 503 could fall through to the original embed URL and create black panes or blocked-resource noise.
- Fixed `VideoWallWidget.resolveStream()` so non-200 resolver responses preserve provider/error details instead of becoming generic `HTTP 503`.
- Routed SkylineWebcams through `/api/eagle/stream` instead of direct iframes. Skyline pages send frame-blocking headers; the resolver now extracts provider-backed YouTube embeds when available and keyed live still images when not.
- Fixed Skyline snapshot selection so the page's own `nkey` image wins over nearby-card CDN images. This corrected the Las Vegas Strip / STRAT snapshot swap.
- Added `cdn.skylinewebcams.com` to the image proxy allowlist.
- Added generic still-image proxy handling for HPWREN and other public still camera media URLs, both in the stream route and in the client-side still normalizer.
- Marked `scripps-pier-sio-cam` as temporarily unavailable using the current Scripps `/piercam` page, which says the underwater cam is unavailable while Scripps troubleshoots the live feed. The stale `/pier-cam` and `current.jpg` URLs were removed.
- Hid native controls for all HLS widgets, including Caltrans, so Caltrans, EarthCam, and HDOnTap all present as the same live-badge playback surface.

Current API/provider proof:

- `npx.cmd tsc --noEmit --pretty false` passed.
- Direct stream/target matrix passed `20/20`: `15` playable targets and `5` safe unavailable upstream/provider cases.
- Playable HLS targets returned proxied manifests beginning with `#EXTM3U`: Caltrans D11, Hotel del Coronado/HDOnTap, Vegas EarthCam Sphere/Karaoke, EarthCam World Trade Center, EarthCam Times Square.
- Playable iframe targets resolved to provider-backed YouTube embeds: Skyline Fremont Street, Skyline Ocean Beach, Skyline Harbor Island.
- Playable snapshot targets returned real images: Skyline Las Vegas `live810.jpg`, Skyline STRAT `live5766.jpg`, NYCTMC Broadway/45, NYCTMC Brooklyn Bridge, HPWREN Lyons Peak.
- Safe unavailable, non-freezing cases: Surfline Imperial Beach/Silver Strand/Ocean Beach, Scripps Pier, Cabrillo/NPS, stale SR-75 rows, and unavailable Fremont EarthCam.

Current browser proof:

- Final Playwright provider matrix on the real Earth Simulator route passed `12/12` widget cases:
  - Caltrans San Diego HLS: `640x480`, `0.349s -> 3.865s`, `controls=false`, close worked.
  - Hotel del Coronado South HLS: `1920x1080`, `0.311s -> 3.823s`, `controls=false`, close worked.
  - Vegas Sphere EarthCam HLS: `1920x1080`, `0.105s -> 3.615s`, `controls=false`, close worked.
  - EarthCam World Trade Center HLS: `1280x720`, `0.388s -> 3.895s`, `controls=false`, close worked.
  - Skyline Fremont Street: YouTube iframe `ZvYvZLfPatQ`, close worked.
  - Skyline Ocean Beach: YouTube iframe `cvP_F-c2Upw`, close worked.
  - Skyline Las Vegas: snapshot `344x193`, close worked.
  - NYCTMC Broadway/45: snapshot `352x240`, close worked.
  - HPWREN Lyons Peak: snapshot `3072x2048`, close worked.
  - Surfline Imperial Beach, Scripps Pier, and NPS Cabrillo: safe `Stream unavailable` state, close worked.
- Every widget close returned control to the page and a `requestAnimationFrame` responsiveness probe passed.
- A follow-up bad-response pass found no relevant `4xx/5xx` responses and no relevant console errors after excluding expected screenshot/YouTube embed abort noise.
- Final screenshot: `D:/Users/admin2/Desktop/MYCOSOFT/CODE/WEBSITE/website/screenshots/earth-provider-system-matrix-final-2026-06-08.png`.

Inventory reality check:

- Las Vegas central fast inventory currently returns `9` camera/context rows: `earthcam:5`, `skylinewebcams:3`, `ndot:1`.
- Fremont core currently returns `3` rows: EarthCam Fremont context, EarthCam Karaoke, Skyline Fremont.
- San Diego coast/city currently returns `123` rows including Caltrans, Surfline context, Scripps context, HDOnTap, Skyline, EarthCam, ALERT/park context.
- NYC Manhattan/Brooklyn currently returns `16` rows: `nyctmc:10`, `earthcam:6`.
- Los Angeles and Bay Area bboxes are currently dominated by Caltrans seed coverage.

Remaining caveats:

- This pass fixes provider rendering and broken-widget behavior; it does not magically expand every city's camera inventory. Vegas coverage is still a data seed/connector coverage gap, not a widget playback failure.
- Surfline is not being claimed as live-video fixed. Current Surfline pages and embed endpoints block iframe/server access in local tests. Rows remain visible as location context and fail safely.
- Scripps Pier is not being claimed as live-video fixed. The current Scripps page reports the camera unavailable upstream.
- NDOT remains context-only until a current public image/video endpoint is sourced.
- The current dev log file still contains older SINE/MINDEX and missing-env warnings from previous tabs. Fresh provider browser passes did not produce relevant camera console/request failures.

### Typecheck

Passed:

```powershell
npx.cmd tsc --noEmit --pretty false --project tsconfig.json --incremental false
```

### Camera Inventory API

Passed after filtering unavailable rows:

- San Diego: 174 cameras; providers `hpwren:2`, `alertwildfire:2`, `caltrans:167`, `scripps:1`, `hdontap:2`; bad rows `0`.
- Las Vegas: 5 cameras; provider `earthcam:5`; bad rows `0`.
- NYC: 13 cameras; providers `nyctmc:10`, `earthcam:3`; bad rows `0`.

### Direct Stream API

Passed for 8 representative stream resolver probes. Each returned a proxied HLS manifest with `#EXTM3U`:

- `caltrans-d11-32.76076,-117.16382`
- `earthcam-coronado-hotel-del`
- `hoteldel-coronado-beach-north`
- `hoteldel-coronado-beach-south`
- `ec-vegas-strip`
- `vegas-earthcam-bellagio`
- `earthcam-times-square-1`
- `ec-abbey-road`

### Full Browser Matrix

Passed 17/17 live video widgets in Playwright against the real Earth Simulator page. The test dispatched the same `crep:eagle:camera-click` event used by map icons, waited for an actual `<video>` element, verified nonzero dimensions, verified playback time advanced, then clicked the widget close button.

Screenshot:

`D:/Users/admin2/Desktop/MYCOSOFT/CODE/WEBSITE/website/screenshots/earth-local-live-video-final-after-restart-2026-06-08.png`

Passed cameras:

- Caltrans San Diego: 640x480, `0.017s -> 3.224s`
- Hotel del Coronado South: 1920x1080, `0.029s -> 3.243s`
- Hotel del Coronado North: 1920x1080, `0.027s -> 3.241s`
- Hotel del Coronado South alias: 1920x1080, `0.015s -> 3.220s`
- EarthCam Las Vegas Strip: 1280x720, `0.108s -> 3.268s`
- Las Vegas Strip Bally's: 1280x720, `0.002s -> 3.182s`
- Bellagio Fountains: 1920x1080, `0.012s -> 3.213s`
- Harry Reid Airport: 1280x720, `0.114s -> 3.273s`
- Sphere at The Venetian: 1920x1080, `0.004s -> 3.181s`
- Times Square 7th Ave and 43rd: 1280x720, `0.003s -> 3.124s`
- World Trade Center: 1280x720, `0.013s -> 3.141s`
- Times Square NYC: 1280x720, `0.023s -> 3.139s`
- Waikiki Beach: 1920x1080, `0.023s -> 3.230s`
- Chicago Riverwalk: 1920x1080, `0.007s -> 3.138s`
- Bourbon Street New Orleans: 1920x1080, `0.007s -> 3.155s`
- Wrigley Field Chicago: 1920x1080, `0.004s -> 3.164s`
- Abbey Road London: 1920x1080, `0.006s -> 3.124s`

Browser matrix results:

- Failed videos: `0`
- Widget close failures: `0`
- API bad responses: `0`
- Page errors: `0`
- Satellite layer before zoom: present, source present, visible, zoom 10.
- Satellite layer after zoom 13: present, source present, visible.
- RAF after interactions: average `16.56ms`, max `16.8ms`.

### Post WebSocket-Gate Browser Smoke

Passed 6/6 focused user-reported cameras after the optional WebSocket gate:

- Caltrans San Diego
- Hotel del Coronado South
- Hotel del Coronado North
- Hotel del Coronado South alias
- EarthCam Las Vegas Strip
- EarthCam Times Square

Screenshot:

`D:/Users/admin2/Desktop/MYCOSOFT/CODE/WEBSITE/website/screenshots/earth-local-live-video-post-ws-gate-2026-06-08.png`

Results:

- Failed videos: `0`
- Bad camera/API responses: `0`
- Browser console severe messages: `0`
- Page errors: `0`
- Satellite visible before and after zoom 13.
- RAF after interaction: average `30.89ms`, max `50.1ms`.

### Fresh Dev Server Logs

Final local server:

- Port: `3010`
- PID observed: `77424`
- Stdout log: `.codex-earth-local-final3-3010-20260608-014718.out.log`
- Stderr log: `.codex-earth-local-final3-3010-20260608-014718.err.log`

Terminal checks:

- Stderr length: `0`
- No matches for `stream unavailable`, `temporarily unavailable`, `HLS playback error`, `No live video`, `webcams/windy`, `HTTP 4`, `HTTP 5`, `4xx`, `5xx`, `warning`, `error`, `WebSocket`, `MapWS`, or `EntityStream`.
- Camera resolver and HLS proxy traffic in stdout returned `200`.

## Caveats

- Cabrillo/NPS is not being claimed as live-video fixed. The old row is stale and is now filtered/marked temporarily unavailable to prevent a broken "loading YouTube stream" widget from freezing the UI.
- Providers that currently do not expose a reliable live HLS/video URL, such as NDOT, Surfline, Navy, and stale NPS/USGS/static-only sources, now fail safely or remain context-only until a current playable stream is proven. SkylineWebcams now resolves through the provider route to YouTube iframes or keyed still snapshots when available.
- The local Playwright screenshot operation can produce Chromium WebGL `ReadPixels` performance warnings during screenshot capture. Those were not present in the final severe-console smoke after filtering test-only readback noise, and no page errors or stream errors remained.
- No blue-green deploy or production verification was done in this pass.

## Reactivation Prompt

Continue from `D:/Users/admin2/Desktop/MYCOSOFT/CODE/WEBSITE/website`. Keep work local unless the user explicitly authorizes deployment. Start `3010`, run the typecheck, inspect the newest `.codex-earth-local-final*.err.log` and `.out.log`, then run the Earth Simulator camera browser matrix. Do not reintroduce stale camera providers as live widgets unless they return a real advancing video stream.
