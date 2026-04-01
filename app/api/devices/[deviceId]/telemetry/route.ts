/**
 * Device Telemetry Route
 *
 * Proxies telemetry from MAS Device Registry or On-Device NemoClaw (Jetson gateway).
 * Used by device detail pages for Mushroom 1 and Hyphae 1.
 *
 * Created: March 7, 2026
 */

import { NextRequest, NextResponse } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://localhost:8001"

/**
 * GET /api/devices/[deviceId]/telemetry
 *
 * Get telemetry from a device via MAS. Supports ?n=10 for last N readings
 * when proxying to On-Device NemoClaw /telemetry/latest.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  const { deviceId } = await params
  const { searchParams } = new URL(request.url)
  const n = Math.min(Math.max(parseInt(searchParams.get("n") ?? "10", 10) || 10, 1), 100)

  try {
    const response = await fetch(
      `${MAS_API_URL}/api/devices/${deviceId}/telemetry${n !== 10 ? `?n=${n}` : ""}`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: `Telemetry failed: ${errorMessage}` },
      { status: 500 }
    )
  }
}
