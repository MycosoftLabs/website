# Codex to Cursor Handoff - Earth Simulator Freeze and MycoBrain Console

Date: May 31, 2026, 8:25 PM Pacific

## Objective

Morgan needs Cursor to continue backend, firmware, and full-workspace diagnostics while Codex keeps ownership of the website frontend. The current urgent issue is that local Earth Simulator on `http://localhost:3010/natureos/earth-simulator` can freeze hover/click/panel controls after roughly 15 to 30 seconds, while the globe itself still pans/zooms and AM/ECM fungi filters still render.

Do not deploy anything from this handoff unless Morgan explicitly says to deploy. This is local debugging and verification only.

## Current Symptoms From Morgan

- A square/rectangular layer appears on Earth Simulator at refresh around global/North America zoom and disappears after a zoom change.
- After refresh, hover and marker click initially work.
- After hovering Psathyrella or zooming toward San Diego, controls can freeze:
  - Map can still move and zoom.
  - Device pulse animations can continue.
  - AM fungi and ECM fungi filters still render instantly.
  - Marker hover/click stops responding.
  - MYCA analysis panel stops responding.
  - Right panel and Eagle Eye stop updating.
  - Intel feed controls mostly stop responding except some species filter buttons.
  - A hover tooltip/dialog can remain stuck on screen.
- The Psathyrella buoy marker sometimes does not pulse while Mushroom 1 and Hyphae 1 do.
- MycoBrain console controls had a separate freeze issue after button pushes; latest UI changes improved this, but there are still firmware/service gaps.

## Repo State

Website repo:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website`

The worktree is dirty with many May 27 to May 31 changes from Codex and Cursor. Do not reset or revert unrelated files. Preserve Morgan, Cursor, and Codex edits.

Important existing handoff docs:

- `docs/codex-handoffs/CODEX_DEVICE_MANAGER_MYCOBRAIN_CONSOLE_HANDOFF_MAY31_2026.md`
- `docs/codex-handoffs/PSATHYRELLA_COM4_CURSOR_HANDOFF_MAY31_2026.md`
- This file: `docs/codex-handoffs/CODEX_TO_CURSOR_EARTH_MYCOBRAIN_FREEZE_HANDOFF_MAY31_2026.md`

## What Codex Changed Recently

### MycoBrain console frontend

Files:

- `components/mycobrain/mycobrain-device-manager.tsx`
- `components/mycobrain/widgets/led-control-widget.tsx`
- `components/mycobrain/widgets/buzzer-control-widget.tsx`
- `components/mycobrain/widgets/peripheral-widget.tsx`
- `hooks/use-mycobrain.ts`

Changes:

- Removed nested Radix tab behavior from the main MycoBrain console control surfaces and replaced it with plain button-driven tab panels. This was done because controls were freezing or becoming unclickable after refresh/button pushes.
- Routed legacy NeoPixel and buzzer controls directly through local COM4 routes instead of relying on the generic peripheral control path.
- Added direct COM4 command helpers for LED and buzzer actions.
- Stopped disabling most UI buttons during command sends so a slow command cannot make the panel feel permanently frozen.
- Added fetch timeouts on control sends.
- Added sensor identity and BME status display for BME688 slots.
- Added a fallback for peripheral records with no `widget` object to avoid `Cannot read properties of undefined (reading 'icon')`.
- Made advanced gas analytics opt-in behind a "Show gas analytics" button so Mindex/AQI calls do not block the basic sensor/control UI.

### MycoBrain local auth/testing

Files:

- `hooks/use-supabase-user.ts`
- `app/api/auth/session/route.ts`
- `app/api/auth/local-dev-session/...`
- `lib/auth/local-dev-session.ts`
- `middleware.ts`
- `app/login/LoginForm.tsx`
- `app/login/page.tsx`

Changes:

- Added local dev session support so localhost UI can test gated controls without routing Google auth back to production.
- Morgan reported the local dev session button previously refreshed without signing in. Re-test this after any auth changes.

### COM4 command API routes

Files:

- `app/api/mycobrain/[port]/buzzer/route.ts`
- `app/api/mycobrain/[port]/led/route.ts`
- `app/api/mycobrain/[port]/control/route.ts`
- `app/api/mycobrain/[port]/sensors/route.ts`
- `app/api/mycobrain/[port]/peripherals/route.ts`

Changes:

- Fixed local serial device ID handling: COM4 must resolve to service device ID `mycobrain-COM4`, not stripped `COM4`.
- Buzzer route sends literal commands such as `coin`, `bump`, `power`, `1up`, `morgio`, `beep <hz> <ms>`, and `buzzer off`.
- LED route sends literal commands such as `led rgb R G B`, `led off`, and `led pattern rainbow`.
- Pattern names are allowed through to firmware so unsupported patterns can fail at the firmware/service layer instead of being blocked silently by the frontend.
- Acoustic TX is currently treated as standby in the route because Cursor reported Side-B science comms are pending/stubbed.

### Earth Simulator device integration

Files:

- `app/api/earth-simulator/devices/route.ts`
- `components/crep/devices/DeviceWidget.tsx`
- `lib/devices/field-deployments.ts`
- `lib/devices/dev-bench-location.ts`
- `lib/crep/device-widget-mapper.tsx`

Changes:

- Added the COM4 unit as `Psathyrella Aquatic MycoBrain Buoy`.
- Registry ID: `mycobrain-COM4`.
- Earth Simulator catalog ID: `psathyrella-buoy-com4`.
- Location: `32.56289, -117.13570`.
- Label: `Project Oyster - North Reef buoy position`.
- Added Psathyrella-specific Earth Simulator widget UI:
  - Position.
  - Wave height standby.
  - Wave period standby.
  - Water temperature standby.
  - Hydrophone LF standby.
  - Hydrophone HF standby.
  - Transducer standby.
  - BME688 A and B gas telemetry display.
- Added device API caching to avoid hammering MAS/local MycoBrain service every render.

## Important Suspect For Earth Simulator Freeze

The highest-risk frontend/backend boundary right now is this behavior in `app/api/earth-simulator/devices/route.ts`:

- The Earth Simulator devices route can call the local MycoBrain service and, if telemetry is not useful, can POST a `sensors` command to `http://localhost:8003/devices/mycobrain-COM4/command`.
- This fallback is controlled by:

```powershell
$env:EARTH_SIM_DEVICES_DISABLE_SENSOR_COMMAND_SNAPSHOT = "1"
```

Cursor should test Earth Simulator with this env var enabled. If the freeze disappears, the map feed must stop issuing serial command snapshots. The map should read cached telemetry/heartbeat/sensors endpoints only. The Earth Simulator UI must never poll a command endpoint that can acquire a serial lock or block device controls.

## What Codex Verified

Codex verified during the recent passes:

- TypeScript checks passed after the console-control patches at those checkpoints. Re-run now because the worktree has continued changing.
- Direct COM4 service commands returned OK for core commands:
  - `coin`
  - `led pattern rainbow`
  - `buzzer off`
  - `power`
  - `1up`
- Direct COM4 service returned stub responses for optical/acoustic:
  - `optx status/start/stop`
  - `aotx status/start/stop`
  - These returned `status: "stub"` / Side-B science comms pending.
- Cursor later reported backend verification:
  - Firmware `side-a-mdp-2.1.1` flashed to COM4.
  - MycoBrain service healthy.
  - `GET /api/mycobrain/COM4/sensors` showed BME688 A at `0x77` with telemetry.
  - BME688 B at `0x76` was absent until Morgan repaired the solder bridge. Re-test now after the hardware repair.

## What Is Still Not Proven

- The latest Earth Simulator freeze has not been fully root-caused.
- The square layer at refresh has not been identified yet.
- The Psathyrella marker pulse absence has not been root-caused.
- The COM4 console cannot be considered fully green until:
  - Controls remain responsive for at least 5 minutes.
  - Local dev session auth works.
  - Both BME slots are re-scanned after Morgan's solder repair.
  - Power and 1-up are confirmed distinct in firmware.
  - Optical and acoustic comms are either restored or clearly labeled firmware pending.

## Cursor Owner Items

### Firmware/service items

Cursor owns these unless Morgan says otherwise:

- Confirm whether firmware `side-a-mdp-2.1.1` removed or stubbed previous optical/acoustic modem behavior.
- Restore real `optx` and `aotx` behavior if it existed before.
- Fix `power` and `1up` if they sound the same at the firmware layer. The frontend is sending distinct literal commands.
- Confirm which LED patterns are actually supported. Codex UI can send blink/breathe/chase/sparkle, but firmware must implement them or return a clear unsupported response.
- Re-run I2C scan after Morgan's solder repair:
  - BME688 A should be `0x77`.
  - BME688 B should be `0x76`.
- Confirm BME readings are continuously changing every few seconds from the service, not frozen snapshots.

### MAS/MINDEX identity items

Cursor owns:

- Apply the MINDEX sensor identity migration if not already done.
- Confirm MAS has `MINDEX_API_KEY` and is syncing board/sensor identity.
- Confirm `board_id`, `sensor_id`, and `sensor_instances[]` are stable and included for COM4.
- Confirm device manager can bind sensor IDs to NLM datasets later.

### Earth Simulator backend pressure test

Cursor should help determine whether a backend route is causing UI freezes:

- Test with `EARTH_SIM_DEVICES_DISABLE_SENSOR_COMMAND_SNAPSHOT=1`.
- If that fixes the freeze, remove the command fallback from the map devices route.
- If it does not fix the freeze, instrument the frontend hover/marker layer.

## Exact Local Test Plan For Cursor

### 1. Clean restart localhost 3010 with no Next cache

Run from PowerShell:

```powershell
$repo = "D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website"
$listen = Get-NetTCPConnection -LocalPort 3010 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($pid in $listen) { Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2
$cache = Join-Path $repo ".next\cache"
if (Test-Path $cache) {
  $resolved = (Resolve-Path $cache).Path
  if ($resolved.StartsWith($repo, [StringComparison]::OrdinalIgnoreCase)) {
    Remove-Item -LiteralPath $resolved -Recurse -Force
  }
}
$env:EARTH_SIM_DEVICES_DISABLE_SENSOR_COMMAND_SNAPSHOT = "1"
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$repo`" && node_modules\.bin\next.cmd dev -p 3010 > .codex-dev-server-3010.current.out 2> .codex-dev-server-3010.current.err" -WindowStyle Hidden
```

Then tail logs:

```powershell
Get-Content "$repo\.codex-dev-server-3010.current.out" -Tail 120
Get-Content "$repo\.codex-dev-server-3010.current.err" -Tail 120
```

### 2. Check devices API

```powershell
Invoke-RestMethod "http://localhost:3010/api/earth-simulator/devices" | ConvertTo-Json -Depth 12
```

Expected:

- 3 devices minimum.
- `mushroom-1`.
- `hyphae-1`.
- `psathyrella-buoy-com4` with registry ID `mycobrain-COM4`.
- Psathyrella location exactly near `32.56289, -117.13570`.
- Cache metadata present.
- No route hang longer than about 1 second after warm cache.

### 3. Check COM4 sensors after hardware repair

```powershell
Invoke-RestMethod "http://localhost:3010/api/mycobrain/COM4/sensors" | ConvertTo-Json -Depth 12
Invoke-RestMethod "http://localhost:8003/devices/mycobrain-COM4/sensors" | ConvertTo-Json -Depth 12
```

Expected:

- BME688 A at `0x77` online.
- BME688 B at `0x76` online if Morgan's solder bridge repair is good.
- If B is not online, return hardware/service diagnostic detail, not a blank widget.

### 4. Check COM4 commands through website routes

```powershell
Invoke-RestMethod -Method POST "http://localhost:3010/api/mycobrain/COM4/buzzer" -ContentType "application/json" -Body '{"action":"preset","preset":"coin"}'
Invoke-RestMethod -Method POST "http://localhost:3010/api/mycobrain/COM4/buzzer" -ContentType "application/json" -Body '{"action":"preset","preset":"power"}'
Invoke-RestMethod -Method POST "http://localhost:3010/api/mycobrain/COM4/buzzer" -ContentType "application/json" -Body '{"action":"preset","preset":"1up"}'
Invoke-RestMethod -Method POST "http://localhost:3010/api/mycobrain/COM4/led" -ContentType "application/json" -Body '{"action":"rgb","r":0,"g":255,"b":0}'
Invoke-RestMethod -Method POST "http://localhost:3010/api/mycobrain/COM4/led" -ContentType "application/json" -Body '{"action":"pattern","pattern":"rainbow"}'
Invoke-RestMethod -Method POST "http://localhost:3010/api/mycobrain/COM4/led" -ContentType "application/json" -Body '{"action":"off"}'
```

Expected:

- Website routes must call `mycobrain-COM4`.
- No route should return 404 due to `COM4` vs `mycobrain-COM4`.
- If `power` and `1up` sound the same, fix firmware sound mappings.

### 5. Check optical/acoustic direct service contract

```powershell
Invoke-RestMethod -Method POST "http://localhost:8003/devices/mycobrain-COM4/command" -ContentType "application/json" -Body '{"command":{"cmd":"optx status"}}' | ConvertTo-Json -Depth 8
Invoke-RestMethod -Method POST "http://localhost:8003/devices/mycobrain-COM4/command" -ContentType "application/json" -Body '{"command":{"cmd":"aotx status"}}' | ConvertTo-Json -Depth 8
```

If these still return stub/pending, Cursor needs to restore or document firmware support. Do not make the website pretend they work.

### 6. Earth Simulator freeze probe

There is a local probe script:

`scripts/codex-freeze-probe.mjs`

Run it after 3010 is up:

```powershell
node scripts/codex-freeze-probe.mjs
```

The script opens:

`http://localhost:3010/natureos/earth-simulator?lat=32.56289&lng=-117.13570&zoom=14&_codex_click_probe=1`

It waits 40 seconds, then checks click/hover/debug state. Expand it if needed to:

- Hover the Psathyrella marker repeatedly.
- Click the Psathyrella marker.
- Click a camera marker.
- Click `ALL OFF`, `AM Fungi`, `Birds`, and panel controls.
- Dump:
  - `window.__crep_map_interaction_state`
  - `window.__crep_resourceGovernor`
  - `window.__map_marker_debug`
  - `window.__map_marker_click_debug`
  - `window.__crep_eagle_camera_counts`
  - `document.elementFromPoint(...)` at map/panel/control points.

Acceptance:

- After 90 seconds, marker hover/click still works.
- Psathyrella widget opens and closes.
- Right panel still responds.
- Eagle Eye updates.
- Hover tooltip does not stick to the screen.
- AM/ECM fungi are not the only controls still working.

## Square Layer Debug Plan

The square layer visible at refresh likely comes from a raster/polygon overlay at low zoom. Cursor should inspect these first:

- `components/crep/layers/proposal-overlays.tsx`
- `components/crep/layers/fungal-atlas-layer.tsx`
- `app/dashboard/crep/CREPDashboardClient.tsx`
- any NASA GIBS, biodiversity hotspots, weather overlay, jurisdiction, project overlay, or static tile source added at startup.

Reproduce at:

`http://localhost:3010/natureos/earth-simulator?zoom=3&_codex_square_layer_probe=1`

In browser console, dump MapLibre style layers and sources:

```javascript
const map = window.__crepMap || window.__map || null
map?.getStyle?.().layers?.map(l => ({ id: l.id, type: l.type, source: l.source, paint: l.paint }))
```

If no global map handle exists, add a dev-only debug assignment in the map setup. The fix should identify the exact layer ID and either:

- correct its tile bounds,
- delay it until the right zoom,
- clip it correctly,
- or remove the low-zoom raster fill if it is stale/invalid.

Do not hide the symptom with opacity unless the underlying layer/source is identified.

## Acceptance Criteria Before Any Deploy

Do not deploy until Morgan personally tests local and says it is good.

Local must satisfy:

- Earth Simulator loads cleanly on `3010` after no-cache restart.
- No square layer artifact at refresh, or exact layer identified and fixed.
- 3 MycoBrain devices show:
  - Mushroom 1.
  - Hyphae 1.
  - Psathyrella buoy COM4.
- Device markers pulse when connected.
- Psathyrella marker remains selectable after 90 seconds.
- Hover and click remain responsive after zoom, pan, and idle.
- MYCA analysis, Eagle Eye, right panel, and Intel feed remain responsive.
- COM4 console shows peripheral scan data and live BME values.
- BME688 B is re-tested after Morgan's solder repair.
- Buzzer/LED controls are single-click and do not freeze the panel.
- Unsupported optical/acoustic/pattern behavior is firmware-pending, not a frontend freeze.
- `npm.cmd run typecheck` or the repo's equivalent TypeScript validation passes.

## One-Line Cursor Prompt

Use this if Morgan wants to paste one short instruction:

Open `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\CODEX_TO_CURSOR_EARTH_MYCOBRAIN_FREEZE_HANDOFF_MAY31_2026.md`; do not deploy; verify COM4 firmware/service after the solder repair, test `EARTH_SIM_DEVICES_DISABLE_SENSOR_COMMAND_SNAPSHOT=1` against the Earth Simulator freeze, identify the square low-zoom layer, and fix only the backend/firmware/MAS/MINDEX pieces while preserving Codex frontend edits.
