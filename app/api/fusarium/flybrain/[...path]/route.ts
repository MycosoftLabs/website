import { NextRequest, NextResponse } from "next/server"
import { requireFusariumOwner } from "@/lib/auth/api-auth"
import { limitedBody } from "@/lib/itdx/gateway.mjs"
import { allowPath } from "@/lib/flybrain/bff-paths"
import { FLYBRAIN_MAS_PREFIX } from "@/lib/flybrain/contract"
import { masBase } from "@/lib/flybrain/client"

/**
 * Owner-gated, allow-listed BFF proxy → MAS `/api/flybrain/*` (spec §10).
 *
 * - `requireFusariumOwner` (Supabase owner + MFA) on every method.
 * - `allowPath` decides which MAS routes exist; anything else is 404 here, never forwarded.
 * - POST must be same-origin JSON (like the ITDX bridge). Body cap 8 MB (`vision/detect` may carry
 *   `image_b64`).
 * - Upstream status + JSON are passed through unchanged, so a MAS 503 "no connectome" stays a 503.
 * - MAS unreachable / timed out → 502 `{ error: "flybrain_unreachable", path }`. The configured MAS
 *   base URL is never included in a response.
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BODY_LIMIT = 8_000_000
const UPSTREAM_LIMIT = 16_000_000
const UPSTREAM_TIMEOUT_MS = 30_000

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie, Authorization",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: privateHeaders })
}

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const auth = await requireFusariumOwner()
  if (auth.error) return auth.error

  const method = request.method.toUpperCase()
  const path = allowPath((await context.params).path, method)
  if (!path) return json({ error: "Unsupported FlyBrain path" }, 404)
  const masPath = FLYBRAIN_MAS_PREFIX + path

  let body: string | undefined
  const headers: Record<string, string> = { Accept: "application/json" }
  if (method === "POST") {
    const sameOrigin = request.headers.get("origin") === new URL(request.url).origin
    const isJson = (request.headers.get("content-type") || "").toLowerCase().startsWith("application/json")
    if (!sameOrigin || !isJson) return json({ error: "Same-origin JSON request required" }, 403)
    if (Number(request.headers.get("content-length") || 0) > BODY_LIMIT) {
      return json({ error: "payload_too_large", limit_bytes: BODY_LIMIT }, 413)
    }
    try {
      body = new TextDecoder().decode(await limitedBody(new Response(request.body), BODY_LIMIT))
    } catch {
      return json({ error: "payload_too_large", limit_bytes: BODY_LIMIT }, 413)
    }
    headers["Content-Type"] = "application/json"
  }

  let url: URL
  try {
    const base = new URL(masBase())
    if (!["http:", "https:"].includes(base.protocol) || base.username || base.password) throw Error("bad base")
    url = new URL(masPath + request.nextUrl.search, base)
  } catch {
    return json({ error: "flybrain_unreachable", path: masPath, reason: "invalid_mas_base" }, 502)
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })
    const bytes = await limitedBody(response, UPSTREAM_LIMIT)
    const text = new TextDecoder().decode(bytes)
    let data: unknown
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = { error: "flybrain_non_json", upstream_status: response.status, raw: text.slice(0, 240) }
    }
    return json(data, response.status)
  } catch (error) {
    const reason = error instanceof Error && error.name === "TimeoutError" ? "timeout" : "network"
    return json({ error: "flybrain_unreachable", path: masPath, reason }, 502)
  }
}

export const GET = forward
export const POST = forward
export const DELETE = forward
