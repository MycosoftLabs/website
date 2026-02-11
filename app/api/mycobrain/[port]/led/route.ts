import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MYCOBRAIN_SERVICE_URL = process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8003"

interface LedCommand {
  action: "rgb" | "off" | "mode" | "pattern" | "optical_tx" | "optical_stop" | "optical_status" | "brightness"
  r?: number
  g?: number
  b?: number
  mode?: string
  pattern?: string
  value?: number  // For brightness 0-100
  // Optical modem TX params
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
 * POST /api/mycobrain/{port}/led
 * Control LED: RGB color, mode, patterns, optical modem TX
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ port: string }> }
) {
  const { port } = await params
  
  try {
    const body: LedCommand = await request.json()
    
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
      case "rgb":
        const r = Math.max(0, Math.min(255, body.r || 0))
        const g = Math.max(0, Math.min(255, body.g || 0))
        const b = Math.max(0, Math.min(255, body.b || 0))
        cmd = `led rgb ${r} ${g} ${b}`
        response = await sendCommand(deviceId, cmd)
        break
        
      case "off":
        cmd = "led mode off"
        response = await sendCommand(deviceId, cmd)
        break
        
      case "mode":
        const mode = body.mode || "manual"
        cmd = `led mode ${mode}`
        response = await sendCommand(deviceId, cmd)
        break
        
      case "pattern":
        // Pattern presets - map UI patterns to firmware patterns
        const patternMap: Record<string, string> = {
          solid: "solid",
          blink: "blink", 
          breathe: "breathe",
          rainbow: "rainbow",
          chase: "chase",
          sparkle: "sparkle"
        }
        const pattern = patternMap[body.pattern || "solid"] || "solid"
        cmd = `led pattern ${pattern}`
        response = await sendCommand(deviceId, cmd)
        break
        
      case "brightness":
        // Set LED brightness 0-100
        const brightness = Math.max(0, Math.min(100, body.value || 100))
        cmd = `led brightness ${brightness}`
        response = await sendCommand(deviceId, cmd)
        break
        
      case "optical_tx":
        // Optical modem transmission - send CLI command
        const payload = body.payload || ""
        cmd = `optx start ${payload}`
        response = await sendCommand(deviceId, cmd)
        break
        
      case "optical_stop":
        // Stop optical modem
        cmd = "optx stop"
        response = await sendCommand(deviceId, cmd)
        break
        
      case "optical_status":
        // Get optical modem status
        cmd = "optx status"
        response = await sendCommand(deviceId, cmd)
        break
        
      default:
        return NextResponse.json(
          { error: "Invalid action", valid_actions: ["rgb", "off", "mode", "pattern", "brightness", "optical_tx", "optical_stop", "optical_status"] },
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
        error: "Failed to control LED",
        details: String(error),
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/mycobrain/{port}/led
 * Get current LED state
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ port: string }> }
) {
  const { port } = await params
  
  try {
    // Get status to read LED state
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
    
    const response = await sendCommand(deviceId, "status")
    
    // Parse LED state from status
    let ledMode = "unknown"
    let rgb = { r: 0, g: 0, b: 0 }
    
    if (response) {
      const modeMatch = response.match(/LED mode=(\w+)/i)
      if (modeMatch) ledMode = modeMatch[1]
      
      const rgbMatch = response.match(/manual rgb=(\d+),(\d+),(\d+)/i)
      if (rgbMatch) {
        rgb = {
          r: parseInt(rgbMatch[1]),
          g: parseInt(rgbMatch[2]),
          b: parseInt(rgbMatch[3]),
        }
      }
    }
    
    return NextResponse.json({
      port,
      device_id: deviceId,
      led: {
        mode: ledMode,
        rgb,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to get LED state",
        details: String(error),
      },
      { status: 503 }
    )
  }
}

























