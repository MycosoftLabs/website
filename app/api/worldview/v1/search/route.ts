/**
 * GET /api/worldview/v1/search
 *
 * Public search endpoint backed by MINDEX's worldview search API.
 * Requires per-user API key (Bearer mk_...) or authenticated Supabase session.
 *
 * Query params:
 *   q       — search query (required)
 *   types   — comma-separated: species,compounds,genetics,research,earth (default: all)
 *   limit   — max results per type (default 20, max 100)
 *
 * The other Claude Code agent is building /api/worldview/v1/search on the MINDEX
 * backend (segregated public API). This route proxies to that endpoint and passes
 * the user's API key for per-user rate limiting and access control.
 *
 * March 19, 2026 — Segregated public/internal API migration
 */

import { NextRequest, NextResponse } from "next/server"
import { getAgentProfile } from "@/lib/agent-auth"
import { createClient } from "@/lib/supabase/server"
import { recordUsageFromRequest } from "@/lib/usage/record-api-usage"

export const dynamic = "force-dynamic"

const MINDEX_BASE = process.env.MINDEX_API_URL || "http://192.168.0.189:8000"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(request: NextRequest) {
  const startTime = performance.now()

  try {
    // --- Auth: per-user API key (Bearer mk_...) or Supabase session ---
    let userApiKey: string | null = null
    let userId: string | null = null

    // Try API key auth first
    const agent = await getAgentProfile(request)
    if (agent) {
      userId = agent.profile_id
      // Extract the raw Bearer token to forward to MINDEX
      const authHeader = request.headers.get("authorization") || ""
      if (authHeader.toLowerCase().startsWith("bearer ")) {
        userApiKey = authHeader.slice(7)
      }
    } else {
      // Fall back to Supabase session auth
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userId = user.id
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "API key or authentication required", docs: "/agent" },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    // --- Parse query params ---
    const { searchParams } = request.nextUrl
    const query = searchParams.get("q")?.trim()

    if (!query || query.length < 2) {
      return NextResponse.json(
        { query: query || "", results: {}, totalCount: 0 },
        { headers: CORS_HEADERS }
      )
    }

    const types = searchParams.get("types") || "species,compounds,genetics,research,earth"
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100)

    // --- Proxy to MINDEX /api/worldview/v1/search ---
    const proxyUrl = new URL(`${MINDEX_BASE}/api/worldview/v1/search`)
    proxyUrl.searchParams.set("q", query)
    proxyUrl.searchParams.set("types", types)
    proxyUrl.searchParams.set("limit", String(limit))

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    // Forward per-user API key so MINDEX can enforce per-user rate limits
    if (userApiKey) {
      headers["Authorization"] = `Bearer ${userApiKey}`
    }

    // Also send server-side MINDEX API key for backend-to-backend auth
    const mindexApiKey = process.env.MINDEX_API_KEY
    if (mindexApiKey) {
      headers["X-API-Key"] = mindexApiKey
    }

    const response = await fetch(proxyUrl.toString(), {
      headers,
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    })

    const latencyMs = Math.round(performance.now() - startTime)

    if (!response.ok) {
      // If MINDEX worldview endpoint isn't deployed yet, return a helpful error
      if (response.status === 404) {
        return NextResponse.json(
          {
            error: "Worldview search API not yet available on MINDEX backend",
            detail: "The /api/worldview/v1/search endpoint is being deployed. Use /api/search/unified in the meantime.",
            fallback: "/api/search/unified",
          },
          { status: 503, headers: CORS_HEADERS }
        )
      }

      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData?.detail || "Search failed", status: response.status },
        { status: response.status >= 500 ? 502 : response.status, headers: CORS_HEADERS }
      )
    }

    const data = await response.json()

    // Record usage
    await recordUsageFromRequest({
      request,
      usageType: "SPECIES_IDENTIFICATION",
      quantity: 1,
      metadata: { query, source: "worldview_v1", latencyMs },
    })

    return NextResponse.json(
      {
        ...data,
        meta: {
          api: "worldview",
          version: "1.0",
          timestamp: new Date().toISOString(),
          latencyMs,
        },
      },
      {
        headers: {
          ...CORS_HEADERS,
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    )
  } catch (error) {
    console.error("[worldview/v1/search] Error:", error)
    return NextResponse.json(
      { error: "Search service temporarily unavailable" },
      { status: 502, headers: CORS_HEADERS }
    )
  }
}
