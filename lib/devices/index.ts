/**
 * Device Management Module
 * 
 * Exports all device-related services and utilities
 */

// MQTT Service
export { 
  MqttService, 
  getMqttService,
  MQTT_TOPICS,
  type MqttServiceConfig,
  type MqttMessage,
  type DeviceTelemetry,
  type DeviceCommand,
} from "./mqtt-service"

// Home Assistant Bridge
export {
  HomeAssistantBridge,
  getHomeAssistantBridge,
  type HAComponentType,
  type HADiscoveryConfig,
  type HADeviceState,
  type HADevice,
} from "./home-assistant-bridge"

// Re-export from mqtt-config if exists
// export * from "./mqtt-config"
