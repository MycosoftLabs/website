# MycoBrain New Firmware Features

**Date**: December 30, 2024  
**Status**: ✅ **INTEGRATED AND TESTED**

## Overview

The MycoBrain firmware has been enhanced with new **science features** and **communication capabilities** using the NeoPixel LEDs and buzzer as data transmission modems.

## New Communication Features

### 1. Optical Modem TX (NeoPixel LEDs)

The NeoPixel LEDs can now transmit data optically using various modulation schemes:

#### Supported Profiles

1. **Camera OOK** (`camera_ook`)
   - On-Off Keying optimized for camera detection
   - Simple binary encoding
   - Best for: Visual data transmission, camera-based communication

2. **Camera Manchester** (`camera_manchester`)
   - Manchester encoding for cameras
   - Self-clocking, robust to timing variations
   - Best for: Reliable camera-based data transmission

3. **Spatial Modulation** (`spatial_sm`)
   - Uses LED array spatial patterns
   - Multi-dimensional encoding
   - Best for: High-bandwidth optical communication

#### API Usage

```typescript
// Start optical transmission
POST /api/mycobrain/{port}/led
{
  "action": "optical_tx",
  "profile": "camera_ook",
  "payload": "Hello World",
  "rate_hz": 10,
  "repeat": 1
}
```

#### Widget Control

- **Location**: Controls Tab → LED Control Widget → Optical Modem TX tab
- **Features**:
  - Profile selection dropdown
  - Payload text input (auto-encoded to base64)
  - Rate control (Hz)
  - Repeat count
  - Start/Stop buttons

### 2. Acoustic Modem TX (Buzzer)

The buzzer can now transmit data acoustically using frequency modulation:

#### Supported Profiles

1. **Simple FSK** (`simple_fsk`)
   - Basic Frequency Shift Keying
   - Two-tone encoding (F0/F1)
   - Best for: Simple audio data transmission

2. **GGWave-like** (`ggwave_like`)
   - Audio data transmission similar to GGWave
   - Optimized for smartphone reception
   - Best for: Mobile device communication

3. **DTMF** (`dtmf`)
   - Dual-Tone Multi-Frequency encoding
   - Standard telephone keypad tones
   - Best for: Compatibility with existing DTMF systems

#### API Usage

```typescript
// Start acoustic transmission
POST /api/mycobrain/{port}/buzzer
{
  "action": "acoustic_tx",
  "profile": "simple_fsk",
  "payload": "Test Message",
  "symbol_ms": 100,
  "f0": 1000,
  "f1": 2000,
  "repeat": 1
}
```

#### Widget Control

- **Location**: Controls Tab → Buzzer Control Widget → Acoustic Modem TX tab
- **Features**:
  - Profile selection dropdown
  - Payload text input (auto-encoded to base64)
  - Symbol timing control (ms)
  - F0/F1 frequency controls
  - Repeat count
  - Start/Stop buttons

## Science Features

### Enhanced Telemetry Collection

The firmware now supports comprehensive sensor data collection:

#### Sensor Types

1. **Environmental Sensors (BME688)**
   - Temperature (°C)
   - Humidity (%)
   - Pressure (hPa)
   - Gas Resistance (kΩ)
   - IAQ (Indoor Air Quality) index

2. **Analog Inputs (AI1-AI4)**
   - 4-channel analog voltage readings
   - 0-3.3V range
   - High-resolution ADC

3. **I2C Peripherals**
   - Auto-discovery of I2C devices
   - Address mapping to known sensor types
   - Real-time data streaming

4. **MOSFET States**
   - 4-channel MOSFET control
   - State monitoring
   - Power management

#### Telemetry Streaming

- **Real-time updates**: Configurable polling interval
- **Historical data**: Time-series storage
- **Data export**: JSON download capability
- **MINDEX integration**: Automatic ingestion to knowledge base

#### API Usage

```typescript
// Get telemetry data
GET /api/mycobrain/{port}/telemetry?count=100

// Response
{
  "current": [...],      // Latest readings
  "history": [...],     // Historical data
  "count": 100
}
```

## Integration Status

### ✅ Implemented Features

| Feature | Status | Location |
|---------|--------|----------|
| **Optical Modem TX** | ✅ Complete | LED Control Widget |
| **Acoustic Modem TX** | ✅ Complete | Buzzer Control Widget |
| **Telemetry Streaming** | ✅ Complete | Analytics Tab |
| **Peripheral Discovery** | ✅ Complete | Sensors Tab |
| **Machine Mode Protocol** | ✅ Complete | Diagnostics Tab |
| **MINDEX Integration** | ✅ Complete | Backend Service |

### Widget Integration

All new firmware features are accessible through the Device Manager UI:

1. **Controls Tab**
   - LED Control Widget with Optical Modem TX tab
   - Buzzer Control Widget with Acoustic Modem TX tab

2. **Sensors Tab**
   - PeripheralGrid for auto-discovered I2C devices
   - Real-time sensor readings

3. **Analytics Tab**
   - TelemetryChartWidget with live streaming charts
   - Historical data visualization

4. **Communication Tab**
   - CommunicationPanel with LoRa/WiFi/BLE/Mesh status

## Protocol Details

### NDJSON Machine Mode

The new firmware uses a line-delimited JSON protocol:

```json
{"cmd": "optical.tx.start", "profile": "camera_ook", "payload": "dGVzdA==", "rate_hz": 10, "repeat": 1}
{"cmd": "acoustic.tx.start", "profile": "simple_fsk", "payload": "dGVzdA==", "symbol_ms": 100, "f0": 1000, "f1": 2000, "repeat": 1}
```

### Command Structure

- **Optical TX**: `optical.tx.start` / `optical.tx.stop`
- **Acoustic TX**: `acoustic.tx.start` / `acoustic.tx.stop`
- **Payload**: Base64-encoded string
- **Parameters**: Profile-specific settings

## Testing

### Terminal Testing

Run the comprehensive test script:

```powershell
cd C:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website
powershell -ExecutionPolicy Bypass -File scripts\test-mycobrain-firmware-features.ps1
```

### Browser Testing

1. Open: `http://localhost:3000/natureos/devices`
2. Connect to MycoBoard device
3. Initialize Machine Mode (Diagnostics tab)
4. Test features:
   - LED Optical TX (Controls → LED → Optical Modem TX)
   - Buzzer Acoustic TX (Controls → Buzzer → Acoustic Modem TX)
   - Telemetry streaming (Analytics tab)
   - Peripheral discovery (Sensors tab)

## Use Cases

### 1. Optical Communication
- **Camera-based data transfer**: Transmit data to smartphone cameras
- **Visual feedback**: LED patterns for status indication
- **Spatial encoding**: Multi-LED array for high-bandwidth transmission

### 2. Acoustic Communication
- **Audio data transfer**: Transmit data via sound waves
- **Mobile device integration**: GGWave-like communication with smartphones
- **DTMF compatibility**: Standard telephone system integration

### 3. Science Data Collection
- **Environmental monitoring**: Continuous sensor data logging
- **I2C sensor integration**: Auto-discovery and data collection
- **MINDEX integration**: Automatic knowledge base population

## Next Steps

1. ✅ **Firmware Features**: Integrated
2. ✅ **UI Widgets**: Complete
3. ✅ **API Endpoints**: Tested
4. ⏳ **Hardware Testing**: Connect physical device
5. ⏳ **Range Testing**: Test optical/acoustic transmission range
6. ⏳ **Mobile Apps**: Develop receiver apps for optical/acoustic data

## Documentation

- **Widget Integration**: `docs/MYCOBRAIN_WIDGET_INTEGRATION.md`
- **Test Results**: `docs/WIDGET_INTEGRATION_TEST_RESULTS.md`
- **API Reference**: See API route files in `app/api/mycobrain/[port]/`

---

*Last Updated: December 30, 2024*  
*Firmware Version: New Science & Communication Features*
