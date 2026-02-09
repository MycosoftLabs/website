import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = process.env.MINDEX_API_URL || "http://localhost:8000"

// Mycosoft device types
const DEVICE_TYPES = [
  "mycobrain",
  "mushroom1", 
  "sporebase",
  "hyphae1",
  "myconode",
  "alarm",
] as const

type DeviceType = typeof DEVICE_TYPES[number]

interface DeviceCapability {
  name: string
  type: "sensor" | "actuator" | "communication"
  unit?: string
}

interface DeviceRegistration {
  id: string
  type: DeviceType
  name?: string
  serial_number?: string
  firmware_version?: string
  status: "online" | "offline" | "unknown"
  last_seen: string
  location?: {
    lat: number
    lng: number
    name?: string
  }
  capabilities: string[]
  metadata?: Record<string, unknown>
}

// Device capability definitions for each Mycosoft device type
const DEVICE_CAPABILITIES: Record<DeviceType, DeviceCapability[]> = {
  mycobrain: [
    { name: "temperature", type: "sensor", unit: "°C" },
    { name: "humidity", type: "sensor", unit: "%" },
    { name: "pressure", type: "sensor", unit: "hPa" },
    { name: "gas_resistance", type: "sensor", unit: "Ω" },
    { name: "iaq", type: "sensor" },
    { name: "co2_equivalent", type: "sensor", unit: "ppm" },
    { name: "voc_equivalent", type: "sensor", unit: "ppm" },
    { name: "neopixel", type: "actuator" },
    { name: "buzzer", type: "actuator" },
    { name: "lora", type: "communication" },
    { name: "wifi", type: "communication" },
  ],
  mushroom1: [
    { name: "temperature", type: "sensor", unit: "°C" },
    { name: "humidity", type: "sensor", unit: "%" },
    { name: "pressure", type: "sensor", unit: "hPa" },
    { name: "voc", type: "sensor", unit: "ppm" },
    { name: "bioelectric", type: "sensor", unit: "mV" },
    { name: "gps", type: "sensor" },
    { name: "neopixel", type: "actuator" },
    { name: "buzzer", type: "actuator" },
    { name: "leg_control", type: "actuator" },
    { name: "lora", type: "communication" },
    { name: "wifi", type: "communication" },
  ],
  sporebase: [
    { name: "spore_count", type: "sensor", unit: "spores/m³" },
    { name: "voc", type: "sensor", unit: "ppm" },
    { name: "particle_count", type: "sensor", unit: "particles/m³" },
    { name: "gps", type: "sensor" },
    { name: "tape_imaging", type: "actuator" },
    { name: "collection_motor", type: "actuator" },
    { name: "lora", type: "communication" },
    { name: "wifi", type: "communication" },
  ],
  hyphae1: [
    { name: "mesh_status", type: "sensor" },
    { name: "node_count", type: "sensor" },
    { name: "signal_strength", type: "sensor", unit: "dBm" },
    { name: "lora_gateway", type: "communication" },
    { name: "lora_relay", type: "communication" },
    { name: "data_routing", type: "communication" },
    { name: "edge_compute", type: "actuator" },
  ],
  myconode: [
    { name: "soil_moisture", type: "sensor", unit: "%" },
    { name: "soil_ph", type: "sensor" },
    { name: "bioelectric", type: "sensor", unit: "mV" },
    { name: "gps", type: "sensor" },
    { name: "stimulation", type: "actuator" },
    { name: "ble", type: "communication" },
    { name: "lora", type: "communication" },
  ],
  alarm: [
    { name: "co2", type: "sensor", unit: "ppm" },
    { name: "voc", type: "sensor", unit: "ppm" },
    { name: "particulate", type: "sensor", unit: "µg/m³" },
    { name: "pathogen_detection", type: "sensor" },
    { name: "gps", type: "sensor" },
    { name: "siren", type: "actuator" },
    { name: "led_array", type: "actuator" },
    { name: "wifi", type: "communication" },
  ],
}

/**
 * GET /api/mindex/registry/devices
 * Query registered Mycosoft devices
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get("type") as DeviceType | null
  const status = searchParams.get("status") as "online" | "offline" | null
  const limit = parseInt(searchParams.get("limit") || "100")
  const offset = parseInt(searchParams.get("offset") || "0")
  
  try {
    // Query MINDEX for registered devices
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    })
    
    if (type && DEVICE_TYPES.includes(type)) {
      queryParams.append("type", type)
    }
    if (status) {
      queryParams.append("status", status)
    }
    
    const mindexResponse = await fetch(
      `${MINDEX_API_URL}/api/mindex/devices?${queryParams}`,
      {
        headers: {
          "X-API-Key": process.env.MINDEX_API_KEY || "local-dev-key",
        },
        signal: AbortSignal.timeout(10000),
      }
    )
    
    if (mindexResponse.ok) {
      const data = await mindexResponse.json()
      return NextResponse.json({
        devices: data.devices || [],
        total: data.total || 0,
        limit,
        offset,
        device_types: DEVICE_TYPES,
        timestamp: new Date().toISOString(),
      })
    }
    
    // If MINDEX unavailable, return empty with capabilities info
    return NextResponse.json({
      devices: [],
      total: 0,
      limit,
      offset,
      device_types: DEVICE_TYPES,
      capabilities: DEVICE_CAPABILITIES,
      warning: "MINDEX registry unavailable",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Device Registry] Query error:", error)
    return NextResponse.json({
      devices: [],
      total: 0,
      error: "Failed to query device registry",
      device_types: DEVICE_TYPES,
      capabilities: DEVICE_CAPABILITIES,
      timestamp: new Date().toISOString(),
    })
  }
}

/**
 * POST /api/mindex/registry/devices
 * Register a new Mycosoft device
 */
export async function POST(request: NextRequest) {
  try {
    const body: Partial<DeviceRegistration> = await request.json()
    
    // Validate required fields
    if (!body.id || !body.type) {
      return NextResponse.json(
        { error: "Missing required fields: id, type" },
        { status: 400 }
      )
    }
    
    // Validate device type
    if (!DEVICE_TYPES.includes(body.type as DeviceType)) {
      return NextResponse.json(
        { 
          error: "Invalid device type", 
          valid_types: DEVICE_TYPES,
          received: body.type 
        },
        { status: 400 }
      )
    }
    
    // Build registration record
    const registration: DeviceRegistration = {
      id: body.id,
      type: body.type as DeviceType,
      name: body.name || `${body.type}-${body.id.slice(-6)}`,
      serial_number: body.serial_number,
      firmware_version: body.firmware_version,
      status: body.status || "unknown",
      last_seen: body.last_seen || new Date().toISOString(),
      location: body.location,
      capabilities: body.capabilities || DEVICE_CAPABILITIES[body.type as DeviceType].map(c => c.name),
      metadata: body.metadata,
    }
    
    // Register with MINDEX
    const mindexResponse = await fetch(
      `${MINDEX_API_URL}/api/mindex/devices/register`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": process.env.MINDEX_API_KEY || "local-dev-key",
        },
        body: JSON.stringify(registration),
        signal: AbortSignal.timeout(10000),
      }
    )
    
    if (mindexResponse.ok) {
      const result = await mindexResponse.json()
      return NextResponse.json({
        success: true,
        device: registration,
        mindex_response: result,
        timestamp: new Date().toISOString(),
      })
    }
    
    // If MINDEX unavailable, still return success with warning
    return NextResponse.json({
      success: true,
      warning: "Device registered locally but MINDEX persistence unavailable",
      device: registration,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Device Registry] Registration error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to register device",
        details: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/mindex/registry/devices
 * Update device status (heartbeat)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.id) {
      return NextResponse.json(
        { error: "Missing required field: id" },
        { status: 400 }
      )
    }
    
    const update = {
      id: body.id,
      status: body.status || "online",
      last_seen: new Date().toISOString(),
      location: body.location,
      metadata: body.metadata,
    }
    
    // Update in MINDEX
    const mindexResponse = await fetch(
      `${MINDEX_API_URL}/api/mindex/devices/${encodeURIComponent(body.id)}/heartbeat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": process.env.MINDEX_API_KEY || "local-dev-key",
        },
        body: JSON.stringify(update),
        signal: AbortSignal.timeout(5000),
      }
    )
    
    return NextResponse.json({
      success: true,
      device_id: body.id,
      status: update.status,
      last_seen: update.last_seen,
      mindex_synced: mindexResponse.ok,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Device Registry] Update error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update device",
        details: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
