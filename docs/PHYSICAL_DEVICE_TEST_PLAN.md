# Physical MycoBoard Device Test Plan

**Date**: December 30, 2024  
**Status**: ✅ **READY FOR TESTING**

## Pre-Test Checklist

### ✅ System Status
- [x] MINDEX container running and healthy
- [x] MycoBrain service running (port 8003)
- [x] Website running (port 3000)
- [x] n8n running (port 5678)
- [x] MAS Orchestrator running (port 8001)

### ✅ Services Verified
- [x] MINDEX health check passing
- [x] Device registration endpoints working
- [x] Telemetry ingestion working
- [x] Peripheral discovery working

---

## Test Procedure

### Step 1: Verify MINDEX Container ✅

**Command**:
```powershell
docker ps --filter "name=mindex"
docker logs mycosoft-always-on-mindex-1 --tail 20
Invoke-RestMethod -Uri "http://localhost:8000/health"
```

**Expected Result**:
- Container status: `Up (healthy)`
- Health endpoint: `{"status": "healthy", "api": true, "database": true}`
- No import errors in logs

**Status**: ✅ **VERIFIED**

---

### Step 2: Connect Physical MycoBoard Device

**Hardware Setup**:
1. Connect MycoBoard via USB to computer
2. Device should appear as COM port (Windows) or `/dev/ttyACM0` (Linux)
3. Power on device (if not auto-powered)

**Browser Steps**:
1. Open Device Manager: `http://localhost:3000/natureos/devices`
2. Click "Scan for Devices" button
3. Select available port (e.g., `ttyACM0` or `COM5`)
4. Click "Connect Side-A" or "Connect Side-B"

**Expected Result**:
- Device appears in connected devices list
- Status shows "connected"
- Device ID is displayed
- Auto-registration message appears in console

**Verification Command**:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/mycobrain/devices"
Invoke-RestMethod -Uri "http://localhost:8000/api/mindex/devices?device_type=mycobrain"
```

---

### Step 3: Test Device Registration

**Automatic Registration**:
- Device should auto-register when connected
- Registration happens via `/api/mycobrain/{port}/register`

**Manual Registration Test**:
```powershell
$reg = @{
    device_id = "mycoboard-001"
    port = "ttyACM0"
    serial_number = "MB001"
    firmware_version = "1.0.0"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/mycobrain/ttyACM0/register" `
    -Method POST -Body $reg -ContentType "application/json"
```

**Expected Result**:
```json
{
  "success": true,
  "port": "ttyACM0",
  "device_id": "mycoboard-001",
  "registrations": {
    "mindex": {"status": "registered"},
    "natureos": {"status": "registered"},
    "mas": {"status": "registered"}
  }
}
```

**Verify in MINDEX**:
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/mindex/devices?device_type=mycobrain"
```

---

### Step 4: Initialize Machine Mode

**Browser Steps**:
1. Go to **Controls Tab** in Device Manager
2. Find "NDJSON Machine Mode Protocol" card
3. Click **"Initialize Machine Mode"** button
4. Check console for success message

**Expected Console Output**:
```
> Initializing machine mode...
✓ Machine mode initialized
✓ Peripheral scan triggered
```

**Verification**:
- Machine mode status badge shows "Active"
- LED Control Widget appears
- Buzzer Control Widget appears
- Communication Panel appears

---

### Step 5: Test Peripheral Discovery

**Browser Steps**:
1. Go to **Sensors Tab**
2. Wait for "Discovered Peripherals" section to load
3. Peripherals should appear automatically

**Expected Result**:
- BME688 sensors appear (if connected)
- All peripherals show with matching UI/UX colors
- "Live" badge appears when data is available
- Data displays in colored cards (orange temp, blue humidity, purple pressure)

**Verification Command**:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/mycobrain/ttyACM0/peripherals"
```

**Expected Response**:
```json
{
  "port": "ttyACM0",
  "peripherals": [
    {
      "address": "0x76",
      "type": "bme688",
      "widget": {
        "widget": "environmental_sensor",
        "icon": "thermometer",
        "telemetryFields": ["temperature", "humidity", "pressure", "iaq"]
      }
    }
  ],
  "count": 2
}
```

---

### Step 6: Test Telemetry Streaming

**Browser Steps**:
1. Go to **Analytics Tab**
2. View "Telemetry Chart Widget"
3. Data should update in real-time

**Expected Result**:
- Chart shows sensor data over time
- Temperature, humidity, pressure values visible
- Data auto-ingested to MINDEX

**Verification Command**:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/mycobrain/ttyACM0/telemetry"
Invoke-RestMethod -Uri "http://localhost:8000/api/mindex/telemetry?device_id=mycoboard-001&limit=5"
```

---

### Step 7: Import n8n Workflows

**Browser Steps**:
1. Open n8n UI: `http://localhost:5678`
2. Click **"Workflows"** in sidebar
3. Click **"Import from File"** or **"+"** button
4. Select workflow file:
   - `n8n/workflows/13_mycobrain_telemetry_forwarder.json`
   - `n8n/workflows/14_mycobrain_optical_acoustic_modem.json`
5. Click **"Import"**
6. Activate workflow (toggle switch)

**Workflow 1: Telemetry Forwarder**
- **Purpose**: Scheduled telemetry forwarding to MINDEX
- **Schedule**: Every 5 minutes (configurable)
- **Actions**: Fetches devices → Gets telemetry → Forwards to MINDEX

**Workflow 2: Optical/Acoustic Modem**
- **Purpose**: Webhook-triggered modem control
- **Endpoint**: `/webhook/mycobrain/modem`
- **Actions**: Receives command → Sends to device → Logs to MINDEX

**Verification**:
- Workflows appear in n8n UI
- Status shows "Active"
- No errors in workflow execution log

---

### Step 8: Test Controls

**LED Control**:
1. Go to **Controls Tab**
2. Find "LED Control Widget"
3. Test color picker, brightness slider
4. Test preset colors

**Buzzer Control**:
1. Find "Buzzer Control Widget"
2. Test beep button
3. Test melody button
4. Test frequency slider

**Expected Result**:
- Device responds to commands
- Console shows success messages
- Visual/audio feedback from device

---

### Step 9: Test Communication Panel

**Browser Steps**:
1. Go to **Communication Tab**
2. Find "Communication Panel"
3. Test optical modem transmission
4. Test acoustic modem transmission

**Expected Result**:
- Commands sent successfully
- Transmission logged to MINDEX
- Console shows confirmation

---

### Step 10: Verify MINDEX Data

**Browser Steps**:
1. Go to **Analytics Tab**
2. View "MINDEX Integration Widget"
3. Check telemetry record count
4. View device registration details

**Verification Commands**:
```powershell
# Check MINDEX stats
Invoke-RestMethod -Uri "http://localhost:8000/api/mindex/stats"

# Check registered devices
Invoke-RestMethod -Uri "http://localhost:8000/api/mindex/devices?device_type=mycobrain"

# Check telemetry records
Invoke-RestMethod -Uri "http://localhost:8000/api/mindex/telemetry?device_id=mycoboard-001&limit=10"
```

**Expected Result**:
- Device appears in MINDEX device registry
- Telemetry records present
- Stats show correct counts

---

## Terminal Test Commands

### Complete Test Sequence

```powershell
# 1. Check all services
Write-Host "`n=== SERVICE HEALTH CHECKS ===" -ForegroundColor Cyan
Invoke-RestMethod -Uri "http://localhost:8000/health"  # MINDEX
Invoke-RestMethod -Uri "http://localhost:8003/health"  # MycoBrain
Invoke-RestMethod -Uri "http://localhost:3000/api/services/status"  # Website
Invoke-RestMethod -Uri "http://localhost:5678/healthz"  # n8n
Invoke-RestMethod -Uri "http://localhost:8001/health"  # MAS

# 2. Test device registration
Write-Host "`n=== DEVICE REGISTRATION TEST ===" -ForegroundColor Cyan
$device = @{
    device_id = "mycoboard-physical-test"
    port = "ttyACM0"
    serial_number = "MB-PHYSICAL-001"
    firmware_version = "1.0.0"
} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/mycobrain/ttyACM0/register" `
    -Method POST -Body $device -ContentType "application/json"

# 3. Verify registration
Write-Host "`n=== VERIFY REGISTRATION ===" -ForegroundColor Cyan
Invoke-RestMethod -Uri "http://localhost:8000/api/mindex/devices?device_type=mycobrain"

# 4. Test telemetry ingestion
Write-Host "`n=== TELEMETRY TEST ===" -ForegroundColor Cyan
$telemetry = @{
    source = "mycobrain"
    device_id = "mycoboard-physical-test"
    timestamp = (Get-Date).ToISOString()
    data = @{
        temperature = 25.5
        humidity = 60.0
        pressure = 1013.25
    }
} | ConvertTo-Json -Depth 3
Invoke-RestMethod -Uri "http://localhost:8000/api/mindex/telemetry" `
    -Method POST -Body $telemetry -ContentType "application/json"

# 5. Check MINDEX data
Write-Host "`n=== MINDEX DATA CHECK ===" -ForegroundColor Cyan
Invoke-RestMethod -Uri "http://localhost:8000/api/mindex/stats"
Invoke-RestMethod -Uri "http://localhost:8000/api/mindex/telemetry?device_id=mycoboard-physical-test&limit=5"
```

---

## Browser Test Checklist

### Device Manager (`http://localhost:3000/natureos/devices`)

- [ ] Device appears in device list after connection
- [ ] Status shows "connected" (green badge)
- [ ] Device ID is displayed correctly
- [ ] Auto-registration message appears in console

### Sensors Tab
- [ ] "Discovered Peripherals" section appears
- [ ] BME688 sensors show with data (if connected)
- [ ] All peripherals use matching UI/UX colors
- [ ] "Live" badge appears when data available
- [ ] Temperature shows in orange card
- [ ] Humidity shows in blue card
- [ ] Pressure shows in purple card
- [ ] IAQ shows with color-coded badge

### Controls Tab
- [ ] Machine Mode status card appears
- [ ] "Initialize Machine Mode" button works
- [ ] Machine mode badge shows "Active" after init
- [ ] LED Control Widget appears when machine mode active
- [ ] Buzzer Control Widget appears when machine mode active
- [ ] Controls respond to user input

### Communication Tab
- [ ] Communication Panel appears
- [ ] Optical modem controls work
- [ ] Acoustic modem controls work
- [ ] Transmission logs appear

### Analytics Tab
- [ ] MINDEX Integration Widget appears
- [ ] Telemetry Chart Widget shows data
- [ ] Device registration details visible
- [ ] Telemetry record count updates

### Diagnostics Tab
- [ ] Run Diagnostics button works
- [ ] Port status shows correctly
- [ ] Service management buttons work
- [ ] No machine mode controls (moved to Controls)

---

## n8n Workflow Import

### Manual Import Steps

1. **Open n8n UI**: `http://localhost:5678`
2. **Navigate to Workflows**
3. **Click "Import from File"**
4. **Select files**:
   - `C:\Users\admin2\Desktop\MYCOSOFT\CODE\MAS\mycosoft-mas\n8n\workflows\13_mycobrain_telemetry_forwarder.json`
   - `C:\Users\admin2\Desktop\MYCOSOFT\CODE\MAS\mycosoft-mas\n8n\workflows\14_mycobrain_optical_acoustic_modem.json`
5. **Activate workflows** (toggle switch)

### Workflow Verification

**Telemetry Forwarder**:
- Schedule trigger configured
- Fetches devices from MycoBrain service
- Forwards telemetry to MINDEX
- Error handling in place

**Optical/Acoustic Modem**:
- Webhook endpoint configured
- Sends commands to MycoBrain service
- Logs transmission to MINDEX
- Response handling in place

---

## Expected Results Summary

### ✅ MINDEX Container
- Status: Healthy
- Database: Connected
- API: Responding
- No import errors

### ✅ Device Registration
- Auto-registration on connect: Working
- MINDEX registration: Success
- NatureOS registration: Success
- MAS registration: Success

### ✅ Peripheral Discovery
- Dynamic display: Working
- Data mapping: Working
- UI/UX colors: Matching
- Auto-rescan: Every 5 seconds

### ✅ Machine Mode
- Initialization: Working
- Status tracking: Working
- Widget visibility: Conditional
- Controls location: Correct

### ✅ n8n Workflows
- Import: Manual (via UI)
- Activation: Manual (toggle)
- Execution: Automatic (scheduled/webhook)

---

## Troubleshooting

### MINDEX Container Issues
```powershell
# Check logs
docker logs mycosoft-always-on-mindex-1 --tail 100

# Restart container
docker compose -f docker-compose.always-on.yml restart mindex

# Rebuild if needed
docker compose -f docker-compose.always-on.yml up -d --build mindex
```

### Device Connection Issues
```powershell
# Check MycoBrain service
Invoke-RestMethod -Uri "http://localhost:8003/health"
Invoke-RestMethod -Uri "http://localhost:8003/devices"

# Check port locks
Invoke-RestMethod -Uri "http://localhost:3000/api/mycobrain/ports/clear-locks" -Method POST

# Restart MycoBrain service
docker compose -f docker-compose.always-on.yml restart mycobrain
```

### Registration Issues
```powershell
# Test direct MINDEX registration
$test = @{device_id="test";device_type="mycobrain"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8000/api/mindex/devices/register" `
    -Method POST -Body $test -ContentType "application/json"

# Verify device in MINDEX
Invoke-RestMethod -Uri "http://localhost:8000/api/mindex/devices"
```

---

## Test Confirmation

After completing all tests, verify:

1. ✅ MINDEX container fully started (no import errors)
2. ✅ Device registration working (auto + manual)
3. ✅ n8n workflows imported and active
4. ✅ Physical device connected and responding
5. ✅ All peripherals showing data
6. ✅ Telemetry streaming to MINDEX
7. ✅ Controls working (LED, Buzzer, Modems)
8. ✅ Machine mode initialized
9. ✅ Data visible in NatureOS tools/explorer

---

**Status**: ✅ **READY FOR PHYSICAL DEVICE TESTING**

*Last Updated: December 30, 2024*
