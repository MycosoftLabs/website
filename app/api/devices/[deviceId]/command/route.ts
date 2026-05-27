/**
 * POST /api/devices/:deviceId/command
 *
 * COM7-bench-style live command surface. Proxies a single MDP COMMAND to the
 * device\'s :8787 agent. Useful for: output_control (LED, buzzer, MOSFET),
 * stream_sensors, read_sensors, estop / clear_estop, Side B transport directives.
 *
 * Auth: company-gated. Operator email is attached for audit.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { isCompanyEmail } from "@/lib/access/types"
import { resolveAgentUrl } from "@/lib/devices/agent-resolver"

export const dynamic = "force-dynamic"

interface CommandBody {
  target: "side_a" | "side_b"
  cmd: string
  params?: Record<string, unknown>
  ack_requested?: boolean
  timeout_ms?: number
}

export async function POST(
  req: NextRequest,
  { params }: { params: { deviceId: string } }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "config_missing" }, { status: 500 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll() {},
    },
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isCompanyEmail(user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  const { data: { session } } = await supabase.auth.getSession()
  const bearer = session?.access_token

  let body: CommandBody
  try { body = await req.json() }
  catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }) }

  if (!body.target || !body.cmd) {
    return NextResponse.json({ error: "missing_target_or_cmd" }, { status: 400 })
  }
  if (body.target !== "side_a" && body.target !== "side_b") {
    return NextResponse.json({ error: "bad_target" }, { status: 400 })
  }

  const agentUrl = await resolveAgentUrl(params.deviceId)
  if (!agentUrl) {
    return NextResponse.json({ error: "no_agent_for_device" }, { status: 404 })
  }

  try {
    const res = await fetch(`${agentUrl}/command`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
      body: JSON.stringify({
        target: body.target,
        cmd: body.cmd,
        params: body.params || {},
        ack_requested: body.ack_requested !== false,
        timeout_ms: body.timeout_ms || 2000,
        user_subject: user.email,
      }),
      signal: AbortSignal.timeout((body.timeout_ms || 2000) + 3000),
      cache: "no-store",
    })
    const text = await res.text()
    let parsed: unknown
    try { parsed = JSON.parse(text) } catch { parsed = { raw: text } }
    return NextResponse.json(parsed, { status: res.status })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 502 }
    )
  }
}
