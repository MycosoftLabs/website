/**
 * GET /api/devices/:deviceId/openclaw/status
 *
 * Proxies to <agent_url>/openclaw/status on the device\'s :8787 agent.
 * Auth: company-gated (Supabase session with @mycosoft.org/.com email).
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { isCompanyEmail } from "@/lib/access/types"
import { resolveAgentUrl } from "@/lib/devices/agent-resolver"

export const dynamic = "force-dynamic"

export async function GET(
  _req: NextRequest,
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
      setAll() { /* noop for read-only handler */ },
    },
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isCompanyEmail(user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const agentUrl = await resolveAgentUrl(params.deviceId)
  if (!agentUrl) {
    return NextResponse.json({ available: false, reason: "no_agent" })
  }

  try {
    const res = await fetch(`${agentUrl}/openclaw/status`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    })
    const body = await res.json()
    return NextResponse.json(body, { status: res.status })
  } catch (err) {
    return NextResponse.json(
      { available: true, ready: false, error: (err as Error).message },
      { status: 502 }
    )
  }
}
