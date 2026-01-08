import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MYCOBRAIN_SERVICE_URL = process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8003"

interface BuzzerCommand {
  action: "preset" | "tone" | "acoustic_tx" | "stop" | "acoustic_status"
  // Preset sounds
  preset?: "coin" | "bump" | "power" | "1up" | "morgio"
  // Custom tone
  hz?: number
  ms?: number
  // Acoustic modem TX params
  payload?: string
}

async function sendCommand(deviceId: string, cmd: string): Promise<string | null> {
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
    if (res.ok) {
      const data = await res.json()
      return data.response || null
    }
  } catch { /* ignore */ }
  return null
}

/**
 * POST /api/mycobrain/{port}/buzzer
 * Control buzzer: presets, custom tones, acoustic modem TX
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ port: string }> }
) {
  const { port } = await params
  
  try {
    const body: BuzzerCommand = await request.json()
    
    // Resolve device ID
    let deviceId = port
    try {
      const devicesRes = await fetch(`${MYCOBRAIN_SERVICE_URL}/devices`, {
        signal: AbortSignal.timeout(3000),
      })
      if (devicesRes.ok) {
        const devicesData = await devicesRes.json()
        const device = devicesData.devices?.find((d: { port?: string; device_id?: string }) =>
          d.port === port || d.device_id === port || d.port?.includes(port) || d.device_id?.includes(port)
        )
        if (device?.device_id) deviceId = device.device_id
      }
    } catch { /* use port */ }
    
    let cmd: string
    let response: string | null = null
    
    switch (body.action) {
      case "preset":
        const validPresets = ["coin", "bump", "power", "1up", "morgio"]
        const preset = body.preset || "coin"
        if (!validPresets.includes(preset)) {
          return NextResponse.json(
            { error: "Invalid preset", valid_presets: validPresets },
            { status: 400 }
          )
        }
        cmd = preset
        response = await sendCommand(deviceId, cmd)
        break
        
      case "tone":
        const hz = Math.max(100, Math.min(10000, body.hz || 1000))
        const ms = Math.max(10, Math.min(5000, body.ms || 200))
        // Firmware uses "beep" command, not "tone"
        cmd = `beep ${hz} ${ms}`
        response = await sendCommand(deviceId, cmd)
        break
        
      case "acoustic_tx":
        // Acoustic modem transmission - send CLI command
        const payload = body.payload || ""
        cmd = `aotx start ${payload}`
        response = await sendCommand(deviceId, cmd)
        break
        
      case "stop":
        cmd = "aotx stop"
        response = await sendCommand(deviceId, cmd)
        break
        
      case "acoustic_status":
        cmd = "aotx status"
        response = await sendCommand(deviceId, cmd)
        break
        
      default:
        return NextResponse.json(
          { error: "Invalid action", valid_actions: ["preset", "tone", "acoustic_tx", "stop", "acoustic_status"] },
          { status: 400 }
        )
    }
    
    return NextResponse.json({
      success: true,
      port,
      device_id: deviceId,
      action: body.action,
      command: cmd,
      response,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to control buzzer",
        details: String(error),
      },
      { status: 500 }
    )
  }
}

























