import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/api-auth"
import { isNetworkRegistryTarget, sendMasNetworkCommand } from "@/lib/devices/network-command-bridge"

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

type ServiceCommandResult = {
  ok: boolean
  status: number
  response: unknown
  error?: unknown
}

async function sendCommand(deviceId: string, cmd: string): Promise<ServiceCommandResult> {
  try {
    const res = await fetch(
      `${MYCOBRAIN_SERVICE_URL}/devices/${encodeURIComponent(deviceId)}/command`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: { cmd } }),
        signal: AbortSignal.timeout(12000),
      }
    )
    const text = await res.text()
    let data: unknown = text
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = { raw: text }
    }
    if (!res.ok) {
      return { ok: false, status: res.status, response: data, error: data }
    }
    const record = data as Record<string, unknown>
    return {
      ok: record.ok !== false && record.success !== false && record.status !== "error",
      status: res.status,
      response: record.response ?? record.result ?? data,
      error: record.error,
    }
  } catch (error) {
    return { ok: false, status: 503, response: null, error: String(error) }
  }
}

function isDirectLocalSerialTarget(port: string) {
  const value = port.trim()
  return /^COM\d+$/i.test(value) || /^mycobrain-COM\d+$/i.test(value)
}

function localSerialServiceDeviceId(port: string) {
  const value = port.trim()
  const bareCom = value.match(/^COM\d+$/i)?.[0]
  if (bareCom) return `mycobrain-${bareCom.toUpperCase()}`
  const mycobrainCom = value.match(/^mycobrain-(COM\d+)$/i)?.[1]
  if (mycobrainCom) return `mycobrain-${mycobrainCom.toUpperCase()}`
  return value
}

async function resolveLocalDeviceId(port: string) {
  if (isDirectLocalSerialTarget(port)) return localSerialServiceDeviceId(port)
  let deviceId = port
  try {
    const devicesRes = await fetch(`${MYCOBRAIN_SERVICE_URL}/devices`, {
      signal: AbortSignal.timeout(1000),
    })
    if (devicesRes.ok) {
      const devicesData = await devicesRes.json()
      const device = devicesData.devices?.find((d: { port?: string; device_id?: string }) =>
        d.port === port || d.device_id === port || d.port?.includes(port) || d.device_id?.includes(port)
      )
      if (device?.device_id) deviceId = device.device_id
    }
  } catch { /* use port */ }
  return deviceId
}

/**
 * POST /api/mycobrain/{port}/led
 * Control LED: RGB color, mode, patterns, optical modem TX
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ port: string }> }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { port } = await params
  
  try {
    const body: LedCommand = await request.json()
    
    let cmd: string
    
    switch (body.action) {
      case "rgb":
        const r = Math.max(0, Math.min(255, body.r || 0))
        const g = Math.max(0, Math.min(255, body.g || 0))
        const b = Math.max(0, Math.min(255, body.b || 0))
        cmd = `led rgb ${r} ${g} ${b}`
        break
        
      case "off":
        cmd = "led off"
        break
        
      case "mode":
        const mode = body.mode || "manual"
        cmd = `led mode ${mode}`
        break
        
      case "pattern":
        // Forward all UI patterns to firmware. If a pattern does not animate,
        // the board/service response should show that instead of the UI
        // disabling controls or pretending the command does not exist.
        const pattern = String(body.pattern || "rainbow").trim().toLowerCase()
        cmd = `led pattern ${pattern}`
        break
        
      case "brightness":
        return NextResponse.json(
          {
            success: false,
            error: "LED brightness is not implemented on current COM4 firmware",
            supported_actions: ["rgb", "off", "pattern:rainbow"],
          },
          { status: 422 }
        )
        
      case "optical_tx":
        return NextResponse.json(
          {
            success: false,
            error: "Optical TX is standby on current COM4 firmware",
            supported_actions: ["rgb", "off", "pattern:rainbow", "optical_status"],
          },
          { status: 422 }
        )
        
      case "optical_stop":
        // Stop optical modem
        cmd = "optx stop"
        break
        
      case "optical_status":
        // Get optical modem status
        cmd = "optx status"
        break
        
      default:
        return NextResponse.json(
          { error: "Invalid action", valid_actions: ["rgb", "off", "mode", "pattern", "brightness", "optical_tx", "optical_stop", "optical_status"] },
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

    // Resolve device ID (local serial only). Direct COM targets should not wait
    // on the global /devices scan before actuator commands.
    const deviceId = await resolveLocalDeviceId(port)
    const commandResult = await sendCommand(deviceId, cmd)
    
    return NextResponse.json({
      success: commandResult.ok,
      port,
      device_id: deviceId,
      action: body.action,
      command: cmd,
      response: commandResult.response,
      error: commandResult.error,
      timestamp: new Date().toISOString(),
    }, { status: commandResult.ok ? 200 : commandResult.status })
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
    const deviceId = await resolveLocalDeviceId(port)
    const commandResult = await sendCommand(deviceId, "status")
    const response = typeof commandResult.response === "string"
      ? commandResult.response
      : JSON.stringify(commandResult.response || "")
    
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














