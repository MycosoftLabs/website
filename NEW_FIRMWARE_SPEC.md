# MycoBrain New Firmware Specification

**Date:** 2025-12-28  
**Repository:** https://github.com/MycosoftLabs/mycobrain  
**Goal:** Direct integration with website/system

## Current Firmware Assessment

### Testing Current Firmware
1. Connect to COM4
2. Send PING command
3. Read firmware version
4. Test all commands (NeoPixel, Buzzer, Sensors)
5. Verify protocol (MDP v1 or JSON)
6. Check Side A/B detection

## New Firmware Requirements

### 1. Enhanced Device Identification

```cpp
// Command: GET_DEVICE_INFO (0x40)
Response:
{
  "firmware_version": "2.0.0",
  "side": "A" or "B",
  "mdp_version": "1.0",
  "hardware_version": "V1",
  "serial_number": "MB-XXXX-XXXX",
  "mac_address": "XX:XX:XX:XX:XX:XX",
  "build_date": "2025-12-28",
  "git_commit": "abc123..."
}
```

### 2. Comprehensive Diagnostics

```cpp
// Command: GET_DIAGNOSTICS (0x41)
Response:
{
  "firmware": {
    "version": "2.0.0",
    "side": "A",
    "status": "ok",
    "uptime_seconds": 3600,
    "free_heap": 250000,
    "reset_reason": "power_on"
  },
  "capabilities": {
    "neopixel": true,
    "buzzer": true,
    "bme688_count": 2,
    "lora": true,
    "i2c_bus": true,
    "analog_inputs": 4,
    "mosfet_outputs": 4,
    "pwm_outputs": 8
  },
  "sensors": {
    "bme688_1": {"present": true, "address": 0x76},
    "bme688_2": {"present": true, "address": 0x77}
  },
  "communication": {
    "uart_baud": 115200,
    "lora_initialized": true,
    "lora_frequency": 915000000,
    "protocol": "mdp_v1"
  }
}
```

### 3. Enhanced Command Set

#### NeoPixel Commands
```cpp
// SET_NEOPIXEL (0x0A)
Parameters: {r: 0-255, g: 0-255, b: 0-255, brightness: 0-255, led_index: 0-7}
Response: ACK with current state

// NEOPIXEL_RAINBOW (0x0C)
Parameters: {speed: 1-10, brightness: 0-255}
Response: ACK

// NEOPIXEL_PATTERN (0x0D) - NEW
Parameters: {pattern: "chase", "pulse", "wave", "breath", speed: 1-10, color: {r, g, b}}
Response: ACK
```

#### Buzzer Commands
```cpp
// BUZZER_BEEP (0x14)
Parameters: {frequency: 100-20000, duration_ms: 0-65535, volume: 0-100}
Response: ACK when complete

// BUZZER_MELODY (0x15)
Parameters: {melody_id: 0-10, tempo: 60-200, volume: 0-100}
Response: ACK

// BUZZER_TONE_SEQUENCE (0x16) - NEW
Parameters: {tones: [{freq, duration}, ...], tempo: 60-200}
Response: ACK
```

#### Sensor Commands
```cpp
// GET_SENSOR_DATA (0x02)
Response: Full telemetry with all sensors

// GET_BME688_1 (0x1E)
Response: {temperature, humidity, pressure, gas_resistance, iaq}

// GET_BME688_2 (0x1F)
Response: {temperature, humidity, pressure, gas_resistance, iaq}

// SET_TELEMETRY_INTERVAL (0x42) - NEW
Parameters: {interval_seconds: 1-3600}
Response: ACK with new interval
```

### 4. Real-time Telemetry

```cpp
// Automatic telemetry transmission
{
  "timestamp": 1703808000,
  "side": "A",
  "sensors": {
    "bme688_1": {
      "temperature": 25.5,
      "humidity": 60.0,
      "pressure": 1013.25,
      "gas_resistance": 50000,
      "iaq": 50
    },
    "bme688_2": {
      "temperature": 25.3,
      "humidity": 59.5,
      "pressure": 1013.20,
      "gas_resistance": 49500,
      "iaq": 48
    }
  },
  "analog_inputs": {
    "ai1": 3.3,
    "ai2": 2.5,
    "ai3": 1.8,
    "ai4": 0.0
  },
  "mosfet_states": [true, false, false, false],
  "i2c_devices": [0x76, 0x77],
  "power": {
    "voltage": 5.0,
    "current": 0.5,
    "battery_percent": 100
  },
  "system": {
    "uptime_seconds": 3600,
    "free_heap": 250000,
    "cpu_temp": 45.0
  }
}
```

### 5. Event System

```cpp
// Events automatically sent on:
- Sensor threshold exceeded
- I2C device detected/lost
- Power state change
- Error conditions
- Command execution status

Event Format:
{
  "event_type": "sensor_threshold" | "device_detected" | "error" | "command_ack",
  "severity": "info" | "warning" | "error" | "critical",
  "message": "Temperature exceeded 30°C",
  "data": {...},
  "timestamp": 1703808000
}
```

## Side A (Sensor MCU) Firmware

### Responsibilities
1. **Sensor Management**
   - BME688 reading (2x sensors)
   - I2C bus scanning
   - Analog input sampling
   - Sensor calibration

2. **Actuator Control**
   - NeoPixel LED control (8 LEDs)
   - Buzzer control
   - MOSFET outputs (4x)
   - PWM outputs (8x)

3. **Data Collection**
   - Periodic sensor readings
   - Event detection
   - Data buffering
   - Telemetry formatting

4. **Command Processing**
   - Receive commands from Side B
   - Execute commands
   - Send acknowledgments
   - Error reporting

### New Features for Side A
- [ ] Enhanced sensor calibration
- [ ] Threshold-based event generation
- [ ] Data logging to flash
- [ ] Low-power mode support
- [ ] Sensor health monitoring

## Side B (Router MCU) Firmware

### Responsibilities
1. **Communication Routing**
   - UART ↔ Side A
   - Serial ↔ Computer
   - LoRa ↔ Gateway (future)
   - Protocol translation

2. **Reliability**
   - Command acknowledgment
   - Retry logic
   - Sequence number management
   - Error recovery

3. **Device Management**
   - Device identification
   - Firmware version reporting
   - Capability reporting
   - Status monitoring

4. **Protocol Handling**
   - MDP v1 encoding/decoding
   - COBS framing
   - CRC16 verification
   - Frame assembly

### New Features for Side B
- [ ] Protocol version negotiation
- [ ] Automatic protocol detection
- [ ] JSON mode for debugging
- [ ] Gateway discovery
- [ ] Mesh routing (future)

## Integration Points

### Website Integration
- ✅ REST API endpoints
- ✅ WebSocket support
- ✅ Real-time telemetry
- ✅ Command execution
- ✅ Diagnostics display

### System Integration
- ⏳ MAS agent integration
- ⏳ MINDEX data ingestion
- ⏳ NATUREOS device registry
- ⏳ Protocol management
- ⏳ Topology management (pending plan)

## Firmware Structure

```
mycobrain/
├── firmware/
│   ├── sideA/
│   │   ├── main.cpp              # Main loop
│   │   ├── sensors.cpp           # BME688, I2C, analog
│   │   ├── actuators.cpp         # NeoPixel, buzzer, MOSFET
│   │   ├── commands.cpp          # Command handlers
│   │   ├── telemetry.cpp         # Telemetry generation
│   │   ├── events.cpp            # Event system
│   │   └── mdp_protocol.cpp      # MDP v1 implementation
│   ├── sideB/
│   │   ├── main.cpp              # Main loop
│   │   ├── router.cpp            # Message routing
│   │   ├── serial.cpp            # Serial communication
│   │   ├── lora.cpp              # LoRa communication
│   │   ├── gateway.cpp           # Gateway discovery
│   │   └── mdp_protocol.cpp      # MDP v1 implementation
│   └── common/
│       ├── mdp_v1.h              # MDP protocol definitions
│       ├── cobs.h                # COBS encoding
│       ├── commands.h            # Command definitions
│       ├── telemetry.h           # Telemetry structures
│       └── config.h              # Configuration
├── docs/
│   ├── PROTOCOL.md               # Protocol specification
│   ├── COMMANDS.md               # Command reference
│   ├── TOPOLOGY.md               # Topology plan (pending)
│   └── FLASHING.md               # Flashing instructions
└── tools/
    ├── flash_firmware.py         # Flashing tool
    ├── test_commands.py          # Command testing
    └── firmware_builder.py       # Build system
```

## Implementation Priority

### Phase 1: Core Functionality (Current)
- [x] Basic MDP v1 protocol
- [x] Command execution
- [x] Sensor reading
- [x] NeoPixel control
- [x] Buzzer control

### Phase 2: Enhanced Features (Next)
- [ ] Device identification
- [ ] Diagnostics command
- [ ] Event system
- [ ] Telemetry interval control
- [ ] Enhanced error handling

### Phase 3: System Integration (After Topology Plan)
- [ ] Gateway communication
- [ ] Mesh networking
- [ ] Device discovery
- [ ] Routing protocols
- [ ] Multi-device management

## Testing Plan

### Unit Tests
- [ ] Command encoding/decoding
- [ ] COBS framing
- [ ] CRC16 calculation
- [ ] Sensor reading
- [ ] Actuator control

### Integration Tests
- [ ] Side A ↔ Side B communication
- [ ] Serial ↔ Computer communication
- [ ] Website ↔ Device communication
- [ ] Error handling
- [ ] Recovery mechanisms

### System Tests
- [ ] Multiple devices
- [ ] Gateway routing
- [ ] Mesh networking
- [ ] Topology management
- [ ] Data flow end-to-end

## Next Steps

1. **Test Current Firmware**
   - Connect to COM4
   - Run diagnostics
   - Test all commands
   - Document capabilities

2. **Plan Firmware Updates**
   - Identify gaps
   - Design new features
   - Create implementation plan
   - Set priorities

3. **Implement New Firmware**
   - Update Side A firmware
   - Update Side B firmware
   - Add new commands
   - Enhance diagnostics

4. **Test & Deploy**
   - Flash new firmware
   - Test all features
   - Verify integration
   - Document changes

5. **Topology Integration** (After plan received)
   - Design gateway protocol
   - Implement mesh networking
   - Add device discovery
   - Create routing system




