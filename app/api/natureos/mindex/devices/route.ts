/**
 * MINDEX Device Registry API
 * 
 * Returns registered MycoBrain and sensor devices
 * Supports unique ID system (CPU+MAC+Device_Type)
 * 
 * GET: List all devices or filter by type
 * POST: Register a new device
 * 
 * NO MOCK DATA - all data from real MINDEX backend
 */

import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"
const DEBUG_MINDEX_DEVICES = process.env.CREP_DEBUG_MINDEX_DEVICES === "1"

interface Device {
  id: string
  unique_id: string // Format: CPU_ID-MAC_PREFIX-DEVICE_TYPE
  name: string
  type: "mycobrain" | "sensor" | "gateway" | "unknown"
  firmware_version: string
  last_seen: string
  is_online: boolean
  location?: {
    latitude: number
    longitude: number
    name?: string
  }
  telemetry?: {
    temperature?: number
    humidity?: number
    co2?: number
    light?: number
    soil_moisture?: number
  }
  metadata?: Record<string, unknown>
}

interface DevicesResponse {
  devices: Device[]
  total: number
  online_count: number
  data_source: "live" | "unavailable"
}

export async function GET(request: NextRequest) {
  const mindexUrl = env.mindexApiBaseUrl
  const apiKey = env.mindexApiKey || "local-dev-key"

  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get("type") || ""
  const online = searchParams.get("online")
  const limit = parseInt(searchParams.get("limit") || "100")

  const response: DevicesResponse = {
    devices: [],
    total: 0,
    online_count: 0,
    data_source: "unavailable",
  }

  const fallbackToEarthSimulatorDevices = async () => {
    const fallbackUrl = new URL("/api/earth-simulator/devices", request.url)
    fallbackUrl.searchParams.set("refresh", "1")
    fallbackUrl.searchParams.set("wait", "1")
    const fallbackResponse = await fetch(fallbackUrl, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6_500),
    })
    if (!fallbackResponse.ok) throw new Error(`earth-simulator-devices ${fallbackResponse.status}`)
    const payload = await fallbackResponse.json()
    const rows = Array.isArray(payload?.devices) ? payload.devices : []
    const devices = rows.slice(0, limit).map((row: any): Device => ({
      id: String(row.registry_id || row.id),
      unique_id: String(row.registry_id || row.id),
      name: String(row.name || row.id || "MycoBrain device"),
      type: "mycobrain",
      firmware_version: String(row.firmware_version || row.firmware || "unknown"),
      last_seen: String(row.lastSeen || row.last_seen || ""),
      is_online: row.status === "connected" || row.status === "online",
      location: row.location
        ? {
            latitude: Number(row.location.lat ?? row.location.latitude),
            longitude: Number(row.location.lon ?? row.location.lng ?? row.location.longitude),
            name: row.location_label || undefined,
          }
        : undefined,
      telemetry: row.telemetry && typeof row.telemetry === "object" ? row.telemetry : undefined,
      metadata: {
        catalog_id: row.id,
        role: row.role,
        source: row.source,
        agent_url: row.agent_url,
        host: row.host,
      },
    }))
    const filteredDevices = type ? devices.filter((device) => device.type === type || String(device.metadata?.role) === type) : devices
    const onlineDevices = online
      ? filteredDevices.filter((device) => String(device.is_online) === online || (online === "true" ? device.is_online : !device.is_online))
      : filteredDevices

    return NextResponse.json({
      devices: onlineDevices,
      total: onlineDevices.length,
      online_count: onlineDevices.filter((device) => device.is_online).length,
      data_source: "live",
      upstream: {
        mindex: "unavailable",
        fallback: "/api/earth-simulator/devices",
      },
    }, {
      headers: {
        "Cache-Control": "no-store",
        "X-MINDEX-Warning": "mindex-devices-unavailable-using-earth-simulator-devices",
      },
    })
  }

  try {
    // Build query params
    const params = new URLSearchParams()
    params.set("limit", limit.toString())
    if (type) params.set("type", type)
    if (online) params.set("online", online)

    const apiResponse = await fetch(`${mindexUrl}/api/mindex/devices?${params.toString()}`, {
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    })

    if (apiResponse.ok) {
      const data = await apiResponse.json()
      response.devices = data.devices || data.data || []
      response.total = data.total || response.devices.length
      response.online_count = response.devices.filter((d: Device) => d.is_online).length
      response.data_source = "live"
      if (response.devices.length === 0) {
        return await fallbackToEarthSimulatorDevices()
      }
    } else {
      return await fallbackToEarthSimulatorDevices()
    }

    return NextResponse.json(response)
  } catch (error) {
    if (DEBUG_MINDEX_DEVICES) {
      console.warn("MINDEX NatureOS devices unavailable, using Earth Simulator devices fallback:", error)
    }
    
    try {
      return await fallbackToEarthSimulatorDevices()
    } catch (fallbackError) {
      if (DEBUG_MINDEX_DEVICES) {
        console.warn("Earth Simulator devices fallback unavailable:", fallbackError)
      }
      return NextResponse.json({
        ...response,
        error: error instanceof Error ? error.message : "Failed to fetch devices",
        troubleshooting: {
          mindex_url: mindexUrl,
          endpoint: "/api/mindex/devices",
        }
      }, { status: 503 })
    }
  }
}

export async function POST(request: NextRequest) {
  const mindexUrl = env.mindexApiBaseUrl
  const apiKey = env.mindexApiKey || "local-dev-key"

  try {
    const body = await request.json()

    // Validate required fields
    if (!body.cpu_id || !body.mac_prefix || !body.device_type) {
      return NextResponse.json({
        error: "Missing required fields: cpu_id, mac_prefix, device_type",
        required_format: {
          cpu_id: "ESP32-A1B2C3",
          mac_prefix: "AA:BB:CC",
          device_type: "MB1|MB2|SENSOR",
          name: "Optional device name",
        }
      }, { status: 400 })
    }

    // Generate unique ID
    const uniqueId = `${body.cpu_id}-${body.mac_prefix.replace(/:/g, "")}-${body.device_type}`

    const deviceData = {
      unique_id: uniqueId,
      name: body.name || `MycoBrain ${body.device_type}`,
      type: body.device_type.toLowerCase().includes("mb") ? "mycobrain" : "sensor",
      firmware_version: body.firmware_version || "unknown",
      metadata: body.metadata || {},
    }

    const apiResponse = await fetch(`${mindexUrl}/api/mindex/devices`, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(deviceData),
      signal: AbortSignal.timeout(10000),
    })

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text()
      return NextResponse.json({
        error: "Failed to register device",
        details: errorText,
      }, { status: apiResponse.status })
    }

    const result = await apiResponse.json()
    return NextResponse.json({
      success: true,
      device: result,
      unique_id: uniqueId,
    })
  } catch (error) {
    console.error("Device registration error:", error)
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Registration failed",
    }, { status: 500 })
  }
}
