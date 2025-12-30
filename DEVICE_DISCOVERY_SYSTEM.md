# Device Discovery System - Complete Integration

**Date:** 2025-12-28

## ✅ Continuous Device Discovery Implemented

A comprehensive device discovery system has been built that continuously scans for MycoBrain devices and integrates with MINDEX and the Mycorrhizae protocol.

### Core Components

#### 1. MycoBrain Service - Continuous Discovery (`services/mycobrain/mycobrain_service.py`)

**Features:**
- ✅ **Continuous Port Scanning** - Scans serial ports every 5 seconds
- ✅ **Auto-Connection** - Automatically connects to MycoBrain-like devices (ESP32-S3, CH340, etc.)
- ✅ **Reconnection Logic** - Automatically reconnects to devices that lose connection
- ✅ **MINDEX Integration** - Registers discovered devices with MINDEX
- ✅ **Device Health Monitoring** - Tracks connection status and device health

**How it works:**
1. Service starts continuous discovery thread on startup
2. Scans all serial ports every 5 seconds
3. Identifies MycoBrain devices by VID/PID and description
4. Auto-connects to new devices
5. Registers devices with MINDEX for persistence
6. Monitors connection health and reconnects as needed

**Device Detection:**
- Detects ESP32-S3 boards (CH340, CH341, CP210, FTDI, SILABS)
- Auto-connects to COM ports (Windows) and /dev/tty* (Linux/Mac)
- Validates connection by checking serial communication

#### 2. Device Discovery API (`/api/devices/discover`)

**Unified Discovery Endpoint:**
- ✅ Combines data from MycoBrain service, MINDEX, and Mycorrhizae protocol
- ✅ Shows all discovered devices (connected and offline)
- ✅ Provides device status, location, and metadata
- ✅ Returns discovery statistics (total, online, offline)

**Data Sources:**
1. **Serial Port Scan** - All available COM/tty ports
2. **MycoBrain Service** - Connected devices with sensor data
3. **MINDEX Registry** - Registered devices with metadata
4. **Mycorrhizae Protocol** - Agent-managed devices via MAS

#### 3. Enhanced Device Telemetry API (`/api/natureos/devices/telemetry`)

**Features:**
- ✅ Fetches from MycoBrain service (real-time sensor data)
- ✅ Includes MINDEX registered devices (persistent registry)
- ✅ Combines and deduplicates devices
- ✅ Returns complete device information with status

**Device Status:**
- `active` - Device is connected and sending data
- `inactive` - Device is registered but not currently connected
- `offline` - Device was discovered but connection failed

#### 4. Updated Dashboard Components

**NatureOS Dashboard:**
- ✅ Shows real connected devices from discovery system
- ✅ Updates every 5 seconds
- ✅ Displays device status correctly (online/offline)
- ✅ Shows device count accurately

**Mycelium Map:**
- ✅ Displays all discovered MycoBrain devices
- ✅ Shows device locations on map
- ✅ Updates device markers in real-time

**Device Manager:**
- ✅ Lists all discovered devices
- ✅ Shows connection status
- ✅ Allows configuration of connected devices

### Integration Points

#### MINDEX Integration
- Devices are automatically registered when discovered
- Device metadata stored in MINDEX database
- Telemetry data linked to device registry
- Location data stored with PostGIS

#### Mycorrhizae Protocol Integration
- Device agents managed through MAS
- Protocol steps can check device status
- Device telemetry used for protocol execution
- Device commands routed through protocol system

### API Endpoints

#### `/api/devices/discover`
**GET** - Unified device discovery endpoint
- Returns all discovered devices from all sources
- Includes discovery statistics
- Shows device status and metadata

#### `/api/natureos/devices/telemetry`
**GET** - Device telemetry with sensor data
- Returns active devices with real-time data
- Includes MINDEX registered devices
- Combines MycoBrain + MINDEX data

#### `/api/mycobrain`
**GET** - MycoBrain service status
- Returns connected devices
- Shows available ports
- Indicates discovery service status

#### `/api/mycobrain/ports`
**GET** - List all serial ports
- Shows all available ports
- Indicates which are MycoBrain-like
- Shows connection status

### Service Requirements

**MycoBrain Service** (`http://localhost:8765`)
```bash
cd services/mycobrain
python mycobrain_service.py
```

**Environment Variables:**
- `MYCOBRAIN_SERVICE_URL` - MycoBrain service URL (default: http://localhost:8765)
- `MINDEX_API_URL` - MINDEX API URL (default: http://localhost:8000)
- `MAS_API_URL` - MAS orchestrator URL (default: http://localhost:8001)

### Device Discovery Flow

1. **Service Startup**
   - Discovery thread starts automatically
   - Initial port scan performed
   - Auto-connects to detected devices

2. **Continuous Scanning** (every 5 seconds)
   - Scans all serial ports
   - Identifies new MycoBrain devices
   - Attempts connection to new devices
   - Monitors existing connections

3. **Device Registration**
   - New devices registered with MINDEX
   - Device metadata stored
   - Location tracked (if available)

4. **Dashboard Updates**
   - Dashboard polls `/api/natureos/devices/telemetry` every 5 seconds
   - Shows all discovered devices
   - Updates connection status in real-time

### Troubleshooting

**Device Not Showing:**
1. Check MycoBrain service is running: `curl http://localhost:8765/health`
2. Check available ports: `curl http://localhost:8765/ports`
3. Verify device is connected via USB
4. Check device appears in Device Manager (Windows) or `ls /dev/tty*` (Linux/Mac)

**Device Shows as Offline:**
1. Check serial port permissions
2. Verify device is not in use by another application
3. Check baud rate matches (115200)
4. Review service logs for connection errors

**Discovery Not Working:**
1. Verify discovery thread is running: Check service logs for "[Discovery]" messages
2. Check MINDEX is accessible (if using registry)
3. Verify MAS is running (if using Mycorrhizae protocol)

### Files Modified

1. `services/mycobrain/mycobrain_service.py` - Added continuous discovery
2. `app/api/natureos/devices/telemetry/route.ts` - Enhanced with MINDEX integration
3. `app/api/mycobrain/route.ts` - Added health check and port info
4. `app/api/devices/discover/route.ts` - New unified discovery endpoint
5. `components/dashboard/natureos-dashboard.tsx` - Updated device detection
6. `components/maps/mycelium-map.tsx` - Updated to use telemetry API

### Next Steps

1. **Start MycoBrain Service:**
   ```bash
   python services/mycobrain/mycobrain_service.py
   ```

2. **Verify Discovery:**
   - Check service logs for "[Discovery]" messages
   - Visit `/api/devices/discover` to see all devices
   - Check dashboard shows devices correctly

3. **Monitor Devices:**
   - Dashboard updates every 5 seconds
   - Device manager shows all discovered devices
   - Map displays device locations

The device discovery system is now fully integrated with MINDEX and the Mycorrhizae protocol, providing continuous device detection and management for the Mycosoft ecosystem.










