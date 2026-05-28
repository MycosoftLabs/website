/**
 * Network Device Command Route
 * 
 * Forward commands to a specific network-registered MycoBrain device.
 * 
 * Created: February 10, 2026
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/api-auth"
import { deploymentByRegistryId } from "@/lib/devices/field-deployments"

const MAS_API_URL = process.env.MAS_API_URL || "http://localhost:8001"

interface CommandRequest {
  command: string
  params?: Record<string, unknown>
  timeout?: number
}

function toOperatorCommand(command: string, params: Record<string, unknown>): string {
  if (typeof params.cmd === "string" && params.cmd.trim()) return params.cmd.trim()
  if (command === "led pattern rainbow") return "led heartbeat"
  if (command === "led rgb 0 0 0") return "led off"
  if (command.startsWith("beep ")) return "bump"
  return command
}

function isLocalDevHost(hostHeader: string | null): boolean {
  const host = (hostHeader || "").split(":")[0]?.toLowerCase()
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]"
}

function allowLocalFieldControlBypass(request: NextRequest, deviceId: string): boolean {
  if (process.env.NODE_ENV === "production") return false
  if (!deploymentByRegistryId(deviceId)) return false
  return isLocalDevHost(request.headers.get("host"))
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

  const operatorCommand = toOperatorCommand(command, params)
  try {
    const response = await fetch(`${field.agent_url}/api/cmd`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ cmd: operatorCommand }),
      signal: AbortSignal.timeout((timeout + 3) * 1000),
      cache: "no-store",
    })

    const text = await response.text()
    let result: unknown = text
    try {
      result = text ? JSON.parse(text) : {}
    } catch {
      result = text
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          device_id: deviceId,
          source: "field-operator-api",
          error: "Field operator command failed",
          operator_status: response.status,
          result,
          upstream_mas: upstreamError,
        },
        { status: response.status }
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

/**
 * POST /api/devices/network/[deviceId]/command
 * 
 * Send a command to a network device via MAS Device Registry.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  const { deviceId } = await params
  const authBypassed = allowLocalFieldControlBypass(request, deviceId)
  if (!authBypassed) {
    const auth = await requireAdmin()
    if (auth.error) return auth.error
  }
  let body: CommandRequest | null = null

  try {
    body = await request.json()
    const { command, params: cmdParams = {}, timeout = 5 } = body

    if (!command) {
      return NextResponse.json(
        { error: "command is required" },
        { status: 400 }
      )
    }

    if (authBypassed) {
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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        command,
        params: cmdParams,
        timeout,
      }),
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
      if (fieldResult) return fieldResult

      return NextResponse.json(
        { error: `Device command failed: ${errorText}` },
        { status: response.status }
      )
    }

    const result = await response.json()
    return NextResponse.json({
      success: true,
      device_id: deviceId,
      auth: authBypassed ? "local-field-dev-bypass" : "admin",
      ...result,
    })

  } catch (error) {
    console.error(`Failed to send command to device ${deviceId}:`, error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    if (body?.command) {
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
