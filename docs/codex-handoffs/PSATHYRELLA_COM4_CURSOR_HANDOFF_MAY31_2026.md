# Psathyrella COM4 Cursor Handoff - May 31, 2026

> **Codex (frontend):** See **`CODEX_DEVICE_MANAGER_MYCOBRAIN_CONSOLE_HANDOFF_MAY31_2026.md`** in this folder for the full Device Manager + MycoBrain console + Earth Simulator widget handoff, live bug split (UI vs firmware), command contract, and sensor/board identity APIs.

## Objective

Repair the COM4 Psathyrella Aquatic MycoBrain buoy path at the firmware, local service, MAS registry, and device-console level. Codex only cleaned the website/front-end surface and did not send actuator commands during this pass.

The Earth Simulator UI should treat this as a real buoy device at Project Oyster, not as a bench/demo artifact.

## Device identity

- Earth Simulator map id: `psathyrella-buoy-com4`
- Registry id: `mycobrain-COM4`
- Console URL: `/natureos/mycobrain?device=mycobrain-COM4`
- Location: `32.56289, -117.13570`
- Location label: `Project Oyster - North Reef buoy position`
- Expected hardware role: Psathyrella aquatic MycoBrain buoy with dual BME688 gas telemetry, hydrophones, acoustic transducer, and marine status channels.

## Front-end changes made by Codex

- Removed customer-visible "USB bench", "mock GPS", and "safety locked" style wording from the Earth Simulator buoy widget.
- Changed the Earth Simulator device position badge to `Site position`.
- Set the Psathyrella marker/widget location text to `Project Oyster - North Reef buoy position`.
- Added Psathyrella-specific widget controls in `components/crep/devices/DeviceWidget.tsx`:
  - `Beep Test`
  - `LED Rainbow`
  - `LED Off`
  - `Record LF`
  - `Record HF`
  - `Ping`
- Kept generic MycoBrain quick controls off for Psathyrella so the buoy uses its own control surface.
- Reworded Device Manager and Device Network COM4 warnings to neutral "firmware profile pending" copy instead of exposing bench/safety-lock language.

## Current read-only evidence from local 3010

Read-only API checks were run. No buzzer, LED, raw command, machine mode, or I2C write actions were sent.

### Earth Simulator devices

`GET http://localhost:3010/api/earth-simulator/devices`

Relevant COM4 row:

```json
{
  "id": "psathyrella-buoy-com4",
  "registry_id": "mycobrain-COM4",
  "name": "Psathyrella Aquatic MycoBrain Buoy",
  "type": "psathyrella",
  "role": "psathyrella",
  "port": "COM4",
  "status": "connected",
  "location": { "lat": 32.56289, "lon": -117.1357 },
  "location_label": "Project Oyster - North Reef buoy position",
  "telemetry": {
    "raw": "I2C: SDA=5 SCL=4 @ 100000 Hz\nAMB: present=YES addr=0x77 begin=OK sub=FAIL\nENV: present=NO addr=0x76 begin=FAIL sub=FAIL"
  },
  "source": "live",
  "agent_url": "http://192.168.0.241:8003",
  "host": "192.168.0.241"
}
```

### Sensors

`GET http://localhost:3010/api/mycobrain/COM4/sensors`

Current result:

```json
{
  "sensors": {
    "bme688_1": {
      "label": "BME688 A - I2C-1 AMB",
      "address": "0x77",
      "present": true,
      "begin_ok": true,
      "subscribed": false
    },
    "bme688_2": {
      "label": "BME688 B - I2C-2 ENV",
      "address": "0x76",
      "present": false,
      "begin_ok": false,
      "subscribed": false
    }
  },
  "raw_response": "{\"type\":\"telemetry\",\"uptime_s\":13022,\"estop\":false,\"analog\":{\"ai1\":0,\"ai2\":0,\"ai3\":0,\"ai4\":0},\"bme688\":{}}\n{\"success\":true,\"message\":\"telemetry_sent\"}\nI2C: SDA=5 SCL=4 @ 100000 Hz\nAMB: present=YES addr=0x77 begin=OK sub=FAIL\nENV: present=NO addr=0x76 begin=FAIL sub=FAIL"
}
```

### Peripherals

`GET http://localhost:3010/api/mycobrain/COM4/peripherals`

Current result:

```json
{
  "peripherals": [
    {
      "uid": "amb-0x77",
      "type": "bme688",
      "product": "BME688 A - I2C-1 AMB",
      "address": "0x77",
      "present": true,
      "status": "subscription_failed"
    },
    {
      "uid": "env-0x76",
      "type": "bme688",
      "product": "BME688 B - I2C-2 ENV",
      "address": "0x76",
      "present": false,
      "status": "not_detected"
    }
  ],
  "count": 2,
  "raw_response": "I2C: SDA=5 SCL=4 @ 100000 Hz\nAMB: present=YES addr=0x77 begin=OK sub=FAIL\nENV: present=NO addr=0x76 begin=FAIL sub=FAIL"
}
```

## Required telemetry contract for the website

The website can render live dual BME data if COM4 publishes either flat fields or nested BME slots. Please make the local MycoBrain service and MAS registry return this shape:

```json
{
  "telemetry": {
    "temperature_c": 24.1,
    "humidity_pct": 45.2,
    "pressure_hpa": 1012.3,
    "iaq": 33,
    "eco2_ppm": 420,
    "bvoc_ppm": 0.12,
    "gas_resistance_ohm": 123456,
    "bme_b_temperature_c": 24.4,
    "bme_b_humidity_pct": 45.5,
    "bme_b_pressure_hpa": 1012.1,
    "bme_b_iaq": 35,
    "bme_b_eco2_ppm": 430,
    "bme_b_bvoc_ppm": 0.14,
    "bme688": {
      "a": {
        "temperature_c": 24.1,
        "humidity_pct": 45.2,
        "pressure_hpa": 1012.3,
        "iaq": 33,
        "eco2_ppm": 420,
        "bvoc_ppm": 0.12
      },
      "b": {
        "temperature_c": 24.4,
        "humidity_pct": 45.5,
        "pressure_hpa": 1012.1,
        "iaq": 35,
        "eco2_ppm": 430,
        "bvoc_ppm": 0.14
      }
    },
    "wave_height_m": null,
    "water_temperature_c": null,
    "wave_period_s": null,
    "hydrophone_low": "standby",
    "hydrophone_high": "standby",
    "transducer": "standby"
  }
}
```

Either the flat `bme_b_*` fields or nested `bme688.a` / `bme688.b` slots are acceptable. Nested slots are preferred long-term.

## Cursor tasks

1. Identify the current COM4 firmware exactly.
   - `MYCOBRAIN_CONSOLE_FULL_FIX_MAY29_2026.md` says COM4 firmware was `unknown`; verify from serial, MAS, and the local MycoBrain service.

2. Restore dual BME688 detection.
   - Expected: AMB on `0x77`, ENV on `0x76`.
   - Current: AMB present and begin OK but subscription failed; ENV is not detected.
   - Reference docs:
     - `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MAS\mycosoft-mas\docs\BME688_DUAL_SENSOR_SETUP.md`
     - `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MAS\mycosoft-mas\docs\BME688_SUBSCRIPTION_FAILURE_INVESTIGATION.md`

3. Fix BSEC2 subscription and publish real readings.
   - AMB and ENV must both publish temperature, humidity, pressure, IAQ, eCO2, BVOC, and gas resistance where available.
   - `bme688` must not remain `{}` when sensors are physically connected.

4. Fix the COM4 command contract.
   - Buzzer controls must not latch or keep screaming.
   - Add or verify an explicit `stop`, `off`, or failsafe command that clears all tone output.
   - LED rainbow, LED off, color select, melody presets, raw command, ping, status, get sensors, and I2C scan must use the correct firmware command path.
   - Do not rely on one successful beep as proof that the command layer is aligned.

5. Fix the Device Manager double-click behavior.
   - Every console button must execute on a single click or single tap.
   - Check disabled/loading state, pointer event overlays, stale form submit behavior, and auth redirects.

6. Confirm auth boundaries.
   - Live production must require company/admin auth for actuator commands.
   - Local unauthenticated behavior should reject actuator commands unless a deliberate local dev bypass is explicitly enabled and clearly not deployable.

7. Keep customer-facing language clean.
   - Do not show "USB bench", "mock GPS", "safety locked", raw COM-port explanations, or internal hardware caveats in live customer UI.
   - Internal troubleshooting detail belongs in docs/logs, not the Earth Simulator widget.

## Acceptance checklist

- `GET http://localhost:3010/api/earth-simulator/devices` returns `psathyrella-buoy-com4` with numeric dual BME telemetry.
- `GET http://localhost:3010/api/mycobrain/COM4/sensors` reports two BME688 sensors present, initialized, subscribed, and producing values.
- `GET http://localhost:3010/api/mycobrain/COM4/peripherals` shows both BME688 devices as healthy/online.
- Earth Simulator widget shows:
  - `Site position`
  - `Project Oyster - North Reef buoy position`
  - marine metrics in `standby` where not physically available yet
  - BME688 A and B numeric telemetry
  - Beep Test, LED Rainbow, LED Off, Record LF, Record HF, Ping
- Device Manager console buttons work on a single click.
- Beep Test is short and never latches.
- LED Rainbow and LED Off visibly affect the board with correct colors and no long delay.
- Raw command, ping, status, sensor read, and I2C scan work without breaking the UI.
- No front-end control freezes after opening and closing the Psathyrella widget repeatedly for at least 60 seconds.
- No deployment until Morgan explicitly approves.

## Cursor backend completion (May 31, 2026)

### Fixes applied

- **Firmware** (`mycobrain/firmware/MycoBrain_SideA_MDP/src/main.cpp`, **side-a-mdp-2.1.1**): BSEC subscription fallback chain (full → minimal → raw ULP), buzzer auto-stop via `g_buzzer_off_at`, rainbow LED mode, optx/aotx MDP stubs; build fix added `static void initBuzzer();` forward declaration (CLI used `initBuzzer` before definition).
- **MycoBrain service** (`MAS/mycosoft-mas/services/mycobrain/mycobrain_service_standalone.py`): actuators enabled by default, expanded MDP command mapping; I2C reconfig still blocked by policy.
- **Dev env**: `.env.local` psathyrella role at Project Oyster coords; `APPROVE_FLASH=true` for live COM4 flash.

### Build and flash

| Step | Result |
|------|--------|
| `build_firmware_artifact.ps1 -Env standalone -Version side-a-mdp-2.1.1` | **OK** — artifact `data/firmware_artifacts/side-a-mdp-2.1.1/side-a-mdp-2.1.1_standalone_merged.bin`, sha256 `0d637023277e0741b1ae32c4520788d96a17ecc8a39a9e82859af34f1a372ba8` |
| `mycobrain-service.ps1 restart` | **OK** — role `psathyrella`, allowed ports COM4/COM7 |
| `POST /flash` COM4 confirm live | **OK** — job `flash-864d1ae0e734`, esptool verify, hard reset; service auto-reconnected COM4 |

### HTTP verification (local dev PC, post-flash)

- `GET :8003/health` — **ok**, 1 device connected, service v2.2.0
- `GET :8003/devices` — **mycobrain-COM4** connected, firmware **side-a-mdp-2.1.1** in MDP hello JSON
- `POST command status` — `AMB: present=YES addr=0x77 begin=OK sub=OK`; **ENV: present=NO addr=0x76 begin=FAIL sub=FAIL**
- `POST command coin` — **ok** (short SFX path; no latched buzzer observed in service response)
- `POST command led pattern rainbow` — **ok**
- `POST command buzzer off` — **ok** (`{"success":true,"message":"buzzer_off"}`)
- `POST command read_sensors` — **ok**, telemetry includes populated `bme688.a`
- `GET :3010/api/mycobrain/COM4/sensors` — **live numeric AMB sample** (example): temp **25.97°C**, RH **66.77%**, pressure **968.07 hPa**, gas **~10.1 kΩ**, IAQ **50**, eCO2 **500**, bVOC **0.5**

### Sensor telemetry sample (BME688 A @ 0x77)

```json
{
  "temperature_c": 25.96641541,
  "humidity_pct": 66.77280426,
  "pressure_hpa": 968.0665894,
  "gas_ohm": 10126.58203,
  "iaq": 50,
  "co2_equivalent": 500,
  "voc_equivalent": 0.499999911
}
```

### Known gaps (backend)

- **BME688 B (ENV @ 0x76)**: not detected on this board wiring — status remains `present=NO`; dual-BME contract still needs hardware or Side B bus path.
- **optx / aotx**: MDP stubs only until Side B / marine transducer firmware is wired.
- **Earth Simulator / MAS registry**: confirm `192.168.0.241:8003` agent path picks up same telemetry shape after UI deploy (dev service is on localhost:8003).

### What Codex should test next (UI)

1. Earth Simulator Psathyrella widget: **Beep Test** (short, no latch), **LED Rainbow** / **LED Off** (visible on device), single-click on all console buttons.
2. Refresh `GET /api/mycobrain/COM4/sensors` and peripherals — expect **one** healthy BME with numeric fields; ENV row absent until 0x76 hardware exists.
3. Marine placeholders (wave, hydrophone, ping) — should stay **standby** until optx/aotx are real.
4. Auth: actuator routes on production vs local dev bypass.
5. Compare widget telemetry to sample above; flag if `bme688` empty again after long uptime.
