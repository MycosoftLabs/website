/**
 * MQTT Service for Device Connections
 * 
 * Provides a complete MQTT client service for:
 * - Connecting to MQTT broker
 * - Subscribing to device topics
 * - Publishing commands to devices
 * - Processing incoming telemetry
 * - Integrating with OEI event bus
 */

import { getEventBus, EventBusChannel } from "@/lib/oei/event-bus"
import type { Entity, Observation, Event as OEIEvent, GeoLocation, ObservationType } from "@/types/oei"

// =============================================================================
// TYPES
// =============================================================================

export interface MqttServiceConfig {
  brokerUrl: string
  clientId?: string
  username?: string
  password?: string
  reconnectPeriod?: number
  keepalive?: number
  cleanSession?: boolean
}

export interface MqttMessage {
  topic: string
  payload: string | Buffer
  qos?: 0 | 1 | 2
  retain?: boolean
}

export interface DeviceTelemetry {
  deviceId: string
  deviceType: string
  timestamp: string
  readings: Record<string, number | string | boolean>
  location?: GeoLocation
  metadata?: Record<string, unknown>
}

export interface DeviceCommand {
  deviceId: string
  command: string
  params?: Record<string, unknown>
  timestamp?: string
}

type MessageHandler = (topic: string, payload: Buffer) => void | Promise<void>
type ConnectionHandler = () => void
type ErrorHandler = (error: Error) => void

// =============================================================================
// TOPIC TEMPLATES
// =============================================================================

export const MQTT_TOPICS = {
  // MycoBrain devices
  MYCOBRAIN: {
    TELEMETRY: "mycobrain/+/telemetry",
    STATUS: "mycobrain/+/status",
    COMMAND: "mycobrain/{deviceId}/command",
    EVENT: "mycobrain/+/event",
  },
  
  // Generic IoT devices
  IOT: {
    TELEMETRY: "iot/+/telemetry",
    STATUS: "iot/+/status",
    COMMAND: "iot/{deviceId}/command",
    EVENT: "iot/+/event",
  },
  
  // ChirpStack LoRaWAN
  LORAWAN: {
    UPLINK: "application/+/device/+/event/up",
    DOWNLINK: "application/{appId}/device/{devEUI}/command/down",
    JOIN: "application/+/device/+/event/join",
    STATUS: "application/+/device/+/event/status",
  },
  
  // Home Assistant
  HOMEASSISTANT: {
    DISCOVERY: "homeassistant/+/+/+/config",
    STATE: "homeassistant/+/+/state",
    COMMAND: "homeassistant/+/+/set",
    AVAILABILITY: "homeassistant/+/+/availability",
  },
  
  // NatureOS internal
  NATUREOS: {
    ENTITY: "natureos/entity/+",
    OBSERVATION: "natureos/observation/+",
    EVENT: "natureos/event/+",
    COMMAND: "natureos/command/+",
  },
} as const

// =============================================================================
// MQTT SERVICE CLASS
// =============================================================================

export class MqttService {
  private config: MqttServiceConfig
  private client: any = null  // Will be MQTT.js client
  private connected = false
  private reconnecting = false
  private subscriptions = new Map<string, Set<MessageHandler>>()
  private onConnectHandlers: ConnectionHandler[] = []
  private onDisconnectHandlers: ConnectionHandler[] = []
  private onErrorHandlers: ErrorHandler[] = []
  private messageQueue: MqttMessage[] = []
  
  constructor(config?: Partial<MqttServiceConfig>) {
    this.config = {
      brokerUrl: process.env.MQTT_BROKER_URL || "mqtt://localhost:1883",
      clientId: config?.clientId || `natureos_${Math.random().toString(16).substring(2, 10)}`,
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      reconnectPeriod: 5000,
      keepalive: 60,
      cleanSession: true,
      ...config,
    }
  }

  // ===========================================================================
  // CONNECTION MANAGEMENT
  // ===========================================================================

  /**
   * Connect to MQTT broker
   */
  async connect(): Promise<void> {
    if (this.connected) {
      console.log("[MQTT] Already connected")
      return
    }

    // Dynamic import for mqtt.js (browser/node compatible)
    const mqtt = await import("mqtt")
    
    return new Promise((resolve, reject) => {
      try {
        console.log(`[MQTT] Connecting to ${this.config.brokerUrl}...`)
        
        this.client = mqtt.connect(this.config.brokerUrl, {
          clientId: this.config.clientId,
          username: this.config.username,
          password: this.config.password,
          reconnectPeriod: this.config.reconnectPeriod,
          keepalive: this.config.keepalive,
          clean: this.config.cleanSession,
        })

        this.client.on("connect", () => {
          console.log("[MQTT] Connected successfully")
          this.connected = true
          this.reconnecting = false
          this.onConnectHandlers.forEach(h => h())
          this.flushMessageQueue()
          resolve()
        })

        this.client.on("message", (topic: string, payload: Buffer) => {
          this.handleMessage(topic, payload)
        })

        this.client.on("error", (error: Error) => {
          console.error("[MQTT] Error:", error.message)
          this.onErrorHandlers.forEach(h => h(error))
          if (!this.connected) {
            reject(error)
          }
        })

        this.client.on("close", () => {
          console.log("[MQTT] Connection closed")
          this.connected = false
          this.onDisconnectHandlers.forEach(h => h())
        })

        this.client.on("reconnect", () => {
          console.log("[MQTT] Reconnecting...")
          this.reconnecting = true
        })

        this.client.on("offline", () => {
          console.log("[MQTT] Offline")
          this.connected = false
        })

      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Disconnect from MQTT broker
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      return new Promise((resolve) => {
        this.client.end(false, {}, () => {
          this.connected = false
          this.client = null
          console.log("[MQTT] Disconnected")
          resolve()
        })
      })
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected
  }

  // ===========================================================================
  // SUBSCRIPTION MANAGEMENT
  // ===========================================================================

  /**
   * Subscribe to a topic
   */
  async subscribe(topic: string, handler?: MessageHandler): Promise<void> {
    // Store handler
    if (handler) {
      if (!this.subscriptions.has(topic)) {
        this.subscriptions.set(topic, new Set())
      }
      this.subscriptions.get(topic)!.add(handler)
    }

    // Subscribe if connected
    if (this.client && this.connected) {
      return new Promise((resolve, reject) => {
        this.client.subscribe(topic, { qos: 1 }, (err: Error | null) => {
          if (err) {
            console.error(`[MQTT] Failed to subscribe to ${topic}:`, err)
            reject(err)
          } else {
            console.log(`[MQTT] Subscribed to ${topic}`)
            resolve()
          }
        })
      })
    }
  }

  /**
   * Unsubscribe from a topic
   */
  async unsubscribe(topic: string, handler?: MessageHandler): Promise<void> {
    // Remove handler
    if (handler && this.subscriptions.has(topic)) {
      this.subscriptions.get(topic)!.delete(handler)
      if (this.subscriptions.get(topic)!.size === 0) {
        this.subscriptions.delete(topic)
      }
    }

    // Unsubscribe if no more handlers
    if (!this.subscriptions.has(topic) && this.client && this.connected) {
      return new Promise((resolve, reject) => {
        this.client.unsubscribe(topic, (err: Error | null) => {
          if (err) reject(err)
          else resolve()
        })
      })
    }
  }

  /**
   * Subscribe to all device topics
   */
  async subscribeToAllDevices(): Promise<void> {
    const topics = [
      MQTT_TOPICS.MYCOBRAIN.TELEMETRY,
      MQTT_TOPICS.MYCOBRAIN.STATUS,
      MQTT_TOPICS.MYCOBRAIN.EVENT,
      MQTT_TOPICS.IOT.TELEMETRY,
      MQTT_TOPICS.IOT.STATUS,
      MQTT_TOPICS.IOT.EVENT,
      MQTT_TOPICS.LORAWAN.UPLINK,
      MQTT_TOPICS.LORAWAN.JOIN,
      MQTT_TOPICS.HOMEASSISTANT.STATE,
      MQTT_TOPICS.HOMEASSISTANT.DISCOVERY,
    ]

    for (const topic of topics) {
      await this.subscribe(topic)
    }
  }

  // ===========================================================================
  // PUBLISHING
  // ===========================================================================

  /**
   * Publish a message
   */
  async publish(topic: string, payload: string | object, options?: { qos?: 0 | 1 | 2; retain?: boolean }): Promise<void> {
    const message = typeof payload === "object" ? JSON.stringify(payload) : payload
    
    if (!this.connected) {
      // Queue message for later
      this.messageQueue.push({
        topic,
        payload: message,
        qos: options?.qos ?? 1,
        retain: options?.retain ?? false,
      })
      console.log(`[MQTT] Queued message for ${topic} (not connected)`)
      return
    }

    return new Promise((resolve, reject) => {
      this.client.publish(topic, message, {
        qos: options?.qos ?? 1,
        retain: options?.retain ?? false,
      }, (err: Error | null) => {
        if (err) {
          console.error(`[MQTT] Failed to publish to ${topic}:`, err)
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  /**
   * Send command to a device
   */
  async sendCommand(command: DeviceCommand): Promise<void> {
    const topic = command.deviceId.startsWith("mycobrain")
      ? `mycobrain/${command.deviceId}/command`
      : `iot/${command.deviceId}/command`

    await this.publish(topic, {
      command: command.command,
      params: command.params || {},
      timestamp: command.timestamp || new Date().toISOString(),
    })
  }

  // ===========================================================================
  // MESSAGE HANDLING
  // ===========================================================================

  /**
   * Handle incoming message
   */
  private async handleMessage(topic: string, payload: Buffer): Promise<void> {
    // Find matching handlers
    for (const [pattern, handlers] of this.subscriptions) {
      if (this.topicMatches(pattern, topic)) {
        for (const handler of handlers) {
          try {
            await handler(topic, payload)
          } catch (error) {
            console.error(`[MQTT] Handler error for ${topic}:`, error)
          }
        }
      }
    }

    // Process by topic type
    try {
      if (topic.includes("/telemetry")) {
        await this.processTelemetry(topic, payload)
      } else if (topic.includes("/status")) {
        await this.processStatus(topic, payload)
      } else if (topic.includes("/event")) {
        await this.processEvent(topic, payload)
      } else if (topic.startsWith("homeassistant/")) {
        await this.processHomeAssistant(topic, payload)
      } else if (topic.includes("/event/up")) {
        await this.processLoRaWAN(topic, payload)
      }
    } catch (error) {
      console.error(`[MQTT] Failed to process ${topic}:`, error)
    }
  }

  /**
   * Process telemetry message
   */
  private async processTelemetry(topic: string, payload: Buffer): Promise<void> {
    const parts = topic.split("/")
    const deviceType = parts[0]
    const deviceId = parts[1]

    let data: DeviceTelemetry
    try {
      const parsed = JSON.parse(payload.toString())
      data = {
        deviceId,
        deviceType,
        timestamp: parsed.timestamp || new Date().toISOString(),
        readings: parsed,
        location: parsed.location,
        metadata: parsed.metadata,
      }
    } catch {
      console.warn(`[MQTT] Non-JSON telemetry from ${deviceId}`)
      return
    }

    // Create observations from readings
    const eventBus = getEventBus()
    const observations = this.telemetryToObservations(data)
    
    for (const obs of observations) {
      await eventBus.publishObservation(obs)
    }
  }

  /**
   * Process status message
   */
  private async processStatus(topic: string, payload: Buffer): Promise<void> {
    const parts = topic.split("/")
    const deviceType = parts[0]
    const deviceId = parts[1]

    try {
      const status = JSON.parse(payload.toString())
      const eventBus = getEventBus()
      
      // Update entity status
      await eventBus.publishEntity({
        id: `${deviceType}_${deviceId}`,
        type: "device",
        name: status.name || deviceId,
        status: status.online ? "active" : "inactive",
        lastSeenAt: new Date().toISOString(),
        location: status.location,
        properties: status,
        provenance: {
          source: deviceType,
          sourceId: deviceId,
          collectedAt: new Date().toISOString(),
          reliability: 1.0,
        },
      })
    } catch (error) {
      console.error(`[MQTT] Failed to process status from ${deviceId}:`, error)
    }
  }

  /**
   * Process event message
   */
  private async processEvent(topic: string, payload: Buffer): Promise<void> {
    const parts = topic.split("/")
    const deviceId = parts[1]

    try {
      const event = JSON.parse(payload.toString())
      const eventBus = getEventBus()
      
      await eventBus.publishEvent({
        id: `evt_${deviceId}_${Date.now()}`,
        type: event.type || "device_alert",
        severity: event.severity || "info",
        title: event.title || `Event from ${deviceId}`,
        description: event.description,
        location: event.location,
        occurredAt: event.timestamp || new Date().toISOString(),
        detectedAt: new Date().toISOString(),
        status: "active",
        source: "mqtt",
        properties: event,
        provenance: {
          source: "mqtt",
          sourceId: deviceId,
          collectedAt: new Date().toISOString(),
          reliability: 0.9,
        },
      })
    } catch (error) {
      console.error(`[MQTT] Failed to process event from ${deviceId}:`, error)
    }
  }

  /**
   * Process Home Assistant message
   */
  private async processHomeAssistant(topic: string, payload: Buffer): Promise<void> {
    // Delegate to Home Assistant bridge
    // homeassistant/{component}/{node_id}/{object_id}/config
    // homeassistant/{component}/{object_id}/state
    console.log(`[MQTT] Home Assistant message on ${topic}`)
  }

  /**
   * Process LoRaWAN uplink
   */
  private async processLoRaWAN(topic: string, payload: Buffer): Promise<void> {
    // application/{appId}/device/{devEUI}/event/up
    const parts = topic.split("/")
    const appId = parts[1]
    const devEUI = parts[3]

    try {
      const uplink = JSON.parse(payload.toString())
      const eventBus = getEventBus()

      // Decode payload if present
      if (uplink.object) {
        const readings = uplink.object as Record<string, number>
        const observations = Object.entries(readings).map(([key, value]) => ({
          id: `lora_${devEUI}_${key}_${Date.now()}`,
          type: this.mapReadingType(key) as ObservationType,
          entityId: `lorawan_${devEUI}`,
          value,
          unit: this.mapReadingUnit(key),
          observedAt: uplink.publishedAt || new Date().toISOString(),
          location: uplink.rxInfo?.[0]?.location,
          source: "lorawan",
          provenance: {
            source: "chirpstack",
            sourceId: devEUI,
            collectedAt: new Date().toISOString(),
            reliability: 0.95,
          },
        }))

        for (const obs of observations) {
          await eventBus.publishObservation(obs as Observation)
        }
      }
    } catch (error) {
      console.error(`[MQTT] Failed to process LoRaWAN uplink:`, error)
    }
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  /**
   * Convert telemetry to OEI observations
   */
  private telemetryToObservations(telemetry: DeviceTelemetry): Observation[] {
    return Object.entries(telemetry.readings)
      .filter(([key]) => !["timestamp", "location", "metadata", "deviceId"].includes(key))
      .map(([key, value]) => ({
        id: `obs_${telemetry.deviceId}_${key}_${Date.now()}`,
        type: this.mapReadingType(key) as ObservationType,
        entityId: `${telemetry.deviceType}_${telemetry.deviceId}`,
        value: typeof value === "number" ? value : undefined,
        unit: this.mapReadingUnit(key),
        observedAt: telemetry.timestamp,
        receivedAt: new Date().toISOString(),
        location: telemetry.location,
        source: telemetry.deviceType,
        provenance: {
          source: telemetry.deviceType,
          sourceId: telemetry.deviceId,
          collectedAt: new Date().toISOString(),
          reliability: 1.0,
        },
        values: typeof value !== "number" ? { [key]: value } : undefined,
      }))
  }

  /**
   * Map reading key to observation type
   */
  private mapReadingType(key: string): string {
    const typeMap: Record<string, string> = {
      temp: "temperature",
      temperature: "temperature",
      humidity: "humidity",
      hum: "humidity",
      pressure: "pressure",
      co2: "co2",
      voc: "voc",
      iaq: "iaq",
      gas: "gas_resistance",
      pm25: "air_quality",
      pm10: "air_quality",
      light: "light",
      motion: "motion",
      door: "door",
      battery: "battery",
    }
    return typeMap[key.toLowerCase()] || "custom"
  }

  /**
   * Map reading key to unit
   */
  private mapReadingUnit(key: string): string {
    const unitMap: Record<string, string> = {
      temp: "celsius",
      temperature: "celsius",
      humidity: "percent",
      hum: "percent",
      pressure: "hPa",
      co2: "ppm",
      voc: "ppb",
      iaq: "index",
      gas: "ohms",
      pm25: "µg/m³",
      pm10: "µg/m³",
      light: "lux",
      battery: "volt",
    }
    return unitMap[key.toLowerCase()] || ""
  }

  /**
   * Check if topic matches pattern
   */
  private topicMatches(pattern: string, topic: string): boolean {
    const patternParts = pattern.split("/")
    const topicParts = topic.split("/")

    if (patternParts.length !== topicParts.length) {
      // Check for # wildcard at end
      if (patternParts[patternParts.length - 1] !== "#") {
        return false
      }
      return patternParts.slice(0, -1).every((part, i) => 
        part === "+" || part === topicParts[i]
      )
    }

    return patternParts.every((part, i) => 
      part === "+" || part === "#" || part === topicParts[i]
    )
  }

  /**
   * Flush queued messages
   */
  private async flushMessageQueue(): Promise<void> {
    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift()!
      try {
        await this.publish(msg.topic, msg.payload as string, {
          qos: msg.qos,
          retain: msg.retain,
        })
      } catch (error) {
        console.error(`[MQTT] Failed to send queued message:`, error)
      }
    }
  }

  // ===========================================================================
  // EVENT HANDLERS
  // ===========================================================================

  onConnect(handler: ConnectionHandler): void {
    this.onConnectHandlers.push(handler)
  }

  onDisconnect(handler: ConnectionHandler): void {
    this.onDisconnectHandlers.push(handler)
  }

  onError(handler: ErrorHandler): void {
    this.onErrorHandlers.push(handler)
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let mqttServiceInstance: MqttService | null = null

export function getMqttService(config?: Partial<MqttServiceConfig>): MqttService {
  if (!mqttServiceInstance) {
    mqttServiceInstance = new MqttService(config)
  }
  return mqttServiceInstance
}

export default MqttService
