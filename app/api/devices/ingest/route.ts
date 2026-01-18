/**
 * Device Ingestion API Route
 * 
 * POST /api/devices/ingest - Ingest telemetry data from devices
 * 
 * Accepts data from:
 * - MycoBrain ESP32-S3 devices
 * - Generic IoT sensors
 * - LoRaWAN gateways (via ChirpStack webhooks)
 * - Home Assistant webhooks
 */

import { NextRequest, NextResponse } from "next/server"
import { getEventBus } from "@/lib/oei"
import type { Observation, Entity, Provenance, GeoLocation } from "@/types/oei"
import type { TelemetryMessage } from "@/lib/devices/mqtt-config"

// =============================================================================
// TYPES
// =============================================================================

interface IngestPayload {
  // Required
  deviceId: string
  timestamp?: string
  
  // Optional metadata
  deviceType?: "mycobrain" | "lorawan" | "homeassistant" | "generic"
  firmwareVersion?: string
  
  // Location
  location?: {
    latitude: number
    longitude: number
    altitude?: number
  }
  
  // Sensor data (flexible)
  sensors?: Record<string, number | string | boolean>
  
  // Or use standard fields
  temperature?: number
  humidity?: number
  pressure?: number
  gasResistance?: number
  iaq?: number
  co2?: number
  voc?: number
  
  // Device status
  status?: {
    uptime?: number
    freeHeap?: number
    wifiRssi?: number
    batteryLevel?: number
  }
  
  // Raw data passthrough
  raw?: unknown
}

interface ChirpStackPayload {
  deviceInfo: {
    devEui: string
    deviceName: string
    applicationName: string
  }
  object?: Record<string, unknown>
  rxInfo?: Array<{
    gatewayId: string
    rssi: number
    snr: number
    location?: {
      latitude: number
      longitude: number
      altitude: number
    }
  }>
  txInfo?: {
    frequency: number
    dr: number
  }
  fCnt?: number
  fPort?: number
  data?: string // base64 encoded
}

interface HomeAssistantPayload {
  entity_id: string
  state: string | number
  attributes?: Record<string, unknown>
  last_changed?: string
  last_updated?: string
}

// =============================================================================
// HELPERS
// =============================================================================

function createProvenance(deviceId: string, deviceType: string): Provenance {
  return {
    source: deviceType,
    sourceId: deviceId,
    collectedAt: new Date().toISOString(),
    reliability: 0.95,
    metadata: {
      ingestionMethod: "http",
    },
  }
}

function parseChirpStack(payload: ChirpStackPayload): IngestPayload {
  const location = payload.rxInfo?.[0]?.location
  
  return {
    deviceId: payload.deviceInfo.devEui,
    deviceType: "lorawan",
    location: location ? {
      latitude: location.latitude,
      longitude: location.longitude,
      altitude: location.altitude,
    } : undefined,
    sensors: payload.object as Record<string, number>,
    status: {
      wifiRssi: payload.rxInfo?.[0]?.rssi,
    },
    raw: payload,
  }
}

function parseHomeAssistant(payload: HomeAssistantPayload): IngestPayload {
  const entityParts = payload.entity_id.split(".")
  const domain = entityParts[0]
  const name = entityParts[1]
  
  const sensors: Record<string, number | string | boolean> = {}
  
  // Parse state based on domain
  if (domain === "sensor") {
    const numValue = parseFloat(String(payload.state))
    if (!isNaN(numValue)) {
      sensors[name] = numValue
    } else {
      sensors[name] = payload.state
    }
  } else if (domain === "binary_sensor") {
    sensors[name] = payload.state === "on"
  }
  
  // Add attributes
  if (payload.attributes) {
    for (const [key, value] of Object.entries(payload.attributes)) {
      if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") {
        sensors[`${name}_${key}`] = value
      }
    }
  }
  
  return {
    deviceId: payload.entity_id,
    deviceType: "homeassistant",
    timestamp: payload.last_updated,
    sensors,
    raw: payload,
  }
}

async function processIngest(payload: IngestPayload): Promise<{
  observations: Observation[]
  entity?: Entity
}> {
  const eventBus = getEventBus()
  const observations: Observation[] = []
  const timestamp = payload.timestamp || new Date().toISOString()
  const provenance = createProvenance(payload.deviceId, payload.deviceType || "generic")
  
  const location: GeoLocation | undefined = payload.location ? {
    ...payload.location,
    source: "gps",
  } : undefined

  // Create entity update
  const entity: Entity = {
    id: `device_${payload.deviceId}`,
    type: "device",
    name: payload.deviceId,
    description: `${payload.deviceType || "Generic"} IoT device`,
    location,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSeenAt: timestamp,
    status: "active",
    provenance,
    tags: [payload.deviceType || "generic", "iot"],
    properties: {
      deviceType: payload.deviceType,
      firmwareVersion: payload.firmwareVersion,
      ...payload.status,
    },
  }

  // Publish entity
  await eventBus.publishEntity(entity)

  // Create observations from sensor data
  const sensorData = payload.sensors || {}
  
  // Add standard fields to sensor data
  if (payload.temperature !== undefined) sensorData.temperature = payload.temperature
  if (payload.humidity !== undefined) sensorData.humidity = payload.humidity
  if (payload.pressure !== undefined) sensorData.pressure = payload.pressure
  if (payload.gasResistance !== undefined) sensorData.gasResistance = payload.gasResistance
  if (payload.iaq !== undefined) sensorData.iaq = payload.iaq
  if (payload.co2 !== undefined) sensorData.co2 = payload.co2
  if (payload.voc !== undefined) sensorData.voc = payload.voc

  // Create observation for each sensor reading
  for (const [key, value] of Object.entries(sensorData)) {
    if (typeof value === "number") {
      const observation: Observation = {
        id: `obs_${payload.deviceId}_${key}_${Date.now()}`,
        type: key as Observation["type"],
        entityId: entity.id,
        location,
        observedAt: timestamp,
        receivedAt: new Date().toISOString(),
        value,
        unit: getUnitForSensor(key),
        source: payload.deviceType || "generic",
        sourceId: payload.deviceId,
        provenance,
      }
      
      observations.push(observation)
      await eventBus.publishObservation(observation)
    }
  }

  return { observations, entity }
}

function getUnitForSensor(sensorType: string): string {
  const units: Record<string, string> = {
    temperature: "°C",
    humidity: "%",
    pressure: "hPa",
    gasResistance: "Ω",
    iaq: "IAQ",
    co2: "ppm",
    voc: "ppb",
    batteryLevel: "%",
    wifiRssi: "dBm",
  }
  return units[sensorType] || ""
}

// =============================================================================
// API HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || ""
    let payload: IngestPayload

    // Parse based on content type
    if (contentType.includes("application/json")) {
      const body = await request.json()
      
      // Detect payload format
      if (body.deviceInfo?.devEui) {
        // ChirpStack format
        payload = parseChirpStack(body as ChirpStackPayload)
      } else if (body.entity_id) {
        // Home Assistant format
        payload = parseHomeAssistant(body as HomeAssistantPayload)
      } else {
        // Standard format
        payload = body as IngestPayload
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Content-Type must be application/json" },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!payload.deviceId) {
      return NextResponse.json(
        { success: false, error: "deviceId is required" },
        { status: 400 }
      )
    }

    // Process the ingestion
    const result = await processIngest(payload)

    return NextResponse.json({
      success: true,
      deviceId: payload.deviceId,
      observationsCount: result.observations.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Ingest] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for testing/health check
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/devices/ingest",
    methods: ["POST"],
    formats: ["standard", "chirpstack", "homeassistant"],
    documentation: "POST telemetry data to ingest device readings",
    example: {
      deviceId: "mycobrain-001",
      deviceType: "mycobrain",
      temperature: 23.5,
      humidity: 65.2,
      pressure: 1013.25,
      iaq: 45,
      location: {
        latitude: 37.7749,
        longitude: -122.4194,
      },
    },
  })
}
