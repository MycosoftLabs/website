# Earth Simulator Continuation Handoff - June 5, 2026

## Owner

This handoff is for the Earth Simulator continuation agent. Do not work on the SINE/MINDEX shared player lane unless explicitly reassigned.

## Current User Priority

The user wants Earth Simulator stable enough for deployment:

- Device icons must render immediately and not disappear.
- Known on-site devices must not be shown as offline when they are responding.
- Map controls, filters, hover effects, widgets, Eagle Eye, MYCA Live, device controls, and video windows must not freeze.
- AM/ECM fungi should not be changed further right now. The user said this is working fine and does not want more experiments there.
- New data/camera work should be added only after the stability issues are under control.

## Current Local Branch

- Repo: `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website`
- Branch observed during this handoff: `codex/myca-website-security-boundary`
- Do not stage the whole dirty tree. Multiple agents have touched different areas.

## Key Files To Inspect First

Earth Simulator / CREP:

- `app/dashboard/crep/CREPDashboardClient.tsx`
- `app/dashboard/crep/v3-overlays.tsx`
- `components/crep/devices/DeviceWidget.tsx`
- `app/api/earth-simulator/devices/route.ts`
- `app/api/mycobrain/[port]/control/route.ts`
- `app/api/mycobrain/[port]/buzzer/route.ts`
- `app/api/mycobrain/[port]/led/route.ts`
- `lib/devices/operator-probe.ts`

MYCA Live:

- `components/myca/MYCAChatWidget.tsx`
- Any Earth Simulator local-command harness that handles fly-to/filter commands.

Camera/video:

- Camera feed data sources in the CREP/Earth Simulator stack.
- Video popup/widget components used by Eagle Eye and map camera markers.

## Backend Context From Cursor

Cursor reported the following backend/device fixes:

- Mushroom 1 and Hyphae 1 are physically up and respond to beeps.
- Mushroom 1 can take more than 2 seconds to answer `/api/status`; the operator probe timeout was raised from 1s to 5s.
- Failed probes should no longer wipe device status. Devices should be kept connected or stale during brief network failures instead of flipping offline.
- Online grace was extended to 10 minutes for Mushroom 1, Hyphae 1, and Psathyrella.
- Psathyrella is physically on COM3 but still maps to UI ids `mycobrain-COM4` / `psathyrella-buoy-com4` for field deployment continuity.
- Psathyrella telemetry was verified through `localhost:8003` with BME values after service fixes.
- Firmware/service bug: Side A beep could latch because old firmware ignored `duration_ms`; Cursor added timed buzzer off handling and a service safety net.

Important API to verify:

- `GET http://localhost:3010/api/earth-simulator/devices?refresh=1`
- `GET http://localhost:8003/devices/mycobrain-COM4/telemetry`
- `GET http://localhost:8003/devices/mycobrain-COM4/sensors`

## Current User-Observed Problems

### Device Markers

Symptoms reported:

- Device icons sometimes do not appear for 30 to 90 seconds after refresh.
- Device icons sometimes appear and then disappear.
- Mushroom 1 sometimes says `device may be off` even when it is online and beeps.
- Device markers should be data-driven and support future moving device coordinates. Do not hard-code the current three devices as the final architecture.

Expected behavior:

- Current devices render immediately from the fastest available stable snapshot.
- Fresh telemetry/status updates should refine the marker, not remove it.
- A temporary backend miss should show stale/last-seen state, not offline.
- When 100 devices are added later, they should appear through the device registry/API without new frontend hard-coding.

### Control Freezing

Symptoms reported:

- Clicking Psathyrella beep can freeze the Codex browser page locally.
- Clicking Mushroom 1 right after refresh can freeze controls.
- Video popups can become unclosable.
- Map can remain visually animated in places, with device pulse animations still running, while controls, close buttons, hover effects, and filters stop responding.

Priority:

- Find the exact lockout path.
- Confirm whether it is a React state/render loop, pending promise, event overlay, modal/backdrop pointer trap, browser-specific issue, or dev-server/chunk corruption.
- No user interaction impairment is acceptable.

### Camera And Eagle Eye

Sources to QA:

- Caltrans
- NYDOT
- CCTV/public traffic feeds
- EarthCam
- YouTube live cameras
- Surfline/surf cams
- Scripps/pier cams
- Windy-linked cameras

User examples:

- Las Vegas / Fremont Street / Bellagio / Strip EarthCam.
- Yellowstone and Yosemite YouTube live feeds.
- Times Square / New York, Los Angeles, San Francisco.
- San Ysidro / Tijuana border cameras.
- Chula Vista and San Diego Caltrans cameras.

Known issues:

- Some YouTube embeds show `This video is unavailable`.
- Some EarthCam widgets show headless render text or black panes.
- Surfline/Pier examples have shown page-not-found or broken iframe.
- Eagle Eye thumbnails sometimes look like still images instead of live thumbnails.
- Video widgets must be closable and must not freeze controls.

### MYCA Live Earth Simulator Harness

Observed bug:

- Commands like `fly to Chula Vista` and `show me all of the fires in the united states` routed to `myca-governance` and returned an authorization message.

Expected behavior:

- In Earth Simulator, MYCA Live should act as a map-control and map-search harness first.
- `fly to Chula Vista`, `show me Chula Vista`, `go to San Francisco` should fly the map.
- `show fires in the United States` should fly/zoom appropriately and set filters to show fires while keeping core base layers like satellite/bathymetry/topology/ECM as intended.
- The governance response should not appear for guest map navigation/filter commands.
- Future voice-to-map control was requested, but stabilize text commands first.

### Civic / Facilities / Public Safety

Observed bug:

- `Civic Center Branch Library` in Chula Vista was classified as `university`.

Expected behavior:

- Civic icon classification should be audited globally.
- Libraries should use library icons.
- Fire stations should use fire icons.
- Hospitals should use hospital icons.
- Universities/schools should use correct education icons.
- Generic colored dots should be replaced by category-specific icons where practical.
- These layers need LOD management so city-level assets do not overload global/state zoom.
- Public safety and facilities filters should be on by default if users otherwise miss important assets.

### AirNow / Environmental Data

Observed bug:

- Live and local showed `AirNow key not configured` even though the user says the key has been provided.

Expected behavior:

- Check all environment variable names and deployment env propagation.
- Confirm local and live AirNow routes use the same expected secret name.
- Apply fix globally for all AQI monitors and cities, not only Chula Vista.

This is likely backend/env/deployment configuration, but the frontend should not mislead users if the backend is healthy.

### Data Coverage

Observed concerns:

- Vancouver and other cities show sparse infrastructure, environmental, events, and species data.
- Canada and Mexico look underrepresented at North America zoom.
- The user expects railway, buoys, cell towers, airports, substations, transmission lines, civic facilities, events, and environmental data in every relevant city.

Likely split:

- Frontend should render data quickly when present and not hide it behind faulty LOD/filter logic.
- Cursor/MAS/MINDEX should audit data availability, backfill, ingestion, and API coverage for international blind spots.

## Immediate QA Matrix

Run this before any deploy:

1. Local hard refresh:
   - `http://localhost:3010/natureos/earth-simulator?lat=32.7157&lng=-117.1611&zoom=10&_qa=<timestamp>`
   - Confirm device markers appear quickly.
   - Confirm no marker disappears during first 2 minutes.

2. Device controls:
   - Open Mushroom 1, Hyphae 1, Psathyrella.
   - Click Beep.
   - Confirm beep does not latch.
   - Confirm widget close works immediately after beep.
   - Confirm map hover/click/zoom still works after each control.

3. Filters:
   - Toggle species/event/infra/device tabs.
   - Toggle fungi, birds, plants, earthquakes, fires, floods, civic/facilities/public safety.
   - Confirm markers persist and widgets do not auto-close on click.
   - Do not change AM/ECM behavior unless a direct regression is found.

4. Camera/video:
   - San Diego / Chula Vista Caltrans.
   - Las Vegas EarthCam.
   - Yellowstone YouTube.
   - Yosemite YouTube.
   - NYDOT/New York.
   - Los Angeles/San Francisco cameras.
   - Confirm thumbnails load, video popup opens, expand/collapse/close works, and map controls remain usable.

5. MYCA Live:
   - `fly to Chula Vista`
   - `show me San Francisco`
   - `show me all fires in the United States`
   - `show earthquakes near San Francisco`
   - Confirm map movement/filter changes happen without governance refusal.

6. Tablet/mobile:
   - iPad/tablet layout must not freeze.
   - Android Pixel was reported better; still smoke test it if available.

7. Live comparison:
   - Compare `localhost:3010` against `https://mycosoft.com/natureos/earth-simulator`.
   - If a bug only occurs in the Codex internal browser and not Chrome/live, keep it local/browser-specific and do not overcorrect live behavior.

## Terminal/API Probes

Suggested local probes:

```powershell
Invoke-RestMethod "http://localhost:3010/api/earth-simulator/devices?refresh=1" | ConvertTo-Json -Depth 8
Invoke-RestMethod "http://localhost:3010/api/crep/fungal?source=mindex-only&bbox=-117.4,32.4,-116.8,33.0&quick=true"
Invoke-RestMethod "http://localhost:3010/api/natureos/mindex/library?category=acoustic&limit=5&offset=0"
Invoke-RestMethod "http://localhost:3010/api/mindex/sine/status"
```

Also watch the Next dev server output for:

- repeated API failures
- React/Next compile errors
- source-map or missing chunk errors
- request storms
- slow device status routes
- video proxy/render errors

## Deployment Gate

Do not deploy Earth Simulator until:

- Device markers are stable after refresh.
- Known on-site devices do not falsely show offline.
- No control freeze reproduces during the QA matrix.
- Video widgets are closable.
- MYCA Live map commands do not route to governance.
- AirNow env issue is resolved or handed clearly to Cursor/deploy owner.
- SINE/MINDEX work is coordinated with the SINE owner and staged separately.

## Cursor Backend Handoff Items

Give Cursor these backend tasks:

1. Confirm MAS/MINDEX device registry returns stable dynamic devices for all active boards.
2. Confirm Mushroom 1, Hyphae 1, and Psathyrella status remains connected/stale during brief timeouts, not offline.
3. Confirm COM3 hardware to COM4 UI alias mapping is intentional and documented in the API payload.
4. Confirm AirNow key is present in local, VM, and deployment environments with the exact env var names the website expects.
5. Audit MINDEX coverage for Canada, Mexico, Vancouver, border areas, and major global cities.
6. Confirm camera provider metadata and playback URLs for EarthCam, YouTube, Surfline, Scripps, NYDOT, Caltrans, and border camera feeds.
7. Confirm device coordinates are dynamic from registry/telemetry and not hard-coded to the first three bench devices.

