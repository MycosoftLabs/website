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

const DEBUG_DEVICE_TELEMETRY = process.env.CREP_DEBUG_DEVICE_TELEMETRY === "1"

function toNumber(value: unknown): number | undefined {
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function normalizeEarthSimDeviceTelemetry(device: any) {
  const id = String(device?.id || device?.device_id || device?.registry_id || "")
  if (!id) return null
  const status = String(device?.status || "").toLowerCase()
  const connected = status === "online" || status === "connected" || status === "active"
  const telemetry = device?.telemetry && typeof device.telemetry === "object" ? device.telemetry : {}
  const bme = telemetry?.bme688 && typeof telemetry.bme688 === "object" ? telemetry.bme688 : {}
  const bmeA = bme?.a || telemetry?.bme1 || telemetry?.bme688_1 || {}
  const bmeB = bme?.b || telemetry?.bme2 || telemetry?.bme688_2 || null

  return {
    deviceId: id,
    deviceType: device?.type || device?.role || device?.device_type || "mycobrain",
    timestamp: device?.lastSeen || telemetry?.captured_at || telemetry?.timestamp || new Date().toISOString(),
    status: connected ? "active" : "inactive",
    connected,
    metrics: {
      temperature: toNumber(telemetry?.temperature_c ?? telemetry?.temperature ?? bmeA?.temperature_c ?? bmeA?.temp_c ?? bmeA?.temperature),
      humidity: toNumber(telemetry?.humidity_pct ?? telemetry?.humidity ?? bmeA?.humidity_pct ?? bmeA?.humidity),
      pressure: toNumber(telemetry?.pressure_hpa ?? telemetry?.pressure ?? bmeA?.pressure_hpa ?? bmeA?.pressure),
      iaq: toNumber(telemetry?.iaq ?? bmeA?.iaq),
      gasResistance: toNumber(telemetry?.gas_resistance_ohm ?? bmeA?.gas_ohm ?? bmeA?.gas_resistance_ohm),
      sensor2: bmeB ? {
        temperature: toNumber(telemetry?.bme_b_temperature_c ?? bmeB?.temperature_c ?? bmeB?.temp_c ?? bmeB?.temperature),
        humidity: toNumber(telemetry?.bme_b_humidity_pct ?? bmeB?.humidity_pct ?? bmeB?.humidity),
        pressure: toNumber(telemetry?.bme_b_pressure_hpa ?? bmeB?.pressure_hpa ?? bmeB?.pressure),
        iaq: toNumber(telemetry?.bme_b_iaq ?? bmeB?.iaq),
      } : null,
      uptime: toNumber(telemetry?.uptime_s ?? telemetry?.uptime_seconds),
    },
  }
}

async function fetchEarthSimulatorDeviceTelemetry(request: NextRequest, deviceId: string) {
  try {
    const res = await fetch(new URL("/api/earth-simulator/devices", request.url), {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(1800),
    })
    if (!res.ok) return null
    const data = await res.json()
    const devices = Array.isArray(data?.devices) ? data.devices : []
    const match = devices.find((d: any) => {
      const ids = [
        d?.id,
        d?.device_id,
        d?.registry_id,
        d?.registryId,
        d?.port,
      ].map((value) => String(value || ""))
      return ids.includes(deviceId)
    })
    return match ? normalizeEarthSimDeviceTelemetry(match) : null
  } catch (error) {
    if (DEBUG_DEVICE_TELEMETRY) {
      console.warn("Earth Simulator device telemetry fallback failed:", error)
    }
    return null
  }
}

async function fetchDeviceTelemetry(request: NextRequest, deviceId: string) {
  const mycoBrainUrl = process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8003"
  const mindexUrl = env.mindexApiBaseUrl

  const normalizedId = deviceId.replace(/^mycobrain-/, "")

  // 1. Try MycoBrain service first (connected devices)
  try {
    const mycoRes = await fetch(`${mycoBrainUrl}/devices`, {
      signal: AbortSignal.timeout(1800),
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
    if (DEBUG_DEVICE_TELEMETRY) {
      console.warn("MycoBrain fetch error:", error)
    }
  }

  // 2. Try MINDEX devices
  try {
    const mindexRes = await fetch(`${mindexUrl}/api/devices?type=mycobrain`, {
      signal: AbortSignal.timeout(1800),
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
    if (DEBUG_DEVICE_TELEMETRY) {
      console.warn("MINDEX fetch error:", error)
    }
  }

  return fetchEarthSimulatorDeviceTelemetry(request, deviceId)
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "Device ID required" }, { status: 400 })
  }

  const telemetry = await fetchDeviceTelemetry(_request, id)
  if (!telemetry) {
    return NextResponse.json(
      { error: `Device ${id} not found`, deviceId: id },
      { status: 404 }
    )
  }
  return NextResponse.json(telemetry)
}
