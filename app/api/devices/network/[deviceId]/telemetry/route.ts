/**
 * Network Device Telemetry Route
 * 
 * Fetch telemetry from a specific network-registered MycoBrain device.
 * 
 * Created: February 10, 2026
 */

import { NextRequest, NextResponse } from "next/server"
import { deploymentByRegistryId } from "@/lib/devices/field-deployments"
import { probeOperatorAgent } from "@/lib/devices/operator-probe"

const MAS_API_URL = process.env.MAS_API_URL || "http://localhost:8001"

async function telemetryFromFieldOperator(deviceId: string) {
  const field = deploymentByRegistryId(deviceId)
  if (!field) return null
  const probe = await probeOperatorAgent(field.agent_url)
  if (!probe?.telemetry) return null
  return {
    telemetry: probe.telemetry,
    status: probe.online ? "online" : "offline",
    last_seen: probe.last_seen,
    source: "field-operator-api",
    agent_url: field.agent_url,
    host: field.host_ip,
    location: field.location,
    location_label: field.location_label,
  }
}

async function telemetryFromRegistrySnapshot(deviceId: string) {
  const response = await fetch(`${MAS_API_URL}/api/devices?include_offline=true`, {
    headers: { "Accept": "application/json" },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  })
  if (!response.ok) return null
  const snapshot = await response.json()
  const devices = Array.isArray(snapshot?.devices) ? snapshot.devices : []
  const device = devices.find((entry: any) => (
    String(entry?.device_id ?? "") === deviceId ||
    String(entry?.id ?? "") === deviceId ||
    String(entry?.registry_id ?? "") === deviceId
  ))
  if (!device) return null
  const telemetry = device.telemetry || device.extra?.latest_telemetry || null
  if (!telemetry) return null
  return {
    telemetry,
    status: device.status,
    last_seen: device.last_seen,
    source: "mas-registry-snapshot",
  }
}

/**
 * GET /api/devices/network/[deviceId]/telemetry
 * 
 * Get telemetry data from a network device via MAS Device Registry.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  const { deviceId } = await params

  try {
    const fieldLive = await telemetryFromFieldOperator(deviceId).catch(() => null)
    if (fieldLive) {
      return NextResponse.json({
        success: true,
        device_id: deviceId,
        ...fieldLive,
      })
    }

    const response = await fetch(`${MAS_API_URL}/api/devices/${deviceId}/telemetry`, {
      headers: {
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    })

    if (!response.ok) {
      const fallback = await telemetryFromRegistrySnapshot(deviceId).catch(() => null)
      if (fallback) {
        return NextResponse.json({
          success: true,
          device_id: deviceId,
          ...fallback,
        })
      }
      const errorText = await response.text()
      console.error(`Device ${deviceId} telemetry failed:`, errorText)
      return NextResponse.json(
        { error: `Telemetry fetch failed: ${errorText}` },
        { status: response.status }
      )
    }

    const result = await response.json()
    return NextResponse.json({
      success: true,
      device_id: deviceId,
      ...result,
    })

  } catch (error) {
    const fallback = await telemetryFromRegistrySnapshot(deviceId).catch(() => null)
    if (fallback) {
      return NextResponse.json({
        success: true,
        device_id: deviceId,
        ...fallback,
      })
    }
    console.error(`Failed to get telemetry from device ${deviceId}:`, error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    
    return NextResponse.json(
      { error: `Telemetry failed: ${errorMessage}` },
      { status: 500 }
    )
  }
}
