import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/api-auth"
import { isNetworkRegistryTarget, sendMasNetworkCommand } from "@/lib/devices/network-command-bridge"

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
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { port } = await params
  
  try {
    const body: BuzzerCommand = await request.json()
    
    let cmd: string
    
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
        break
        
      case "tone":
        const hz = Math.max(100, Math.min(10000, body.hz || 1000))
        const ms = Math.max(10, Math.min(5000, body.ms || 200))
        cmd = `beep ${hz} ${ms}`
        break
        
      case "acoustic_tx":
        const payload = body.payload || ""
        cmd = `aotx start ${payload}`
        break
        
      case "stop":
        cmd = "aotx stop"
        break
        
      case "acoustic_status":
        cmd = "aotx status"
        break
        
      default:
        return NextResponse.json(
          { error: "Invalid action", valid_actions: ["preset", "tone", "acoustic_tx", "stop", "acoustic_status"] },
          { status: 400 }
        )
    }

    if (isNetworkRegistryTarget(port)) {
      const { ok, result, status } = await sendMasNetworkCommand(port, cmd)
      return NextResponse.json({
        success: ok,
        port,
        device_id: port,
        action: body.action,
        command: cmd,
        response: result,
        source: "mas-network-relay",
        timestamp: new Date().toISOString(),
      }, { status: ok ? 200 : status })
    }

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

    const response = await sendCommand(deviceId, cmd)
    
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
























