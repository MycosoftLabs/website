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
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Devices API error:", error)
    
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
