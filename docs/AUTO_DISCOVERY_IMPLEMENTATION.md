# MycoBoard Auto-Discovery Implementation

**Date**: December 30, 2024  
**Status**: ✅ **IMPLEMENTED**

## Overview

Implemented continuous automatic device discovery and connection for MycoBoard devices. The system now automatically detects and connects to MycoBoard devices when plugged in via USB-C, regardless of Cursor/IDE state.

---

## Features Implemented

### ✅ Continuous Auto-Scanning (Device Manager)

**Location**: `components/mycobrain/mycobrain-device-manager.tsx`

**Functionality**:
- **Continuous scanning**: Automatically scans for devices every 5 seconds when MycoBrain service is online
- **Auto-connection**: Automatically connects to detected MycoBoard devices
- **Port tracking**: Tracks connected ports to avoid duplicate connections
- **Background operation**: Works independently of Cursor/IDE state
- **Smart detection**: Identifies MycoBoard devices via:
  - USB-C ports (COM ports on Windows, ttyACM/ttyUSB on Linux)
  - Device descriptions (CH340, CP210, FTDI, ESP32, MycoBoard)
  - Service-reported device flags (`is_mycobrain`)

**Implementation Details**:
```typescript
// Continuous auto-scanning effect
useEffect(() => {
  if (serviceStatus !== "online") return
  
  const autoScanAndConnect = async () => {
    // Get currently connected devices
    // Find unconnected MycoBoard devices
    // Auto-connect to first available device
  }
  
  // Initial scan after 2 seconds, then every 5 seconds
  const initialTimeout = setTimeout(autoScanAndConnect, 2000)
  const interval = setInterval(autoScanAndConnect, 5000)
  
  return () => {
    clearTimeout(initialTimeout)
    clearInterval(interval)
  }
}, [serviceStatus, scanning, refresh])
```

**Key Features**:
- ✅ Runs every 5 seconds when service is online
- ✅ Silently attempts connections (doesn't show scanning state)
- ✅ Refreshes device list after successful connection
- ✅ Logs auto-connection events to console
- ✅ Prevents duplicate connections using port tracking

---

## Device Detection Logic

### USB-C / Serial Port Detection

The system detects MycoBoard devices by:

1. **Port Patterns**:
   - Windows: `COM*` (COM3, COM4, COM5, etc.)
   - Linux/WSL: `/dev/ttyACM*`, `/dev/ttyUSB*`
   - Service-reported ports with `is_mycobrain` flag

2. **Device Descriptions**:
   - CH340 (common USB-to-serial chip)
   - CP210 (Silicon Labs USB-to-UART)
   - FTDI (FTDI USB-to-serial)
   - ESP32 (ESP32 development boards)
   - MycoBoard (explicit MycoBoard identification)

3. **Connection Status**:
   - Only attempts connection to unconnected devices
   - Tracks connected ports to avoid duplicates
   - Skips locked ports (in use by other applications)

---

## Auto-Connection Flow

1. **Service Check**: Verifies MycoBrain service is online
2. **Port Scan**: Fetches available serial ports from service
3. **Device Filter**: Identifies MycoBoard-compatible ports
4. **Connection Check**: Verifies device is not already connected
5. **Auto-Connect**: Attempts connection to first available device
6. **Refresh**: Updates device list after successful connection
7. **Logging**: Logs connection events to console

---

## Radio Discovery (Future Enhancement)

**Status**: ⏳ **PENDING**

Planned features for radio-based device discovery:

### LoRa Gateway Discovery
- Scan for LoRa gateway nodes
- Discover devices connected via LoRa network
- Auto-register gateway devices

### Bluetooth Discovery
- Scan for MycoBoard devices via Bluetooth
- Pair and connect to Bluetooth-enabled devices
- Support for BLE (Bluetooth Low Energy)

### WiFi Gateway Discovery
- Discover MycoBoard devices on local network
- Connect via WiFi gateway nodes
- Support for mesh networking

**Implementation Notes**:
- Radio discovery will require additional endpoints in MycoBrain service
- Gateway nodes will need to report connected devices
- Device Manager will need radio discovery UI components

---

## Configuration

### Auto-Scan Interval

**Current**: 5 seconds  
**Location**: `components/mycobrain/mycobrain-device-manager.tsx`

To change the interval, modify:
```typescript
const interval = setInterval(autoScanAndConnect, 5000) // Change 5000 to desired milliseconds
```

### Initial Scan Delay

**Current**: 2 seconds  
**Location**: `components/mycobrain/mycobrain-device-manager.tsx`

To change the delay, modify:
```typescript
const initialTimeout = setTimeout(autoScanAndConnect, 2000) // Change 2000 to desired milliseconds
```

---

## Testing

### Manual Test

1. **Connect MycoBoard via USB-C**
2. **Open Device Manager**: `http://localhost:3000/natureos/devices`
3. **Wait 2-7 seconds**: Device should auto-connect
4. **Check Console**: Should see "✓ Auto-connected to MycoBoard on [port]"
5. **Verify Device**: Device should appear in connected devices list

### Verification Commands

```powershell
# Check connected devices
Invoke-RestMethod -Uri "http://localhost:3000/api/mycobrain/devices"

# Check available ports
Invoke-RestMethod -Uri "http://localhost:3000/api/mycobrain/ports"
```

---

## Troubleshooting

### Device Not Auto-Connecting

**Possible Causes**:
1. MycoBrain service not running
2. Port locked by another application
3. Device not recognized as MycoBoard
4. Connection timeout

**Solutions**:
1. Check service status: `http://localhost:3000/api/mycobrain`
2. Close serial monitors, Arduino IDE, or other applications
3. Check port detection: `http://localhost:3000/api/mycobrain/ports`
4. Increase connection timeout in auto-scan function

### Duplicate Connections

**Prevention**: System tracks connected ports using `connectedPortsRef`

**If duplicates occur**:
1. Check device list: `http://localhost:3000/api/mycobrain/devices`
2. Manually disconnect duplicate devices
3. Refresh Device Manager page

### Service Offline

**Auto-scanning disabled when service is offline**

**To enable**:
1. Start MycoBrain service
2. Verify service health: `http://localhost:8003/health`
3. Auto-scanning will resume automatically

---

## Performance Considerations

### Resource Usage

- **Scan Interval**: 5 seconds (configurable)
- **Network Requests**: 2-3 requests per scan cycle
- **CPU Impact**: Minimal (async operations)
- **Memory**: Low (port tracking in memory)

### Optimization

- Only scans when service is online
- Skips already-connected devices
- Uses abort signals for timeout handling
- Silently fails on errors (doesn't spam console)

---

## Future Enhancements

### Planned Features

1. **Radio Discovery**: LoRa, Bluetooth, WiFi gateway support
2. **Device Prioritization**: Priority-based connection order
3. **Connection Retry**: Automatic retry for failed connections
4. **Device Naming**: Custom device names and aliases
5. **Multi-Device Support**: Simultaneous connection to multiple devices
6. **Connection History**: Track connection/disconnection events
7. **Device Profiles**: Save and restore device configurations

---

## Status Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Continuous Auto-Scanning | ✅ Implemented | Every 5 seconds |
| Auto-Connection | ✅ Implemented | USB-C devices |
| Port Tracking | ✅ Implemented | Prevents duplicates |
| Background Operation | ✅ Implemented | Independent of IDE |
| Radio Discovery | ⏳ Pending | LoRa/Bluetooth/WiFi |
| Gateway Nodes | ⏳ Pending | Multi-hop discovery |

---

**Status**: ✅ **AUTO-DISCOVERY ACTIVE**

MycoBoard devices will now be automatically detected and connected when plugged in via USB-C, regardless of Cursor/IDE state.

*Last Updated: December 30, 2024*
























