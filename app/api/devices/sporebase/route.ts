/**
 * SporeBase device info and status.
 * Proxies to MAS /api/sporebase/devices when available.
 * Created: February 12, 2026
 */

import { NextResponse } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

/**
 * GET /api/devices/sporebase
 * Returns SporeBase device list and aggregate status from MAS.
 */
export async function GET() {
  try {
    const response = await fetch(`${MAS_API_URL}/api/sporebase/devices`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    })

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({
          devices: [],
          count: 0,
          source: "MAS",
          note: "SporeBase API not deployed; no devices.",
          timestamp: new Date().toISOString(),
        })
      }
      const text = await response.text()
      return NextResponse.json(
        { error: `MAS returned ${response.status}: ${text}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json({
      ...data,
      source: "MAS",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.warn("SporeBase devices fetch failed:", error)
    return NextResponse.json({
      devices: [],
      count: 0,
      source: "MAS",
      note: "MAS unreachable; no device data.",
      timestamp: new Date().toISOString(),
    })
  }
}
