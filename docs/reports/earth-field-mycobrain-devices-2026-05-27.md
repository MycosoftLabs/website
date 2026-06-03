# Earth Simulator Field MycoBrain Device Audit

Date: May 27, 2026

## Scope

Replace the Earth Simulator "Local MycoBrain" service widget path with the two real field devices prepared by MAS:

- Mushroom 1: `mushroom-1`, registry `mycobrain-mushroom1-jetson-123`, `32.715736,-117.161087`, agent `http://192.168.0.123:8787`
- Hyphae 1: `hyphae-1`, registry `mycobrain-hyphae1-jetson-228`, `32.640278,-117.085833`, agent `http://192.168.0.228:8787`

## Changes

- Earth Simulator device state now polls `GET /api/earth-simulator/devices` every 30 seconds and filters to the two catalog field units.
- The old local-service-only widget binding is replaced with field-device IDs, fixed coordinates, MAS registry IDs, live BME688 telemetry, GPS state, host, agent URL, and per-device control IDs.
- Native MapLibre Mycosoft-device layers now also use `/api/earth-simulator/devices`, so both DOM markers and native markers point at the same field-device registry records.
- Device marker click handling now tags marker roots, raises device marker stacking above dense aircraft/camera/nature layers, and stops pointer/mouse propagation so a device click does not open an aircraft or camera widget underneath.
- `POST /api/devices/network/[deviceId]/command` still prefers MAS, stays admin-gated, and has a narrow fallback to the field operator `/api/cmd` path for known registry IDs when MAS command routing fails locally.
- `GET /api/devices/network/[deviceId]/telemetry` falls back to the MAS registry snapshot when the per-device MAS telemetry route is unavailable.

## Local Verification

### Device API

`GET http://localhost:3010/api/earth-simulator/devices`

- Result: 2 devices
- Mushroom 1: connected, host `192.168.0.123`, temp about 32.5 C, IAQ about 127, eCO2 about 836 ppm
- Hyphae 1: connected, host `192.168.0.228`, temp about 23.0 C, IAQ about 51, eCO2 about 507 ppm

### Telemetry Routes

- `GET /api/devices/network/mycobrain-mushroom1-jetson-123/telemetry`: 200, `source: mas-registry-snapshot`
- `GET /api/devices/network/mycobrain-hyphae1-jetson-228/telemetry`: 200, `source: mas-registry-snapshot`

### Operator Agents

Safe status probes were verified directly:

- `POST http://192.168.0.123:8787/api/cmd` with `{"cmd":"status"}`: `ok: true`
- `POST http://192.168.0.228:8787/api/cmd` with `{"cmd":"status"}`: `ok: true`

Website control route security:

- Unauthenticated `POST /api/devices/network/mycobrain-mushroom1-jetson-123/command`: 401 `Authentication required`

### Browser Evidence

Local Earth Simulator URL:

`http://localhost:3010/natureos/earth-simulator?lat=32.7157&lng=-117.1611&zoom=10`

Verified:

- Intel Feed shows `2 Devices`.
- The old `Local MycoBrain` widget is absent.
- Two device markers are present with `data-marker-root="device"` and `z-index: 1500`.
- Mushroom 1 marker opens a Mushroom 1 widget with registry `mycobrain-mushroom1-jetson-123`, live telemetry, GPS lock, and quick controls.
- Hyphae 1 marker opens a Hyphae 1 widget with registry `mycobrain-hyphae1-jetson-228`, live telemetry, GPS lock, and quick controls.
- Neither device click opened aircraft details during the final verification.

Screenshots:

- `screenshots/earth-field-mycobrain-mushroom-widget-final-2026-05-27.png`
- `screenshots/earth-field-mycobrain-hyphae-widget-final-2026-05-27.png`

### Type Check

`npx tsc --noEmit --pretty false --incremental false`

Result: pass.

## Remaining Deployment Notes

- Production website should keep `MAS_API_URL=http://192.168.0.188:8001` so sandbox/live can read MAS heartbeats without direct LAN reachability to `192.168.0.123` or `192.168.0.228`.
- Actual physical command execution through the website requires an authenticated admin session and MAS command routing on 188. The local fallback is present for known field devices, but live production should continue to rely on MAS heartbeat and command routing.
