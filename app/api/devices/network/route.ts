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
import {
  FIELD_MYCOBRAIN_DEPLOYMENTS,
  deploymentByHost,
  parseLocation,
} from "@/lib/devices/field-deployments"
import { probeAllOperatorAgents } from "@/lib/devices/operator-probe"
import { resolveDevBenchLocation, DEV_BENCH_LOCATION_LABEL } from "@/lib/devices/dev-bench-location"

const MAS_API_URL = process.env.MAS_API_URL || "http://localhost:8001"

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
  location_coords?: { lat: number; lon: number } | null
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

async function buildFieldAndOperatorDevices(
  existingProbes?: Awaited<ReturnType<typeof probeAllOperatorAgents>>
) {
  const operatorProbes = existingProbes ?? (await probeAllOperatorAgents())
  const probeByHost = new Map(operatorProbes.map((p) => [p.host, p]))
  return FIELD_MYCOBRAIN_DEPLOYMENTS.map((field) => {
    const probe = probeByHost.get(field.host_ip)
    return {
      id: field.registry_id,
      device_id: field.registry_id,
      name: field.name,
      device_name: field.name,
      device_role: field.role,
      device_display_name: field.name,
      display_name: field.name,
      type: "mycobrain",
      host: field.host_ip,
      port: field.agent_port,
      agent_url: field.agent_url,
      firmware_version: probe?.firmware_version ?? "unknown",
      board_type: field.board_type,
      sensors: [],
      capabilities: ["mqtt", "mdp_command", "telemetry_stream"],
      location: `${field.location.lat},${field.location.lon}`,
      location_coords: field.location,
      location_label: field.location_label,
      connection_type: "lan",
      ingestion_source: probe ? "operator-http" : "field-config",
      status: probe?.online ? "online" : "offline",
      last_seen: probe?.last_seen ?? null,
      registered_at: new Date().toISOString(),
      source: probe ? "operator-http" : "field-config",
      extra: {
        agent_url: field.agent_url,
        mdp_device_id: field.mdp_device_id,
        field_deployment: field.registry_id,
        latest_telemetry: probe?.telemetry ?? null,
      },
      telemetry: probe?.telemetry ?? null,
      openclaw_url: `http://${field.host_ip}:18789`,
    }
  })
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
      if (response.status === 404) {
        const fallback = await buildFieldAndOperatorDevices()
        return NextResponse.json({
          devices: fallback,
          count: fallback.length,
          source: "field-config+operator-http",
          mas_url: MAS_API_URL,
          note: "MAS device registry empty; showing field deployments from LAN probes.",
          timestamp: new Date().toISOString(),
        })
      }
      console.warn(`MAS Device Registry returned ${response.status}, returning empty list`)
      return NextResponse.json({
        devices: [],
        count: 0,
        source: "MAS Device Registry",
        mas_url: MAS_API_URL,
        note: `MAS returned ${response.status}; only local/serial devices will appear.`,
        timestamp: new Date().toISOString(),
      })
    }

    const data: DeviceRegistryResponse = await response.json()

    const operatorProbes = await probeAllOperatorAgents()
    const probeByHost = new Map(operatorProbes.map((p) => [p.host, p]))

    // Transform to match frontend expectations (serial + LoRa/BT/WiFi gateways)
    const devices = data.devices.map((device: NetworkDevice) => {
      const field = deploymentByHost(device.host)
      const extra = (device.extra || {}) as Record<string, unknown>
      const agentUrl =
        (typeof extra.agent_url === "string" ? extra.agent_url : null) ||
        (field ? field.agent_url : device.host ? `http://${device.host}:${device.port || 8787}` : null)
      const probe = probeByHost.get(device.host)
      const coords =
        field?.location ||
        parseLocation(device.location) ||
        parseLocation(extra.location) ||
        resolveDevBenchLocation(device.device_id, device.host) ||
        null

      // Build display name with fallback chain: device_display_name -> device_name -> device_role -> device_id
      const displayName = device.device_display_name 
        || device.device_name 
        || (device.device_role ? formatDeviceRole(device.device_role) : null)
        || device.device_id

      const liveStatus =
        probe?.online && (device.status === "offline" || device.status === "stale")
          ? "online"
          : device.status

      return {
        id: device.device_id,
        device_id: device.device_id,
        name: device.device_name,
        device_name: device.device_name,
        device_role: device.device_role ?? field?.role ?? "standalone",
        device_display_name: device.device_display_name ?? field?.name ?? null,
        display_name: field?.name || displayName,
        type: "mycobrain",
        host: device.host,
        port: device.port,
        agent_url: agentUrl,
        firmware_version: device.firmware_version || probe?.firmware_version,
        board_type: device.board_type,
        sensors: device.sensors,
        capabilities: device.capabilities,
        location: field?.location
          ? `${field.location.lat},${field.location.lon}`
          : device.location || (coords ? `${coords.lat},${coords.lon}` : null),
        location_coords: coords,
        location_label:
          field?.location_label ??
          (resolveDevBenchLocation(device.device_id, device.host)
            ? DEV_BENCH_LOCATION_LABEL
            : null),
        connection_type: device.connection_type,
        ingestion_source: device.ingestion_source ?? "serial",
        status: liveStatus,
        last_seen: probe?.last_seen || device.last_seen,
        registered_at: device.registered_at,
        source: "MAS-Registry",
        extra: {
          ...extra,
          agent_url: agentUrl,
          mdp_device_id: extra.mdp_device_id || field?.mdp_device_id || probe?.mdp_device_id,
          latest_telemetry: probe?.telemetry ?? extra.latest_telemetry,
          field_deployment: field?.registry_id ?? null,
        },
        telemetry: probe?.telemetry ?? null,
        // NemoClaw Control UI (port 18789) runs on same host as device for on-site AI
        openclaw_url: device.host ? `http://${device.host}:18789` : null,
      }
    })

    const knownIds = new Set(devices.map((d) => d.device_id))
    const fieldFallback = await buildFieldAndOperatorDevices(operatorProbes)

    for (const fb of fieldFallback) {
      if (!knownIds.has(fb.device_id)) devices.push(fb)
    }

    return NextResponse.json({
      devices,
      count: devices.length,
      source: "MAS Device Registry",
      mas_url: MAS_API_URL,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.warn("MAS device registry unreachable, returning field fallback:", error instanceof Error ? error.message : error)
    const fallback = await buildFieldAndOperatorDevices()
    return NextResponse.json({
      devices: fallback,
      count: fallback.length,
      source: "field-config+operator-http",
      mas_url: MAS_API_URL,
      note: "MAS unreachable; showing field deployments from LAN operator probes.",
      timestamp: new Date().toISOString(),
    })
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
