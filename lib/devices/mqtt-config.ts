/**
 * MQTT Configuration for Device Ingestion
 * 
 * Configuration and utilities for MQTT broker connections.
 * Supports Eclipse Mosquitto, EMQX, and other MQTT 3.1.1/5.0 brokers.
 */

export interface MQTTConfig {
  broker: {
    host: string
    port: number
    protocol: "mqtt" | "mqtts" | "ws" | "wss"
    username?: string
    password?: string
    clientId?: string
  }
  topics: {
    telemetry: string      // Device telemetry data
    commands: string       // Commands to devices
    status: string         // Device status updates
    discovery: string      // Device auto-discovery
    events: string         // Device events/alerts
  }
  qos: {
    telemetry: 0 | 1 | 2
    commands: 0 | 1 | 2
    events: 0 | 1 | 2
  }
  options: {
    keepAlive: number      // seconds
    connectTimeout: number // milliseconds
    reconnectPeriod: number // milliseconds
    clean: boolean
  }
}

/**
 * Default MQTT configuration
 */
export const defaultMQTTConfig: MQTTConfig = {
  broker: {
    host: process.env.MQTT_BROKER_HOST || "localhost",
    port: parseInt(process.env.MQTT_BROKER_PORT || "1883"),
    protocol: (process.env.MQTT_PROTOCOL as MQTTConfig["broker"]["protocol"]) || "mqtt",
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    clientId: `natureos-${process.env.NODE_ENV || "dev"}-${Date.now()}`,
  },
  topics: {
    telemetry: "natureos/devices/+/telemetry",
    commands: "natureos/devices/+/commands",
    status: "natureos/devices/+/status",
    discovery: "natureos/discovery",
    events: "natureos/events/#",
  },
  qos: {
    telemetry: 0, // At most once - acceptable for frequent sensor data
    commands: 1,  // At least once - ensure commands are delivered
    events: 1,    // At least once - don't lose events
  },
  options: {
    keepAlive: 60,
    connectTimeout: 30000,
    reconnectPeriod: 5000,
    clean: true,
  },
}

/**
 * Topic templates for device communication
 */
export const topicTemplates = {
  deviceTelemetry: (deviceId: string) => `natureos/devices/${deviceId}/telemetry`,
  deviceCommands: (deviceId: string) => `natureos/devices/${deviceId}/commands`,
  deviceStatus: (deviceId: string) => `natureos/devices/${deviceId}/status`,
  deviceConfig: (deviceId: string) => `natureos/devices/${deviceId}/config`,
  
  // MycoBrain specific
  mycobrain: {
    telemetry: (deviceId: string) => `mycobrain/${deviceId}/telemetry`,
    sensors: (deviceId: string) => `mycobrain/${deviceId}/sensors`,
    commands: (deviceId: string) => `mycobrain/${deviceId}/commands`,
    response: (deviceId: string) => `mycobrain/${deviceId}/response`,
  },
  
  // Environmental sensors
  environment: {
    temperature: (location: string) => `natureos/environment/${location}/temperature`,
    humidity: (location: string) => `natureos/environment/${location}/humidity`,
    airQuality: (location: string) => `natureos/environment/${location}/air_quality`,
  },
}

/**
 * Telemetry message format
 */
export interface TelemetryMessage {
  deviceId: string
  timestamp: string
  type: "sensor" | "status" | "event" | "heartbeat"
  data: {
    // Sensor readings
    temperature?: number
    humidity?: number
    pressure?: number
    gasResistance?: number
    iaq?: number
    co2?: number
    voc?: number
    
    // Device status
    uptime?: number
    freeHeap?: number
    wifiRssi?: number
    batteryLevel?: number
    
    // Custom data
    [key: string]: unknown
  }
  metadata?: {
    firmwareVersion?: string
    hardwareVersion?: string
    location?: {
      latitude: number
      longitude: number
      altitude?: number
    }
  }
}

/**
 * Command message format
 */
export interface CommandMessage {
  commandId: string
  timestamp: string
  action: string
  parameters?: Record<string, unknown>
  timeout?: number // milliseconds
}

/**
 * Status message format
 */
export interface StatusMessage {
  deviceId: string
  timestamp: string
  status: "online" | "offline" | "error" | "updating"
  details?: {
    lastSeen?: string
    errorMessage?: string
    uptimeSeconds?: number
  }
}

/**
 * Generate MQTT broker URL from config
 */
export function getMQTTUrl(config: MQTTConfig = defaultMQTTConfig): string {
  const { protocol, host, port, username, password } = config.broker
  
  if (username && password) {
    return `${protocol}://${username}:${password}@${host}:${port}`
  }
  
  return `${protocol}://${host}:${port}`
}

/**
 * Docker Compose configuration for MQTT broker (Mosquitto)
 */
export const mosquittoDockerConfig = `
# Eclipse Mosquitto MQTT Broker
# Add to docker-compose.yml

services:
  mosquitto:
    image: eclipse-mosquitto:2
    container_name: natureos-mqtt
    ports:
      - "1883:1883"   # MQTT
      - "9001:9001"   # WebSocket
    volumes:
      - ./mosquitto/config:/mosquitto/config
      - ./mosquitto/data:/mosquitto/data
      - ./mosquitto/log:/mosquitto/log
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "mosquitto_sub", "-t", "\\$SYS/#", "-C", "1", "-i", "healthcheck", "-W", "3"]
      interval: 30s
      timeout: 10s
      retries: 3
`

/**
 * Mosquitto configuration file content
 */
export const mosquittoConfig = `
# mosquitto.conf
# Place in ./mosquitto/config/mosquitto.conf

# Persistence
persistence true
persistence_location /mosquitto/data/

# Logging
log_dest file /mosquitto/log/mosquitto.log
log_type all

# Default listener (MQTT)
listener 1883
protocol mqtt

# WebSocket listener
listener 9001
protocol websockets

# Authentication (optional - uncomment for auth)
# password_file /mosquitto/config/passwd
# allow_anonymous false

# Allow anonymous for development
allow_anonymous true
`

/**
 * Environment variables template
 */
export const envTemplate = `
# MQTT Configuration
MQTT_BROKER_HOST=localhost
MQTT_BROKER_PORT=1883
MQTT_PROTOCOL=mqtt
MQTT_USERNAME=
MQTT_PASSWORD=
`
