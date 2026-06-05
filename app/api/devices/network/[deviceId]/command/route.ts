/**
 * Network Device Command Route
 *
 * Forward commands to a specific network-registered MycoBrain device.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/api-auth"
import { deploymentByRegistryId } from "@/lib/devices/field-deployments"
import {
  isCommandResponseOk,
  networkCommandToOperator,
} from "@/lib/devices/operator-commands"

const MAS_API_URL = process.env.MAS_API_URL || "http://localhost:8001"

interface CommandRequest {
  command: string
  params?: Record<string, unknown>
  timeout?: number
}

function isSafeLocalSerialCommand(command: string) {
  const value = command.trim().toLowerCase().replace(/\s+/g, " ")
  if (/(^|\s)(flash|erase|factory|bootloader|ota|format)(\s|$)/i.test(value)) return false
  if (/(^|\s)(gpio|pinmode|pin mode|set pins|i2c pins|i2c reconfig|reconfigure i2c)(\s|$)/i.test(value)) return false
  const allowed = new Set([
    "ping",
    "health",
    "status",
    "sensors",
    "sensor read",
    "read_sensors",
    "get sensors",
    "get-sensors",
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
  if (allowed.has(value)) return true
  if (/^beep\s+\d{2,5}\s+\d{1,4}$/i.test(value)) return true
  if (/^led rgb\s+\d{1,3}\s+\d{1,3}\s+\d{1,3}$/i.test(value)) return true
  if (/^led brightness\s+\d{1,3}$/i.test(value)) return true
  return true
}

async function forwardFieldOperatorCommand(
  deviceId: string,
  command: string,
  params: Record<string, unknown>,
  timeout: number,
  upstreamError: { status: number; text: string } | null
) {
  const field = deploymentByRegistryId(deviceId)
  if (!field) return null

  const operatorCommand = networkCommandToOperator(command, params)
  try {
    const timeoutMs = Math.max(900, Math.min(timeout * 1000, 6500))
    const response = await fetch(`${field.agent_url}/api/cmd`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ cmd: operatorCommand }),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    })

    const text = await response.text()
    let result: unknown = text
    try {
      result = text ? JSON.parse(text) : {}
    } catch {
      result = text
    }

    if (!response.ok || !isCommandResponseOk(result)) {
      return NextResponse.json(
        {
          success: false,
          device_id: deviceId,
          source: "field-operator-api",
          error: "Field operator command failed",
          operator_status: response.status,
          operator_command: operatorCommand,
          result,
          upstream_mas: upstreamError,
        },
        { status: response.ok ? 502 : response.status }
      )
    }

    return NextResponse.json({
      success: true,
      device_id: deviceId,
      source: "field-operator-api",
      command,
      operator_command: operatorCommand,
      result,
      upstream_mas: upstreamError,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      {
        success: false,
        device_id: deviceId,
        source: "field-operator-api",
        error: `Field operator command failed: ${errorMessage}`,
        upstream_mas: upstreamError,
      },
      { status: 502 }
    )
  }
}

async function forwardLocalSerialCommand(
  deviceId: string,
  command: string,
  params: Record<string, unknown>,
  timeout: number
) {
  const field = deploymentByRegistryId(deviceId)
  if (!field || field.agent_port !== 8003) return null

  const operatorCommand = networkCommandToOperator(command, params)
  if (!isSafeLocalSerialCommand(operatorCommand)) {
    return NextResponse.json(
      {
        success: false,
        device_id: deviceId,
        source: "local-serial-safety-interlock",
        error: "COM4 safety interlock active",
        message: "Local COM4 blocked a low-level reconfiguration command. Verified actuator, sensor, and status commands remain enabled.",
        command,
        operator_command: operatorCommand,
      },
      { status: 423 }
    )
  }
  try {
    const response = await fetch(
      `${field.agent_url}/devices/${encodeURIComponent(field.mdp_device_id)}/command`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: { cmd: operatorCommand } }),
        signal: AbortSignal.timeout((timeout + 3) * 1000),
        cache: "no-store",
      }
    )
    const text = await response.text()
    let result: unknown = text
    try {
      result = text ? JSON.parse(text) : {}
    } catch {
      result = text
    }

    return NextResponse.json(
      {
        success: response.ok && isCommandResponseOk(result),
        device_id: deviceId,
        source: "local-serial-mycobrain",
        command,
        operator_command: operatorCommand,
        result,
      },
      { status: response.ok && isCommandResponseOk(result) ? 200 : 502 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        device_id: deviceId,
        source: "local-serial-mycobrain",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    )
  }
}

/**
 * POST /api/devices/network/[deviceId]/command
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  const { deviceId } = await params
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  let body: CommandRequest | null = null

  try {
    body = await request.json()
    const { command, params: cmdParams = {}, timeout = 5 } = body

    if (!command) {
      return NextResponse.json({ error: "command is required" }, { status: 400 })
    }

    const localSerialResult = await forwardLocalSerialCommand(deviceId, command, cmdParams, timeout)
    if (localSerialResult) return localSerialResult

    // Known field Jetsons: hit :8787 /api/cmd first (works from Sandbox on LAN).
    // Do not queue a MAS fallback for Earth Simulator quick controls; delayed
    // fallback commands can physically fire long after the user clicked.
    if (deploymentByRegistryId(deviceId)) {
      const fieldResult = await forwardFieldOperatorCommand(
        deviceId,
        command,
        cmdParams,
        timeout,
        null
      )
      if (fieldResult) return fieldResult
    }

    const response = await fetch(`${MAS_API_URL}/api/devices/${deviceId}/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command, params: cmdParams, timeout }),
      signal: AbortSignal.timeout((timeout + 5) * 1000),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Device ${deviceId} command failed:`, errorText)
      const fieldResult = await forwardFieldOperatorCommand(
        deviceId,
        command,
        cmdParams,
        timeout,
        { status: response.status, text: errorText }
      )
      if (fieldResult) {
        const fieldJson = await fieldResult.clone().json().catch(() => ({}))
        if (fieldResult.status < 400 && fieldJson.success !== false) return fieldResult
      }

      return NextResponse.json(
        { error: `Device command failed: ${errorText}` },
        { status: response.status }
      )
    }

    const result = await response.json()
    if (!isCommandResponseOk(result)) {
      const fieldResult = await forwardFieldOperatorCommand(
        deviceId,
        command,
        cmdParams,
        timeout,
        { status: 502, text: JSON.stringify(result) }
      )
      if (fieldResult) return fieldResult
    }

    return NextResponse.json({
      success: true,
      device_id: deviceId,
      auth: "admin",
      ...result,
    })
  } catch (error) {
    console.error(`Failed to send command to device ${deviceId}:`, error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    if (body?.command) {
      const localSerialResult = await forwardLocalSerialCommand(
        deviceId,
        body.command,
        body.params || {},
        body.timeout || 5
      )
      if (localSerialResult) return localSerialResult

      const fieldResult = await forwardFieldOperatorCommand(
        deviceId,
        body.command,
        body.params || {},
        body.timeout || 5,
        { status: 502, text: errorMessage }
      )
      if (fieldResult) return fieldResult
    }

    return NextResponse.json(
      { error: `Command failed: ${errorMessage}` },
      { status: 500 }
    )
  }
}
