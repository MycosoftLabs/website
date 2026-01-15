/**
 * MycoBrain Sensor Registry
 * 
 * Runtime sensor detection, registration, and management.
 * Handles plug-and-play sensor discovery via I2C scanning.
 */

import { 
  SensorDefinition, 
  DetectedSensor, 
  SENSOR_LIBRARY,
  identifySensorByI2CAddress,
  detectDeviceProfile,
  DeviceProfileType,
  ConnectionStatus
} from "./types"

// ============================================================================
// SENSOR REGISTRY
// ============================================================================

export class SensorRegistry {
  private sensors: Map<string, DetectedSensor> = new Map()
  private deviceProfile: DeviceProfileType = "custom"
  private lastScan: Date | null = null
  private scanInterval: NodeJS.Timeout | null = null

  constructor() {
    // Initialize with empty registry
  }

  /**
   * Register a sensor from I2C scan results
   */
  registerFromI2C(address: number, status: ConnectionStatus = "connected"): DetectedSensor | null {
    const definition = identifySensorByI2CAddress(address)
    if (!definition) {
      console.log(`[SensorRegistry] Unknown sensor at I2C address 0x${address.toString(16)}`)
      return null
    }

    const sensorKey = `${definition.id}_0x${address.toString(16)}`
    const sensor: DetectedSensor = {
      definition,
      address,
      status,
      lastUpdate: new Date().toISOString()
    }

    this.sensors.set(sensorKey, sensor)
    console.log(`[SensorRegistry] Registered ${definition.name} at 0x${address.toString(16)}`)
    
    // Re-detect device profile
    this.updateDeviceProfile()
    
    return sensor
  }

  /**
   * Register a sensor by ID and optional address
   */
  register(sensorId: string, options?: { address?: number; port?: string }): DetectedSensor | null {
    const definition = SENSOR_LIBRARY[sensorId.toUpperCase()]
    if (!definition) {
      console.warn(`[SensorRegistry] Unknown sensor ID: ${sensorId}`)
      return null
    }

    const sensorKey = options?.address 
      ? `${definition.id}_0x${options.address.toString(16)}`
      : options?.port 
        ? `${definition.id}_${options.port}`
        : definition.id

    const sensor: DetectedSensor = {
      definition,
      address: options?.address,
      port: options?.port,
      status: "connected",
      lastUpdate: new Date().toISOString()
    }

    this.sensors.set(sensorKey, sensor)
    this.updateDeviceProfile()
    
    return sensor
  }

  /**
   * Unregister a sensor
   */
  unregister(sensorKey: string): boolean {
    const removed = this.sensors.delete(sensorKey)
    if (removed) {
      this.updateDeviceProfile()
    }
    return removed
  }

  /**
   * Update sensor reading
   */
  updateReading(sensorKey: string, reading: Record<string, unknown>): void {
    const sensor = this.sensors.get(sensorKey)
    if (sensor) {
      sensor.lastReading = reading
      sensor.lastUpdate = new Date().toISOString()
      sensor.status = "connected"
    }
  }

  /**
   * Mark sensor as disconnected/error
   */
  setSensorStatus(sensorKey: string, status: ConnectionStatus): void {
    const sensor = this.sensors.get(sensorKey)
    if (sensor) {
      sensor.status = status
      sensor.lastUpdate = new Date().toISOString()
    }
  }

  /**
   * Get all registered sensors
   */
  getAllSensors(): DetectedSensor[] {
    return Array.from(this.sensors.values())
  }

  /**
   * Get sensors by category
   */
  getSensorsByCategory(category: string): DetectedSensor[] {
    return this.getAllSensors().filter(s => s.definition.category === category)
  }

  /**
   * Get a specific sensor by key
   */
  getSensor(sensorKey: string): DetectedSensor | undefined {
    return this.sensors.get(sensorKey)
  }

  /**
   * Get current device profile
   */
  getDeviceProfile(): DeviceProfileType {
    return this.deviceProfile
  }

  /**
   * Update device profile based on connected sensors
   */
  private updateDeviceProfile(): void {
    const sensorIds = this.getAllSensors().map(s => s.definition.id)
    this.deviceProfile = detectDeviceProfile(sensorIds)
  }

  /**
   * Parse MycoBrain peripheral scan response and register sensors
   */
  parsePeripheralScan(peripherals: Array<{
    address: string | number
    name?: string
    type?: string
  }>): DetectedSensor[] {
    const registered: DetectedSensor[] = []
    
    for (const peripheral of peripherals) {
      const address = typeof peripheral.address === "string" 
        ? parseInt(peripheral.address, 16)
        : peripheral.address

      const sensor = this.registerFromI2C(address)
      if (sensor) {
        registered.push(sensor)
      }
    }

    this.lastScan = new Date()
    return registered
  }

  /**
   * Get sensor library definitions (for UI sensor picker)
   */
  static getLibrary(): Record<string, SensorDefinition> {
    return SENSOR_LIBRARY
  }

  /**
   * Start auto-scan interval
   */
  startAutoScan(intervalMs: number = 30000): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval)
    }
    // Note: actual scanning would need to be triggered externally
    // This just sets up the timer for when scan should occur
    this.scanInterval = setInterval(() => {
      console.log("[SensorRegistry] Auto-scan triggered")
    }, intervalMs)
  }

  /**
   * Stop auto-scan
   */
  stopAutoScan(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval)
      this.scanInterval = null
    }
  }

  /**
   * Get registry status
   */
  getStatus(): {
    sensorCount: number
    connectedCount: number
    deviceProfile: DeviceProfileType
    lastScan: string | null
  } {
    const sensors = this.getAllSensors()
    return {
      sensorCount: sensors.length,
      connectedCount: sensors.filter(s => s.status === "connected").length,
      deviceProfile: this.deviceProfile,
      lastScan: this.lastScan?.toISOString() || null
    }
  }
}

// Singleton instance
let registryInstance: SensorRegistry | null = null

export function getSensorRegistry(): SensorRegistry {
  if (!registryInstance) {
    registryInstance = new SensorRegistry()
  }
  return registryInstance
}
