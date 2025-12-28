# MycoBrain Serial Communication Service

A Python FastAPI service that provides REST API endpoints for communicating with MycoBrain devices via USB serial.

## Features

- **Auto-detection**: Automatically connects to MycoBrain devices on COM4 or /dev/ttyACM*
- **Real-time Sensor Data**: Read BME688 environmental sensor data (temperature, humidity, pressure, gas resistance, IAQ)
- **Peripheral Control**: Control NeoPixel LEDs and buzzer
- **WebSocket Support**: Real-time updates via WebSocket connections
- **MDP Protocol**: Full support for Mycelium Data Protocol (MDP) v1

## Requirements

- Python 3.9+
- pyserial
- fastapi
- uvicorn

## Quick Start

### 1. Install Dependencies

```bash
cd services/mycobrain
pip install pyserial fastapi uvicorn[standard]
```

### 2. Connect MycoBrain

Connect your MycoBrain device via USB-C. It should appear as:
- Windows: `COM4` (or another COM port)
- Linux: `/dev/ttyACM0`
- macOS: `/dev/tty.usbmodem*`

### 3. Start the Service

```bash
python mycobrain_service.py
```

Or with uvicorn for development:

```bash
uvicorn mycobrain_service:app --host 0.0.0.0 --port 8765 --reload
```

### 4. Access the API

The service will be available at `http://localhost:8765`

## API Endpoints

### Health Check
```
GET /health
```
Returns service status and number of connected devices.

### List Serial Ports
```
GET /ports
```
Lists all available serial ports on the system.

### List Connected Devices
```
GET /devices
```
Returns all connected MycoBrain devices with their status and sensor data.

### Connect to Device
```
POST /devices/connect/{port}
```
Connect to a MycoBrain device on the specified port.

### Disconnect Device
```
POST /devices/disconnect/{port}
```
Disconnect from a MycoBrain device.

### Get Device Status
```
GET /devices/{port}/status
```
Get detailed status of a specific device.

### Get Sensor Data
```
GET /devices/{port}/sensors
```
Request and return sensor data from both BME688 sensors.

### Control NeoPixel LEDs
```
POST /devices/{port}/neopixel
Content-Type: application/json

{
  "r": 255,
  "g": 0,
  "b": 0,
  "brightness": 128,
  "mode": "solid"  // solid, rainbow, off
}
```

### Control Buzzer
```
POST /devices/{port}/buzzer
Content-Type: application/json

{
  "frequency": 1000,
  "duration_ms": 100,
  "pattern": "beep"  // beep, melody, off
}
```

### Send Raw Command
```
POST /devices/{port}/command
Content-Type: application/json

{
  "cmd_id": 1,
  "dst": 161,
  "data": [1, 2, 3]
}
```

### WebSocket Real-time Updates
```
WS /ws/{port}
```
Connect to receive real-time device updates every 500ms.

## Command IDs

| ID | Command | Description |
|----|---------|-------------|
| 0 | NOP | No operation |
| 1 | PING | Ping device |
| 2 | GET_SENSOR_DATA | Request all sensor data |
| 10 | SET_NEOPIXEL | Set NeoPixel color |
| 11 | NEOPIXEL_OFF | Turn off NeoPixels |
| 12 | NEOPIXEL_RAINBOW | Rainbow animation |
| 20 | BUZZER_BEEP | Single beep |
| 21 | BUZZER_MELODY | Play melody |
| 22 | BUZZER_OFF | Stop buzzer |
| 30 | GET_BME688_1 | Request BME688 #1 data |
| 31 | GET_BME688_2 | Request BME688 #2 data |

## Integration with Next.js

The website includes API routes that proxy to this service:

- `/api/mycobrain` - List devices
- `/api/mycobrain/[port]/sensors` - Get sensor data
- `/api/mycobrain/[port]/control` - Control peripherals

Set the `MYCOBRAIN_SERVICE_URL` environment variable to configure the service URL (default: `http://localhost:8765`).

## Troubleshooting

### Device not detected

1. Check if the device appears in Device Manager (Windows) or `ls /dev/tty*` (Linux/Mac)
2. Ensure no other application is using the serial port
3. Try unplugging and replugging the device

### Connection fails

1. Check the baud rate matches (115200)
2. Ensure the firmware is flashed correctly
3. Check for driver issues with ESP32-S3

### No sensor data

1. Verify the BME688 sensors are connected to the I2C bus
2. Check the firmware is configured for dual BME688
3. Request data using the GET_BME688_1 and GET_BME688_2 commands

## Development

To add new commands or features:

1. Add command ID to the `Commands` class
2. Add endpoint in the FastAPI app
3. Update the `send_command` method if needed
4. Add corresponding endpoint in the Next.js API routes
