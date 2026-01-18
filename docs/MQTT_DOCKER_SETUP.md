# MQTT Broker Docker Setup

**Date**: 2026-01-16  
**Status**: DOCUMENTATION COMPLETE

---

## Overview

This document describes how to add a Mosquitto MQTT broker to the Docker stack for device telemetry ingestion.

---

## Docker Compose Configuration

Add the following service to `docker-compose.always-on.yml`:

```yaml
services:
  # ... existing services ...

  # MQTT Broker for IoT device telemetry
  mosquitto:
    image: eclipse-mosquitto:2.0
    container_name: mycosoft-mosquitto
    restart: unless-stopped
    ports:
      - "1883:1883"    # MQTT standard port
      - "9001:9001"    # WebSocket port
    volumes:
      - ./docker/mosquitto/config:/mosquitto/config:ro
      - ./docker/mosquitto/data:/mosquitto/data
      - ./docker/mosquitto/log:/mosquitto/log
    networks:
      - mycosoft-network
    healthcheck:
      test: ["CMD", "mosquitto_sub", "-t", "$$SYS/#", "-C", "1", "-i", "healthcheck", "-W", "3"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## Mosquitto Configuration

Create the configuration file at `docker/mosquitto/config/mosquitto.conf`:

```conf
# Mosquitto Configuration for NatureOS

# Persistence
persistence true
persistence_location /mosquitto/data/

# Logging
log_dest file /mosquitto/log/mosquitto.log
log_dest stdout
log_type error
log_type warning
log_type notice
log_type information

# Network
listener 1883
protocol mqtt

# WebSocket support
listener 9001
protocol websockets

# Allow anonymous connections for development
# For production, set to false and configure authentication
allow_anonymous true

# Authentication (uncomment for production)
# password_file /mosquitto/config/passwd
# allow_anonymous false

# ACL (uncomment for production)
# acl_file /mosquitto/config/acl.conf
```

---

## Directory Structure

```
docker/
└── mosquitto/
    ├── config/
    │   ├── mosquitto.conf
    │   ├── passwd           # (optional) Password file
    │   └── acl.conf         # (optional) ACL rules
    ├── data/                # Persistence storage
    └── log/                 # Log files
```

---

## Create Directories

```bash
mkdir -p docker/mosquitto/config
mkdir -p docker/mosquitto/data
mkdir -p docker/mosquitto/log
```

---

## Environment Variables

Add to `.env` or `docker-compose.yml` environment:

```env
# MQTT Configuration
MQTT_BROKER_URL=mqtt://mosquitto:1883
MQTT_BROKER_PUBLIC_URL=mqtt://localhost:1883
MQTT_WEBSOCKET_URL=ws://localhost:9001
MQTT_USERNAME=
MQTT_PASSWORD=
```

---

## Website Service Update

Update the `mycosoft-website` service to depend on mosquitto:

```yaml
  mycosoft-website:
    # ... existing config ...
    depends_on:
      - mosquitto
    environment:
      - MQTT_BROKER_URL=mqtt://mosquitto:1883
```

---

## Production Security

For production deployments:

### 1. Create Password File

```bash
# Generate password file
docker exec mycosoft-mosquitto mosquitto_passwd -c /mosquitto/config/passwd natureos
# Enter password when prompted
```

### 2. Create ACL File

`docker/mosquitto/config/acl.conf`:

```conf
# NatureOS MQTT ACL

# Default: deny all
user natureos
topic readwrite #

# Device topics
pattern readwrite mycobrain/%c/+
pattern readwrite iot/%c/+
pattern readwrite lorawan/%c/+

# Home Assistant discovery
pattern read homeassistant/#
```

### 3. Enable TLS

```conf
# TLS Configuration
listener 8883
protocol mqtt
cafile /mosquitto/config/ca.crt
certfile /mosquitto/config/server.crt
keyfile /mosquitto/config/server.key
require_certificate false
```

---

## Testing

### Test with mosquitto_sub/pub:

```bash
# Subscribe to all topics
docker exec mycosoft-mosquitto mosquitto_sub -t "#" -v

# Publish test message
docker exec mycosoft-mosquitto mosquitto_pub -t "mycobrain/test/telemetry" -m '{"temp": 22.5}'
```

### Test from host:

```bash
# Install mosquitto clients
# macOS: brew install mosquitto
# Ubuntu: apt install mosquitto-clients
# Windows: Download from mosquitto.org

# Subscribe
mosquitto_sub -h localhost -t "#" -v

# Publish
mosquitto_pub -h localhost -t "mycobrain/device-001/telemetry" -m '{"temp": 23.1, "humidity": 65}'
```

---

## MQTT Topics Reference

| Topic Pattern | Description |
|---------------|-------------|
| `mycobrain/{deviceId}/telemetry` | MycoBrain sensor data |
| `mycobrain/{deviceId}/status` | MycoBrain online status |
| `mycobrain/{deviceId}/command` | Commands to MycoBrain |
| `iot/{deviceId}/telemetry` | Generic IoT telemetry |
| `iot/{deviceId}/status` | Generic IoT status |
| `iot/{deviceId}/command` | Commands to generic devices |
| `lorawan/{appId}/device/{devEUI}/event/up` | ChirpStack uplink |
| `homeassistant/{component}/{nodeId}/{objectId}/config` | HA discovery |
| `homeassistant/{component}/{objectId}/state` | HA state updates |

---

## Integration with NatureOS

The MQTT service (`lib/devices/mqtt-service.ts`) connects to this broker and:

1. Subscribes to all device topics
2. Parses incoming telemetry
3. Creates OEI observations
4. Publishes to the event bus
5. Stores in the database

---

## Monitoring

### View logs:
```bash
docker logs mycosoft-mosquitto -f
```

### Check connections:
```bash
docker exec mycosoft-mosquitto cat /mosquitto/log/mosquitto.log | grep -i connect
```

---

*Document generated by MYCA Integration System - 2026-01-16*
