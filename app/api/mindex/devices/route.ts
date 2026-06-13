/**
 * Devices API Route (BFF Proxy)
 *
 * Proxies requests to MINDEX device endpoints
 */

import { type NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"
import { getDevices } from "@/lib/integrations/mindex"

const DEBUG_MINDEX_DEVICES = process.env.CREP_DEBUG_MINDEX_DEVICES === "1"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = Number.parseInt(searchParams.get("page") || "1")
  const pageSize = Number.parseInt(searchParams.get("pageSize") || "50")
  const type = searchParams.get("type") || undefined

  const fallbackToEarthSimulatorDevices = async () => {
    const fallbackUrl = new URL("/api/earth-simulator/devices", request.url)
    fallbackUrl.searchParams.set("refresh", "1")
    fallbackUrl.searchParams.set("wait", "1")
    const res = await fetch(fallbackUrl, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6_500),
    })
    if (!res.ok) throw new Error(`earth-simulator-devices ${res.status}`)
    const payload = await res.json()
    const rows = Array.isArray(payload?.devices) ? payload.devices : []
    const devices = type ? rows.filter((d: any) => d.type === type || d.role === type || d.device_type === type) : rows
    return NextResponse.json(
      {
        data: devices.slice(0, pageSize),
        devices: devices.slice(0, pageSize),
        meta: {
          page,
          pageSize,
          total: devices.length,
          source: "earth-simulator-devices-fallback",
        },
        total: devices.length,
        source: "earth-simulator-devices-fallback",
        dataSource: payload?.sources ? "real_field_device_registry" : "real_device_registry",
        upstream: {
          mindex: "unavailable",
          fallback: "/api/earth-simulator/devices",
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-MINDEX-Warning": "mindex-devices-unavailable-using-earth-simulator-devices",
        },
      },
    )
  }

  if (!env.integrationsEnabled) {
    try {
      return await fallbackToEarthSimulatorDevices()
    } catch {
      return NextResponse.json(
        {
          error: "MINDEX integration is disabled and device fallback is unavailable.",
          code: "INTEGRATIONS_DISABLED",
          requiredEnv: ["INTEGRATIONS_ENABLED=true", "MINDEX_API_BASE_URL", "MINDEX_API_KEY"],
        },
        { status: 503 },
      )
    }
  }

  try {
    const result = await getDevices({ page, pageSize })
    const devices = type ? result.data.filter((d) => d.type === type) : result.data

    return NextResponse.json({
      ...result,
      data: devices,
      meta: {
        ...result.meta,
        total: devices.length,
      },
    })
  } catch (error) {
    if (DEBUG_MINDEX_DEVICES) {
      console.warn("MINDEX devices unavailable, using Earth Simulator devices fallback:", error)
    }
    try {
      return await fallbackToEarthSimulatorDevices()
    } catch (fallbackError) {
      if (DEBUG_MINDEX_DEVICES) {
        console.warn("Earth Simulator devices fallback unavailable:", fallbackError)
      }
      return NextResponse.json({ error: "Failed to fetch devices", code: "MINDEX_ERROR" }, { status: 500 })
    }
  }
}
