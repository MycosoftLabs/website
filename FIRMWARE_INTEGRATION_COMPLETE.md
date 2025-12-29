# MycoBrain Firmware Integration - Complete

**Date:** 2025-12-28  
**Repository:** https://github.com/MycosoftLabs/mycobrain

## Integration Summary

Successfully integrated MycoBrain firmware repository with the website service. The service now supports both MDP v1 (preferred) and JSON (fallback) protocols.

## Changes Made

### 1. MDP v1 Protocol Support
- ✅ Added MDP v1 encoder/decoder integration
- ✅ Supports COBS framing and CRC16 checksums
- ✅ Binary frame structure with proper headers
- ✅ Automatic fallback to JSON if MDP unavailable

### 2. Protocol Detection
- ✅ Service detects if MDP v1 library is available
- ✅ Automatically uses MDP when available
- ✅ Falls back to JSON for compatibility

### 3. Command Mapping
- ✅ Command IDs mapped to MDP command types
- ✅ Parameters properly structured for MDP frames
- ✅ Supports all current commands (NeoPixel, Buzzer, Sensors)

### 4. Message Processing
- ✅ MDP telemetry messages properly decoded
- ✅ Event messages handled
- ✅ ACK messages processed
- ✅ JSON fallback for legacy firmware

## Command ID Mapping

| Command ID | Command Type | MDP Type | Parameters |
|------------|--------------|----------|------------|
| 0 | nop | COMMAND | {} |
| 1 | ping | COMMAND | {} |
| 2 | get_sensor_data | COMMAND | {} |
| 10 | set_neopixel | COMMAND | {r, g, b, brightness} |
| 11 | neopixel_off | COMMAND | {} |
| 12 | neopixel_rainbow | COMMAND | {} |
| 20 | buzzer_beep | COMMAND | {frequency, duration_ms} |
| 21 | buzzer_melody | COMMAND | {} |
| 22 | buzzer_off | COMMAND | {} |
| 30 | get_bme688_1 | COMMAND | {} |
| 31 | get_bme688_2 | COMMAND | {} |

## Protocol Details

### MDP v1 Frame Structure
```
[Header (13 bytes)] [Payload (JSON)] [CRC16 (2 bytes)]
- Message Type (1 byte): 0x02 = COMMAND
- Sequence (2 bytes): Big-endian
- Payload Length (2 bytes): Big-endian
- Timestamp (8 bytes): Big-endian Unix timestamp
- CRC16: CRC16-CCITT checksum
```

### COBS Encoding
- Frame is COBS-encoded before transmission
- Frame delimiter: 0x00
- No zero bytes in encoded output

## Testing Status

### ✅ Completed
- [x] MDP v1 library integration
- [x] Command encoding with MDP
- [x] Message decoding from MDP frames
- [x] JSON fallback mechanism
- [x] Protocol detection

### ⏳ Pending (Requires COM4 Access)
- [ ] Test MDP v1 communication with real device
- [ ] Verify command IDs match firmware
- [ ] Test NeoPixel commands via MDP
- [ ] Test Buzzer commands via MDP
- [ ] Verify sensor data via MDP telemetry
- [ ] Check firmware version detection

## Next Steps

1. **Release COM4 Port**
   - Close any serial monitors
   - Close Arduino IDE
   - Close other serial tools

2. **Test Connection**
   - Connect to COM4 via Device Manager
   - Service will auto-detect protocol (MDP or JSON)
   - Check diagnostics for protocol version

3. **Verify Commands**
   - Test each command through website
   - Verify responses are decoded correctly
   - Check console for protocol messages

4. **Firmware Verification**
   - Check if firmware version supports all commands
   - Verify Side A/B detection works
   - Test all peripherals (lights, buzzer, sensors)

## Files Modified

1. `services/mycobrain/mycobrain_service.py`
   - Added MDP v1 protocol support
   - Updated `send_command()` to use MDP encoder
   - Updated `_read_loop()` to decode MDP frames
   - Added telemetry/event/ACK handlers

## Compatibility

- **MDP v1 Firmware**: Full support with binary frames
- **JSON Firmware**: Fallback mode with text commands
- **Legacy Devices**: Backward compatible

## References

- Firmware Repository: https://github.com/MycosoftLabs/mycobrain
- MDP v1 Spec: `docs/protocols/MDP_V1_SPEC.md`
- Protocol Implementation: `mycosoft_mas/protocols/mdp_v1.py`




