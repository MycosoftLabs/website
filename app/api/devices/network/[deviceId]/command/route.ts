/**
 * Network Device Command Route
 * 
 * Forward commands to a specific network-registered MycoBrain device.
 * 
 * Created: February 10, 2026
 */

import { NextRequest, NextResponse } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

interface CommandRequest {
  command: string
  params?: Record<string, unknown>
  timeout?: number
}

/**
 * POST /api/devices/network/[deviceId]/command
 * 
 * Send a command to a network device via MAS Device Registry.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { deviceId: string } }
) {
  const { deviceId } = params

  try {
    const body: CommandRequest = await request.json()
    const { command, params: cmdParams = {}, timeout = 5 } = body

    if (!command) {
      return NextResponse.json(
        { error: "command is required" },
        { status: 400 }
      )
    }

    const response = await fetch(`${MAS_API_URL}/api/devices/${deviceId}/command`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        command,
        params: cmdParams,
        timeout,
      }),
      signal: AbortSignal.timeout((timeout + 5) * 1000),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Device ${deviceId} command failed:`, errorText)
      return NextResponse.json(
        { error: `Device command failed: ${errorText}` },
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
    console.error(`Failed to send command to device ${deviceId}:`, error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    
    return NextResponse.json(
      { error: `Command failed: ${errorMessage}` },
      { status: 500 }
    )
  }
}
