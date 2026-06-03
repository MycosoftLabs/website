# Codex Handoff — Device Manager, MycoBrain Console, Earth Simulator Widgets

**Date:** May 31, 2026
**Status:** Active — Codex owns website/UI; Cursor owns firmware + MycoBrain service + MAS/MINDEX backend
**Supersedes/extends:** `PSATHYRELLA_COM4_CURSOR_HANDOFF_MAY31_2026.md`, `CODEX_BLUEGREEN_HANDOFF_MAY29_2026.md`

---

## Morgan’s live symptoms (MycoBrain console on COM4)

| Symptom | Likely bucket | Notes |
|--------|----------------|-------|
| Buzzer presets mostly work; **power** and **1up** sound the same | Frontend mapping **or** firmware SFX | Presets must send **distinct literal cmds** (`power` vs `1up`), not `bump` fallback |
| **Custom tone buttons** all sound the same | **Frontend bug (fixed by Codex)** | Legacy path remapped every tone to `bump`; must send `beep <hz> <ms>` literally |
| **LED changes feel delayed** | **Frontend** | Per-click `/devices` lookup before actuators; Codex removing that for direct COM targets |
| **Rainbow / patterns / NeoPixel RGB** do not work on live board | **Backend + firmware gap** | See command contract below — several UI patterns are **not implemented in firmware** |
| Sensor telemetry | **Backend mostly OK** | BME688 A @ 0x77 live; B @ 0x76 absent on this wiring |

**Rule:** If the UI sends the correct literal command and the board still does nothing / sounds wrong → **Cursor firmware/service handoff**, not another website guess.

---

## Owner split

| Owner | Scope |
|-------|--------|
| **Codex** | Website only: Device Manager, `/natureos/mycobrain` console, Earth Simulator `DeviceWidget`, API route proxies, auth, UX (single-click, no delay), command payload mapping |
| **Cursor** | `mycobrain/` firmware, `MAS/.../services/mycobrain/`, MAS device registry, MINDEX sensor identity, NLM dataset bind, on-board testing, VM deploy |

**Do not** change marketing/public copy without Morgan. **Do not** SSH/deploy VMs for this task unless Morgan asks.

---

## Device identity (backend — use in UI)

Cursor added a **stable board/sensor identity layer**. Wire Device Manager and widgets to these fields instead of inventing parallel IDs.

| Field | Example (COM4 today) | Source |
|-------|----------------------|--------|
| `portal_device_id` / registry id | `mycobrain-COM4` | USB port (can change if cable moves) |
| `board_id` | `mycobrain-port-com4` (fallback) or `mycobrain-{efuse_mac}` | MDP hello JSON `device_id` when parsed |
| `sensor_id` | `mycobrain-port-com4:bme688_a:0x77` | `{board_id}:{slot}:{i2c_addr}` |
| `peripheral_uid` | `amb-0x77`, `env-0x76` | UI slot label |
| `sensor_slot` | `bme688_a`, `bme688_b` | Normalized from AMB/ENV |
| `dataset_id` | e.g. `psathyrella-oyster-v1` | NLM bind via MAS API |

### APIs Codex should read (no mock data)

**Local MycoBrain service (dev PC, port 8003):**

```
GET  http://localhost:8003/devices/mycobrain-COM4/sensors
GET  http://localhost:8003/devices/mycobrain-COM4/telemetry
POST http://localhost:8003/devices/mycobrain-COM4/command
```

**Website proxies (admin auth on actuators):**

```
GET  /api/mycobrain/COM4/sensors
GET  /api/mycobrain/COM4/peripherals
GET  /api/mycobrain/COM4/telemetry
POST /api/mycobrain/COM4/buzzer
POST /api/mycobrain/COM4/led
POST /api/mycobrain/COM4/control
```

**MAS registry (field / sandbox):**

```
GET  http://192.168.0.188:8001/api/devices/mycobrain-COM4/sensors
GET  http://192.168.0.188:8001/api/devices/sensors
POST http://192.168.0.188:8001/api/devices/sensors/datasets/bind
```

**MINDEX (after migration on 189):**

```
GET  /api/mindex/mycobrain/sensors?portal_device_id=mycobrain-COM4
GET  /api/mindex/mycobrain/sensors/datasets/{dataset_id}/telemetry
```

### Example sensor registry response (live May 31)

```json
{
  "device_id": "mycobrain-COM4",
  "board_id": "mycobrain-port-com4",
  "sensor_instances": [
    {
      "sensor_id": "mycobrain-port-com4:bme688_a:0x77",
      "sensor_slot": "bme688_a",
      "peripheral_uid": "amb-0x77",
      "i2c_address": 119,
      "status": "online"
    },
    {
      "sensor_id": "mycobrain-port-com4:bme688_b:0x76",
      "sensor_slot": "bme688_b",
      "peripheral_uid": "env-0x76",
      "i2c_address": 118,
      "status": "not_detected"
    }
  ]
}
```

**UI work:** Show `board_id`, `sensor_id`, and slot status on Device Manager + console sensor panels. When binding NLM training, expose `sensor_id` → `dataset_id` (admin-only).

Doc: `MAS/mycosoft-mas/docs/SENSOR_BOARD_IDENTITY_BACKEND_MAY31_2026.md`

---

## Psathyrella / Earth Simulator device

| Key | Value |
|-----|--------|
| Earth Simulator map id | `psathyrella-buoy-com4` |
| Registry id | `mycobrain-COM4` |
| Console | `/natureos/mycobrain?device=mycobrain-COM4` |
| Role | `psathyrella` |
| Location | `32.56289, -117.13570` — Project Oyster - North Reef buoy position |
| Firmware | `side-a-mdp-2.1.1` on COM4 |

Earth Simulator widget controls (Codex): Beep Test, LED Rainbow, LED Off, Record LF/HF, Ping — marine channels stay **standby** until Side B / optx / aotx are real.

---

## Command contract — what the UI must send

All actuator paths ultimately hit **MycoBrain service** `POST /devices/{device_id}/command` with either:

```json
{ "command": { "cmd": "coin" } }
```

or structured `{ "command": { "command_type": "buzzer-tone", "frequency": 880, "duration_ms": 150 } }` (service `map_command()`).

**Critical:** `{device_id}` must be **`mycobrain-COM4`**, not bare `COM4`.
Bug in `app/api/mycobrain/[port]/buzzer/route.ts` and `led/route.ts`: `resolveLocalDeviceId()` strips `mycobrain-` and returns `COM4`, which 404s on the service. **Codex fix:** for direct serial targets use `mycobrain-${port}` or skip lookup when port is already `mycobrain-COM4`.

### Buzzer — literal firmware CLI strings

| UI control | HTTP body (buzzer route) | Literal cmd to service |
|------------|--------------------------|-------------------------|
| Coin | `{ "action": "preset", "preset": "coin" }` | `coin` |
| Bump | `{ "action": "preset", "preset": "bump" }` | `bump` |
| Power | `{ "action": "preset", "preset": "power" }` | `power` |
| 1-Up | `{ "action": "preset", "preset": "1up" }` | `1up` |
| Morgio | `{ "action": "preset", "preset": "morgio" }` or melody | `morgio` |
| Custom tone | `{ "action": "tone", "hz": 880, "ms": 150 }` | `beep 880 150` |
| Stop | `{ "action": "stop" }` | `buzzer off` |

**Do not** map tones to `bump` or `coin` as fallback. `lib/mycobrain/control-command.ts` already maps `beep ${frequency} ${duration}` correctly for field relay.

### LED — literal firmware CLI strings

| UI control | Literal cmd | Firmware support (2.1.1) |
|------------|-------------|---------------------------|
| RGB color | `led rgb <r> <g> <b>` | **Yes** (CLI + MDP `output_control` neopixel) |
| Off | `led off` or `led mode off` | **Yes** |
| Rainbow | `led pattern rainbow` or `led mode rainbow` | **Yes** (CLI only; loop animates) |
| Brightness | `led brightness <0-100>` | **No** — not in firmware; hide or stub until Cursor adds |
| blink / breathe / chase / sparkle | `led pattern <name>` | **No** — only `rainbow` implemented; disable or label “coming soon” |

### Service transport (Cursor — for debugging)

`mycobrain_service_standalone.py`:

1. Tries MDP mapping for: `read_sensors`, `hello`, `led rgb`, `led off`, `beep freq ms`, `buzzer off`
2. **Falls back to ASCII CLI** (`cmd\r\n`) for: `coin`, `power`, `1up`, `morgio`, `bump`, `led pattern rainbow`, `status`, etc.
3. CLI path has **~500ms sleep** before read — contributes to perceived LED delay (Cursor can reduce after UI stops double-fetching)

Firmware MDP `handle_command()` does **not** implement preset SFX or rainbow — only `output_control` for buzzer/neopixel. Presets **require** CLI fallback or future MDP commands.

---

## Website files Codex touches

| Area | Paths |
|------|--------|
| Console UI | `app/natureos/mycobrain/**`, related components under `components/` |
| Device Manager | `app/natureos/devices/**`, `components/crep/devices/DeviceWidget.tsx` |
| Earth Simulator fleet | `app/api/earth-simulator/devices/route.ts`, `lib/devices/dev-bench-location.ts`, `lib/devices/field-deployments.ts` |
| Actuator APIs | `app/api/mycobrain/[port]/buzzer/route.ts`, `led/route.ts`, `control/route.ts` |
| Command mapping | `lib/mycobrain/control-command.ts` |
| Network relay | `lib/devices/network-command-bridge.ts` |

### Codex in-progress (Morgan confirmed)

- [x] Fix tone remapping → literal `beep <freq> <dur>`
- [ ] Remove slow per-click `/devices` scan for direct COM4 / `mycobrain-COM4` actuators
- [ ] Fix `resolveLocalDeviceId` → always use `mycobrain-COM4` service id
- [ ] Ensure each buzzer preset button calls **distinct** preset (verify in Network tab: cmd string)
- [ ] Disable or grey out LED patterns not in firmware (blink/chase/sparkle/brightness)
- [ ] Consume `sensor_instances[]` + `board_id` from sensors/telemetry APIs for console + Device Manager
- [ ] Single-click actuators (no double-submit, no overlay blocking)

### Auth

- Production actuators: **company/admin** (`requireAdmin` on buzzer/led/control)
- Local dev: unauthenticated actuator calls should fail unless explicit dev bypass — do not ship bypass to sandbox/prod

---

## Cursor backend — done vs remaining

### Done (May 31)

- Firmware **side-a-mdp-2.1.1** on COM4: BSEC fallback, buzzer auto-stop, rainbow mode in `loop()`, optx/aotx stubs
- MycoBrain service v2.2.0: MDP + CLI dual path, actuators enabled, sensor identity on connect/telemetry/heartbeat
- MAS device registry: `board_id`, `sensor_instances[]` on heartbeat; sensor list + dataset bind endpoints
- MINDEX migration + schemas for `board_node`, `sensor_instance`, `sensor_id` on readings (apply on 189 pending)
- NLM `ingest_from_sensors(dataset_id=...)` pulls real MINDEX telemetry (no mock)

### Cursor remaining (firmware/service — not Codex)

| Task | Why |
|------|-----|
| Parse MDP hello `device_id` → stable `board_id` (efuse MAC) | Currently fallback `mycobrain-port-com4` |
| Add MDP commands for SFX presets + `led pattern rainbow` | Avoid CLI-only path / latency |
| Implement `led brightness` + blink/breathe/chase/sparkle **or** document unsupported | UI sends brightness today |
| Verify `sfxPowerUp()` vs `sfx1Upish()` differ audibly | Morgan reports power ≈ 1up |
| Reduce CLI command latency in service | Remove fixed 500ms sleep where safe |
| Apply MINDEX migration + deploy MAS 188 + `MINDEX_API_KEY` | Registry persists to DB |
| Pressure sanity (~968 hPa vs ~1013) | Firmware `pressureToHpa` — separate telemetry task |

### On-board test commands (Cursor runs these; Codex verifies via UI)

```powershell
# Service must be up: .\scripts\mycobrain-service.ps1 status
Invoke-RestMethod -Method POST -Uri "http://localhost:8003/devices/mycobrain-COM4/command?command=coin"
Invoke-RestMethod -Method POST -Uri "http://localhost:8003/devices/mycobrain-COM4/command?command=power"
Invoke-RestMethod -Method POST -Uri "http://localhost:8003/devices/mycobrain-COM4/command?command=1up"
Invoke-RestMethod -Method POST -Uri "http://localhost:8003/devices/mycobrain-COM4/command" -ContentType "application/json" -Body '{"command":{"cmd":"beep 880 200"}}'
Invoke-RestMethod -Method POST -Uri "http://localhost:8003/devices/mycobrain-COM4/command?command=led%20pattern%20rainbow"
Invoke-RestMethod -Method POST -Uri "http://localhost:8003/devices/mycobrain-COM4/command" -ContentType "application/json" -Body '{"command":{"cmd":"led rgb 255 0 0"}}'
Invoke-RestMethod -Method POST -Uri "http://localhost:8003/devices/mycobrain-COM4/command?command=buzzer%20off"
Invoke-RestMethod -Uri "http://localhost:8003/devices/mycobrain-COM4/sensors"
```

---

## Telemetry shape for widgets

Prefer nested BME slots (matches firmware MDP telemetry):

```json
{
  "telemetry": {
    "bme688": {
      "a": {
        "temperature_c": 25.97,
        "humidity_pct": 66.77,
        "pressure_hpa": 968.07,
        "gas_ohm": 10126,
        "iaq": 50,
        "co2_equivalent": 500,
        "voc_equivalent": 0.5
      }
    },
    "board_id": "mycobrain-port-com4",
    "sensor_instances": [ "..."]
  }
}
```

Flat `bme_b_*` fields also accepted. **Empty `bme688: {}`** means subscription/read failure — show empty state, not fake numbers.

Raw status lines (for diagnostics panel, not customer hero copy):

```
AMB: present=YES addr=0x77 begin=OK sub=OK
ENV: present=NO addr=0x76 begin=FAIL sub=FAIL
```

---

## Acceptance checklist (Codex UI)

- [ ] Each buzzer preset sends a **different** `command` string in Network tab
- [ ] Tone sliders send `beep <hz> <ms>` with distinct hz values
- [ ] LED RGB picker sends `led rgb R G B` and pixel changes within ~1s (after device-id fix)
- [ ] Rainbow sends `led pattern rainbow` and animates on board
- [ ] LED off sends `led off` / `led mode off`
- [ ] No actuator requires double-click
- [ ] Sensor panel shows `sensor_id`, slot, I2C address, online/not_detected from `/sensors`
- [ ] Earth Simulator Psathyrella widget: site position + Project Oyster label + live BME A metrics
- [ ] Failed actuator shows error from API (503/404), not silent success
- [ ] No deploy until Morgan approves

## Acceptance checklist (Cursor backend — blocks some UI features)

- [ ] `power` and `1up` audibly distinct at firmware level
- [ ] Rainbow + RGB work via service when Codex sends correct cmds + device id
- [ ] `board_id` from efuse MAC in hello JSON
- [ ] MINDEX migration applied; MAS heartbeats persist sensors

---

## One-line summary for Codex

Fix UI command mapping and **device id `mycobrain-COM4`** + remove actuator lookup delay; consume **`board_id` / `sensor_id` / `sensor_instances`** from backend APIs; disable unsupported LED patterns. If literal cmds still fail on hardware, ping Cursor — firmware/service owns the rest.
