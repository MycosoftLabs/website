import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/api-auth"
import { isNetworkRegistryTarget, sendMasNetworkCommand } from "@/lib/devices/network-command-bridge"

export const dynamic = "force-dynamic"

const MYCOBRAIN_SERVICE_URL = process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8003"

interface BuzzerCommand {
  action: "preset" | "tone" | "melody" | "acoustic_tx" | "stop" | "off" | "acoustic_status"
  // Preset sounds
  preset?: "coin" | "bump" | "power" | "1up" | "morgio"
  // Custom tone
  hz?: number
  ms?: number
  // Acoustic modem TX params
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
        {
          const hz = Math.max(50, Math.min(8000, Number(body.hz || 1000)))
          const ms = Math.max(20, Math.min(1000, Number(body.ms || 100)))
          cmd = `beep ${hz} ${ms}`
        }
        break

      case "melody":
        cmd = "morgio"
        break
        
      case "acoustic_tx":
        return NextResponse.json(
          {
            success: false,
            error: "Acoustic TX is standby on current COM4 firmware",
            supported_actions: ["preset", "tone", "melody", "stop", "acoustic_status"],
          },
          { status: 422 }
        )
        
      case "stop":
      case "off":
        cmd = "buzzer off"
        break
        
      case "acoustic_status":
        cmd = "aotx status"
        break
        
      default:
        return NextResponse.json(
          { error: "Invalid action", valid_actions: ["preset", "tone", "melody", "acoustic_tx", "stop", "acoustic_status"] },
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
        error: "Failed to control buzzer",
        details: String(error),
      },
      { status: 500 }
    )
  }
}















