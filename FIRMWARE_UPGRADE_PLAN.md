# MycoBrain Firmware Upgrade Plan

**Date:** 2025-12-28  
**Repository:** https://github.com/MycosoftLabs/mycobrain  
**Goal:** Create firmware that integrates directly with website/system

## Current Status

### Firmware Repository
- **Location:** https://github.com/MycosoftLabs/mycobrain
- **Side A:** `sideA_firmware.cpp` - Sensor MCU
- **Side B:** `sideB_firmware.cpp` - Router MCU
- **Protocol:** MDP v1 (COBS + CRC16)

### Website Integration
- ✅ MDP v1 protocol support added
- ✅ Command encoding/decoding implemented
- ✅ JSON fallback for compatibility
- ⏳ Testing with actual device pending

## Firmware Requirements for Direct Integration

### 1. Protocol Support
- [x] MDP v1 binary protocol (COBS + CRC16)
- [ ] JSON fallback mode for debugging
- [ ] Protocol version negotiation
- [ ] Automatic protocol detection

### 2. Command Support
Required commands for website integration:

| Command ID | Command | Purpose | Status |
|------------|---------|---------|--------|
| 0 | NOP | No operation | ✅ |
| 1 | PING | Device responsiveness | ✅ |
| 2 | GET_SENSOR_DATA | Request all sensors | ✅ |
| 10 | SET_NEOPIXEL | Set RGB color | ⏳ Verify |
| 11 | NEOPIXEL_OFF | Turn off LEDs | ⏳ Verify |
| 12 | NEOPIXEL_RAINBOW | Rainbow animation | ⏳ Verify |
| 20 | BUZZER_BEEP | Single beep | ⏳ Verify |
| 21 | BUZZER_MELODY | Play melody | ⏳ Verify |
| 22 | BUZZER_OFF | Turn off buzzer | ⏳ Verify |
| 30 | GET_BME688_1 | Read sensor 1 | ⏳ Verify |
| 31 | GET_BME688_2 | Read sensor 2 | ⏳ Verify |

### 3. Device Identification
- [ ] Side A/B auto-detection
- [ ] Firmware version reporting
- [ ] Device capabilities reporting
- [ ] Serial number/unique ID

### 4. Telemetry Format
- [ ] Standardized telemetry structure
- [ ] BME688 sensor data (temp, humidity, pressure, gas)
- [ ] Analog input readings (AI1-AI4)
- [ ] MOSFET states
- [ ] I2C device list
- [ ] Power status
- [ ] Uptime reporting

### 5. Error Handling
- [ ] Command acknowledgment (ACK)
- [ ] Error event reporting
- [ ] Invalid command handling
- [ ] Sensor failure detection

## New Firmware Features Needed

### 1. Enhanced Diagnostics
```cpp
// New command: GET_DIAGNOSTICS (0x40)
{
  "firmware_version": "1.0.0",
  "side": "A" or "B",
  "mdp_version": "1.0",
  "capabilities": {
    "neopixel": true,
    "buzzer": true,
    "bme688_count": 2,
    "lora": true,
    "i2c_bus": true,
    "analog_inputs": 4,
    "mosfet_outputs": 4
  },
  "status": "ok",
  "uptime_seconds": 3600,
  "lora_initialized": true
}
```

### 2. Website-Specific Commands
```cpp
// Enhanced NeoPixel control
SET_NEOPIXEL (0x0A):
  Parameters: {r: 0-255, g: 0-255, b: 0-255, brightness: 0-255}
  Response: ACK with current state

// Enhanced Buzzer control  
BUZZER_BEEP (0x14):
  Parameters: {frequency: 100-20000, duration_ms: 0-65535}
  Response: ACK when complete

// Sensor data request
GET_SENSOR_DATA (0x02):
  Response: Full telemetry with all sensors
```

### 3. Real-time Telemetry
- Automatic telemetry transmission every N seconds
- Configurable telemetry interval
- Event-driven telemetry on threshold changes
- Low-power mode support

### 4. Side A/B Communication
- Side B routes commands to Side A
- Side A sends telemetry to Side B
- Side B forwards to serial/LoRa
- Proper acknowledgment chain

## Firmware Architecture

### Side A (Sensor MCU) Responsibilities
1. **Sensor Management**
   - BME688 sensor reading (2x sensors)
   - I2C bus scanning
   - Analog input sampling (AI1-AI4)
   - Sensor calibration

2. **Actuator Control**
   - NeoPixel LED control
   - Buzzer control
   - MOSFET output control
   - PWM outputs

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

### Side B (Router MCU) Responsibilities
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

## Implementation Plan

### Phase 1: Current Firmware Assessment
1. ✅ Connect to COM4
2. ⏳ Read current firmware version
3. ⏳ Test all commands
4. ⏳ Verify protocol compatibility
5. ⏳ Document current capabilities

### Phase 2: Firmware Updates
1. **Update Side A Firmware**
   - Add enhanced diagnostics command
   - Improve sensor data formatting
   - Add capability reporting
   - Enhance error handling

2. **Update Side B Firmware**
   - Improve protocol handling
   - Add device identification
   - Enhance command routing
   - Add status reporting

3. **Protocol Enhancements**
   - Add JSON mode for debugging
   - Protocol version negotiation
   - Automatic protocol detection
   - Backward compatibility

### Phase 3: Integration Testing
1. Test all commands through website
2. Verify telemetry streaming
3. Test error handling
4. Verify Side A/B communication
5. Test with multiple devices

### Phase 4: Topology Integration
1. Wait for topology plan from user
2. Design gateway communication
3. Implement mesh networking
4. Add device discovery
5. Implement routing protocols

## Code Structure

### Recommended Firmware Structure
```
mycobrain/
├── firmware/
│   ├── sideA/
│   │   ├── main.cpp
│   │   ├── sensors.cpp
│   │   ├── actuators.cpp
│   │   ├── commands.cpp
│   │   └── mdp_protocol.cpp
│   ├── sideB/
│   │   ├── main.cpp
│   │   ├── router.cpp
│   │   ├── serial.cpp
│   │   ├── lora.cpp
│   │   └── mdp_protocol.cpp
│   └── common/
│       ├── mdp_v1.h
│       ├── cobs.h
│       └── commands.h
├── docs/
│   ├── PROTOCOL.md
│   ├── COMMANDS.md
│   └── TOPOLOGY.md
└── tools/
    ├── flash_firmware.py
    └── test_commands.py
```

## Next Steps

1. **Immediate:**
   - Test COM4 connection
   - Read current firmware diagnostics
   - Verify command compatibility

2. **Short-term:**
   - Update firmware with enhancements
   - Test all website commands
   - Verify telemetry streaming

3. **Medium-term:**
   - Implement topology plan
   - Add gateway support
   - Mesh networking

4. **Long-term:**
   - Multi-device management
   - Cloud integration
   - Advanced features

## Testing Checklist

### Connection Testing
- [ ] COM4 connection successful
- [ ] Device responds to PING
- [ ] Protocol detected (MDP/JSON)
- [ ] Firmware version read

### Command Testing
- [ ] NeoPixel commands work
- [ ] Buzzer commands work
- [ ] Sensor reading commands work
- [ ] Diagnostics command works

### Telemetry Testing
- [ ] Telemetry received
- [ ] Sensor data accurate
- [ ] Real-time updates working
- [ ] Event reporting works

### Integration Testing
- [ ] Website controls device
- [ ] Device reports to website
- [ ] Error handling works
- [ ] Multiple devices supported

## References

- Firmware Repo: https://github.com/MycosoftLabs/mycobrain
- MDP v1 Spec: `docs/protocols/MDP_V1_SPEC.md`
- Website Service: `services/mycobrain/mycobrain_service.py`










