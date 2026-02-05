# Elephant Conservation Demo - Feb 05, 2026

## Overview

This document describes the CREP Elephant Conservation Demo, which showcases MycoBrain devices monitoring elephant movement, health, and wildlife corridors in Ghana and other African conservation zones.

## Features

### 1. MycoBrain Device Integration (San Diego / Chula Vista 91910)

The primary MycoBrain device is located at Chula Vista, San Diego, CA 91910. It provides:

- **Live Sensor Data Display**
  - Temperature (°C)
  - Humidity (%)
  - Pressure (hPa)
  - Indoor Air Quality (IAQ) with quality labels
  - CO2 Equivalent (ppm)
  - bVOC (breath VOC) levels
  - Device uptime

- **Quick Controls**
  - Rainbow LED effect
  - Beep buzzer
  - LED off control

- **Device Info**
  - Port (COM7)
  - Protocol (MDP)
  - Firmware version
  - GPS coordinates

### 2. Elephant Tracker Markers

GPS collars with biosignal monitoring showing:

- **Location & Movement**
  - Real-time GPS position
  - Heading direction indicator
  - Speed (km/h)
  
- **Biosignal Telemetry**
  - Heart rate (bpm) - Normal: 25-35 bpm
  - Body temperature (°C)
  - Activity level (grazing, resting, walking, running, foraging)
  - Hydration level (%)
  - Stress index (0-100) with alerts

- **Health Status**
  - Healthy (green)
  - Warning (amber) - elevated stress or abnormal vitals
  - Critical (red) - requires immediate attention

### 3. Smart Fence Network

MycoBrain-powered fence sensors for wildlife corridors:

- **Fence Segments**
  - Active/breach status monitoring
  - Multiple sensor nodes per segment
  
- **Sensor Readings**
  - Presence detection (PIR)
  - Vibration levels
  - Break detection
  - Environmental conditions (temp, humidity)

- **Alerts**
  - Fence breach notifications
  - Elephant crossing events
  - Maintenance status

### 4. Presence Detection

Environmental monitoring stations with:

- **Motion Detection**
  - PIR presence sensing
  - Motion intensity levels
  - Last movement timestamp

- **Smell Detection (BME688)**
  - Elephant dung detection
  - Musth pheromone detection
  - Forest vegetation patterns

### 5. Conservation Events

Real-time event stream including:

- `elephant_crossing` - Herd movements through fence corridors
- `fence_breach` - Perimeter alerts
- `health_alert` - Individual elephant health concerns
- `presence_alert` - Motion/smell detections
- `musth_detection` - Male breeding condition alerts

## Demo Locations

### Ghana Conservation Zones

| Park | Coordinates | Description |
|------|-------------|-------------|
| Mole National Park | 9.2667°N, 1.8333°W | Largest wildlife refuge in Ghana |
| Kakum National Park | 5.3500°N, 1.3833°W | Rainforest with elephant populations |
| Bui National Park | 8.2833°N, 2.2333°W | Savanna ecosystem |

### Additional African Parks (Future Expansion)

| Park | Country | Coordinates |
|------|---------|-------------|
| Kruger National Park | South Africa | 23.9884°S, 31.5547°E |
| Amboseli National Park | Kenya | 2.6527°S, 37.2606°E |
| Chobe National Park | Botswana | 18.7669°S, 25.1545°E |

## Technical Implementation

### API Endpoints

```
GET /api/crep/demo/elephant-conservation
```

Returns:
- `elephants` - Array of tracked elephants with biosignals
- `fenceSegments` - Smart fence network data
- `environmentMonitors` - Presence detection stations
- `devices` - All MycoBrain devices (formatted for CREP)
- `events` - Conservation event stream
- `stats` - Summary statistics

### New Components

| Component | Path | Description |
|-----------|------|-------------|
| ElephantMarker | `components/crep/markers/elephant-marker.tsx` | Map marker with biosignals |
| SmartFenceWidget | `components/crep/smart-fence-widget.tsx` | Fence network monitoring |
| PresenceDetectionWidget | `components/crep/presence-detection-widget.tsx` | Motion/presence display |
| BiosignalWidget | `components/crep/biosignal-widget.tsx` | Elephant health dashboard |

### CREP Page Updates

- New layer: "🐘 Elephant Trackers" (enabled by default)
- New layer: "Smart Fence Network" (enabled by default)
- Conservation widgets in right panel (when demo data available)
- Enhanced DeviceMarker with live sensor data and controls

## MycoBrain Service

The MycoBrain service runs on port 8765:

```bash
# Start the service
cd website/services/mycobrain
python mycobrain_service.py
```

API routes updated to use port 8765 by default:
- `/api/mycobrain/devices`
- `/api/mycobrain/ports`
- `/api/mycobrain/[port]/control`
- `/api/mycobrain/[port]/sensors`

## Testing

1. **Start MycoBrain Service**
   ```bash
   python services/mycobrain/mycobrain_service.py
   ```

2. **Verify Device Connection**
   - Check COM7 shows as connected
   - Verify sensor data streaming

3. **Start Dev Server**
   ```bash
   npm run dev
   ```

4. **Navigate to CREP**
   - Open http://localhost:3010/dashboard/crep
   - MycoBrain device should appear in Chula Vista, San Diego
   - Elephant markers should appear in Ghana

5. **Test Features**
   - Click MycoBrain device marker to see sensor data
   - Use quick controls (Rainbow, Beep, LED Off)
   - Click elephant markers to see biosignals
   - View conservation widgets in right panel

## Deployment

1. Commit and push to GitHub
2. SSH to sandbox VM (192.168.0.187)
3. Pull code and rebuild Docker image
4. Restart container with NAS mount
5. Clear Cloudflare cache

## Data Sources

- **Demo Mode**: Simulated data for Ghana elephant conservation
- **Real Device**: Live MycoBrain sensor data from COM7
- **Future**: Integration with actual GPS collar data streams

## Notes

- Demo data exception: This demo uses simulated elephant/fence data for presentation purposes
- Real MycoBrain device provides actual sensor readings
- Conservation zones use real GPS coordinates for Ghana national parks
