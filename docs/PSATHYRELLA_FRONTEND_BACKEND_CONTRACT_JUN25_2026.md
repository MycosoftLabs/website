# Psathyrella GCS — Front-end ↔ Back-end Interface Contract
**Date: 2026-06-25 · Front-end: Claude Code · Back-end: Cursor**

This is the handshake between the Psathyrella ground-control-station (front-end,
`/natureos/psathyrella`) and the MAS/MycoBrain/Jetson backend. The front-end is
**built and live against the endpoints below**; where the backend does not yet
serve a field, the GCS renders an honest `STANDBY / AWAITING FEED` state (no-mock
policy). The machine-readable source of truth is
[`lib/psathyrella/contract.ts`](../lib/psathyrella/contract.ts) — import its types
on both sides.

Device: `psathyrella-buoy-com4` · registry `mycobrain-COM4` (portal) · serial `mycobrain-COM3` on dev PC · anchor **32.56289, -117.1357** (Project Oyster, North Reef).

**COM3/COM4 alias:** Hardware is on **COM3**; stable ids remain `mycobrain-COM4` / `psathyrella-buoy-com4`. MycoBrain service maps `MYCOBRAIN_DEVICE_ALIASES=mycobrain-COM4=mycobrain-COM3` and heartbeat uses `MYCOBRAIN_REGISTRY_ID=mycobrain-COM4`.

---

## 1. Endpoints the GCS consumes

| Method | Path | Status | Purpose |
|--------|------|--------|---------|
| GET | `/api/mycobrain/COM4/sensors` | ✅ live | BME688 A/B (temp, humidity, pressure, gas, IAQ, eCO2, bVOC) |
| GET | `/api/earth-simulator/devices` | ✅ live | registry row → position, online/source |
| POST | `/api/devices/psathyrella-buoy-com4/command` | ✅ live | legacy diagnostics + MDP nav/cam via MAS `/api/psathyrella/.../command` |
| GET | `/api/psathyrella/telemetry` | ✅ implemented (MAS) | Fused `BuoyTelemetry` envelope — default device `psathyrella-buoy-com4` |
| GET | `/api/psathyrella/{device_id}/telemetry` | ✅ implemented (MAS) | Same envelope per device id / registry alias |
| POST | `/api/psathyrella/{device_id}/command` | ✅ implemented (MAS) | MDP `nav.*` / `cam.*` + legacy operator strings |
| GET | `/api/psathyrella/telemetry` (website proxy) | ✅ implemented | `app/api/psathyrella/telemetry/route.ts` → `MAS_API_URL` |
| WS | `/api/psathyrella/ws` | ⛔ TODO | MAS push: MAVLink, mission events, NLM results, scope frames |

The GCS currently polls `sensors` (3 s) and `devices` (12 s). Once `/api/psathyrella/telemetry`
exists returning the **`BuoyTelemetry`** shape (§3), point the hook
(`lib/psathyrella/useBuoyTelemetry.ts`) at it and/or the WS and every panel lights up
with zero UI changes.

---

## 2. What the GCS renders today vs. needs from you

| Surface | Live now | Needs backend |
|---------|----------|---------------|
| Bottom bar: air temp / RH / IAQ / pressure | ✅ BME688 A | — |
| Map: buoy position + waypoint drop | ✅ position | persist + execute waypoints (`nav.add_waypoint`) |
| Camera / Lidar / Radar / BlueSight scopes | chrome only | live frames + contacts (§3 `lidar`/`radar`/`bluesight`/`camera`) |
| Left: thruster vector ring + autonomy modes | UI + commands emit | `nav.*` MDP handlers + `propulsion`/`autonomy` telemetry |
| Right: RF stack / acoustic modem / hydrophone / NLM | UI | `comms` telemetry + NLM uplink summary |
| Bottom: solar / battery / depth | UI | `power` + `pose.depthM` telemetry |

---

## 3. Telemetry envelope (`BuoyTelemetry`)

Return this from `/api/psathyrella/telemetry` and/or push over WS. Every leaf is
nullable — send `null` for anything not yet wired; the GCS shows STANDBY. Field
names are exact (see `contract.ts`). Summary:

```ts
BuoyTelemetry {
  deviceId; link: "online"|"stale"|"offline"|"unknown"; lastUpdateMsAgo; source; simulated;
  pose:   { lat, lon, headingDeg, speedKn, depthM, gpsLock }
  bme:    { a: BmeReading|null, b: BmeReading|null }          // already served by /sensors
  propulsion: { thrusters: ThrusterState[4], commandedVector }
  autonomy:   { mode, armed, waypoints[], activeWaypointId, cameraHoldBearingDeg, fightCurrent }
  power:      { solarInputW, panelTempC, batterySocPct, batteryVoltage, loadW, estRuntimeH, sunRepositionSuggested }
  comms:      { radios: RadioLink[ble,cellular,wifi,lora], acoustic, hydrophone, bridgeActive, lastUplink }
  camera:     { active, streamUrl, zoom, bearingDeg, tiltDeg }
  lidar:      ScopeFrame   // { sweepDeg, maxRangeM, contacts: SensorContact[], active }
  radar:      ScopeFrame
  bluesight:  { wifi: SensorContact[], active }               // radar+lidar fused client-side
}
SensorContact { id, bearingDeg(0..360 rel. bow), rangeM, kind, strength(0..1), label?, classifiedAs? }
```

`camera.streamUrl` may be MJPEG/HLS/snapshot — the GCS renders it directly when
`active`. Scope `contacts` should already be in bow-relative bearings.

---

## 4. Command bus (front-end → `POST /api/devices/psathyrella-buoy-com4/command`)

Two body shapes. **Diagnostics use the legacy operator string (already working):**

```jsonc
{ "command": "led pattern rainbow" }   // led off | buzzer off | beep 2000 150 | transducer ping | hydrophone-lf record | hydrophone-hf record
```

**Nav / camera use the MDP envelope (please implement on side_b / side_a):**

| Command | Body |
|---------|------|
| Thrust vector | `{ target:"side_b", cmd:"nav.thrust_vector", params:{ heading, magnitude, yaw_rate } }` |
| Single thruster | `{ target:"side_b", cmd:"nav.thruster", params:{ id, throttle, azimuth } }` |
| All stop | `{ target:"side_b", cmd:"nav.all_stop" }` |
| Set mode | `{ target:"side_b", cmd:"nav.set_mode", params:{ mode } }` (MANUAL/STABILIZE/STATION_KEEP/GUIDED/AUTO/SIGNAL_FOLLOW/DEPTH_HOLD/RTL) |
| Arm | `{ target:"side_b", cmd:"nav.arm", params:{ armed } }` |
| Add / clear / goto waypoint | `nav.add_waypoint` {lat,lon,loiter,id} · `nav.clear_waypoints` · `nav.goto` {id} |
| Station-keep / fight current | `nav.station_keep` · `nav.fight_current` {enabled} |
| Camera hold / zoom / point | `nav.camera_hold` {bearing} · `cam.zoom` {zoom} · `cam.point` {bearing,tilt} (side_a) |

The GCS treats any non-200 (incl. 404 "no backend route yet", 401 "auth required")
as an un-acked command and surfaces it in the status bar — so partial backend
coverage degrades gracefully.

Map these `nav.*` to the `PsathyrellaMissionAgent` → MAVROS → ArduSub guided-mode
path from `PSATHYRELLA_AUTONOMOUS_OPS_PLAN_JUN25_2026.md`.

---

## 5. Open questions for Cursor
1. ~~Will fused telemetry arrive via `GET /api/psathyrella/telemetry`~~ **Yes — live at MAS `:8001/api/psathyrella/telemetry` and website proxy `/api/psathyrella/telemetry`. WS still TODO.**
2. Scope contacts — bow-relative bearings confirmed? And `maxRangeM` per sensor?
3. `camera.streamUrl` transport (MJPEG vs HLS) so the front-end picks the right element.
4. Auth: actuator commands require `requireAdmin()` today — confirm the operator session the demo will use.

## 6. Backend implementation status (Cursor, 2026-06-26)

| Area | Status | Notes |
|------|--------|-------|
| `BuoyTelemetry` envelope | ✅ | `mycosoft_mas/devices/psathyrella/telemetry_builder.py` |
| Website proxy `GET /api/psathyrella/telemetry` | ✅ | Merged to `main` (`7d49733c`); proxies `MAS_API_URL` |
| MAS `MYCOBRAIN_SERVICE_URL` | ✅ | MAS VM 188 systemd drop-in → `http://192.168.0.241:8003` (dev PC / Voice Legion LAN) |
| BME688 A/B | ⚠️ partial | Envelope + `present` flags live; numeric readings null until firmware `sub=OK` on COM3 AMB sensor |
| Pose / link | ✅ | Registry location + link `online` when MycoBrain reachable |
| Propulsion / autonomy state | ✅ partial | In-memory until MAVLink; commands update runtime |
| Power | ✅ partial | From device telemetry when present, else null |
| Comms | ✅ partial | Bridge state; radios null until Side B ingest |
| Camera / lidar / radar / bluesight | ⛔ standby | `active: false` until `PSATHYRELLA_*_STREAM_URL` set |
| Nav/cam MDP commands | ✅ | `nav.thrust_vector`, `nav.set_mode`, `cam.point`, etc. |
| Legacy diagnostics | ✅ | `led pattern rainbow`, `transducer ping`, hydrophone record |

**Claude hook:** No changes required — `useBuoyTelemetry` can switch to `/api/psathyrella/telemetry` when ready; contract types unchanged.
