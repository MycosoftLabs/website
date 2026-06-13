# Earth Simulator Device Backend Cursor Handoff - Jun 12 2026

Scope for Cursor: `MINDEX/mindex`, MAS/MycoBrain services, MQTT/device bridge, and device-side operator agents. Do not make website UI changes in this handoff unless explicitly asked. Website-side work is continuing in `WEBSITE/website`.

## Why This Handoff Exists

Earth Simulator on `WEBSITE/website` can now show the three expected field devices as connected/present and can surface real Mushroom One telemetry when the LAN operator responds. The remaining device/backend failures are outside the website frontend lane:

- Hyphae 1 operator agent at `http://192.168.0.228:8787` times out.
- Psathyrella buoy agent at `http://192.168.0.241:8003` refuses connection.
- MAS/MINDEX network registry has field records, but telemetry is missing for Hyphae and Psathyrella.
- MQTT/presence route access and live telemetry ingestion need backend verification.

No mock data should be added. Empty compounds/genetics/publications remain acceptable until ETL fills them, but connected field devices must expose honest status plus live/last-seen telemetry when available.

## Current Website-Side Fixes Already Applied

These changes are in `WEBSITE/website` and should be treated as frontend/BFF compatibility fixes, not backend proof:

- `app/api/earth-simulator/devices/route.ts`
  - Field deployments now bootstrap as `connected` instead of `offline`.
  - Live operator/MAS telemetry wins when present.
  - Empty field shells preserve expected connected presence instead of flipping to off solely because telemetry is absent.
  - Device cache TTL increased to reduce repeated slow LAN probes.
- `lib/devices/operator-probe.ts`
  - Operator probe timeout widened to `4500ms`, matching observed LAN response behavior.
- `app/api/natureos/devices/telemetry/route.ts`
  - Operator HTTP timeout widened.
  - Valid live Mushroom One metrics suppress stale parse `lastError` in the Website telemetry API.
- `app/api/mindex/proxy/[source]/route.ts`
- `app/api/mindex/devices/route.ts`
- `app/api/natureos/mindex/devices/route.ts`
  - Device fallbacks now call `/api/earth-simulator/devices?refresh=1&wait=1` so MINDEX-facing website routes do not return stale empty field shells while Earth Simulator has live telemetry.

## Current Local Evidence From Website 3010

Commands were run from `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website` without restarting the dev server.

### Mushroom One Works Intermittently But Is Real When Agent Responds

Direct operator probe:

`GET http://192.168.0.123:8787/api/status`

Observed:

- HTTP 200
- `serialConnected: true`
- `lastHeartbeat` present
- `lastSensorReading` present

Website route after timeout fix:

`GET http://localhost:3010/api/earth-simulator/devices?refresh=1&wait=1`

Observed for `mushroom-1`:

- `status: connected`
- `source: operator`
- telemetry present:
  - `temperature_c`
  - `humidity_pct`
  - `pressure_hpa`
  - `iaq`
  - `eco2_ppm`
  - `gas_resistance_ohm`
  - `captured_at`

Telemetry route:

`GET http://localhost:3010/api/natureos/devices/telemetry`

Observed for `mushroom-1`:

- `status: active`
- `connected: true`
- `source: operator-http`
- live BME688 metrics present
- `lastError: null` from WEBSITE because valid metrics exist

Note: the raw operator status still reports a serial parse `lastError` even while valid complete telemetry exists. Backend/device-agent should clean this up at source if possible by distinguishing partial serial fragments from health errors.

### Hyphae 1 Does Not Expose Live Telemetry

Direct operator probe:

`GET http://192.168.0.228:8787/api/status`

Observed:

- timeout

MAS/network registry route through Website:

`GET http://localhost:3010/api/devices/network`

Observed for `mycobrain-hyphae1-jetson-228`:

- `status: online`
- `ingestion_source: field-bridge`
- `telemetry: null`
- `extra.online: false`
- `extra.latest_telemetry: null`
- `extra.agent_url: http://192.168.0.228:8787`

Website shows Hyphae as connected/present because it is an expected field deployment, but there is no real sensor payload to display.

### Psathyrella Buoy Does Not Expose Live Telemetry

Direct operator probes:

`GET http://192.168.0.241:8003/api/status`

`GET http://192.168.0.241:8003/api/sensor`

Observed:

- unable to connect to remote server

MAS/network registry route through Website:

`GET http://localhost:3010/api/devices/network`

Observed for `mycobrain-COM4`:

- `status: offline`
- `ingestion_source: field-config`
- `telemetry: null`
- `extra.latest_telemetry: null`
- `extra.agent_url: http://192.168.0.241:8003`

Website shows Psathyrella as connected/present because it is an expected field deployment, but there is no real sensor payload to display.

### MAS Global Device Endpoint Is Empty

Direct probe:

`GET http://192.168.0.196:8003/devices`

Observed:

- HTTP 200
- `devices: []`
- `count: 0`

This means the MAS global service is reachable but not serving live connected devices through `/devices`.

### MQTT Presence Route Needs Backend/Auth Check

Website probe:

`GET http://localhost:3010/api/devices/mqtt/presence`

Observed:

- HTTP 403 Forbidden

Cursor should verify whether this is expected auth gating, a missing local auth/test bypass, or a broken MQTT presence backend contract. Do not bypass security casually; document the correct authenticated local test path.

## Backend Tasks For Cursor

1. Fix Hyphae 1 operator service availability.
   - Host: `192.168.0.228`
   - Expected agent: `http://192.168.0.228:8787`
   - Required routes:
     - `/api/status`
     - `/api/sensor`
   - Must return `serialConnected` or clear offline status, `lastHeartbeat`, and latest BME688 telemetry if the board is physically on.

2. Fix Psathyrella buoy service availability.
   - Host: `192.168.0.241`
   - Expected agent/service: `http://192.168.0.241:8003`
   - Required routes:
     - `/api/status`
     - `/api/sensor`
     - or MAS/MINDEX telemetry route that Website can consume without mocking.
   - If the buoy is offline, backend should report an honest offline/stale state with last seen and reason.

3. Fix MAS `/devices` and registry telemetry.
   - `http://192.168.0.196:8003/devices` currently returns an empty list.
   - MAS registry should expose the three field deployments with status, last seen, agent URL, and telemetry when available.
   - Do not require Website to scrape every device directly if MAS is supposed to be the canonical aggregation layer.

4. Fix MINDEX device persistence and proxy data.
   - MINDEX should persist live/latest telemetry for:
     - `mycobrain-mushroom1-jetson-123`
     - `mycobrain-hyphae1-jetson-228`
     - `mycobrain-COM4`
   - Website should not be the only layer carrying live Mushroom telemetry.
   - Ensure `/api/mindex/proxy/devices` equivalent in MINDEX returns live telemetry and not only field shell records.

5. Fix MQTT telemetry/presence contract.
   - Verify broker connection, topics, retained messages, device IDs, auth, and bridge ingestion.
   - Confirm whether Mushroom One, Hyphae One, and Psathyrella are publishing.
   - If they are not publishing, return explicit backend/device status explaining why.
   - If they are publishing, bridge the payloads into MAS/MINDEX so Website routes can consume them.

6. Fix operator-agent error semantics.
   - Mushroom One currently produces valid BME688 telemetry while `status.lastError` contains a partial JSON parse error.
   - Operator service should distinguish partial serial fragments from true telemetry failure.
   - API response should include a non-fatal parse warning separately from health failure if valid readings exist.

7. Keep device IDs stable.
   - Website expects these catalog IDs:
     - `mushroom-1`
     - `hyphae-1`
     - `psathyrella-buoy-com4`
   - Registry IDs:
     - `mycobrain-mushroom1-jetson-123`
     - `mycobrain-hyphae1-jetson-228`
     - `mycobrain-COM4`
   - Do not rename these without coordinating Website route mapping.

## Acceptance Criteria For Cursor

Run these from a machine/network that can reach the devices:

```powershell
Invoke-WebRequest -UseBasicParsing http://192.168.0.123:8787/api/status
Invoke-WebRequest -UseBasicParsing http://192.168.0.123:8787/api/sensor
Invoke-WebRequest -UseBasicParsing http://192.168.0.228:8787/api/status
Invoke-WebRequest -UseBasicParsing http://192.168.0.228:8787/api/sensor
Invoke-WebRequest -UseBasicParsing http://192.168.0.241:8003/api/status
Invoke-WebRequest -UseBasicParsing http://192.168.0.241:8003/api/sensor
Invoke-WebRequest -UseBasicParsing http://192.168.0.196:8003/devices
```

Expected:

- Mushroom One returns live metrics.
- Hyphae One either returns live metrics or an explicit honest offline/stale status with last seen and reason.
- Psathyrella either returns live metrics or an explicit honest offline/stale status with last seen and reason.
- MAS `/devices` is not empty when field devices are expected online.
- MINDEX/MAS exposes latest telemetry for each connected device.
- No mock values are generated.
- Website route below returns the same live facts without special frontend work:

```powershell
Invoke-WebRequest -UseBasicParsing "http://localhost:3010/api/earth-simulator/devices?refresh=1&wait=1"
Invoke-WebRequest -UseBasicParsing "http://localhost:3010/api/natureos/devices/telemetry"
Invoke-WebRequest -UseBasicParsing "http://localhost:3010/api/mindex/proxy/devices?limit=20"
```

## Paste-Ready Cursor Prompt

You are working on the backend/device side for Mycosoft Earth Simulator. WEBSITE/website already has frontend/BFF compatibility fixes, but Hyphae 1 and Psathyrella telemetry are not actually available from device/MAS/MINDEX. Do not add mock data. Fix the real device/MAS/MQTT/MINDEX paths so Earth Simulator can consume honest live or stale/offline status.

Use this handoff:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\EARTH_SIMULATOR_DEVICE_BACKEND_CURSOR_HANDOFF_JUN12_2026.md`

Target device IDs:

- `mushroom-1` / `mycobrain-mushroom1-jetson-123` / `192.168.0.123:8787`
- `hyphae-1` / `mycobrain-hyphae1-jetson-228` / `192.168.0.228:8787`
- `psathyrella-buoy-com4` / `mycobrain-COM4` / `192.168.0.241:8003`

Acceptance: direct operator routes, MAS `/devices`, MQTT/presence, MINDEX device persistence, and Website proxy routes all agree. Connected devices show live telemetry; unreachable devices show explicit stale/offline status with last seen and reason. No frontend mock data.

