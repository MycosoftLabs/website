# MycoBrain Sensor Library

## Overview

The MycoBrain Sensor Library is a comprehensive plug-and-play sensor management system that supports automatic detection, registration, and visualization of environmental sensors, actuators, and communication modules.

## Supported Sensors

### Environmental Sensors
| Sensor | Interface | Capabilities |
|--------|-----------|-------------|
| **BME688** | I2C (0x76, 0x77) | Temperature, Humidity, Pressure, Gas/VOC, IAQ, CO2 |
| **BMV080** | I2C (0x57) | PM1.0, PM2.5, PM4.0, PM10, Particle Count |
| **SCD41** | I2C (0x62) | True CO2 (NDIR), Temperature, Humidity |
| **SGP41** | I2C (0x59) | VOC Index, NOx Index, VSC |

### Acoustic Sensors & Actuators
| Sensor | Interface | Capabilities |
|--------|-----------|-------------|
| **SPH0645** | I2S/I2C | MEMS Microphone, Spectrum Analysis, Sound Level |
| **ICS-43434** | I2S/I2C | MEMS Microphone, Voice Detection |
| **MAX98357A** | I2S/I2C | Audio Playback, Acoustic Modem TX |

### Optical Sensors
| Sensor | Interface | Capabilities |
|--------|-----------|-------------|
| **VL53L1X** | I2C (0x29) | ToF Distance (0-4m), Ranging |
| **TF-Mini** | UART | LiDAR Distance (0.1-12m) |
| **MLX90640** | I2C (0x33) | Thermal Imaging (32x24), Presence Detection |
| **AMG8833** | I2C (0x68/0x69) | Infrared Grid-Eye (8x8) |

### Spectral Sensors
| Sensor | Interface | Capabilities |
|--------|-----------|-------------|
| **AS7341** | I2C (0x39) | 11-Channel Spectroscopy, Color Analysis, Chlorophyll Detection |

### Communication Modules
| Module | Interface | Capabilities |
|--------|-----------|-------------|
| **SIM7000G-H** | UART | 4G LTE, GNSS, SMS, MQTT, HTTP |
| **RFM95W** | SPI | LoRa, Long Range, Mesh |
| **PN532** | I2C (0x24) | NFC/RFID Read/Write, Card Emulation |

### Navigation & IMU
| Sensor | Interface | Capabilities |
|--------|-----------|-------------|
| **BNO085** | I2C (0x4A/0x4B) | 9-DOF IMU, Orientation, Quaternion |
| **MAX-M10** | I2C (0x42) | Multi-GNSS (GPS, GLONASS, Galileo, BeiDou) |
| **BMP390** | I2C (0x76/0x77) | Barometric Altimeter |

### Biological/Environmental Probes
| Sensor | Interface | Capabilities |
|--------|-----------|-------------|
| **STEMMA Soil** | I2C (0x36) | Soil Moisture, Soil Temperature |
| **EZO-pH** | I2C (0x63) | pH Measurement |
| **FCI Probe** | Analog | Mycelium Conductivity, Colonization Detection |

### Actuators
| Device | Interface | Capabilities |
|--------|-----------|-------------|
| **NeoPixel/WS2812B** | GPIO | Addressable RGB LEDs, Animations |
| **OPTX (Optical Modem TX)** | GPIO | Optical Communication, High Bandwidth |
| **OPRX (Optical Modem RX)** | GPIO | Optical Communication Receiver |
| **AUTX (Acoustic Modem TX)** | I2C | Underwater Acoustic Communication |
| **AURX (Acoustic Modem RX)** | I2C | Underwater Acoustic Receiver |

## Device Profiles

Device profiles define the sensor configurations for specific MycoBrain-based devices:

### MycoDrone
- **Required**: BNO085 (IMU), MAX-M10 (GNSS), BMP390 (Altimeter)
- **Optional**: BME688, VL53L1X, MLX90640, SPH0645, MAX98357A, SIM7000G, NeoPixel
- **Capabilities**: Flight, Autonomous Navigation, FPV, Mapping, Surveillance

### Mushroom 1
- **Required**: BME688
- **Optional**: BMV080, SCD41, SGP41, AS7341, STEMMA Soil, NeoPixel
- **Capabilities**: Environmental Monitoring, Smell Detection, Growth Tracking

### SporeBase
- **Required**: BME688, AS7341
- **Optional**: BMV080, SCD41, MLX90640, PN532
- **Capabilities**: Spore Collection, Spectral Analysis, Species ID

### Petreus
- **Required**: BME688
- **Optional**: AS7341, MLX90640, AMG8833, NeoPixel
- **Capabilities**: Dish Monitoring, Timelapse, Contamination Detection

### MycoProbe
- **Required**: BME688, STEMMA Soil
- **Optional**: FCI Probe, EZO-pH, SCD41
- **Capabilities**: Soil Monitoring, Colonization Tracking, pH Monitoring

### MycoAlarm
- **Required**: BME688, SPH0645
- **Optional**: VL53L1X, AMG8833, PN532, MAX98357A, NeoPixel, SIM7000G
- **Capabilities**: Alerts, Motion Detection, Sound Detection, Remote Notification

### MycoWeather
- **Required**: BME688, BMP390
- **Optional**: BMV080, SCD41, SGP41, MAX-M10, SIM7000G, LoRa
- **Capabilities**: Weather Monitoring, Forecasting, Air Quality

### MycoRover
- **Required**: BNO085, MAX-M10
- **Optional**: BME688, VL53L1X, TF-Mini, MLX90640, SPH0645, SIM7000G
- **Capabilities**: Navigation, Obstacle Avoidance, Mapping

### MycoBuoy
- **Required**: BME688, MAX-M10
- **Optional**: EZO-pH, Acoustic Modems, SIM7000G, LoRa
- **Capabilities**: Water Monitoring, Acoustic Communication, Solar Power

## Drone Control Page

A dedicated drone control interface is available at `/natureos/drone` with:

### Widgets
- **Attitude Indicator**: Real-time pitch/roll/heading display
- **Flight Controls**: Virtual joysticks, arm/disarm, takeoff/land, RTH
- **Motor Status**: Quad layout with RPM, current, temperature
- **Battery Status**: Cell voltages, current draw, time remaining
- **GPS Navigation**: Position, satellites, HDOP, home distance
- **FPV Display**: Video stream with HUD overlay

### Features
- Keyboard controls (W/S/A/D for throttle/yaw, arrows for pitch/roll)
- Real-time telemetry updates
- Armed state warning indicators
- Multiple flight modes (STABILIZE, LOITER, LAND, RTL)

## Usage

### Sensor Registry

```typescript
import { getSensorRegistry, SENSOR_LIBRARY } from "@/lib/mycobrain"

// Get the singleton registry
const registry = getSensorRegistry()

// Register a sensor from I2C scan
registry.registerFromI2C(0x76) // Detects BME688

// Get all registered sensors
const sensors = registry.getAllSensors()

// Get device profile based on sensors
const profile = registry.getDeviceProfile() // Returns "mushroom_1", "drone", etc.
```

### Sensor Detection

```typescript
import { identifySensorByI2CAddress, getWidgetForSensor } from "@/lib/mycobrain"

// Identify sensor from I2C address
const sensor = identifySensorByI2CAddress(0x39) // Returns AS7341 definition

// Get the widget component for a sensor
const widget = getWidgetForSensor("bme688") // Returns "peripheral-widget"
```

## File Structure

```
lib/mycobrain/
├── types.ts           # Sensor definitions, device profiles
├── sensor-registry.ts # Runtime sensor management
└── index.ts           # Public exports

components/mycobrain/
├── drone/
│   ├── attitude-indicator.tsx
│   ├── battery-status.tsx
│   ├── flight-controls.tsx
│   ├── fpv-display.tsx
│   ├── gps-navigation.tsx
│   ├── motor-status.tsx
│   └── index.ts
├── widgets/
│   ├── cellular-widget.tsx
│   ├── imu-widget.tsx
│   ├── spectrometer-widget.tsx
│   └── ... (existing widgets)
└── ... (existing components)

app/natureos/drone/
└── page.tsx           # Drone control interface
```

## Status

✅ **Completed:**
- Comprehensive sensor library with 25+ sensors
- Device profile system with 10 profiles
- Drone control page with FPV interface
- Attitude indicator with pitch/roll/heading
- Flight controls with virtual joysticks
- Motor status with quad layout
- Battery monitoring with cell voltages
- GPS navigation with HDOP and home tracking
- Cellular (SIM7000G) widget
- IMU (BNO085) widget
- Spectrometer (AS7341) widget

⏳ **Pending:**
- WebSocket integration for real-time MycoBrain data
- Mission planner with waypoints
- Full FPV video streaming
- Auto-detection on device connect
