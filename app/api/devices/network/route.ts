/**
 * Network Devices API Route
 * 
 * Fetches MycoBrain devices registered with the MAS Device Registry.
 * These are devices that have registered via heartbeat from remote machines
 * (Tailscale or Cloudflare tunnel connections).
 * 
 * Created: February 10, 2026
 */

import { NextRequest, NextResponse } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

interface NetworkDevice {
  device_id: string
  device_name: string
  device_role?: string
  device_display_name?: string | null
  host: string
  port: number
  firmware_version: string
  board_type: string
  sensors: string[]
  capabilities: string[]
  location: string | null
  connection_type: string
  ingestion_source?: string
  status: string
  last_seen: string
  registered_at: string
  extra?: Record<string, unknown>
}

interface DeviceRegistryResponse {
  devices: NetworkDevice[]
  count: number
  timestamp: string
}

/**
 * Format device role for display
 * Converts role codes to human-friendly names
 */
function formatDeviceRole(role: string): string {
  const roleMap: Record<string, string> = {
    mushroom1: "Mushroom 1",
    sporebase: "SporeBase",
    hyphae1: "Hyphae 1",
    alarm: "Mycosoft Alarm",
    gateway: "Gateway",
    mycodrone: "MycoDrone",
    standalone: "MycoBrain",
  }
  return roleMap[role.toLowerCase()] || role
}

/**
 * GET /api/devices/network
 * 
 * Fetch all network-registered MycoBrain devices from MAS.
 * 
 * Query params:
 * - status: Filter by status (online, stale, offline)
 * - include_offline: Include offline devices (default: false)
 */
export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status")
  const includeOffline = request.nextUrl.searchParams.get("include_offline") === "true"

  try {
    // Build query string
    const params = new URLSearchParams()
    if (status) params.set("status", status)
    if (includeOffline) params.set("include_offline", "true")
    
    const queryString = params.toString()
    const url = `${MAS_API_URL}/api/devices${queryString ? `?${queryString}` : ""}`

    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(10000),
      cache: "no-store", // Always get fresh data
    })

    if (!response.ok) {
      // MAS may not have device registry yet (404) - return empty list so UI doesn't break
      if (response.status === 404) {
        return NextResponse.json({
          devices: [],
          count: 0,
          source: "MAS Device Registry",
          mas_url: MAS_API_URL,
          note: "MAS device registry not deployed; only local/serial devices will appear.",
          timestamp: new Date().toISOString(),
        })
      }
      console.error(`MAS Device Registry error: ${response.status}`)
      return NextResponse.json({
        devices: [],
        count: 0,
        error: `MAS API returned ${response.status}`,
        timestamp: new Date().toISOString(),
      }, { status: response.status })
    }

    const data: DeviceRegistryResponse = await response.json()

    // Transform to match frontend expectations (serial + LoRa/BT/WiFi gateways)
    const devices = data.devices.map((device: NetworkDevice) => {
      // Build display name with fallback chain: device_display_name -> device_name -> device_role -> device_id
      const displayName = device.device_display_name 
        || device.device_name 
        || (device.device_role ? formatDeviceRole(device.device_role) : null)
        || device.device_id

      return {
        id: device.device_id,
        device_id: device.device_id,
        name: device.device_name,
        device_name: device.device_name,
        device_role: device.device_role ?? "standalone",
        device_display_name: device.device_display_name ?? null,
        display_name: displayName, // Computed display name with fallbacks
        type: "mycobrain",
        host: device.host,
        port: device.port,
        firmware_version: device.firmware_version,
        board_type: device.board_type,
        sensors: device.sensors,
        capabilities: device.capabilities,
        location: device.location,
        connection_type: device.connection_type,
        ingestion_source: device.ingestion_source ?? "serial",
        status: device.status,
        last_seen: device.last_seen,
        registered_at: device.registered_at,
        source: "MAS-Registry",
        extra: device.extra || {},
      }
    })

    return NextResponse.json({
      devices,
      count: devices.length,
      source: "MAS Device Registry",
      mas_url: MAS_API_URL,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error("Failed to fetch network devices:", error)
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    
    return NextResponse.json({
      devices: [],
      count: 0,
      error: `Failed to connect to MAS: ${errorMessage}`,
      timestamp: new Date().toISOString(),
    }, { status: 503 })
  }
}

/**
 * POST /api/devices/network/:deviceId/command
 * 
 * Forward a command to a network device via MAS.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { device_id, command, params = {}, timeout = 5 } = body

    if (!device_id) {
      return NextResponse.json(
        { error: "device_id is required" },
        { status: 400 }
      )
    }

    if (!command) {
      return NextResponse.json(
        { error: "command is required" },
        { status: 400 }
      )
    }

    const response = await fetch(`${MAS_API_URL}/api/devices/${device_id}/command`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        command,
        params,
        timeout,
      }),
      signal: AbortSignal.timeout((timeout + 5) * 1000),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `Device command failed: ${errorText}` },
        { status: response.status }
      )
    }

    const result = await response.json()
    return NextResponse.json(result)

  } catch (error) {
    console.error("Failed to send device command:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    
    return NextResponse.json(
      { error: `Command failed: ${errorMessage}` },
      { status: 500 }
    )
  }
}
