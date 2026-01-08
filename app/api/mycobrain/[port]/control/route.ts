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
          // Use rainbow pattern mode
          payload = { command: { cmd: "led pattern rainbow" } }
        } else if (action === "off") {
          payload = { command: { cmd: "led mode off" } }
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
        const duration = data.duration_ms || 200
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
          // No buzzer off command, just ignore
          return NextResponse.json({ success: true, peripheral, action, message: "Buzzer stops automatically" })
        } else if (action === "beep") {
          // Use frequency and duration from data
          payload = { command: { cmd: `beep ${freq} ${duration}` } }
        } else {
          // Default beep
          payload = { command: { cmd: "beep 1000 200" } }
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
