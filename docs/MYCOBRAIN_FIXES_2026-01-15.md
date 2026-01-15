# MycoBrain Device Manager Fixes - January 15, 2026

**Date**: 2026-01-15  
**Status**: Completed  
**Affected Codebase**: WEBSITE (`C:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website`)

---

## Executive Summary

This document describes critical fixes applied to the MycoBrain Device Manager in the Mycosoft Website codebase. The issues prevented the UI from properly communicating with MycoBrain devices running in Docker containers. All fixes were applied to the **WEBSITE codebase** (not MAS), which is what Docker uses to build the `mycosoft-website` container.

---

## Issues Identified

### Issue 1: Wrong Codebase Being Edited

**Problem**: Earlier development work was incorrectly modifying files in the MAS codebase (`mycosoft-mas/app/api/mycobrain/`) instead of the WEBSITE codebase (`WEBSITE/website/app/api/mycobrain/`).

**Root Cause**: The Docker container builds from `../../WEBSITE/website`, not from the MAS codebase. The MAS codebase only serves as an integration layer.

**Impact**: Changes made to MAS had no effect on the running website.

### Issue 2: API Routes Calling Non-Existent `/cli` Endpoint

**Problem**: The website's sensor route was calling `/devices/{device_id}/cli` which does not exist in the running MycoBrain service.

**Root Cause**: The MycoBrain service (`mycobrain_service_standalone.py`) only has these endpoints:
- `/health`
- `/devices`
- `/ports`
- `/devices/connect/{port}`
- `/devices/{device_id}/disconnect`
- `/devices/{device_id}/command`
- `/devices/{device_id}/telemetry`
- `/clear-locks`

There is NO `/cli` endpoint.

**Impact**: 404 errors when fetching sensor data.

### Issue 3: Device ID Not Being Resolved from Port Path

**Problem**: API routes were passing the raw port path (e.g., `/dev/ttyACM0`) directly to the MycoBrain service instead of the resolved `device_id` (e.g., `mycobrain--dev-ttyACM0`).

**Root Cause**: Linux device paths contain forward slashes which, when URL-encoded, create malformed URLs like `/devices//dev/ttyACM0/command`.

**Impact**: 404 errors for all device commands.

### Issue 4: Machine Mode Not Initializing

**Problem**: The "Initialize Machine Mode" button wasn't working, and machine mode wasn't auto-initializing.

**Root Cause**: 
1. The machine-mode route had the same device_id resolution issue
2. The route was sending unsupported firmware commands (`mode machine`, `dbg off`)
3. No auto-initialization on device connection

**Impact**: Advanced NDJSON protocol features (optical modem, acoustic modem) were unavailable.

---

## Fixes Applied

### Fix 1: Sensors Route - Change `/cli` to `/command`

**File**: `app/api/mycobrain/[port]/sensors/route.ts`

**Before**:
```typescript
const response = await fetch(
  `${MYCOBRAIN_SERVICE_URL}/devices/${encodeURIComponent(deviceId)}/cli`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command: "sensors" }),
```

**After**:
```typescript
const response = await fetch(
  `${MYCOBRAIN_SERVICE_URL}/devices/${encodeURIComponent(deviceId)}/command`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command: { cmd: "get-sensors" } }),
```

### Fix 2: Machine Mode Route - Add Device ID Resolution

**File**: `app/api/mycobrain/[port]/machine-mode/route.ts`

**Added** `resolveDeviceId()` helper function:
```typescript
async function resolveDeviceId(port: string): Promise<string> {
  // If it looks like a device_id already, use it
  if (port.startsWith("mycobrain-")) return port
  
  // If it's a port path (COM5, /dev/ttyACM0), look up the device_id
  if (port.match(/^COM\d+$/i) || port.startsWith("/dev/")) {
    try {
      const res = await fetch(`${MYCOBRAIN_SERVICE_URL}/devices`, {
        signal: AbortSignal.timeout(3000),
      })
      if (res.ok) {
        const data = await res.json()
        const device = data.devices?.find((d: any) => d.port === port)
        if (device?.device_id) return device.device_id
      }
    } catch {
      // Fallback to constructed device_id
    }
    // Construct device_id from port path: /dev/ttyACM0 -> mycobrain--dev-ttyACM0
    return `mycobrain-${port.replace(/\//g, "-")}`
  }
  
  return port
}
```

### Fix 3: Machine Mode Route - Update to Supported Firmware Commands

**File**: `app/api/mycobrain/[port]/machine-mode/route.ts`

**Before**:
```typescript
const commands = [
  "mode machine",  // NOT SUPPORTED by firmware v2.0.0
  "dbg off",       // NOT SUPPORTED by firmware v2.0.0
  "fmt json",
]
```

**After**:
```typescript
const commands = [
  "fmt json",      // Only command needed - ensures JSON output
]
```

**Firmware v2.0.0 Supported Commands**:
```
help, status, ping, get_mac, get_version, scan, sensors, 
led, beep, fmt, optx, aotx, reboot
```

### Fix 4: Auto-Initialize Machine Mode on Device Connect

**File**: `components/mycobrain/mycobrain-device-manager.tsx`

**Added** useEffect for auto-initialization:
```typescript
const [machineModeActive, setMachineModeActive] = useState(false)
const machineModePendingRef = useRef(false)

// Auto-initialize machine mode when device connects
useEffect(() => {
  if (!device?.port || !device?.connected) {
    setMachineModeActive(false)
    return
  }
  
  // Prevent duplicate initialization
  if (machineModeActive || machineModePendingRef.current) return
  machineModePendingRef.current = true
  
  const initMachineMode = async () => {
    try {
      logToConsole("> Auto-initializing machine mode...")
      const res = await fetch(`/api/mycobrain/${encodeURIComponent(device.port)}/machine-mode`, {
        method: "POST",
        signal: AbortSignal.timeout(10000),
      })
      const data = await res.json()
      if (data.success) {
        setMachineModeActive(true)
        logToConsole("✓ Machine mode auto-initialized")
      } else {
        logToConsole(`✗ Machine mode init failed: ${data.error || "Unknown"}`)
      }
    } catch (error) {
      logToConsole(`✗ Machine mode init error: ${error}`)
    } finally {
      machineModePendingRef.current = false
    }
  }
  
  // Small delay to let device settle after connection
  const timer = setTimeout(initMachineMode, 1000)
  return () => clearTimeout(timer)
}, [device?.port, device?.connected, machineModeActive])
```

---

## Files Modified

| File | Change Description |
|------|-------------------|
| `app/api/mycobrain/[port]/sensors/route.ts` | Changed `/cli` to `/command`, updated request body format |
| `app/api/mycobrain/[port]/machine-mode/route.ts` | Added `resolveDeviceId()`, updated firmware commands, improved response logging |
| `components/mycobrain/mycobrain-device-manager.tsx` | Added auto-initialization of machine mode on device connect |

---

## Architecture Overview

### Data Flow
```
MycoBrain Device (ESP32-S3)
        │
        │ USB Serial (/dev/ttyACM0 in Docker via usbipd)
        ▼
MycoBrain Service (Python FastAPI @ :8003)
  - mycobrain_service_standalone.py
  - Running in Docker container
        │
        │ REST API
        ▼
Website API Routes (Next.js @ :3000)
  - /api/mycobrain/[port]/control
  - /api/mycobrain/[port]/sensors
  - /api/mycobrain/[port]/peripherals
  - /api/mycobrain/[port]/machine-mode
        │
        │ React Components
        ▼
NatureOS Device Manager UI
  - /natureos/devices
```

### Device ID Format
- **Windows**: `mycobrain-COM5`
- **Linux/Docker**: `mycobrain--dev-ttyACM0` (slashes replaced with hyphens)

### MycoBrain Service Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service health check |
| `/devices` | GET | List connected devices |
| `/ports` | GET | List available serial ports |
| `/devices/connect/{port}` | POST | Connect to device |
| `/devices/{device_id}/disconnect` | POST | Disconnect device |
| `/devices/{device_id}/command` | POST | Send command to device |
| `/devices/{device_id}/telemetry` | GET | Get device telemetry |
| `/clear-locks` | POST | Clear serial port locks |

### Command Format for `/command` Endpoint

```json
{
  "command": {
    "cmd": "led rgb 255 0 0"
  }
}
```

Or for mapped commands:
```json
{
  "command": {
    "cmd": "buzzer-beep",
    "frequency": 1000,
    "duration": 200
  }
}
```

The Python service has a `map_command()` function that translates:
- `"buzzer-beep"` → `"coin"`
- `"neopixel-set"` → `"led rgb R G B"`
- `"get-sensors"` → `"status"`

---

## Testing Results

### Verified Working
- ✅ Device detected and shown in UI
- ✅ Device status shows "Connected"
- ✅ 2x BME688 sensors detected (0x76, 0x77)
- ✅ Beep command works (board responds `{"ok":true}`)
- ✅ LED control works (board responds `{"ok":true}`)
- ✅ Machine mode auto-initializes on device connect
- ✅ Machine mode badge shows "Active" in Controls tab
- ✅ Advanced widgets (LED Control, Buzzer Control with tabs) displayed
- ✅ Console shows initialization logs
- ✅ No more 404 errors in MycoBrain service logs

### Test Commands Used
```powershell
# Test beep via API
$body = @{
  peripheral = "buzzer"
  action = "beep"
  frequency = 1000
  duration_ms = 200
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/mycobrain/%2Fdev%2FttyACM0/control" `
  -Method POST -Body $body -ContentType "application/json"

# Result: {"success":true,"peripheral":"buzzer","action":"beep","result":{"status":"ok","device_id":"mycobrain--dev-ttyACM0","command":"beep 1000 200","response":"{\"ok\":true}"}}
```

---

## Related Documentation

- `docs/MYCOBRAIN_ARCHITECTURE.md` - Hardware and firmware architecture
- `MYCOBRAIN_COMMAND_REFERENCE.md` - Full command documentation
- `docs/firmware/` - Firmware documentation

---

## Notes for Future Development

1. **Always edit WEBSITE codebase** - The MAS codebase is only for integration, not the running website
2. **Device ID resolution** - Any new routes that interact with devices must resolve device_id from port
3. **Firmware commands** - Check `help` output for supported commands before adding new features
4. **Machine mode** - Now auto-initializes; only needs manual re-init if firmware is reloaded

---

*Document created: 2026-01-15*  
*Last updated: 2026-01-15*
