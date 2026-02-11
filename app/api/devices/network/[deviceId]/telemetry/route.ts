/**
 * Network Device Telemetry Route
 * 
 * Fetch telemetry from a specific network-registered MycoBrain device.
 * 
 * Created: February 10, 2026
 */

import { NextRequest, NextResponse } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

/**
 * GET /api/devices/network/[deviceId]/telemetry
 * 
 * Get telemetry data from a network device via MAS Device Registry.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { deviceId: string } }
) {
  const { deviceId } = params

  try {
    const response = await fetch(`${MAS_API_URL}/api/devices/${deviceId}/telemetry`, {
      headers: {
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    })

    if (!response.ok) {
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
    console.error(`Failed to get telemetry from device ${deviceId}:`, error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    
    return NextResponse.json(
      { error: `Telemetry failed: ${errorMessage}` },
      { status: 500 }
    )
  }
}
