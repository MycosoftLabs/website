/**
 * Worldstate API Proxy — Mar 14, 2026
 *
 * Proxies GET requests to MAS canonical worldstate API (/api/myca/world).
 * Read-only passive awareness — CREP commands and Earth2 simulation stay specialist.
 *
 * Public API: Only serves nature/science data (CREP, MINDEX, environment).
 * Path allowlist blocks access to internal endpoints.
 * Response sanitization strips internal/sensitive fields.
 * Internal calls (x-internal-token) bypass all filtering.
 *
 * Auth: API key (Bearer mk_...) or Supabase JWT required.
 * Internal calls via x-internal-token bypass auth.
 *
 * @route GET /api/mas/world
 * @route GET /api/mas/world/summary
 * @route GET /api/mas/world/region
 * @route GET /api/mas/world/sources
 * @route GET /api/mas/world/diff
 * @route GET /api/mas/world/crep/*
 * @route GET /api/mas/world/mindex/*
 * @route GET /api/mas/world/environment/*
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getAgentProfile } from "@/lib/agent-auth"
import { checkAndFireBalanceAlerts, fireAgentEvent } from "@/lib/myca-hooks"

const MAS_API_URL = process.env.MAS_API_URL || "http://localhost:8001"

// --- Path Allowlist (public API) ---
const ALLOWED_PATHS = new Set([
  '',              // /api/mas/world — root worldstate summary
  'summary',       // /api/mas/world/summary — condensed overview
  'region',        // /api/mas/world/region — regional data
  'sources',       // /api/mas/world/sources — data source status
  'diff',          // /api/mas/world/diff — recent changes
  'crep',          // /api/mas/world/crep — all CREP data
  'crep/aviation', // /api/mas/world/crep/aviation
  'crep/maritime', // /api/mas/world/crep/maritime
  'crep/satellite',// /api/mas/world/crep/satellite
  'crep/weather',  // /api/mas/world/crep/weather
  'mindex',        // /api/mas/world/mindex — MINDEX species/compounds
  'mindex/species',// /api/mas/world/mindex/species
  'mindex/compounds', // /api/mas/world/mindex/compounds
  'mindex/search', // /api/mas/world/mindex/search
  'environment',   // /api/mas/world/environment — environmental readings
  'environment/sensors', // /api/mas/world/environment/sensors
])

// --- Redacted keys (stripped from responses for external callers) ---
const REDACTED_KEYS = new Set([
  // Agent internals
  'agents', 'agent_registry', 'topology', 'orchestrator',
  'task_queue', 'task_queues', 'pending_tasks', 'active_tasks',
  'heartbeat', 'heartbeats', 'connections',
  // Company/org data
  'finance', 'financial', 'revenue', 'billing', 'csuite',
  'employees', 'team', 'org', 'organization', 'internal_docs',
  'company', 'corporate',
  // User/private data
  'users', 'profiles', 'emails', 'wallets', 'api_keys',
  'payments', 'conversations', 'memory', 'chat_history',
  'session_data', 'auth',
  // System internals
  'internal', 'debug', 'config', 'credentials', 'secrets',
  'service_key', 'private_key', 'database', 'db_config',
  'internal_ip', 'internal_url', 'mas_internal',
  // LLM internals
  'llm_router', 'llm_config', 'model_config', 'frontier_config',
  'prompt_templates', 'system_prompts',
])

// Internal IP patterns to redact from string values
const INTERNAL_IP_PATTERN = /\b(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
}

/**
 * Recursively sanitize a JSON value by stripping redacted keys and internal IPs.
 */
function sanitizeResponse(value: unknown): unknown {
  if (value === null || value === undefined) return value

  if (typeof value === 'string') {
    return value.replace(INTERNAL_IP_PATTERN, '[redacted]')
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeResponse)
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      // Skip redacted keys
      if (REDACTED_KEYS.has(key)) continue
      // Skip keys with _internal or _private suffix
      if (key.endsWith('_internal') || key.endsWith('_private')) continue
      result[key] = sanitizeResponse(val)
    }
    return result
  }

  return value
}

let _admin: ReturnType<typeof createClient> | null = null
function getAdmin() {
  if (_admin) return _admin
  _admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  return _admin
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
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
          { status: 401, headers: CORS_HEADERS }
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
          { status: 402, headers: CORS_HEADERS }
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
            { status: 429, headers: { ...CORS_HEADERS, "Retry-After": "60" } }
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
            { status: 429, headers: { ...CORS_HEADERS, "Retry-After": "3600" } }
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

    // 5. Path allowlist check (external callers only)
    const { path = [] } = await params
    const pathStr = path.join("/")

    if (!isInternal && !ALLOWED_PATHS.has(pathStr)) {
      return NextResponse.json(
        { error: "Endpoint not available on public API", docs: "/agent" },
        { status: 404, headers: CORS_HEADERS }
      )
    }

    // 6. Proxy to MAS
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
        { status: response.status >= 500 ? 502 : response.status, headers: CORS_HEADERS }
      )
    }

    const data = await response.json()

    // 7. Log usage
    if (agent?.api_key_id) {
      await logUsage(agent, request, response.status, latencyMs, path)
    }

    // 8. Internal calls get raw response, external get sanitized + envelope
    if (isInternal) {
      return NextResponse.json(data, { headers: CORS_HEADERS })
    }

    const sanitized = sanitizeResponse(data)

    return NextResponse.json(
      {
        data: sanitized,
        meta: {
          api: "worldview",
          version: "1.0",
          timestamp: new Date().toISOString(),
          source: "mycosoft",
          public: true,
          note: "This endpoint serves public nature and science data only.",
        },
      },
      { headers: CORS_HEADERS }
    )
  } catch (error) {
    console.error("[worldstate] Proxy error:", error)
    return NextResponse.json(
      {
        error: "Worldstate API unreachable",
        degraded: true,
        detail: "MAS worldstate endpoint not available",
      },
      { status: 502, headers: CORS_HEADERS }
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
