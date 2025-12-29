# Firmware Management System

**Date:** 2025-12-28  
**Status:** ✅ Automatic firmware update and testing system implemented

## Overview

Complete firmware management system that replicates PlatformIO/Arduino workflow for rapid firmware development and testing on MycoBrain ESP32 devices.

## Features

### ✅ Automatic Firmware Updates
- Compile firmware using PlatformIO or Arduino CLI
- Upload firmware to ESP32 devices
- Test firmware automatically after upload
- Full workflow: compile → upload → test

### ✅ Device Detection
- Automatically detects ESP32 devices on serial ports
- Lists available devices with descriptions
- Auto-selects COM4 if available

### ✅ Rapid Testing
- Quick firmware testing after upload
- Serial communication verification
- Command response validation
- Real-time output console

### ✅ Integration
- Integrated into Device Manager UI
- API endpoints for programmatic access
- Service manager integration
- MYCA agent monitoring

## Usage

### Via Device Manager UI

1. **Open Device Manager**
   - Navigate to: `http://localhost:3000/natureos/devices`
   - Click on "Firmware" tab

2. **Select Device and Firmware**
   - Choose ESP32 device port (e.g., COM4)
   - Select firmware (sideA or sideB)
   - Choose build tool (PlatformIO or Arduino CLI)

3. **Update Firmware**
   - Click "Compile & Upload & Test" for full workflow
   - Or use individual buttons: Compile, Upload, Test

4. **Monitor Progress**
   - Watch real-time output in console
   - View test results
   - Check for errors

### Via API

```bash
# Detect devices
curl http://localhost:3000/api/firmware?action=detect

# List firmware
curl http://localhost:3000/api/firmware?action=list

# Compile firmware
curl -X POST http://localhost:3000/api/firmware \
  -H "Content-Type: application/json" \
  -d '{"action": "compile", "firmware": "sideA", "use_platformio": true}'

# Upload firmware
curl -X POST http://localhost:3000/api/firmware \
  -H "Content-Type: application/json" \
  -d '{"action": "upload", "firmware": "sideA", "port": "COM4", "use_platformio": true}'

# Full workflow (compile + upload + test)
curl -X POST http://localhost:3000/api/firmware \
  -H "Content-Type: application/json" \
  -d '{"action": "full", "firmware": "sideA", "port": "COM4", "use_platformio": true, "test": true}'
```

### Via CLI

```bash
# Detect devices
python services/firmware_manager.py detect

# List firmware
python services/firmware_manager.py list

# Compile
python services/firmware_manager.py compile --firmware sideA

# Upload
python services/firmware_manager.py upload --firmware sideA --port COM4

# Test
python services/firmware_manager.py test --port COM4

# Full workflow
python services/firmware_manager.py full --firmware sideA --port COM4
```

## Firmware Configuration

### Auto-Detection

The system automatically searches for firmware in:
- `../mycobrain/firmware/`
- `../MYCOBRAIN/firmware/`
- `~/Documents/mycobrain/firmware/`
- `C:/Users/admin2/Desktop/MYCOSOFT/CODE/mycobrain/firmware/`

### Manual Registration

Edit `services/firmware_manager.py` to add custom firmware:

```python
firmware_manager.register_firmware(FirmwareConfig(
    name="sideA",
    firmware_path=Path("/path/to/firmware/sideA"),
    side="A",
    platformio_env="esp32-s3-devkitc-1",
    arduino_board="esp32:esp32:esp32s3",
))
```

## Build Tools

### PlatformIO (Recommended)
- **Command:** `pio` or `platformio`
- **Install:** `pip install platformio`
- **Config:** `platformio.ini` in firmware directory

### Arduino CLI
- **Command:** `arduino-cli`
- **Install:** Download from Arduino website
- **Config:** Board FQBN (e.g., `esp32:esp32:esp32s3`)

## Testing Workflow

After firmware upload, the system automatically:

1. **Waits for device reset** (3 seconds)
2. **Opens serial connection** (115200 baud)
3. **Sends PING command** (`{"cmd": 1}`)
4. **Sends GET_SENSOR_DATA** (`{"cmd": 2}`)
5. **Validates responses**
6. **Reports test results**

## Integration Points

### Device Manager
- New "Firmware" tab
- Integrated firmware updater component
- Real-time status and output

### Service Manager
- Can be integrated for automatic firmware updates
- Monitors firmware version
- Auto-updates on device connection

### MYCA Agent
- Monitors firmware versions
- Reports firmware status
- Can trigger firmware updates

## Files

- `services/firmware_manager.py` - Main firmware management system
- `components/myca/firmware-updater.tsx` - UI component
- `app/api/firmware/route.ts` - API endpoints
- `FIRMWARE_MANAGEMENT.md` - This documentation

## Requirements

### Python Dependencies
- `pyserial` - Serial communication
- `platformio` - PlatformIO CLI (optional)
- Standard library: `subprocess`, `pathlib`, `json`

### System Requirements
- PlatformIO installed OR Arduino CLI installed
- ESP32 toolchain configured
- Serial port access permissions

## Troubleshooting

### PlatformIO Not Found
```bash
pip install platformio
# Or
pip install -U platformio
```

### Arduino CLI Not Found
- Install Arduino CLI from: https://arduino.github.io/arduino-cli/
- Or use Arduino IDE (detected automatically)

### Port Access Denied
- Close Arduino IDE serial monitor
- Close other serial tools
- Check device manager for port conflicts

### Compilation Fails
- Check `platformio.ini` configuration
- Verify ESP32 toolchain installed
- Check firmware path is correct

### Upload Fails
- Verify device is in bootloader mode
- Check port is correct
- Try pressing reset button on device
- Verify USB cable is data-capable

## Rapid Development Workflow

1. **Edit Firmware**
   - Make changes to firmware code
   - Save files

2. **Quick Update**
   - Open Device Manager → Firmware tab
   - Select device (COM4)
   - Select firmware (sideA/sideB)
   - Click "Compile & Upload & Test"

3. **Verify**
   - Check console output
   - Review test results
   - Test device functionality

4. **Iterate**
   - Make more changes
   - Repeat update process
   - Rapid iteration cycle

## Next Steps

- [ ] Add firmware version tracking
- [ ] Implement rollback functionality
- [ ] Add firmware backup/restore
- [ ] Integrate with CI/CD pipeline
- [ ] Add firmware signing/verification
- [ ] Support OTA updates via LoRa






