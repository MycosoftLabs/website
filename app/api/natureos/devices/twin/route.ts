/**
 * NatureOS Digital Twin API
 *
 * Retrieves device telemetry for digital twin synchronization.
 * NO MOCK DATA - uses NatureOS or MAS device telemetry endpoints.
 */

import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

const NATUREOS_URL =
  process.env.NATUREOS_API_BASE_URL || env.natureosApiBaseUrl
const MAS_API_URL = process.env.MAS_API_URL

async function fetchDeviceTelemetry(deviceId: string) {
  if (NATUREOS_URL) {
    const res = await fetch(
      `${NATUREOS_URL}/api/Devices/${encodeURIComponent(deviceId)}/sensor-data`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (res.ok) {
      return { data: await res.json(), source: "natureos" }
    }
  }

  if (MAS_API_URL) {
    const res = await fetch(
      `${MAS_API_URL}/api/devices/${encodeURIComponent(deviceId)}/sensor-data`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (res.ok) {
      return { data: await res.json(), source: "mas" }
    }
  }

  return null
}

export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get("deviceId") || ""

  if (!deviceId) {
    return NextResponse.json(
      { error: "deviceId is required" },
      { status: 400 }
    )
  }

  try {
    const result = await fetchDeviceTelemetry(deviceId)
    if (!result) {
      return NextResponse.json(
        { error: "Device telemetry unavailable" },
        { status: 503 }
      )
    }
    return NextResponse.json(result.data)
  } catch (error) {
    console.error("NatureOS digital twin error:", error)
    return NextResponse.json(
      { error: "Digital twin backend unavailable" },
      { status: 503 }
    )
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const deviceId = body.deviceId ?? body.id ?? ""

  if (!deviceId || typeof deviceId !== "string") {
    return NextResponse.json(
      { error: "deviceId is required" },
      { status: 400 }
    )
  }

  try {
    const result = await fetchDeviceTelemetry(deviceId)
    if (!result) {
      return NextResponse.json(
        { error: "Device telemetry unavailable" },
        { status: 503 }
      )
    }
    return NextResponse.json(result.data)
  } catch (error) {
    console.error("NatureOS digital twin error:", error)
    return NextResponse.json(
      { error: "Digital twin backend unavailable" },
      { status: 503 }
    )
  }
}
