/**
 * POST /api/devices/:deviceId/command
 *
 * MDP live command surface and operator-string commands for field Jetsons.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/api-auth"
import { resolveAgentUrl } from "@/lib/devices/agent-resolver"
import { deploymentByRegistryId } from "@/lib/devices/field-deployments"
import {
  mdpToOperatorCommand,
  networkCommandToOperator,
  isCommandResponseOk,
} from "@/lib/devices/operator-commands"

export const dynamic = "force-dynamic"

interface MdpCommandBody {
  target: "side_a" | "side_b"
  cmd: string
  params?: Record<string, unknown>
  ack_requested?: boolean
  timeout_ms?: number
}

interface LegacyCommandBody {
  command: string
  params?: Record<string, unknown>
  timeout?: number
}

async function postOperatorCmd(agentUrl: string, operatorCmd: string, timeoutMs: number) {
  const res = await fetch(`${agentUrl}/api/cmd`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ cmd: operatorCmd }),
    signal: AbortSignal.timeout(timeoutMs + 3000),
    cache: "no-store",
  })
  const text = await res.text()
  let parsed: unknown = text
  try {
    parsed = text ? JSON.parse(text) : {}
  } catch {
    parsed = { raw: text }
  }
  return { res, parsed }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  const { deviceId } = await params
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  // The Psathyrella buoy is an OWNER-ONLY control surface (morgan@mycosoft.org). Every other device
  // stays admin-commandable; only the buoy ids are narrowed to owner. (Ids trend to psathyrella-1;
  // legacy COM4 aliases kept through the migration.)
  const PSATHYRELLA_IDS = new Set(["psathyrella-1", "psathyrella-buoy-com4", "mycobrain-COM4"])
  if (PSATHYRELLA_IDS.has(deviceId) && !auth.user.isOwner) {
    return NextResponse.json({ error: "Owner access required" }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 })
  }

  // Psathyrella bench MDP commands go to the MAS Psathyrella API (188), which forwards to the
  // MycoBrain registry and returns the ack envelope — NOT the field-Jetson agent resolver
  // (which has no agent for the buoy and 404s). See PSATHYRELLA_CLAUDE_GCS_MAS_INTEGRATION_HANDOFF.
  // Device identity is trending to `psathyrella-1` (MQTT mycosoft/devices/psathyrella-1/*, the
  // Mushroom 1 board on the Jetson); keep the legacy COM4 aliases so nothing breaks mid-migration.
  if (PSATHYRELLA_IDS.has(deviceId) && typeof body.target === "string" && typeof body.cmd === "string") {
    const mas = process.env.MAS_API_URL || "http://192.168.0.188:8001"
    const masTimeoutMs = typeof body.timeout_ms === "number" ? body.timeout_ms : 15000
    try {
      const res = await fetch(`${mas}/api/psathyrella/${deviceId}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          target: body.target,
          cmd: body.cmd,
          params: (body.params as Record<string, unknown>) ?? {},
          clientCommandId: typeof body.clientCommandId === "string" ? body.clientCommandId : undefined,
          user_subject: auth.user.email,
        }),
        signal: AbortSignal.timeout(masTimeoutMs + 3000),
        cache: "no-store",
      })
      const text = await res.text()
      let parsed: unknown
      try {
        parsed = text ? JSON.parse(text) : {}
      } catch {
        parsed = { raw: text }
      }
      return NextResponse.json(parsed as object, { status: res.status })
    } catch (err) {
      return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 502 })
    }
  }

  const field = deploymentByRegistryId(deviceId)
  const agentUrl =
    (await resolveAgentUrl(deviceId)) ||
    field?.agent_url ||
    null

  // Legacy string command from device detail quick buttons
  if (typeof body.command === "string" && !body.target) {
    const legacy = body as unknown as LegacyCommandBody
    const operatorCmd = networkCommandToOperator(
      legacy.command,
      legacy.params || {}
    )
    if (field) {
      const { res, parsed } = await postOperatorCmd(
        field.agent_url,
        operatorCmd,
        (legacy.timeout || 5) * 1000
      )
      return NextResponse.json(parsed, {
        status: res.ok && isCommandResponseOk(parsed) ? 200 : res.status || 502,
      })
    }
    if (!agentUrl) {
      return NextResponse.json({ error: "no_agent_for_device" }, { status: 404 })
    }
    const { res, parsed } = await postOperatorCmd(
      agentUrl,
      operatorCmd,
      (legacy.timeout || 5) * 1000
    )
    return NextResponse.json(parsed, {
      status: res.ok && isCommandResponseOk(parsed) ? 200 : res.status || 502,
    })
  }

  const mdp = body as unknown as MdpCommandBody
  if (!mdp.target || !mdp.cmd) {
    return NextResponse.json({ error: "missing_target_or_cmd" }, { status: 400 })
  }
  if (mdp.target !== "side_a" && mdp.target !== "side_b") {
    return NextResponse.json({ error: "bad_target" }, { status: 400 })
  }

  if (!agentUrl) {
    return NextResponse.json({ error: "no_agent_for_device" }, { status: 404 })
  }

  const timeoutMs = mdp.timeout_ms || 2000
  const operatorCmd = mdpToOperatorCommand(mdp.target, mdp.cmd, mdp.params || {})

  if (operatorCmd) {
    try {
      const { res, parsed } = await postOperatorCmd(agentUrl, operatorCmd, timeoutMs)
      if (res.ok && isCommandResponseOk(parsed)) {
        return NextResponse.json(
          typeof parsed === "object" && parsed !== null
            ? { ok: true, ...(parsed as object), operator_command: operatorCmd }
            : { ok: true, result: parsed, operator_command: operatorCmd },
          { status: 200 }
        )
      }
    } catch {
      // fall through to MDP /command attempt
    }
  }

  try {
    const res = await fetch(`${agentUrl}/command`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        target: mdp.target,
        cmd: mdp.cmd,
        params: mdp.params || {},
        ack_requested: mdp.ack_requested !== false,
        timeout_ms: timeoutMs,
        user_subject: auth.user.email,
      }),
      signal: AbortSignal.timeout(timeoutMs + 3000),
      cache: "no-store",
    })
    const text = await res.text()
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = { raw: text }
    }

    if (res.ok) {
      return NextResponse.json(parsed, { status: res.status })
    }

    if (operatorCmd) {
      const fallback = await postOperatorCmd(agentUrl, operatorCmd, timeoutMs)
      return NextResponse.json(fallback.parsed, {
        status:
          fallback.res.ok && isCommandResponseOk(fallback.parsed)
            ? 200
            : fallback.res.status || 502,
      })
    }

    return NextResponse.json(parsed, { status: res.status })
  } catch (err) {
    if (operatorCmd) {
      try {
        const fallback = await postOperatorCmd(agentUrl, operatorCmd, timeoutMs)
        return NextResponse.json(fallback.parsed, {
          status:
            fallback.res.ok && isCommandResponseOk(fallback.parsed)
              ? 200
              : 502,
        })
      } catch {
        // continue to error below
      }
    }
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 502 }
    )
  }
}
