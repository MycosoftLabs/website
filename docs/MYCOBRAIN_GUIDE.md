# MycoBrain Device Integration

## Overview

MycoBrain is Mycosoft's ESP32-S3 environmental sensor for mushroom cultivation.

## Hardware

- ESP32-S3 with 16MB Flash, OPI PSRAM
- Dual BME688 sensors (AMB at 0x77, ENV at 0x76)
- NeoPixel LED on GPIO15
- MOSFET outputs on GPIO12, 13, 14
- Analog inputs on GPIO6, 7, 10, 11

## Telemetry

- Temperature, humidity, pressure
- IAQ (Indoor Air Quality)
- CO2 and VOC equivalents
- System stats (uptime, heap, WiFi RSSI)

## API

- GET /api/mycobrain/devices - List devices
- GET /api/mycobrain/devices/{id}/telemetry - Get readings
- POST /api/mycobrain/devices/{id}/command - Send command

## Running Service

```bash
npm run services:mycobrain
```

## CLI Commands

```
status, sensors, led, output, i2c, wifi, reboot
```
