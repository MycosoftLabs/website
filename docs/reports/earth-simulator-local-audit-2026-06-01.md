# Earth Simulator Local Audit - June 1, 2026

Status: local QA only. No deployment was run from this thread.

## Scope

This audit covers the local `http://localhost:3010/natureos/earth-simulator` runtime after the reported freezes, disappearing fungi, camera/Eagle Eye instability, and COM4 alias confusion. It also records the MycoBrain public page readiness checks because that page is intended to ship with the next approved batch.

## Fixes Applied In This Pass

- Restarted the local dev server from a clean `.next` cache after the stale Next cache produced missing chunk errors such as `Cannot find module './45994.js'`.
- Fixed Eagle Eye thumbnail click ordering in `components/crep/eagle-eye/EagleEyeThumbnailGrid.tsx`.
  - The thumbnail now dispatches the camera-open event before scheduling the fly-to.
  - This prevents the fly-to/map update from swallowing the video widget open event.
- Kept the previous current-session map-marker DOM fix in `components/ui/map.tsx`.
  - MapLibre owns the marker container.
  - React portals render into a child element, so marker movement/removal does not leave React attached to a MapLibre-owned DOM node.
- Kept the previous current-session VideoWall cleanup fix in `components/crep/eagle-eye/VideoWallWidget.tsx`.
  - Closing clears active feed, resolved stream, loading state, minimized state, and maximized state.
  - Close via button, Escape, map click, or `crep:eagle:close` all use the same cleanup path.
- Kept the previous current-session Eagle live stream resolver fix in `components/crep/eagle-eye/eagle-live-stream.tsx`.
  - Caltrans/511/dot.ca.gov thumbnails try the stream resolver before falling back to still images.
- Added `force-dynamic` and `nodejs` runtime exports to `app/api/avani/evaluate/route.ts`.
  - This stops Next from trying to prerender `/api/avani/evaluate` during `next build`.

## Local Server State

- Active dev server: `localhost:3010`
- Restart method:
  - Stopped the `3010` listener.
  - Verified `.next` resolved under the website workspace.
  - Removed only `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\.next`.
  - Restarted with `npm.cmd run dev -- --port 3010`.
- Post-restart log state:
  - Route/API probes are returning `200`.
  - Current stderr tail only showed the webpack big-string cache warning.
  - Earlier stale-cache chunk errors disappeared after the clean restart.

## API Smoke Results

All of these returned `200` after the clean restart:

- `/natureos/earth-simulator?lat=32.7157&lng=-117.1611&zoom=10`
- `/api/earth-simulator/devices`
- `/api/eagle/sources?limit=20&live=0&bbox=-117.25,32.50,-116.85,33.00`
- `/api/oei/railway-live?limit=1500`
- `/api/natureos/global-events?days=3&limit=1200`
- `/api/crep/fungal?...kingdom=Fungi...`
- `/api/crep/fungal?...kingdom=Plantae...`
- `/api/crep/fungal?...kingdom=Aves...`
- `/api/mycobrain/COM4/sensors`
- `/devices/mycobrain`
- `/assets/devices/mycobrainspin.mp4`
- `/images/devices/mycobrain-v2-front.png`

Species API count spot checks for the San Diego bbox were non-empty:

- Fungi: non-empty
- Plantae: non-empty
- Aves: non-empty
- Mammalia: non-empty
- Reptilia: non-empty
- Insecta: non-empty
- Actinopterygii: non-empty

## Browser Visual Smoke

Final in-app browser reload:

- Earth Simulator mounted.
- Satellite imagery, bathymetry/topology overlays, fungi surface/markers, infrastructure, cameras, MYCA panel, and Eagle Eye panel were visible.
- `MYCOBRAIN: CONNECTED` displayed in the footer.
- Eagle Eye had 6 clickable thumbnail tiles.
- Browser-side blocking error arrays were empty.
- Enabled button count remained high after interactions, indicating controls were not globally disabled.

Eagle Eye click path after fix:

- Clicking an Eagle Eye tile opened the floating video/camera widget.
- The widget could be closed.
- Closing unmounted the widget and left the map/buttons responsive.
- Some camera feeds still resolve to still/snapshot or "temporarily unavailable" depending on upstream provider status.

## Freeze Soak

Command:

```powershell
$env:CODEX_EARTH_SOAK_MS='180000'; node scripts/codex-earth-long-freeze-soak.mjs
```

Result:

- `ok: true`
- Duration: 180 seconds
- Iterations: 6
- Final map state:
  - `loaded: true`
  - `styleLoaded: true`
  - `layerCount: 159`
  - zoom about `10.09`
- Devices stayed connected:
  - `mushroom-1`
  - `hyphae-1`
  - `psathyrella-buoy-com4`
- Eagle sources stayed non-empty.
- MYCA/NATURE button probes kept working.
- Fatal browser logs: none.
- Blocking silenced errors: none.

Observed non-blocking noise during the soak:

- Optional voice websocket unavailable.
- MAS/entity websocket 401/unavailable in local context.
- Aborted stale viewport requests during map motion.
- WebGL `ReadPixels` performance warnings.
- Occasional provider `404`/`502` from camera/HLS or external assets.
- LiveTransit source warning.
- PMTiles probe fallback warnings for some infrastructure layers.

These did not reproduce the hard UI freeze in the final soak.

## COM4 / Psathyrella Status

The local UI route is reachable:

- `/api/mycobrain/COM4/sensors` returned `200`.

Current payload facts:

- Requested portal path: `COM4`
- Reported `device_id`: `mycobrain-COM4`
- Reported `board_id`: `mycobrain-1db410`
- Reported portal device ID inside sensor instances: `mycobrain-COM3`
- Sensor instances present:
  - `mycobrain-1db410:bme688_a:0x77`
  - `mycobrain-1db410:bme688_b:0x76`
- Both slots show `present: true`.
- Both slots currently show `status: unknown`.
- Raw telemetry currently contains `"bme688": {}`.

Conclusion:

The alias and sensor identity path are alive, but live numeric BME688 telemetry is still not flowing through this UI endpoint. This matches Cursor's note that Side A/COM3 is aliased to the COM4 portal ID and BSEC subscription/live numeric telemetry still needs firmware or service work. Front-end should display the slots, but Cursor/MAS/firmware still owns the empty `bme688` payload.

## MycoBrain Public Page Readiness

Checked locally:

- `/devices/mycobrain` returned `200`.
- `/assets/devices/mycobrainspin.mp4` returned `200` and `video/mp4`.
- `/images/devices/mycobrain-v2-front.png` returned `200` and `image/png`.
- The Devices dropdown includes MycoBrain as the first device link above Mushroom 1.

Deployment note:

Do not deploy this page until the user explicitly approves the batch. The page/assets are locally reachable, but the repo is very dirty and must be staged narrowly.

## Build Result

`npm.cmd run build` initially failed twice because Next misclassified runtime API routes during page-data/static generation:

- First failure: admin key route module collection.
- Second failure: `/api/avani/evaluate`.

After adding the runtime guard to `/api/avani/evaluate`, the build passed:

- Compile: passed.
- Static generation: `486/486` passed.
- Build output: successful.

Remaining build warnings are environment/config warnings, not compile failures:

- `MYCA_MAS_API_BASE_URL` missing.
- `MYCORRHIZAE_PUBLISH_KEY` missing.
- `SOLANA_RPC_URL` missing.
- `NEXTAUTH_SECRET` missing in local build context.
- `SUPABASE_SERVICE_ROLE_KEY` missing for Contact API in local build context.

## Remaining Work Before Deployment Approval

Required before a safe live deployment:

- User visually verifies local `3010` again after the clean restart.
- Confirm fungi and Eagle Eye behave acceptably in the user's browser for at least one normal test pass.
- Decide whether COM4 numeric BME telemetry is a deploy blocker or a known backend/firmware blocker.
- Narrow staging to the intended files only. The worktree has many unrelated dirty files from other agents.
- Run blue-green only after explicit user approval.

Do not deploy Earth Simulator changes from this thread until the user explicitly says to deploy.

## June 2 Follow-Up: Panel Click Freeze Regression

User-reported symptom:

- After a refresh, hover/click controls could freeze within seconds.
- Map motion could still work while Intel Feed, MYCA, Eagle Eye, and marker selection stopped responding.
- Fungal/device markers were visually appearing above panels in screenshots.

Reproduced locally on `http://localhost:3010/natureos/earth-simulator`:

- A click in the Eagle Eye thumbnail panel selected an Air Quality map marker underneath the panel.
- `document.elementFromPoint(1305, 770)` showed the panel tile only after lowering map marker stacking.
- Before the fix, the map marker layer was allowed to sit above the right panel and steal clicks.

Fix applied:

- `app/dashboard/crep/CREPDashboardClient.tsx`
  - Lowered `.crep-map-container .maplibregl-marker-container` from `z-index: 9999` to `z-index: 20`.
  - Panels remain `z-30`, so markers can no longer bleed over Intel Feed, MYCA, or Eagle Eye.
- `components/ui/map.tsx`
  - Lowered special device marker z-index from `1500` to `25`.
  - MycoBrain markers still sit above the map canvas, but below panels.
- `components/crep/eagle-eye/VideoWallWidget.tsx`
  - Stopped propagation on Minimize, Maximize, and Close buttons.
  - Camera widget controls no longer leak into global map click handlers.

Visual/browser verification after the fix:

- Fresh San Diego reload showed fungal icons, Eagle Eye thumbnails, 3 devices, and no error overlay.
- Eagle Eye tile point check:
  - `elementFromPoint(1305, 770)` returned the Eagle Eye button in `data-panel="right"`.
  - `marker: false`, confirming map markers were no longer above the panel.
- Manual-coordinate click on the first Eagle Eye tile:
  - Opened `EarthCam Gaslamp Quarter` video widget.
  - Did not select the Air Quality marker underneath.
  - Did not scroll the page.
  - Close button unmounted `[data-video-wall-widget]`.
- Fungi visible click:
  - Off: `0/84 NATURE`.
  - Back on: `22/84 NATURE`.
  - `elementFromPoint` on the Fungi button returned the left panel button, not a marker.
- Plants and Birds buttons were also clickable after the camera open/close path.

Terminal verification after the fix:

```powershell
npm.cmd run lint -- --file app/dashboard/crep/CREPDashboardClient.tsx --file components/ui/map.tsx --file components/crep/eagle-eye/VideoWallWidget.tsx
```

Result:

- Passed with pre-existing warnings only.

```powershell
$env:CODEX_EARTH_SOAK_MS='300000'; $env:CODEX_EARTH_SOAK_STEP_MS='30000'; node scripts/codex-earth-long-freeze-soak.mjs
```

Result:

- `ok: true`
- Duration: `316s`
- Iterations: `10`
- Fatal logs: `0`
- Blocking silenced errors: `0`
- MYCA/NATURE click probes continued through the soak.
- Final map state:
  - zoom about `9.55`
  - `layerCount: 206`
  - `styleLoaded: true`
  - interaction state: `idle`
- Device API was healthy most checks, but some probe cycles reached the 5s client timeout and printed `devices: none`.

Remaining backend/noise observed:

- `/api/earth-simulator/devices` can still hit a 5s timeout during MAS/operator probe windows, causing temporary device-delay/offline behavior in local testing.
- MINDEX and fungal route warnings still appear when upstream MINDEX or taxonomy batch calls timeout.
- Some Eagle/Caltrans/HLS requests abort during viewport changes; successful thumbnails and video widget playback still work after the panel z-index fix.
- `LiveTransit` still reports missing source in local logs.
- Optional voice websocket is unavailable locally; map controls continue without it.

Conclusion:

The panel/control freeze that was caused by markers sitting above UI panels is fixed locally. Remaining issues are upstream/probe latency and noisy fallbacks, not the same click-stealing freeze.
