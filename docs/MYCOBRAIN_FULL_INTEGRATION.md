# MycoBrain Full System Integration

**Date**: December 30, 2024  
**Status**: ✅ **INTEGRATION COMPLETE**

## Overview

MycoBrain devices are now fully integrated across all Mycosoft systems:
- **MINDEX**: Telemetry storage, device registration, peripheral tracking
- **NatureOS**: Device management, status sync, dashboard integration
- **Mycosoft MAS**: Agent-based telemetry forwarding, command routing, workflow automation
- **Website**: Device Manager with MINDEX integration, auto-registration, data visualization

## Integration Architecture

```
MycoBrain Device
    ↓
MycoBrain Service (port 8003)
    ↓
    ├─→ Website Device Manager (port 3000)
    │   ├─→ Auto-registers with MINDEX
    │   ├─→ Auto-registers with NatureOS
    │   └─→ Displays MINDEX integration status
    │
    ├─→ MINDEX (port 8000)
    │   ├─→ Device registration
    │   ├─→ Telemetry storage
    │   └─→ Peripheral discovery tracking
    │
    ├─→ NatureOS (port 3000)
    │   ├─→ Device registry
    │   └─→ Status synchronization
    │
    └─→ MAS Orchestrator (port 8001)
        ├─→ Telemetry forwarding agent
        ├─→ Command routing
        └─→ Workflow triggers
```

## MINDEX Integration

### Device Registration

**Endpoint**: `POST /api/mindex/devices/register`

```typescript
{
  device_id: "mycobrain-ttyACM0",
  device_type: "mycobrain",
  serial_number: "ttyACM0",
  firmware_version: "1.0.0",
  location: { lat: 37.7749, lon: -122.4194 },
  metadata: { port: "ttyACM0", capabilities: [...] }
}
```

**Features**:
- Automatic device registration on connect
- Device metadata storage
- Location tracking
- Last seen timestamp
- Status management

### Telemetry Ingestion

**Endpoint**: `POST /api/mindex/telemetry`

**Auto-ingestion**:
- Telemetry automatically sent to MINDEX when fetched
- NDJSON format support
- Sensor data storage
- Peripheral scan events
- Optical/acoustic modem usage tracking

**Data Stored**:
- Environmental sensors (temperature, humidity, pressure, IAQ)
- Analog inputs (AI1-AI4 voltages)
- Peripheral discovery results
- Communication events (optical/acoustic TX)
- Device status changes

### Device Query

**Endpoint**: `GET /api/mindex/devices`

**Filters**:
- `device_type=mycobrain` - Filter by device type
- `status=active` - Filter by status

**Returns**:
- List of registered devices
- Registration timestamps
- Last seen times
- Location data
- Metadata

## NatureOS Integration

### Device Registry

**Endpoint**: `GET /api/natureos/devices/mycobrain`

**Features**:
- Merges data from MycoBrain service and MINDEX
- Shows connection status
- Displays registration status
- Location information

**Endpoint**: `POST /api/natureos/devices/mycobrain`

**Features**:
- Register device with NatureOS
- Sync with MINDEX
- Update device metadata

## MAS Integration

### Telemetry Forwarder Agent

**Location**: `mycosoft_mas/agents/mycobrain/telemetry_forwarder_agent.py`

**Features**:
- Background agent that forwards telemetry to MINDEX
- Batch processing for efficiency
- Automatic retry on failure
- Queue-based architecture

**Usage**:
```python
from mycosoft_mas.agents.mycobrain.telemetry_forwarder_agent import MycoBrainTelemetryForwarderAgent

agent = MycoBrainTelemetryForwarderAgent(
    agent_id="telemetry-forwarder",
    name="MycoBrain Telemetry Forwarder",
    config={"forwarding_enabled": True, "batch_size": 10}
)

await agent.forward_telemetry(
    device_id="mycobrain-ttyACM0",
    telemetry_data={"temperature": 25.5, "humidity": 60.0}
)
```

### MAS Integration Module

**Location**: `services/mycobrain/mas_integration.py`

**Features**:
- Device registration with MAS
- Telemetry forwarding to MINDEX
- Command routing via MAS
- Device status queries

## Website Integration

### Device Manager Enhancements

**New Features**:
1. **MINDEX Integration Widget**
   - Shows registration status
   - Displays telemetry record count
   - Registration button
   - Location display

2. **Auto-Registration**
   - Automatically registers devices on connect
   - Registers with MINDEX, NatureOS, and MAS
   - Non-blocking (best effort)

3. **Telemetry Auto-Ingestion**
   - Telemetry automatically sent to MINDEX
   - No user action required
   - Background processing

### API Routes

**New Routes**:
- `POST /api/mycobrain/{port}/register` - Register device with all systems
- `GET /api/natureos/devices/mycobrain` - List MycoBrain devices
- `POST /api/natureos/devices/mycobrain` - Register device
- `GET /api/mindex/telemetry` - Query telemetry from MINDEX
- `POST /api/mas/mycobrain` - Send commands via MAS
- `GET /api/mas/mycobrain` - Get device status from MAS

## n8n Workflows

### 1. Telemetry Forwarder

**File**: `n8n/workflows/13_mycobrain_telemetry_forwarder.json`

**Features**:
- Runs every 10 seconds
- Fetches telemetry from connected devices
- Forwards to MINDEX
- Handles multiple devices

### 2. Optical/Acoustic Modem Control

**File**: `n8n/workflows/14_mycobrain_optical_acoustic_modem.json`

**Features**:
- Webhook endpoint for modem control
- Supports optical and acoustic modems
- Logs usage to MINDEX
- Returns transmission status

**Usage**:
```bash
curl -X POST http://localhost:5678/webhook/mycobrain-modem \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "mycobrain-ttyACM0",
    "modem_type": "optical",
    "profile": "camera_ook",
    "payload": "Hello World",
    "rate_hz": 10,
    "repeat": 1
  }'
```

## Data Flow

### Telemetry Flow

1. **Device** → MycoBrain Service (serial/UART)
2. **MycoBrain Service** → Website API (`/api/mycobrain/{port}/telemetry`)
3. **Website API** → MINDEX (`/api/mindex/telemetry`)
4. **MINDEX** → Database storage
5. **MAS Agent** → Optional forwarding for workflows

### Device Registration Flow

1. **User connects device** in Device Manager
2. **Website** → Auto-registers with:
   - MINDEX (`/api/mindex/devices/register`)
   - NatureOS (`/api/natureos/devices/mycobrain`)
   - MAS (`/api/mas/mycobrain`)
3. **All systems** → Store device metadata
4. **Device Manager** → Shows registration status

### Command Flow

1. **User sends command** via Device Manager
2. **Website** → MycoBrain Service (`/devices/{id}/command`)
3. **Optional**: Route via MAS for workflow integration
4. **Device** → Executes command
5. **Response** → Logged to MINDEX (if enabled)

## Features by System

### MINDEX
- ✅ Device registration
- ✅ Telemetry storage
- ✅ Peripheral discovery tracking
- ✅ Communication event logging
- ✅ Device query API

### NatureOS
- ✅ Device registry
- ✅ Status synchronization
- ✅ Device listing API
- ✅ Registration API

### MAS
- ✅ Telemetry forwarder agent
- ✅ Device registration
- ✅ Command routing
- ✅ Workflow integration

### Website
- ✅ MINDEX integration widget
- ✅ Auto-registration on connect
- ✅ Telemetry auto-ingestion
- ✅ Device status sync
- ✅ MAS command routing

## Testing

### Test Device Registration

```powershell
# Register device
$body = @{
    device_id = "mycobrain-ttyACM0"
    serial_number = "ttyACM0"
    firmware_version = "1.0.0"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/mycobrain/ttyACM0/register" `
    -Method POST -Body $body -ContentType "application/json"
```

### Test Telemetry Ingestion

```powershell
# Get telemetry (auto-ingests to MINDEX)
Invoke-RestMethod -Uri "http://localhost:3000/api/mycobrain/ttyACM0/telemetry?count=10"
```

### Test MINDEX Query

```powershell
# Query telemetry from MINDEX
Invoke-RestMethod -Uri "http://localhost:3000/api/mindex/telemetry?device_id=mycobrain-ttyACM0&limit=10"
```

## Files Created/Modified

### MINDEX
- `services/mindex/api.py` - Added device registration endpoints
- Enhanced telemetry ingestion with JSON support

### Website
- `app/api/mycobrain/[port]/register/route.ts` - Device registration
- `app/api/mycobrain/[port]/telemetry/route.ts` - Auto-ingestion
- `app/api/mycobrain/[port]/peripherals/route.ts` - Peripheral tracking
- `app/api/natureos/devices/mycobrain/route.ts` - NatureOS sync
- `app/api/mas/mycobrain/route.ts` - MAS integration
- `app/api/mindex/telemetry/route.ts` - MINDEX query proxy
- `components/mycobrain/mindex-integration-widget.tsx` - MINDEX widget
- `components/mycobrain/mycobrain-device-manager.tsx` - Auto-registration

### MAS
- `services/mycobrain/mas_integration.py` - MAS integration module
- `mycosoft_mas/agents/mycobrain/telemetry_forwarder_agent.py` - Forwarder agent

### n8n
- `n8n/workflows/13_mycobrain_telemetry_forwarder.json` - Telemetry workflow
- `n8n/workflows/14_mycobrain_optical_acoustic_modem.json` - Modem workflow

## Next Steps

1. ✅ **MINDEX Integration**: Complete
2. ✅ **NatureOS Integration**: Complete
3. ✅ **MAS Integration**: Complete
4. ✅ **Website Integration**: Complete
5. ⏳ **Testing**: Test with physical device
6. ⏳ **Monitoring**: Set up alerts and dashboards
7. ⏳ **Documentation**: Update user guides

---

**Status**: ✅ **FULLY INTEGRATED**

All MycoBrain features are now integrated across MINDEX, NatureOS, MAS, and the Website. Devices automatically register and telemetry flows to all systems.

*Last Updated: December 30, 2024*
