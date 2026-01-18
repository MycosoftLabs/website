/**
 * Home Assistant Bridge
 * 
 * Bridges Home Assistant MQTT discovery protocol to NatureOS OEI:
 * - Parses HA discovery messages to create entities
 * - Converts HA state updates to observations
 * - Supports sensor, binary_sensor, switch, climate, light components
 */

import { getMqttService, MqttService, MQTT_TOPICS } from "./mqtt-service"
import { getEventBus } from "@/lib/oei/event-bus"
import type { Entity, Observation, ObservationType } from "@/types/oei"

// =============================================================================
// TYPES
// =============================================================================

export type HAComponentType = 
  | "sensor" 
  | "binary_sensor" 
  | "switch" 
  | "light" 
  | "climate" 
  | "cover" 
  | "fan"
  | "lock"
  | "alarm_control_panel"

export interface HADiscoveryConfig {
  name: string
  unique_id: string
  device_class?: string
  state_topic: string
  unit_of_measurement?: string
  value_template?: string
  icon?: string
  availability_topic?: string
  availability_template?: string
  json_attributes_topic?: string
  command_topic?: string
  payload_on?: string
  payload_off?: string
  device?: {
    identifiers: string[]
    name: string
    manufacturer?: string
    model?: string
    sw_version?: string
    hw_version?: string
    configuration_url?: string
  }
}

export interface HADeviceState {
  state: string | number | boolean
  attributes?: Record<string, unknown>
  last_changed?: string
  last_updated?: string
}

export interface HADevice {
  id: string
  name: string
  component: HAComponentType
  config: HADiscoveryConfig
  state?: HADeviceState
  entityId?: string
}

// =============================================================================
// DEVICE CLASS TO OBSERVATION TYPE MAPPING
// =============================================================================

const DEVICE_CLASS_TO_TYPE: Record<string, ObservationType> = {
  // Sensors
  temperature: "temperature",
  humidity: "humidity",
  pressure: "pressure",
  pm25: "air_quality",
  pm10: "air_quality",
  co2: "co2",
  voc: "voc",
  illuminance: "light",
  motion: "motion",
  door: "door",
  window: "door",
  battery: "battery",
  voltage: "voltage",
  current: "current",
  power: "power",
  energy: "energy",
  gas: "gas_resistance",
  
  // Binary sensors
  occupancy: "motion",
  presence: "motion",
  moisture: "moisture",
  smoke: "smoke",
  carbon_monoxide: "co2",
  
  // Default
  default: "custom",
}

const DEVICE_CLASS_ICONS: Record<string, string> = {
  temperature: "🌡️",
  humidity: "💧",
  pressure: "🌀",
  motion: "🏃",
  door: "🚪",
  window: "🪟",
  battery: "🔋",
  illuminance: "💡",
  smoke: "🔥",
  co2: "🫧",
}

// =============================================================================
// HOME ASSISTANT BRIDGE
// =============================================================================

export class HomeAssistantBridge {
  private mqttService: MqttService
  private devices = new Map<string, HADevice>()
  private stateSubscriptions = new Map<string, string>()  // state_topic -> device_id
  private eventBus = getEventBus()
  private started = false

  constructor(mqttService?: MqttService) {
    this.mqttService = mqttService || getMqttService()
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  /**
   * Start the bridge
   */
  async start(): Promise<void> {
    if (this.started) return

    console.log("[HA Bridge] Starting Home Assistant bridge...")

    // Subscribe to discovery topics
    await this.mqttService.subscribe(
      MQTT_TOPICS.HOMEASSISTANT.DISCOVERY,
      this.handleDiscovery.bind(this)
    )

    // Subscribe to state topics
    await this.mqttService.subscribe(
      MQTT_TOPICS.HOMEASSISTANT.STATE,
      this.handleState.bind(this)
    )

    this.started = true
    console.log("[HA Bridge] Started successfully")
  }

  /**
   * Stop the bridge
   */
  async stop(): Promise<void> {
    if (!this.started) return

    await this.mqttService.unsubscribe(MQTT_TOPICS.HOMEASSISTANT.DISCOVERY)
    await this.mqttService.unsubscribe(MQTT_TOPICS.HOMEASSISTANT.STATE)

    this.started = false
    console.log("[HA Bridge] Stopped")
  }

  // ===========================================================================
  // MESSAGE HANDLERS
  // ===========================================================================

  /**
   * Handle discovery message
   */
  private async handleDiscovery(topic: string, payload: Buffer): Promise<void> {
    // homeassistant/{component}/{node_id}/{object_id}/config
    const parts = topic.split("/")
    if (parts.length < 5) return

    const component = parts[1] as HAComponentType
    const nodeId = parts[2]
    const objectId = parts[3]
    const deviceId = `${nodeId}_${objectId}`

    // Empty payload = device removed
    if (payload.length === 0) {
      await this.removeDevice(deviceId)
      return
    }

    try {
      const config: HADiscoveryConfig = JSON.parse(payload.toString())
      await this.registerDevice(deviceId, component, config)
    } catch (error) {
      console.error(`[HA Bridge] Failed to parse discovery config for ${deviceId}:`, error)
    }
  }

  /**
   * Handle state update
   */
  private async handleState(topic: string, payload: Buffer): Promise<void> {
    // Find device by state topic
    const deviceId = this.stateSubscriptions.get(topic)
    if (!deviceId) {
      // Check if this matches any registered device's state_topic
      for (const [id, device] of this.devices) {
        if (device.config.state_topic === topic) {
          this.stateSubscriptions.set(topic, id)
          await this.processState(id, payload)
          return
        }
      }
      return
    }

    await this.processState(deviceId, payload)
  }

  // ===========================================================================
  // DEVICE MANAGEMENT
  // ===========================================================================

  /**
   * Register a new device from discovery
   */
  private async registerDevice(deviceId: string, component: HAComponentType, config: HADiscoveryConfig): Promise<void> {
    console.log(`[HA Bridge] Discovered device: ${config.name} (${deviceId})`)

    const device: HADevice = {
      id: deviceId,
      name: config.name,
      component,
      config,
    }

    this.devices.set(deviceId, device)

    // Subscribe to state topic
    if (config.state_topic) {
      this.stateSubscriptions.set(config.state_topic, deviceId)
      await this.mqttService.subscribe(config.state_topic)
    }

    // Create OEI entity
    const entity = this.createEntity(device)
    device.entityId = entity.id
    
    await this.eventBus.publishEntity(entity)
    console.log(`[HA Bridge] Registered entity: ${entity.id}`)
  }

  /**
   * Remove a device
   */
  private async removeDevice(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId)
    if (!device) return

    console.log(`[HA Bridge] Removing device: ${device.name} (${deviceId})`)

    // Unsubscribe from state topic
    if (device.config.state_topic) {
      this.stateSubscriptions.delete(device.config.state_topic)
      await this.mqttService.unsubscribe(device.config.state_topic)
    }

    // Mark entity as inactive
    if (device.entityId) {
      await this.eventBus.publishEntity({
        id: device.entityId,
        type: "device",
        name: device.name,
        status: "inactive",
        lastSeenAt: new Date().toISOString(),
        provenance: {
          source: "homeassistant",
          sourceId: deviceId,
          collectedAt: new Date().toISOString(),
          reliability: 1.0,
        },
      })
    }

    this.devices.delete(deviceId)
  }

  /**
   * Process state update
   */
  private async processState(deviceId: string, payload: Buffer): Promise<void> {
    const device = this.devices.get(deviceId)
    if (!device) return

    let state: HADeviceState
    try {
      // Try JSON first
      const parsed = JSON.parse(payload.toString())
      state = typeof parsed === "object" 
        ? { state: parsed.state ?? parsed, attributes: parsed }
        : { state: parsed }
    } catch {
      // Plain text/number state
      state = { state: payload.toString() }
    }

    device.state = state

    // Create observation
    const observation = this.createObservation(device, state)
    if (observation) {
      await this.eventBus.publishObservation(observation)
    }
  }

  // ===========================================================================
  // OEI CONVERSION
  // ===========================================================================

  /**
   * Create OEI entity from HA device
   */
  private createEntity(device: HADevice): Entity {
    const haDevice = device.config.device

    return {
      id: `ha_${device.id}`,
      type: "device",
      name: device.name,
      description: `Home Assistant ${device.component}: ${device.name}`,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      tags: [
        "homeassistant",
        device.component,
        device.config.device_class || "",
        haDevice?.manufacturer || "",
      ].filter(Boolean),
      properties: {
        component: device.component,
        deviceClass: device.config.device_class,
        unit: device.config.unit_of_measurement,
        icon: device.config.icon || DEVICE_CLASS_ICONS[device.config.device_class || ""],
        stateTopic: device.config.state_topic,
        commandTopic: device.config.command_topic,
        haDevice: haDevice ? {
          manufacturer: haDevice.manufacturer,
          model: haDevice.model,
          swVersion: haDevice.sw_version,
          hwVersion: haDevice.hw_version,
        } : undefined,
      },
      provenance: {
        source: "homeassistant",
        sourceId: device.id,
        collectedAt: new Date().toISOString(),
        reliability: 1.0,
        metadata: {
          uniqueId: device.config.unique_id,
          discovery: true,
        },
      },
    }
  }

  /**
   * Create OEI observation from HA state
   */
  private createObservation(device: HADevice, state: HADeviceState): Observation | null {
    const deviceClass = device.config.device_class || "default"
    const obsType = DEVICE_CLASS_TO_TYPE[deviceClass] || "custom"
    
    // Parse value
    let value: number | undefined
    if (typeof state.state === "number") {
      value = state.state
    } else if (typeof state.state === "string") {
      const parsed = parseFloat(state.state)
      if (!isNaN(parsed)) {
        value = parsed
      }
    }

    // For binary sensors, map on/off to 1/0
    if (device.component === "binary_sensor") {
      if (state.state === "on" || state.state === true) value = 1
      else if (state.state === "off" || state.state === false) value = 0
    }

    return {
      id: `ha_obs_${device.id}_${Date.now()}`,
      type: obsType,
      entityId: `ha_${device.id}`,
      value,
      unit: device.config.unit_of_measurement,
      observedAt: state.last_changed || new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      source: "homeassistant",
      provenance: {
        source: "homeassistant",
        sourceId: device.id,
        collectedAt: new Date().toISOString(),
        reliability: 1.0,
      },
      values: {
        rawState: state.state,
        deviceClass,
        ...state.attributes,
      },
    }
  }

  // ===========================================================================
  // DEVICE CONTROL
  // ===========================================================================

  /**
   * Send command to HA device
   */
  async sendCommand(deviceId: string, command: string): Promise<void> {
    const device = this.devices.get(deviceId.replace("ha_", ""))
    if (!device || !device.config.command_topic) {
      throw new Error(`Device ${deviceId} not found or has no command topic`)
    }

    await this.mqttService.publish(device.config.command_topic, command)
    console.log(`[HA Bridge] Sent command to ${device.name}: ${command}`)
  }

  /**
   * Turn on a device
   */
  async turnOn(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId.replace("ha_", ""))
    const payload = device?.config.payload_on || "ON"
    await this.sendCommand(deviceId, payload)
  }

  /**
   * Turn off a device
   */
  async turnOff(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId.replace("ha_", ""))
    const payload = device?.config.payload_off || "OFF"
    await this.sendCommand(deviceId, payload)
  }

  /**
   * Toggle a device
   */
  async toggle(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId.replace("ha_", ""))
    if (!device?.state) {
      await this.turnOn(deviceId)
      return
    }

    const isOn = device.state.state === "on" || device.state.state === true || device.state.state === 1
    if (isOn) {
      await this.turnOff(deviceId)
    } else {
      await this.turnOn(deviceId)
    }
  }

  // ===========================================================================
  // GETTERS
  // ===========================================================================

  /**
   * Get all discovered devices
   */
  getDevices(): HADevice[] {
    return Array.from(this.devices.values())
  }

  /**
   * Get device by ID
   */
  getDevice(deviceId: string): HADevice | undefined {
    return this.devices.get(deviceId.replace("ha_", ""))
  }

  /**
   * Get devices by component type
   */
  getDevicesByComponent(component: HAComponentType): HADevice[] {
    return this.getDevices().filter(d => d.component === component)
  }

  /**
   * Get devices by device class
   */
  getDevicesByClass(deviceClass: string): HADevice[] {
    return this.getDevices().filter(d => d.config.device_class === deviceClass)
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let bridgeInstance: HomeAssistantBridge | null = null

export function getHomeAssistantBridge(): HomeAssistantBridge {
  if (!bridgeInstance) {
    bridgeInstance = new HomeAssistantBridge()
  }
  return bridgeInstance
}

export default HomeAssistantBridge
