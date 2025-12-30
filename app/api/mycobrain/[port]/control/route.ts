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
    // First, try to find the device_id from the port
    // The port parameter might be a device_id (e.g., "mycobrain-side-a-COM5") or just a port (e.g., "COM5")
    let deviceId = port
    
    // If it looks like just a port (COM5), try to find the device_id
    if (port.match(/^COM\d+$/i)) {
      try {
        const devicesRes = await fetch(`${MYCOBRAIN_SERVICE_URL}/devices`, {
          signal: AbortSignal.timeout(3000),
        })
        if (devicesRes.ok) {
          const devicesData = await devicesRes.json()
          const device = devicesData.devices?.find((d: any) => d.port === port)
          if (device?.device_id) {
            deviceId = device.device_id
          }
        }
      } catch {
        // If lookup fails, use port as device_id (fallback)
      }
    }

    let endpoint = ""
    let payload = {}

    switch (peripheral) {
      case "neopixel":
        // Use command endpoint with proper format
        endpoint = `/devices/${encodeURIComponent(deviceId)}/command`
        // Board command: led rgb <r 0-255> <g 0-255> <b 0-255>
        const r = data.r || 0
        const g = data.g || 0
        const b = data.b || 0
        if (action === "rainbow") {
          // No rainbow mode on board, simulate with cycle color
          payload = { command: { cmd: "led mode state" } }
        } else if (action === "off") {
          payload = { command: { cmd: "led mode off" } }
        } else {
          // Note: brightness not supported by board, just set manual mode and RGB
          payload = { command: { cmd: `led rgb ${r} ${g} ${b}` } }
        }
        break

      case "buzzer":
        // Use command endpoint with proper format
        // Board supports: coin, bump, power, 1up, morgio for sounds
        endpoint = `/devices/${encodeURIComponent(deviceId)}/command`
        if (action === "melody" || action === "morgio") {
          payload = { command: { cmd: "morgio" } }
        } else if (action === "off") {
          // No buzzer off command, just ignore
          return NextResponse.json({ success: true, peripheral, action, message: "Buzzer stops automatically" })
        } else if (action === "coin" || action === "beep") {
          payload = { command: { cmd: "coin" } }
        } else if (action === "bump") {
          payload = { command: { cmd: "bump" } }
        } else if (action === "power") {
          payload = { command: { cmd: "power" } }
        } else if (action === "1up") {
          payload = { command: { cmd: "1up" } }
        } else {
          // Default to coin sound for any beep action
          payload = { command: { cmd: "coin" } }
        }
        break

      case "command":
        endpoint = `/devices/${encodeURIComponent(deviceId)}/command`
        // Support both old format and new format
        if (data.cmd) {
          // New format: {"command": {"cmd": "led rgb 255 0 0"}}
          payload = { command: { cmd: data.cmd } }
        } else {
          // Old format for backwards compatibility
          payload = {
            cmd_id: data.cmd_id || 0,
            dst: data.dst || 0xa1,
            data: data.data || [],
          }
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
