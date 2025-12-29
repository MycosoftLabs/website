import { NextRequest, NextResponse } from "next/server"

// Port 8003 = MAS dual service (preferred), Port 8765 = legacy website service
const MYCOBRAIN_SERVICE_URL = process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8003"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ port: string }> }
) {
  const { port } = await params
  const body = await request.json()
  const { peripheral, action, ...data } = body

  try {
    let endpoint = ""
    let payload = {}

    switch (peripheral) {
      case "neopixel":
        endpoint = `/devices/${encodeURIComponent(port)}/neopixel`
        payload = {
          r: data.r || 0,
          g: data.g || 0,
          b: data.b || 0,
          brightness: data.brightness || 128,
          mode: action || "solid",
        }
        break

      case "buzzer":
        endpoint = `/devices/${encodeURIComponent(port)}/buzzer`
        payload = {
          frequency: data.frequency || 1000,
          duration_ms: data.duration_ms || 100,
          pattern: action || "beep",
        }
        break

      case "command":
        endpoint = `/devices/${encodeURIComponent(port)}/command`
        payload = {
          cmd_id: data.cmd_id || 0,
          dst: data.dst || 0xa1,
          data: data.data || [],
        }
        break

      default:
        return NextResponse.json({ error: "Unknown peripheral" }, { status: 400 })
    }

    const response = await fetch(`${MYCOBRAIN_SERVICE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    })

    if (response.ok) {
      const result = await response.json()
      return NextResponse.json({
        success: true,
        peripheral,
        action,
        result,
      })
    }

    throw new Error("Command failed")
  } catch (error) {
    // Return error - no mock success
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send command",
        message: "MycoBrain service not available or device not connected",
        peripheral,
        action,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
