/**
 * Individual Device Telemetry API
 *
 * Returns telemetry for a single device by ID.
 * Fetches from MycoBrain service and MINDEX, filters by device ID.
 * NO MOCK DATA - all data from real backends.
 */

import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

async function fetchDeviceTelemetry(deviceId: string) {
  const mycoBrainUrl = process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8003"
  const mindexUrl = env.mindexApiBaseUrl

  const normalizedId = deviceId.replace(/^mycobrain-/, "")

  // 1. Try MycoBrain service first (connected devices)
  try {
    const mycoRes = await fetch(`${mycoBrainUrl}/devices`, {
      signal: AbortSignal.timeout(5000),
    })
    if (mycoRes.ok) {
      const mycoData = await mycoRes.json()
      const devices = mycoData.devices || []
      const match = devices.find(
        (d: { port?: string; device_id?: string }) =>
          d.port?.replace(/[\/\\]/g, "-") === normalizedId ||
          d.device_id === deviceId ||
          `mycobrain-${(d.port || "").replace(/[\/\\]/g, "-")}` === deviceId
      )
      if (match) {
        const bme1 = match.sensor_data?.bme688_1
        const bme2 = match.sensor_data?.bme688_2
        return {
          deviceId: `mycobrain-${(match.port || "").replace(/[\/\\]/g, "-")}`,
          deviceType: "mycobrain",
          timestamp: match.last_message_time || new Date().toISOString(),
          status: match.connected ? "active" : "inactive",
          connected: match.connected,
          metrics: {
            temperature: bme1?.temperature,
            humidity: bme1?.humidity,
            pressure: bme1?.pressure,
            iaq: bme1?.iaq,
            gasResistance: bme1?.gas_resistance,
            sensor2: bme2
              ? {
                  temperature: bme2.temperature,
                  humidity: bme2.humidity,
                  pressure: bme2.pressure,
                  iaq: bme2.iaq,
                }
              : null,
            uptime: match.device_info?.uptime,
            loraStatus: match.device_info?.lora_status,
          },
        }
      }
    }
  } catch (error) {
    console.error("MycoBrain fetch error:", error)
  }

  // 2. Try MINDEX devices
  try {
    const mindexRes = await fetch(`${mindexUrl}/api/devices?type=mycobrain`, {
      signal: AbortSignal.timeout(3000),
    })
    if (mindexRes.ok) {
      const mindexData = await mindexRes.json()
      const devices = mindexData.data || mindexData.devices || []
      const match = devices.find(
        (d: { device_id?: string; id?: string }) =>
          d.device_id === deviceId || d.id === deviceId
      )
      if (match) {
        return {
          deviceId: match.device_id || match.id,
          deviceType: match.device_type || "mycobrain",
          timestamp: match.last_seen || match.timestamp || new Date().toISOString(),
          status: match.status === "online" ? "active" : "inactive",
          connected: match.status === "online",
          metrics: match.metrics || {},
        }
      }
    }
  } catch (error) {
    console.error("MINDEX fetch error:", error)
  }

  return null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "Device ID required" }, { status: 400 })
  }

  const telemetry = await fetchDeviceTelemetry(id)
  if (!telemetry) {
    return NextResponse.json(
      { error: `Device ${id} not found`, deviceId: id },
      { status: 404 }
    )
  }
  return NextResponse.json(telemetry)
}
