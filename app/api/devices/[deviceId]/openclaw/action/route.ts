/**
 * POST /api/devices/:deviceId/openclaw/action
 *
 * Proxies a claw action to the device\'s :8787 agent. Auth: company-gated.
 * The operator\'s email is attached as `user_subject` for audit. The
 * Supabase session cookie is converted into a Bearer token the agent can
 * verify against Supabase JWKS.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { isCompanyEmail } from "@/lib/access/types"
import { resolveAgentUrl } from "@/lib/devices/agent-resolver"

export const dynamic = "force-dynamic"

interface ActionBody {
  action: string
  params?: Record<string, unknown>
  request_id?: string
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

  const cookieStore = cookies()
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

  let body: ActionBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 })
  }

  if (!body.action || typeof body.action !== "string") {
    return NextResponse.json({ error: "missing_action" }, { status: 400 })
  }

  const agentUrl = await resolveAgentUrl(params.deviceId)
  if (!agentUrl) {
    return NextResponse.json({ error: "no_agent_for_device" }, { status: 404 })
  }

  const requestId =
    body.request_id ||
    `nat-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`

  try {
    const res = await fetch(`${agentUrl}/openclaw/action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
      body: JSON.stringify({
        action: body.action,
        params: body.params || {},
        request_id: requestId,
        user_subject: user.email,
      }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    })
    const responseBody = await res.text()
    let parsed: unknown
    try {
      parsed = JSON.parse(responseBody)
    } catch {
      parsed = { raw: responseBody }
    }
    return NextResponse.json(parsed, { status: res.status })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message, request_id: requestId },
      { status: 502 }
    )
  }
}
