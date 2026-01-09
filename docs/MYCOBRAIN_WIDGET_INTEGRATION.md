# MycoBrain Widget Integration Complete

## Overview

All NDJSON machine mode protocol widgets have been successfully integrated into the Device Manager dashboard at `/natureos/devices`.

## Integrated Widgets

### 1. **LED Control Widget** (`LedControlWidget`)
- **Location**: Controls Tab (when machine mode is active)
- **Features**:
  - RGB color picker with sliders
  - Color presets (Red, Green, Blue, Yellow, Cyan, Magenta, White, Off)
  - Pattern presets (solid, blink, breathe, rainbow, chase, sparkle)
  - Brightness control
  - **Optical Modem TX** tab:
    - Profile selection (Camera OOK, Camera Manchester, Spatial Modulation)
    - Payload input (text → base64)
    - Rate (Hz) and repeat controls
    - Start/Stop transmission

### 2. **Buzzer Control Widget** (`BuzzerControlWidget`)
- **Location**: Controls Tab (when machine mode is active)
- **Features**:
  - Sound presets (coin, bump, power, 1up, morgio)
  - Custom tone generator (frequency + duration)
  - **Acoustic Modem TX** tab:
    - Profile selection (Simple FSK, GGWave-like, DTMF)
    - Payload input (text → base64)
    - Symbol timing, F0/F1 frequency controls
    - Start/Stop transmission

### 3. **Peripheral Grid** (`PeripheralGrid`)
- **Location**: Sensors Tab
- **Features**:
  - Auto-discovers I2C peripherals via `scan` command
  - Maps I2C addresses to peripheral types (BME688, OLED, LiDAR, etc.)
  - Auto-renders appropriate widgets for each peripheral type
  - Shows "Awaiting data plane" for unknown peripherals
  - Rescan button for manual refresh

### 4. **Telemetry Chart Widget** (`TelemetryChartWidget`)
- **Location**: Analytics Tab
- **Features**:
  - Live streaming charts for temperature, humidity, pressure, IAQ
  - Sensor selection (all sensors or specific sensor)
  - Play/Pause streaming
  - Data export (JSON download)
  - Real-time updates with configurable polling interval

### 5. **Communication Panel** (`CommunicationPanel`)
- **Location**: Communication Tab (top of tab)
- **Features**:
  - **LoRa Tab**: Frequency, SF, RSSI, SNR display; message sending; quick commands (Ping, Beacon, Query Status)
  - **WiFi Tab**: Connection status, SSID, IP, signal strength
  - **Bluetooth LE Tab**: Device name, advertising toggle, connection status
  - **Mesh Tab**: ESP-NOW mesh network status, peer count
  - Communication log with TX/RX history

## Machine Mode Initialization

### How to Activate

1. Connect to a MycoBoard device (via port selection)
2. Go to **Diagnostics** tab
3. Click **"Initialize Machine Mode"** button
4. Machine mode will:
   - Send `mode machine` command
   - Send `dbg off` command
   - Send `fmt json` command
   - Trigger I2C scan for peripherals
   - Trigger status command

### Status Indicators

- **Controls Tab**: Shows machine mode status badge
  - Green "Active" badge when machine mode is initialized
  - Gray "Not Initialized" badge when inactive
- **Widget Visibility**: New widgets only appear when machine mode is active
- **Legacy Controls**: Still available below new widgets for backward compatibility

## Widget API Endpoints

All widgets use the following API routes:

- `/api/mycobrain/{port}/machine-mode` - Initialize machine mode
- `/api/mycobrain/{port}/peripherals` - Discover peripherals
- `/api/mycobrain/{port}/led` - LED control (RGB, patterns, optical TX)
- `/api/mycobrain/{port}/buzzer` - Buzzer control (presets, tones, acoustic TX)
- `/api/mycobrain/{port}/telemetry` - Telemetry streaming
- `/api/mycobrain/{port}/control` - Generic control commands

## Integration Points

### Sensors Tab
- **PeripheralGrid** appears at the top
- Shows auto-discovered I2C devices
- Existing BME688 sensor displays remain below

### Controls Tab
- **Machine Mode Status Card** at top
- **LedControlWidget** and **BuzzerControlWidget** when active
- Legacy controls below for MDP protocol compatibility

### Communication Tab
- **CommunicationPanel** at top with full LoRa/WiFi/BLE/Mesh controls
- Legacy communication cards below

### Analytics Tab
- **TelemetryChartWidget** on left
- Existing sensor history chart on right

## Protocol Support

### NDJSON Machine Mode (New)
- Line-delimited JSON responses
- Structured message types: `ack`, `err`, `telemetry`, `periph`, `periph_list`
- Automatic peripheral discovery
- Optical/acoustic modem support

### Legacy MDP Protocol
- Still supported for backward compatibility
- Text-based commands
- Manual sensor queries

## Next Steps

1. **Test Machine Mode**: Connect MycoBoard and initialize machine mode
2. **Test Widgets**: Verify LED, buzzer, and peripheral discovery work
3. **Test Modems**: Try optical TX and acoustic TX features
4. **Monitor Telemetry**: Check that charts update in real-time

## Troubleshooting

### Widgets Not Showing
- Ensure machine mode is initialized (check Diagnostics tab)
- Verify device is connected and responding
- Check browser console for errors

### Peripherals Not Detected
- Click "Rescan" button in PeripheralGrid
- Verify I2C devices are properly connected
- Check that `scan` command returns results

### Machine Mode Fails
- Check MycoBrain service is running (port 8003)
- Verify device is connected to correct port
- Check console log for error messages

---

*Last Updated: December 2024*
*Part of MycoBrain NDJSON Protocol Integration*
























