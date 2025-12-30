# MycoBrain Firmware Integration

**Repository:** https://github.com/MycosoftLabs/mycobrain  
**Date:** 2025-12-28

## Repository Structure

Based on the GitHub repository, the MycoBrain firmware consists of:

### Core Files
- `sideA_firmware.cpp` - Sensor MCU firmware (Side A)
- `sideB_firmware.cpp` - Router MCU firmware (Side B)
- `firmware/` - Compiled firmware binaries
- `docs/` - Documentation
- `tools/python/` - Python tools

### Hardware Architecture
- **2× ESP32-S3-WROOM-1U modules** (ESP-1 and ESP-2)
- **1× SX1262 LoRa module** (SPI)
- **Side-A (Sensor MCU)**: Sensors, I2C, analog inputs, MOSFET outputs
- **Side-B (Router MCU)**: UART↔LoRa routing, acknowledgements, command channel

### Communication Protocol
- **MDP v1 (Mycosoft Device Protocol)**
- COBS framing
- 0x00 frame delimiter
- CRC16-CCITT integrity
- Binary payloads (not JSON)

## Current Website Integration

### Command IDs (from mycobrain_service.py)

```python
class Commands:
    NOP = 0
    PING = 1
    GET_SENSOR_DATA = 2
    SET_NEOPIXEL = 10
    NEOPIXEL_OFF = 11
    NEOPIXEL_RAINBOW = 12
    BUZZER_BEEP = 20
    BUZZER_MELODY = 21
    BUZZER_OFF = 22
    GET_BME688_1 = 30
    GET_BME688_2 = 31
```

### Current Implementation Issues

1. **Protocol Mismatch**: Website sends JSON commands, but firmware expects MDP v1 binary protocol
2. **Command Format**: Need to verify actual command structure in firmware
3. **Side Detection**: Firmware should identify Side A vs Side B automatically

## Integration Tasks

### 1. Verify Firmware Command Structure
- [ ] Check `sideA_firmware.cpp` for actual command handlers
- [ ] Check `sideB_firmware.cpp` for command routing
- [ ] Verify command IDs match between firmware and service
- [ ] Check if commands are JSON or binary MDP

### 2. Update Service to Match Firmware
- [ ] If firmware uses MDP v1 binary, update `send_command()` to use MDP encoder
- [ ] If firmware uses JSON, verify format matches
- [ ] Add proper MDP framing if needed
- [ ] Update command parsing to match firmware responses

### 3. Firmware Compatibility Check
- [ ] Verify current board firmware version
- [ ] Check if firmware supports all website commands
- [ ] Identify any missing commands
- [ ] Plan firmware upgrade if needed

### 4. Testing
- [ ] Test each command ID with actual firmware
- [ ] Verify NeoPixel commands work
- [ ] Verify buzzer commands work
- [ ] Verify sensor reading commands work
- [ ] Test Side A/B detection

## Next Steps

1. **Clone/Examine Firmware Repository**
   ```bash
   git clone https://github.com/MycosoftLabs/mycobrain.git
   ```

2. **Review Firmware Code**
   - Read `sideA_firmware.cpp` to understand command handlers
   - Read `sideB_firmware.cpp` to understand routing
   - Check protocol implementation

3. **Update Service Code**
   - Align command IDs with firmware
   - Update protocol if needed (JSON vs MDP binary)
   - Add proper error handling

4. **Test with Real Device**
   - Flash latest firmware if needed
   - Test each command through website
   - Verify all peripherals work

## References

- Repository: https://github.com/MycosoftLabs/mycobrain
- MDP v1 Protocol: See `docs/` in repository
- Hardware Specs: See README.md in repository











