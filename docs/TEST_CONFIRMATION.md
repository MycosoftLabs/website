# Physical Device Test Confirmation

**Date**: December 30, 2024  
**Status**: ✅ **READY FOR TESTING**

## Pre-Test System Status

### ✅ All Services Verified

| Service | Status | Health Check |
|---------|--------|--------------|
| **MINDEX** | ✅ Healthy | `http://localhost:8000/health` |
| **MycoBrain Service** | ✅ Healthy | `http://localhost:8003/health` |
| **Website** | ✅ Running | `http://localhost:3000/api/services/status` |
| **n8n** | ✅ Running | `http://localhost:5678/healthz` |
| **MAS Orchestrator** | ✅ Healthy | `http://localhost:8001/health` |

### ✅ MINDEX Container
- **Status**: Up (healthy)
- **Imports**: All fixed (json, typing, pydantic, fastapi verified)
- **Database**: Connected
- **API**: Responding
- **ETL**: Running

### ✅ Device Registration
- **MINDEX Registration**: ✅ Working
- **Device Manager Endpoint**: ✅ Working
- **Auto-registration**: ✅ Implemented

---

## Test Execution Steps

### 1. MINDEX Container ✅ VERIFIED

**Status**: ✅ Container fully started, all imports working

**Verification**:
```powershell
docker ps --filter "name=mindex"
# Output: Up (healthy)

Invoke-RestMethod -Uri "http://localhost:8000/health"
# Output: {"status": "healthy", "api": true, "database": true}
```

**Result**: ✅ **CONFIRMED** - MINDEX container healthy, no import errors

---

### 2. Device Registration ✅ TESTED

**Test 1: Direct MINDEX Registration**
```powershell
$device = @{
    device_id = "test-mycobrain-001"
    device_type = "mycobrain"
    serial_number = "TEST001"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/mindex/devices/register" `
    -Method POST -Body $device -ContentType "application/json"
```

**Result**: ✅ **SUCCESS** - Device registered successfully

**Test 2: Device Manager Registration**
```powershell
$reg = @{
    device_id = "test-device-manager"
    port = "ttyACM0"
    serial_number = "TEST002"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/mycobrain/ttyACM0/register" `
    -Method POST -Body $reg -ContentType "application/json"
```

**Result**: ✅ **SUCCESS** - Multi-system registration working

---

### 3. n8n Workflow Import

**Workflow Files Ready**:
- ✅ `13_mycobrain_telemetry_forwarder.json`
- ✅ `14_mycobrain_optical_acoustic_modem.json`

**Import Method**: Manual via n8n UI (recommended)

**Steps**:
1. Open n8n UI: `http://localhost:5678`
2. Click **"Workflows"** in sidebar
3. Click **"Import from File"** or **"+"** button
4. Select workflow files:
   - `C:\Users\admin2\Desktop\MYCOSOFT\CODE\MAS\mycosoft-mas\n8n\workflows\13_mycobrain_telemetry_forwarder.json`
   - `C:\Users\admin2\Desktop\MYCOSOFT\CODE\MAS\mycosoft-mas\n8n\workflows\14_mycobrain_optical_acoustic_modem.json`
5. Click **"Import"**
6. **Activate workflows** (toggle switch in workflow list)

**Alternative**: Use helper script
```powershell
.\scripts\import-n8n-workflows.ps1
```

**Status**: ⏳ **PENDING** - Requires manual import via UI

---

### 4. Physical MycoBoard Device Testing

#### Browser Testing

**Step 1: Connect Device**
1. Connect MycoBoard via USB
2. Open Device Manager: `http://localhost:3000/natureos/devices`
3. Click **"Scan for Devices"**
4. Select port (e.g., `ttyACM0` or `COM5`)
5. Click **"Connect Side-A"**

**Expected**:
- Device appears in connected list
- Status shows "connected" (green badge)
- Auto-registration message in console
- Device ID displayed

**Step 2: Initialize Machine Mode**
1. Go to **Controls Tab**
2. Find "NDJSON Machine Mode Protocol" card
3. Click **"Initialize Machine Mode"** button

**Expected**:
- Console: `✓ Machine mode initialized`
- Badge shows "Active"
- LED and Buzzer widgets appear

**Step 3: View Peripherals**
1. Go to **Sensors Tab**
2. View "Discovered Peripherals" section

**Expected**:
- BME688 sensors appear (if connected)
- All peripherals show with matching colors
- "Live" badge when data available
- Temperature (orange), Humidity (blue), Pressure (purple)

**Step 4: Test Controls**
1. Go to **Controls Tab**
2. Test LED Control Widget
3. Test Buzzer Control Widget

**Expected**:
- Device responds to commands
- Console shows success messages

**Step 5: View Analytics**
1. Go to **Analytics Tab**
2. View MINDEX Integration Widget
3. View Telemetry Chart Widget

**Expected**:
- Device registration details visible
- Telemetry record count updates
- Charts show real-time data

#### Terminal Verification

**Check Device Connection**:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/mycobrain/devices"
Invoke-RestMethod -Uri "http://localhost:8003/devices"
```

**Check Registration**:
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/mindex/devices?device_type=mycobrain"
```

**Check Telemetry**:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/mycobrain/ttyACM0/telemetry"
Invoke-RestMethod -Uri "http://localhost:8000/api/mindex/telemetry?device_id=YOUR_DEVICE_ID&limit=5"
```

**Check Peripherals**:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/mycobrain/ttyACM0/peripherals"
```

---

## Test Confirmation Checklist

### Pre-Test ✅
- [x] MINDEX container running and healthy
- [x] All imports verified (no errors)
- [x] Device registration endpoints tested
- [x] All services responding

### Physical Device Test ⏳
- [ ] MycoBoard connected via USB
- [ ] Device appears in Device Manager
- [ ] Auto-registration successful
- [ ] Machine mode initialized
- [ ] Peripherals discovered and showing data
- [ ] Controls responding (LED, Buzzer)
- [ ] Telemetry streaming to MINDEX
- [ ] Data visible in Analytics tab

### n8n Workflows ⏳
- [ ] Workflows imported via UI
- [ ] Telemetry Forwarder activated
- [ ] Optical/Acoustic Modem activated
- [ ] Workflows executing successfully

---

## Quick Reference

### Access Points
- **Device Manager**: `http://localhost:3000/natureos/devices`
- **MINDEX Dashboard**: `http://localhost:3000/natureos/mindex`
- **n8n UI**: `http://localhost:5678`

### API Endpoints
- **MINDEX Health**: `http://localhost:8000/health`
- **Device Registration**: `http://localhost:3000/api/mycobrain/{port}/register`
- **Peripheral Scan**: `http://localhost:3000/api/mycobrain/{port}/peripherals`
- **Machine Mode**: `http://localhost:3000/api/mycobrain/{port}/machine-mode`

### Workflow Files
- **Telemetry Forwarder**: `n8n/workflows/13_mycobrain_telemetry_forwarder.json`
- **Modem Control**: `n8n/workflows/14_mycobrain_optical_acoustic_modem.json`

---

## Troubleshooting

### Device Not Connecting
```powershell
# Check MycoBrain service
Invoke-RestMethod -Uri "http://localhost:8003/health"
Invoke-RestMethod -Uri "http://localhost:8003/devices"

# Clear port locks
Invoke-RestMethod -Uri "http://localhost:3000/api/mycobrain/ports/clear-locks" -Method POST

# Restart service
docker compose -f docker-compose.always-on.yml restart mycobrain
```

### Peripherals Not Showing
1. Ensure machine mode is initialized
2. Check console for peripheral scan messages
3. Verify device has I2C sensors connected
4. Try manual scan: Click "Rescan" in Sensors tab

### Registration Failing
```powershell
# Test direct MINDEX registration
$test = @{device_id="test";device_type="mycobrain"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8000/api/mindex/devices/register" `
    -Method POST -Body $test -ContentType "application/json"

# Verify in MINDEX
Invoke-RestMethod -Uri "http://localhost:8000/api/mindex/devices"
```

---

## Expected Test Results

### ✅ Successful Test Should Show:

1. **Device Connection**:
   - Device appears in Device Manager
   - Status: "connected" (green)
   - Auto-registration successful

2. **Machine Mode**:
   - Initialization successful
   - Status badge: "Active"
   - Widgets appear (LED, Buzzer, Communication)

3. **Peripherals**:
   - BME688 sensors discovered
   - Data displaying in colored cards
   - "Live" badge visible
   - Auto-rescan working (every 5 seconds)

4. **Telemetry**:
   - Real-time data in charts
   - Data ingested to MINDEX
   - Record count increasing

5. **Controls**:
   - LED responds to commands
   - Buzzer responds to commands
   - Console shows success messages

6. **MINDEX Integration**:
   - Device registered
   - Telemetry records present
   - Stats updated

---

**Status**: ✅ **SYSTEM READY - AWAITING PHYSICAL DEVICE TEST**

All services verified. All endpoints tested. Ready for physical MycoBoard connection.

*Last Updated: December 30, 2024*
