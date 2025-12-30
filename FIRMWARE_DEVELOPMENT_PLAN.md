# MycoBrain Firmware Development Plan

**Date:** 2025-12-28  
**Repository:** https://github.com/MycosoftLabs/mycobrain  
**Goal:** Create new firmware that integrates directly with website/system

## Current Situation

### Status
- ✅ Website service ready with MDP v1 support
- ✅ COM4 detected and available
- ⏳ Need to test current firmware
- ⏳ Need to assess firmware capabilities
- ⏳ Need to create enhanced firmware

### Current Firmware (To Be Tested)
- **Side A:** Sensor MCU firmware
- **Side B:** Router MCU firmware
- **Protocol:** MDP v1 (COBS + CRC16) or JSON

## Phase 1: Current Firmware Assessment

### Testing Checklist
1. **Connection Test**
   - [ ] Connect to COM4 via service
   - [ ] Verify device responds
   - [ ] Check protocol (MDP/JSON)

2. **Firmware Information**
   - [ ] Read firmware version
   - [ ] Identify Side A/B
   - [ ] Check MDP version
   - [ ] Get device capabilities

3. **Command Testing**
   - [ ] PING (0x01)
   - [ ] GET_SENSOR_DATA (0x02)
   - [ ] SET_NEOPIXEL (0x0A) - Test lights
   - [ ] NEOPIXEL_RAINBOW (0x0C)
   - [ ] BUZZER_BEEP (0x14) - Test buzzer
   - [ ] BUZZER_MELODY (0x15)
   - [ ] GET_BME688_1 (0x1E)
   - [ ] GET_BME688_2 (0x1F)

4. **Sensor Testing**
   - [ ] Read BME688 sensor 1
   - [ ] Read BME688 sensor 2
   - [ ] Verify telemetry streaming
   - [ ] Check data accuracy

## Phase 2: New Firmware Design

### Enhanced Features

#### 1. Device Identification (NEW)
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
  "git_commit": "abc123...",
  "compiler_version": "ESP-IDF v5.x"
}
```

#### 2. Comprehensive Diagnostics (NEW)
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
    "reset_reason": "power_on",
    "last_error": null
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
    "bme688_1": {"present": true, "address": 0x76, "last_read": 1703808000},
    "bme688_2": {"present": true, "address": 0x77, "last_read": 1703808000}
  },
  "communication": {
    "uart_baud": 115200,
    "lora_initialized": true,
    "lora_frequency": 915000000,
    "protocol": "mdp_v1",
    "frames_sent": 1000,
    "frames_received": 950,
    "errors": 0
  },
  "power": {
    "voltage": 5.0,
    "current": 0.5,
    "battery_percent": 100
  }
}
```

#### 3. Enhanced Commands

**NeoPixel Enhancements:**
```cpp
// SET_NEOPIXEL (0x0A) - Enhanced
Parameters: {
  "r": 0-255,
  "g": 0-255,
  "b": 0-255,
  "brightness": 0-255,
  "led_index": 0-7,  // NEW: Control individual LEDs
  "fade_time_ms": 0-1000  // NEW: Smooth transitions
}
Response: ACK with current state

// NEOPIXEL_PATTERN (0x0D) - NEW
Parameters: {
  "pattern": "chase" | "pulse" | "wave" | "breath" | "knight_rider",
  "speed": 1-10,
  "color": {"r": 255, "g": 0, "b": 0},
  "brightness": 0-255
}
```

**Buzzer Enhancements:**
```cpp
// BUZZER_BEEP (0x14) - Enhanced
Parameters: {
  "frequency": 100-20000,
  "duration_ms": 0-65535,
  "volume": 0-100  // NEW: Volume control
}
Response: ACK when complete

// BUZZER_TONE_SEQUENCE (0x16) - NEW
Parameters: {
  "tones": [
    {"freq": 1000, "duration": 200},
    {"freq": 1500, "duration": 200},
    {"freq": 2000, "duration": 400}
  ],
  "tempo": 60-200,
  "volume": 0-100
}
```

**Sensor Enhancements:**
```cpp
// SET_TELEMETRY_INTERVAL (0x42) - NEW
Parameters: {"interval_seconds": 1-3600}
Response: ACK with new interval

// GET_SENSOR_HISTORY (0x43) - NEW
Parameters: {"sensor_id": "bme688_1" | "bme688_2", "count": 1-100}
Response: Array of historical readings
```

#### 4. Event System (NEW)
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

## Phase 3: Firmware Implementation

### Side A Firmware Structure
```
sideA/
├── main.cpp              # Main loop, initialization
├── sensors.cpp           # BME688, I2C, analog inputs
├── actuators.cpp         # NeoPixel, buzzer, MOSFET, PWM
├── commands.cpp          # Command handlers
├── telemetry.cpp         # Telemetry generation
├── events.cpp            # Event system
├── mdp_protocol.cpp      # MDP v1 implementation
├── diagnostics.cpp       # Diagnostics and device info
└── config.h              # Configuration constants
```

### Side B Firmware Structure
```
sideB/
├── main.cpp              # Main loop, initialization
├── router.cpp            # Message routing (Side A ↔ Serial/LoRa)
├── serial.cpp            # Serial communication
├── lora.cpp              # LoRa communication (future)
├── gateway.cpp           # Gateway discovery (future)
├── mdp_protocol.cpp      # MDP v1 implementation
├── diagnostics.cpp       # Device identification
└── config.h              # Configuration constants
```

### Common Code
```
common/
├── mdp_v1.h              # MDP protocol definitions
├── cobs.h                # COBS encoding/decoding
├── commands.h            # Command ID definitions
├── telemetry.h           # Telemetry structures
├── events.h              # Event structures
└── utils.h               # Utility functions
```

## Phase 4: Integration with System

### Website Integration Points
1. **Device Manager UI**
   - Real-time diagnostics display
   - Command execution interface
   - Telemetry visualization
   - Event log display

2. **API Endpoints**
   - `/api/mycobrain` - Device management
   - `/api/mycobrain/{port}/diagnostics` - Firmware info
   - `/api/mycobrain/{port}/commands` - Command execution
   - `/api/mycobrain/{port}/telemetry` - Real-time data

3. **WebSocket Support**
   - Real-time telemetry streaming
   - Event notifications
   - Command acknowledgments

### System Integration (After Topology Plan)
1. **MAS Integration**
   - Device agent for each MycoBrain
   - Protocol management
   - Telemetry ingestion

2. **MINDEX Integration**
   - Device registry
   - Telemetry storage
   - Historical data

3. **NATUREOS Integration**
   - Device dashboard
   - Network topology
   - Gateway management

## Implementation Steps

### Step 1: Test Current Firmware
1. Connect to COM4 via website
2. Run diagnostics command
3. Test all commands
4. Document current capabilities
5. Identify gaps

### Step 2: Design New Firmware
1. Review current firmware code
2. Design enhanced features
3. Create command specifications
4. Design telemetry format
5. Plan event system

### Step 3: Implement New Firmware
1. Update Side A firmware
2. Update Side B firmware
3. Add new commands
4. Implement diagnostics
5. Add event system

### Step 4: Test & Deploy
1. Flash new firmware
2. Test all commands
3. Verify website integration
4. Test telemetry streaming
5. Verify error handling

### Step 5: Topology Integration (After Plan)
1. Review topology plan
2. Design gateway protocol
3. Implement mesh networking
4. Add device discovery
5. Create routing system

## Command Reference

### Current Commands (To Verify)
| ID | Command | Parameters | Response |
|----|---------|------------|----------|
| 0x00 | NOP | None | ACK |
| 0x01 | PING | None | Device info |
| 0x02 | GET_SENSOR_DATA | None | Full telemetry |
| 0x0A | SET_NEOPIXEL | [r, g, b, brightness] | ACK |
| 0x0B | NEOPIXEL_OFF | None | ACK |
| 0x0C | NEOPIXEL_RAINBOW | None | ACK |
| 0x14 | BUZZER_BEEP | [freq_high, freq_low, dur_high, dur_low] | ACK |
| 0x15 | BUZZER_MELODY | None | ACK |
| 0x16 | BUZZER_OFF | None | ACK |
| 0x1E | GET_BME688_1 | None | Sensor data |
| 0x1F | GET_BME688_2 | None | Sensor data |

### New Commands (To Implement)
| ID | Command | Parameters | Response |
|----|---------|------------|----------|
| 0x40 | GET_DEVICE_INFO | None | Device information |
| 0x41 | GET_DIAGNOSTICS | None | Full diagnostics |
| 0x42 | SET_TELEMETRY_INTERVAL | {interval_seconds} | ACK |
| 0x43 | GET_SENSOR_HISTORY | {sensor_id, count} | Historical data |
| 0x0D | NEOPIXEL_PATTERN | {pattern, speed, color} | ACK |
| 0x16 | BUZZER_TONE_SEQUENCE | {tones[], tempo, volume} | ACK |

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
- [ ] Gateway routing (after topology)
- [ ] Mesh networking (after topology)
- [ ] Topology management (after topology)
- [ ] Data flow end-to-end

## Next Actions

1. **Immediate:**
   - Test COM4 connection through website
   - Run firmware diagnostics
   - Test all current commands
   - Document firmware capabilities

2. **Short-term:**
   - Design new firmware features
   - Implement enhanced commands
   - Add diagnostics support
   - Test with website

3. **Medium-term:**
   - Implement event system
   - Add telemetry interval control
   - Enhance error handling
   - Create firmware flashing tools

4. **Long-term (After Topology Plan):**
   - Gateway communication
   - Mesh networking
   - Device discovery
   - Routing protocols
   - Multi-device management

## Files to Create/Update

### Firmware Files
- `firmware/sideA/main.cpp` - Update with new features
- `firmware/sideB/main.cpp` - Update with new features
- `firmware/common/commands.h` - Add new command IDs
- `firmware/common/diagnostics.h` - New diagnostics structures

### Documentation
- `docs/FIRMWARE_V2_SPEC.md` - New firmware specification
- `docs/COMMANDS_V2.md` - Enhanced command reference
- `docs/FLASHING.md` - Firmware flashing guide
- `docs/TOPOLOGY.md` - Topology plan (pending)

### Tools
- `tools/flash_firmware.py` - Firmware flashing tool
- `tools/test_commands.py` - Command testing tool
- `tools/firmware_builder.py` - Build system

## References

- Firmware Repo: https://github.com/MycosoftLabs/mycobrain
- MDP v1 Spec: `docs/protocols/MDP_V1_SPEC.md`
- Website Service: `services/mycobrain/mycobrain_service.py`
- Integration Guide: `docs/integrations/MYCOBRAIN_INTEGRATION.md`











