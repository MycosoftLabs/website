/**
 * Worldstate API Proxy — Mar 14, 2026
 *
 * Proxies GET requests to MAS canonical worldstate API (/api/myca/world).
 * Read-only passive awareness — CREP commands and Earth2 simulation stay specialist.
 *
 * Auth: API key (Bearer mk_...) or Supabase JWT required.
 * Internal calls via x-internal-token bypass auth.
 *
 * @route GET /api/mas/world
 * @route GET /api/mas/world/summary
 * @route GET /api/mas/world/region
 * @route GET /api/mas/world/sources
 * @route GET /api/mas/world/diff
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getAgentProfile } from "@/lib/agent-auth"
import { checkAndFireBalanceAlerts, fireAgentEvent } from "@/lib/myca-hooks"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

let _admin: ReturnType<typeof createClient> | null = null
function getAdmin() {
  if (_admin) return _admin
  _admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  return _admin
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const startTime = Date.now()

  try {
    // Internal calls bypass auth
    const internalToken = request.headers.get("x-internal-token")
    const isInternal =
      internalToken && process.env.INTERNAL_API_SECRET && internalToken === process.env.INTERNAL_API_SECRET

    let agent: Awaited<ReturnType<typeof getAgentProfile>> = null

    if (!isInternal) {
      // 1. Authenticate
      agent = await getAgentProfile(request)
      if (!agent) {
        return NextResponse.json(
          { error: "API key required", docs: "/agent" },
          { status: 401 }
        )
      }

      // 2. Balance check
      if ((agent.balance_cents ?? 0) <= 0) {
        const admin = getAdmin()
        const upsell = await admin.rpc("get_upsell_message", {
          p_event_type: "balance_exhausted",
          p_balance_cents: 0,
        })
        return NextResponse.json(
          { error: "Insufficient balance", ...(upsell.data || {}) },
          { status: 402 }
        )
      }

      // 3. Rate limit checks (only for API key auth)
      if (agent.via === "api_key") {
        if (
          agent.requests_this_minute !== undefined &&
          agent.rate_limit_per_minute !== undefined &&
          agent.requests_this_minute >= agent.rate_limit_per_minute
        ) {
          await fireAgentEvent(getAdmin(), {
            profile_id: agent.profile_id,
            api_key_id: agent.api_key_id,
            event_type: "rate_limit_hit",
            severity: "warn",
            message: "Per-minute rate limit reached.",
          })
          return NextResponse.json(
            { error: "Rate limit exceeded" },
            { status: 429, headers: { "Retry-After": "60" } }
          )
        }
        if (
          agent.requests_today !== undefined &&
          agent.rate_limit_per_day !== undefined &&
          agent.requests_today >= agent.rate_limit_per_day
        ) {
          await fireAgentEvent(getAdmin(), {
            profile_id: agent.profile_id,
            api_key_id: agent.api_key_id,
            event_type: "rate_limit_hit",
            severity: "warn",
            message: "Daily rate limit reached.",
          })
          return NextResponse.json(
            { error: "Daily rate limit exceeded" },
            { status: 429, headers: { "Retry-After": "3600" } }
          )
        }
      }

      // 4. Increment usage (deduct 1 cent)
      if (agent.api_key_id) {
        const { data: newBalance } = await getAdmin().rpc("increment_api_usage", {
          p_api_key_id: agent.api_key_id,
          p_cost_cents: 1,
        })

        // Check balance alerts after deduction
        if (typeof newBalance === "number") {
          await checkAndFireBalanceAlerts(
            getAdmin(),
            agent.profile_id,
            newBalance,
            agent.api_key_id
          )
        }
      }
    }

    // 5. Proxy to MAS
    const { path = [] } = await params
    const base = `${MAS_API_URL}/api/myca/world`
    const pathSuffix = path.length ? `/${path.join("/")}` : ""
    const url = new URL(base + pathSuffix)
    request.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v))

    const response = await fetch(url.toString(), {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10000),
    })

    const latencyMs = Date.now() - startTime

    if (!response.ok) {
      // Log usage even on upstream error
      if (agent?.api_key_id) {
        await logUsage(agent, request, response.status, latencyMs, path)
      }
      return NextResponse.json(
        {
          error: "Worldstate API unavailable",
          status: response.status,
          degraded: true,
        },
        { status: response.status >= 500 ? 502 : response.status }
      )
    }

    const data = await response.json()

    // 6. Log usage
    if (agent?.api_key_id) {
      await logUsage(agent, request, response.status, latencyMs, path)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[worldstate] Proxy error:", error)
    return NextResponse.json(
      {
        error: "Worldstate API unreachable",
        degraded: true,
        detail: "MAS worldstate endpoint not available",
      },
      { status: 502 }
    )
  }
}

async function logUsage(
  agent: { profile_id: string; api_key_id?: string },
  request: NextRequest,
  statusCode: number,
  latencyMs: number,
  path: string[]
) {
  try {
    await getAdmin().from("agent_usage_log").insert({
      api_key_id: agent.api_key_id,
      profile_id: agent.profile_id,
      endpoint: `/api/mas/world${path.length ? `/${path.join("/")}` : ""}`,
      method: "GET",
      status_code: statusCode,
      cost_cents: 1,
      latency_ms: latencyMs,
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
      user_agent: request.headers.get("user-agent") || null,
    })
  } catch (err) {
    console.error("[worldstate] Usage log error:", err)
  }
}
