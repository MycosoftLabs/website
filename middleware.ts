/**
 * Middleware - Agent Defense + Supabase Session Refresh
 *
 * Execution order:
 *  1. Extract client IP (Cloudflare > x-forwarded-for > fallback)
 *  2. Circuit breaker check (rejects ALL non-auth traffic when overloaded)
 *  3. Classify client tier (browser / authenticated / known-agent / unknown-bot)
 *  4. Tiered rate limiting (agents get 5-10 req/min vs 60-120 for browsers)
 *  5. Legacy redirects (/MYCA -> /myca)
 *  6. Supabase session refresh
 *  7. Attach defense headers (X-Client-Tier, X-Request-ID for logging)
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {
  classifyClient,
  isExemptPath,
  isHighCostPath,
  tieredLimiter,
  circuitBreaker,
  rateLimited429,
  serviceUnavailable503,
  type ClientTier,
} from "@/lib/agent-defense"

/**
 * Extract client IP — trust Cloudflare first, then x-forwarded-for.
 */
function getClientIP(request: NextRequest): string {
  const cfIp = request.headers.get("cf-connecting-ip")
  if (cfIp) return cfIp

  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()

  return request.ip || "unknown"
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // ── 0. Skip exempt paths (static assets, health checks) ──
  if (isExemptPath(pathname)) {
    return NextResponse.next({ request })
  }

  // ── 1. Extract client IP ──
  const ip = getClientIP(request)

  // ── 2. Classify the client ──
  const userAgent = request.headers.get("user-agent")
  const hasSessionCookie = request.cookies.has("sb-access-token") ||
    request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"))
  const hasAuthHeader = !!request.headers.get("authorization")
  const tier: ClientTier = classifyClient(userAgent, hasSessionCookie, hasAuthHeader)

  // ── 3. Circuit breaker — reject everything if system is overloaded ──
  if (circuitBreaker.shouldReject(ip, tier)) {
    return serviceUnavailable503()
  }

  // ── 4. Tiered rate limiting (only for /api/* routes) ──
  if (pathname.startsWith("/api/")) {
    const isStream = pathname.includes("/stream")
    const highCost = isHighCostPath(pathname)
    const result = tieredLimiter.check(ip, tier, highCost, isStream)

    if (!result.allowed) {
      return rateLimited429(result.retryAfterMs!, result.reason!)
    }
  }

  // ── 5. Legacy redirect ──
  const response =
    pathname === "/MYCA"
      ? NextResponse.redirect(new URL("/myca", request.url), 302)
      : NextResponse.next({ request })

  // ── 6. Supabase session refresh ──
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    })
    await supabase.auth.getUser()
  }

  // ── 7. Attach defense headers for downstream logging ──
  response.headers.set("X-Client-Tier", tier)
  response.headers.set("X-Request-IP", ip)

  return response
}

// Exclude auth/continue and auth/callback - they handle session themselves and redirect immediately.
// Middleware's getUser() can overwrite response cookies that never get sent when page throws redirect().
export const config = {
  matcher: ['/((?!_next/static|_next/image|auth/login|auth/signup|auth/reset|auth/continue|auth/callback).*)'],
}
