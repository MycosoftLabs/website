# MycoBrain Device Integration Fix

## ✅ Completed Changes

### 1. **Removed Fake Devices from Overview**
- Overview → Devices tab now **only shows real devices** from APIs
- Uses `useRealDevices()` hook which fetches from:
  - `/api/natureos/devices/telemetry` (MycoBrain + MINDEX devices)
  - `/api/mycobrain` (MycoBrain service directly)
- **No hardcoded or sample devices** - all data comes from real services

### 2. **MycoBrain Service Running**
- Service: `mycobrain_service_standalone.py`
- Port: **8003**
- Status: Running and monitored by watchdog
- Location: `C:\Users\admin2\Desktop\MYCOSOFT\CODE\MAS\mycosoft-mas\services\mycobrain\`

### 3. **COM5 Device Connection**
- **Port**: COM5 (USB-C)
- **Device**: MycoBrain board
- **Note**: Port may be locked by debugging agent - close agent to connect

### 4. **Updated API Endpoints**
- Device Discovery API: Now uses port **8003** (was 8765)
- Device Telemetry API: Now uses port **8003** (was 8765)
- Default connection port: Changed from COM4 to **COM5**

### 5. **Service Status Indicator**
- Device Network page (`/natureos/devices/network`) now shows:
  - MycoBrain Service (Python) status
  - Green checkmark when online
  - Red exclamation when offline
  - Instructions to start service if offline

## 📍 Device Locations

### Overview → Devices Tab
- **URL**: http://localhost:3000/natureos (Devices tab)
- **Shows**: Only real devices from MycoBrain service and MINDEX
- **Updates**: Every 5 seconds
- **No fake devices**: All removed

### Infrastructure → Device Network
- **URL**: http://localhost:3000/natureos/devices/network
- **Shows**: 
  - Service status (MycoBrain Python service)
  - All discovered devices
  - Connection status
- **Features**: Scan button, service status indicator

## 🔧 How to Connect COM5 Device

### Via Website UI:
1. Go to **http://localhost:3000/natureos/devices**
2. Click "Scan for Devices" button
3. Or use quick connect to COM5

### Via API:
```powershell
Invoke-RestMethod -Uri "http://localhost:8003/devices/connect/COM5" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"port":"COM5","baudrate":115200}'
```

### Via Script:
```powershell
cd C:\Users\admin2\Desktop\MYCOSOFT\CODE\MAS\mycosoft-mas
.\scripts\connect-com5.ps1
```

## ⚠️ Troubleshooting

### Port Locked Error
If you see "Port is locked or in use":
- Close the debugging agent
- Close Arduino IDE serial monitor
- Close any other serial port applications
- Then try connecting again

### Service Not Running
If service shows as offline:
1. Check if service is running:
   ```powershell
   Get-Process python | Where-Object { $_.CommandLine -like "*mycobrain*" }
   ```
2. Start service:
   ```powershell
   cd C:\Users\admin2\Desktop\MYCOSOFT\CODE\MAS\mycosoft-mas
   python services\mycobrain\mycobrain_service_standalone.py
   ```
3. Or use startup script:
   ```powershell
   .\scripts\start-all-persistent.ps1
   ```

### No Devices Showing
- Make sure MycoBrain service is running (port 8003)
- Check device is connected via USB-C to COM5
- Verify device is powered on
- Try scanning from Device Manager page

## 📊 Service Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service health check |
| `/devices` | GET | List connected devices |
| `/ports` | GET | List available serial ports |
| `/devices/connect/{port}` | POST | Connect to device on port |
| `/devices/{device_id}/status` | GET | Get device status |
| `/devices/{device_id}/telemetry` | GET | Get device telemetry |
| `/devices/{device_id}/command` | POST | Send command to device |

## ✅ Verification

To verify everything is working:
1. **Service Status**: http://localhost:8003/health
2. **Connected Devices**: http://localhost:8003/devices
3. **Overview Devices**: http://localhost:3000/natureos (Devices tab)
4. **Device Network**: http://localhost:3000/natureos/devices/network

All should show only **real devices** - no fake/sample data!



























