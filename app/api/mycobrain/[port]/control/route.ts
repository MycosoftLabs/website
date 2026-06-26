import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/api-auth"
import { isFieldRegistryId } from "@/lib/devices/firmware-compatibility"
import { controlPayloadToOperatorCommand } from "@/lib/mycobrain/control-command"
import { isLocalPsathyrellaSerialTarget, resolveLocalSerialServiceTarget } from "@/lib/devices/psathyrella-local"

// MycoBrain service runs on port 8003
const MYCOBRAIN_SERVICE_URL = process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8003"
const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

export const dynamic = "force-dynamic"

function isLocalPsathyrellaSerialTarget(port: string) {
  const value = port.trim()
  const upper = value.toUpperCase()
  if (/^COM\d+$/.test(upper)) return true
  if (/^MYCOBRAIN-COM\d+$/i.test(value)) return true
  if (upper === "PSATHYRELLA-BUOY-COM4" || upper === "MYCOBRAIN-COM4") return true
  return value.toLowerCase().includes("psathyrella")
}

function localSerialServiceDeviceId(port: string) {
  const value = port.trim()
  const bareCom = value.match(/^COM\d+$/i)?.[0]
  if (bareCom) return `mycobrain-${bareCom.toUpperCase()}`
  const mycobrainCom = value.match(/^mycobrain-(COM\d+)$/i)?.[1]
  if (mycobrainCom) return `mycobrain-${mycobrainCom.toUpperCase()}`
  return null
}

function normalizeRawCommand(cmd: unknown) {
  return typeof cmd === "string" ? cmd.trim().toLowerCase().replace(/\s+/g, " ") : ""
}

function blockedLocalSerialControl(peripheral: string, action: string, data: Record<string, unknown>) {
  const rawCommand = normalizeRawCommand(data.cmd)
  if (peripheral !== "command") return false
  // COM4 firmware 2.1.1 verifies actuator commands. Keep only low-level
  // reconfiguration/destructive commands blocked from the UI relay.
  if (/(^|\s)(flash|erase|factory|bootloader|ota|format)(\s|$)/i.test(rawCommand)) return true
  if (/(^|\s)(gpio|pinmode|pin mode|set pins|i2c pins|i2c reconfig|reconfigure i2c)(\s|$)/i.test(rawCommand)) return true
  if (peripheral === "command") {
    const allowed = new Set([
      "ping",
      "health",
      "status",
      "sensors",
      "sensor read",
      "get sensors",
      "get-sensors",
      "read_sensors",
      "scan",
      "i2c",
      "i2c scan",
      "get_mac",
      "get version",
      "get_version",
      "version",
      "coin",
      "bump",
      "power",
      "1up",
      "morgio",
      "led pattern rainbow",
      "led brightness 25",
      "led brightness 50",
      "led brightness 75",
      "led brightness 100",
      "buzzer off",
      "beep",
      "beep off",
      "tone off",
      "speaker off",
      "led off",
      "neopixel off",
      "optx status",
      "aotx status",
    ])
    if (allowed.has(rawCommand)) return false
    if (/^beep\s+\d{2,5}\s+\d{1,4}$/i.test(rawCommand)) return false
    if (/^led rgb\s+\d{1,3}\s+\d{1,3}\s+\d{1,3}$/i.test(rawCommand)) return false
    if (/^led brightness\s+\d{1,3}$/i.test(rawCommand)) return false
    return false
  }
  return false
}

function localSerialSafetyResponse(peripheral: string, action: string) {
  return NextResponse.json(
    {
      success: false,
      error: "Local serial safety interlock active",
      message: "Psathyrella buoy blocked a low-level reconfiguration command. Verified actuator, sensor, and status commands remain enabled.",
      peripheral,
      action,
      source: "local-serial-safety-interlock",
    },
    { status: 423 }
  )
}

async function relayFieldControl(
  registryId: string,
  peripheral: string,
  action: string,
  data: Record<string, unknown>
) {
  const command = controlPayloadToOperatorCommand(peripheral, action, data)
  if (!command) {
    return NextResponse.json(
      { success: true, peripheral, action, message: "No operator mapping for this action" },
      { status: 200 }
    )
  }

  const res = await fetch(`${MAS_API_URL}/api/devices/${encodeURIComponent(registryId)}/command`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command, params: {}, timeout: 12 }),
    signal: AbortSignal.timeout(15000),
  })
  const text = await res.text()
  let parsed: unknown = text
  try {
    parsed = text ? JSON.parse(text) : {}
  } catch {
    parsed = { raw: text }
  }
  if (!res.ok) {
    return NextResponse.json(
      {
        success: false,
        peripheral,
        action,
        operator_command: command,
        error: parsed,
        source: "mas-field-relay",
      },
      { status: res.status }
    )
  }
  return NextResponse.json({
    success: true,
    peripheral,
    action,
    operator_command: command,
    result: parsed,
    source: "mas-field-relay",
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ port: string }> }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { port } = await params
  const body = await request.json()
  const { peripheral, action, ...data } = body

  if (isLocalPsathyrellaSerialTarget(port) && blockedLocalSerialControl(peripheral, action, data)) {
    return localSerialSafetyResponse(peripheral, action)
  }

  if (isFieldRegistryId(port)) {
    try {
      return await relayFieldControl(port, peripheral, action, data)
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          peripheral,
          action,
          source: "mas-field-relay",
        },
        { status: 503 }
      )
    }
  }

  try {
    // Resolve stable registry alias (mycobrain-COM4) to live serial id (e.g. mycobrain-COM3).
    let deviceId = localSerialServiceDeviceId(port) || port
    
    if (isLocalPsathyrellaSerialTarget(port) || isLocalPsathyrellaSerialTarget(deviceId)) {
      try {
        const devicesRes = await fetch(`${MYCOBRAIN_SERVICE_URL}/devices`, {
          signal: AbortSignal.timeout(3000),
        })
        if (devicesRes.ok) {
          const devicesData = await devicesRes.json()
          const connected = (devicesData.devices || [])
            .map((d: { device_id?: string }) => String(d.device_id || ""))
            .filter(Boolean)
          const resolved = resolveLocalSerialServiceTarget(deviceId, connected)
          if (resolved) deviceId = resolved
        }
      } catch {
        // fall through with best-effort id
      }
    } else if (!localSerialServiceDeviceId(port) && (port.match(/^COM\d+$/i) || port.startsWith("/dev/"))) {
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
          // Use rainbow pattern mode
          payload = { command: { cmd: "led pattern rainbow" } }
        } else if (action === "off") {
          payload = { command: { cmd: "led off" } }
        } else {
          // Handle brightness if provided (convert 0-255 to 0-100%)
          if (data.brightness !== undefined) {
            const brightnessPercent = Math.round((data.brightness / 255) * 100)
            // Send brightness command first
            try {
              await fetch(`${MYCOBRAIN_SERVICE_URL}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ command: { cmd: `led brightness ${brightnessPercent}` } }),
                signal: AbortSignal.timeout(3000),
              })
            } catch { /* ignore brightness command failure */ }
          }
          // Then send RGB color
          payload = { command: { cmd: `led rgb ${r} ${g} ${b}` } }
        }
        break

      case "buzzer":
        // Use command endpoint with proper format
        // Dual-mode firmware supports: beep [freq] [ms], plus sound presets
        endpoint = `/devices/${encodeURIComponent(deviceId)}/command`
        const freq = data.frequency || 1000
        const duration = data.duration_ms ?? data.duration ?? 200
        if (action === "melody") {
          // Play morgio melody (custom jingle from firmware)
          payload = { command: { cmd: "morgio" } }
        } else if (action === "coin") {
          payload = { command: { cmd: "coin" } }
        } else if (action === "bump") {
          payload = { command: { cmd: "bump" } }
        } else if (action === "power") {
          payload = { command: { cmd: "power" } }
        } else if (action === "1up") {
          payload = { command: { cmd: "1up" } }
        } else if (action === "off") {
          payload = { command: { cmd: "buzzer off" } }
        } else if (action === "beep") {
          // Psathyrella buoy firmware (Jun 2026): `beep freq ms` is unknown; `coin` is safe short chirp.
          if (isLocalPsathyrellaSerialTarget(port) || isLocalPsathyrellaSerialTarget(deviceId)) {
            payload = { command: { cmd: "coin" } }
          } else {
            const safeFreq = Math.max(50, Math.min(8000, Number(freq)))
            const safeDuration = Math.max(20, Math.min(2000, Number(duration)))
            payload = { command: { cmd: `beep ${safeFreq} ${safeDuration}` } }
          }
        } else {
          payload = { command: { cmd: "bump" } }
        }
        break

      case "led":
        // LED control with optical modem support
        endpoint = `/devices/${encodeURIComponent(deviceId)}/command`
        if (action === "optical_tx" || action === "optx_start") {
          const optPayload = data.payload || ""
          payload = { command: { cmd: `optx start ${optPayload}` } }
        } else if (action === "optical_stop" || action === "optx_stop") {
          payload = { command: { cmd: "optx stop" } }
        } else if (action === "optical_status" || action === "optx_status") {
          payload = { command: { cmd: "optx status" } }
        } else {
          // Default LED control
          const lr = data.r || 0
          const lg = data.g || 0
          const lb = data.b || 0
          payload = { command: { cmd: `led rgb ${lr} ${lg} ${lb}` } }
        }
        break
        
      case "acoustic":
        // Acoustic modem control
        endpoint = `/devices/${encodeURIComponent(deviceId)}/command`
        if (action === "acoustic_tx" || action === "aotx_start") {
          const aotxPayload = data.payload || ""
          payload = { command: { cmd: `aotx start ${aotxPayload}` } }
        } else if (action === "acoustic_stop" || action === "stop" || action === "aotx_stop") {
          payload = { command: { cmd: "aotx stop" } }
        } else if (action === "acoustic_status" || action === "aotx_status") {
          payload = { command: { cmd: "aotx status" } }
        } else {
          return NextResponse.json({ error: "Unknown acoustic action" }, { status: 400 })
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
