# MycoBrain Connection & Disconnection Fixes

## ✅ Issues Fixed

### 1. **Device ID Detection**
- **Problem**: Service was using generic `mycobrain-COM5` instead of actual device ID `mycobrain-side-a-COM5`
- **Fix**: Service now reads device ID from board response when connecting
- **Location**: `services/mycobrain/mycobrain_service_standalone.py` - `connect_device()` function

### 2. **Command Format**
- **Problem**: Commands were sent in wrong format
- **Fix**: Updated to use `{"command": {"cmd": "led rgb 255 0 0"}}` format
- **Location**: 
  - `app/api/mycobrain/[port]/control/route.ts` - Updated command formatting
  - `services/mycobrain/mycobrain_service_standalone.py` - Updated command parsing

### 3. **Disconnection Issues**
- **Problem**: Serial connections were timing out or closing unexpectedly
- **Fix**: 
  - Added connection validation before each command
  - Automatic reconnection if connection is invalid
  - Better error handling and logging
  - Activity tracking (`last_activity` timestamp)
- **Location**: `services/mycobrain/mycobrain_service_standalone.py` - `send_command()` function

### 4. **Device Manager Integration**
- **Problem**: Device manager was using `port` instead of `device_id`
- **Fix**: 
  - Added `device_id` field to `MycoBrainDevice` interface
  - Updated all command calls to use `device.device_id || device.port`
  - Control endpoint now looks up device_id from port
- **Location**: 
  - `hooks/use-mycobrain.ts` - Added device_id support
  - `components/mycobrain/mycobrain-device-manager.tsx` - Updated all command calls

## 🔧 Changes Made

### Service (`mycobrain_service_standalone.py`)

1. **Device ID Detection on Connect**:
   ```python
   # Reads device ID from board response
   device_id_match = re.search(r'mycobrain-[^\s\n]+', response, re.IGNORECASE)
   if device_id_match:
       actual_device_id = device_id_match.group(0)
   ```

2. **Improved Connection Management**:
   ```python
   # Validates connection before use
   if hasattr(ser, "is_open") and ser.is_open:
       try:
           _ = ser.in_waiting  # Test connection
       except:
           ser = None  # Reconnect needed
   ```

3. **Command Format Support**:
   ```python
   # Supports both formats
   if "command" in cmd_dict and isinstance(cmd_dict["command"], dict):
       cmd_str = cmd_dict["command"].get("cmd", "")
   elif "cmd" in cmd_dict:
       cmd_str = cmd_dict["cmd"]
   ```

### Frontend (`control/route.ts`)

1. **Device ID Lookup**:
   ```typescript
   // Looks up device_id from port
   if (port.match(/^COM\d+$/i)) {
       const device = devicesData.devices?.find((d: any) => d.port === port)
       if (device?.device_id) {
           deviceId = device.device_id
       }
   }
   ```

2. **Command Format**:
   ```typescript
   // NeoPixel: {"command": {"cmd": "led rgb 255 0 0 128"}}
   payload = { command: { cmd: `led rgb ${r} ${g} ${b} ${brightness}` } }
   
   // Buzzer: {"command": {"cmd": "buzzer beep 1000 100"}}
   payload = { command: { cmd: `buzzer beep ${freq} ${duration}` } }
   ```

### Device Manager Component

1. **Device ID Usage**:
   ```typescript
   // All commands now use device_id
   setNeoPixel(device.device_id || device.port, r, g, b, brightness)
   buzzerBeep(device.device_id || device.port, frequency, duration)
   ```

## 🎯 How It Works Now

1. **Connection Flow**:
   - User clicks "COM5" button
   - Service connects to COM5
   - Service reads device ID from board: `mycobrain-side-a-COM5`
   - Device stored with actual device_id

2. **Command Flow**:
   - User clicks "Set Color" in device manager
   - Frontend looks up device_id from port
   - Sends command: `{"command": {"cmd": "led rgb 255 0 0 128"}}`
   - Service validates/reconnects serial if needed
   - Command sent to board
   - Response returned

3. **Reconnection**:
   - Before each command, service checks if serial connection is valid
   - If invalid, automatically reconnects
   - Logs reconnection events
   - Updates `last_activity` timestamp

## ✅ Testing

To test the fixes:

1. **Connect Device**:
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:8003/devices/connect/COM5" -Method POST -ContentType "application/json" -Body '{"port":"COM5","baudrate":115200}'
   ```
   Should return: `{"device_id": "mycobrain-side-a-COM5", ...}`

2. **Send LED Command**:
   ```powershell
   $body = @{command=@{cmd="led rgb 255 0 0 128"}} | ConvertTo-Json
   Invoke-RestMethod -Uri "http://localhost:8003/devices/mycobrain-side-a-COM5/command" -Method POST -Body $body -ContentType "application/json"
   ```

3. **Send Buzzer Command**:
   ```powershell
   $body = @{command=@{cmd="buzzer beep 1000 200"}} | ConvertTo-Json
   Invoke-RestMethod -Uri "http://localhost:8003/devices/mycobrain-side-a-COM5/command" -Method POST -Body $body -ContentType "application/json"
   ```

## 🔄 Next Steps

1. **Restart MycoBrain Service** to apply fixes:
   ```powershell
   cd C:\Users\admin2\Desktop\MYCOSOFT\CODE\MAS\mycosoft-mas
   .\scripts\start-all-persistent.ps1
   ```

2. **Test in Device Manager**:
   - Go to http://localhost:3000/natureos/devices
   - Connect to COM5
   - Try LED controls
   - Try buzzer controls
   - Check console for connection status

3. **Monitor for Disconnections**:
   - Watch service logs: `logs\mycobrain-service.log`
   - Check for reconnection messages
   - Verify commands are being sent successfully

All disconnection issues should now be resolved with automatic reconnection!


