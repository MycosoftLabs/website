import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MYCOBRAIN_SERVICE_URL = process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8003"

// Helper to resolve device_id from port
async function resolveDeviceId(port: string): Promise<string> {
  // If it looks like a device_id already, use it
  if (port.startsWith("mycobrain-")) return port
  
  // If it's a port path (COM5, /dev/ttyACM0), look up the device_id
  if (port.match(/^COM\d+$/i) || port.startsWith("/dev/")) {
    try {
      const res = await fetch(`${MYCOBRAIN_SERVICE_URL}/devices`, {
        signal: AbortSignal.timeout(3000),
      })
      if (res.ok) {
        const data = await res.json()
        const device = data.devices?.find((d: any) => d.port === port)
        if (device?.device_id) return device.device_id
      }
    } catch {
      // Fallback to constructed device_id
    }
    // Construct device_id from port path: /dev/ttyACM0 -> mycobrain--dev-ttyACM0
    return `mycobrain-${port.replace(/\//g, "-")}`
  }
  
  return port
}

/**
 * POST /api/mycobrain/{port}/machine-mode
 * Initialize machine mode on the board
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ port: string }> }
) {
  const { port } = await params
  
  try {
    // Resolve device_id from port
    const deviceId = await resolveDeviceId(port)
    
    // Send bootstrap commands for machine mode
    // The current firmware (v2.0.0) supports: help, status, ping, get_mac, get_version,
    // scan, sensors, led, beep, fmt, optx, aotx, reboot
    const commands = [
      "fmt json",      // Ensure JSON format (NDJSON output)
    ]
    
    const results: { cmd: string; ok: boolean; response?: string }[] = []
    
    for (const cmd of commands) {
      try {
        const res = await fetch(
          `${MYCOBRAIN_SERVICE_URL}/devices/${encodeURIComponent(deviceId)}/command`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ command: { cmd } }),
            signal: AbortSignal.timeout(5000),
          }
        )
        const data = await res.json()
        results.push({ cmd, ok: res.ok, response: data.response })
      } catch (e) {
        results.push({ cmd, ok: false, response: String(e) })
      }
      // Small delay between commands
      await new Promise(r => setTimeout(r, 200))
    }
    
    return NextResponse.json({
      success: true,
      port,
      device_id: deviceId,
      machine_mode: true,
      commands: results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize machine mode",
        details: String(error),
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/mycobrain/{port}/machine-mode
 * Get machine mode status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ port: string }> }
) {
  const { port } = await params
  
  try {
    // Resolve device_id from port
    const deviceId = await resolveDeviceId(port)
    
    const response = await fetch(
      `${MYCOBRAIN_SERVICE_URL}/devices/${encodeURIComponent(deviceId)}/command`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: { cmd: "status" } }),
        signal: AbortSignal.timeout(5000),
      }
    )
    
    if (!response.ok) {
      throw new Error(`Status check failed: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Check if machine mode is active from the response
    const responseText = data.response || ""
    const isMachineMode = responseText.includes('"type"') || responseText.includes('"ok"')
    
    return NextResponse.json({
      port,
      device_id: deviceId,
      machine_mode: isMachineMode,
      status: data,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        port,
        error: "Failed to get status",
        details: String(error),
      },
      { status: 503 }
    )
  }
}

























