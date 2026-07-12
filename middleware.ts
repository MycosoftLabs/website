/**
 * Middleware - Supabase session refresh + case-sensitive redirects
 * 1. Refreshes Supabase auth session and syncs cookies (required for server to see session)
 * 2. /MYCA (uppercase) -> /myca to support legacy links
 * 3. Route gating aligned with lib/access/routes.ts (auth + company-email gates)
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { pathRequiresAuth, pathRequiresCompanyEmail, pathRequiresOwner, OWNER_ALLOWED_EMAILS } from '@/lib/access/routes'
import { isCompanyEmail } from '@/lib/access/types'

/** Cloudflare / reverse proxies send x-forwarded-proto; force HTTPS on the public site. */
function isLocalDevHost(host: string): boolean {
  const normalized = host.toLowerCase()
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "0.0.0.0" ||
    normalized === "::1" ||
    normalized === "[::1]"
  )
}

function httpsUpgradeResponse(request: NextRequest): NextResponse | null {
  const host = request.nextUrl.hostname
  if (process.env.NODE_ENV === "development" || isLocalDevHost(host)) return null
  const forwarded = request.headers.get("x-forwarded-proto")
  if (forwarded !== "http") return null
  const url = request.nextUrl.clone()
  url.protocol = "https:"
  return NextResponse.redirect(url, 308)
}

export async function middleware(request: NextRequest) {
  const httpsRedirect = httpsUpgradeResponse(request)
  if (httpsRedirect) return httpsRedirect

  const pathname = request.nextUrl.pathname
  // Supabase/Google can occasionally return local OAuth callbacks as
  // /code=<auth-code> when the provider falls back to the site root. Recover
  // that shape before route gating so localhost sign-in can still finish in
  // the client callback and use the stored redirect target.
  if (process.env.NODE_ENV === "development" && pathname.startsWith("/code=")) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/client-callback"
    url.searchParams.set("code", decodeURIComponent(pathname.slice("/code=".length)))
    return NextResponse.redirect(url, 302)
  }

  if (pathname === "/search/qa") {
    const url = request.nextUrl.clone()
    url.pathname = "/search"
    url.searchParams.set("qa", "1")
    return NextResponse.rewrite(url)
  }

  const response =
    pathname === "/MYCA"
      ? NextResponse.redirect(new URL("/myca", request.url), 302)
      : NextResponse.next({ request })

  // Apr 23, 2026 — Explicit public-prefix bypass for Worldview v1.
  // Route handlers in /api/worldview/v1/* do their own Bearer auth via
  // getAgentProfile() (lib/agent-auth.ts). Middleware Supabase cookie
  // lookup would (a) be pointless for bearer-auth callers and (b) has
  // caused observed HTML-instead-of-JSON responses when config_missing
  // triggers a login redirect on image-builds that predate the route
  // file. Shortcut: never gate /api/worldview/* via the page-auth flow.
  if (pathname.startsWith("/api/worldview/")) return response
  if (pathname.startsWith("/natureos/model-training")) return response

  // Fast path: skip Supabase getUser() entirely for public pages that don't
  // need auth. This eliminates a network round-trip on every navigation to
  // /, /about, /devices/*, etc. and fixes the "page won't load until clicked" lag.
  const needsAuth = pathRequiresAuth(pathname) || pathRequiresCompanyEmail(pathname)
  if (!needsAuth) return response

  // Local dev only: allow NatureOS/infrastructure routes without login (opt-in; never enable in prod).
  // Set in .env.local: UNSAFE_BYPASS_AUTH=true with NODE_ENV=development on localhost:3010.
  const host = request.nextUrl.hostname
  const localDevAuthBypass =
    process.env.UNSAFE_BYPASS_AUTH === "true" &&
    process.env.NODE_ENV === "development" &&
    isLocalDevHost(host)
  if (localDevAuthBypass) {
    return response
  }

  // Localhost-only test sessions let device-console QA stay on port 3010
  // even when Supabase OAuth redirects are configured for production.
  // API routes still verify the signed cookie before allowing commands.
  const localDevSession =
    process.env.NODE_ENV === "development" &&
    isLocalDevHost(host) &&
    request.cookies.get("mycosoft_local_dev_admin")?.value
  if (localDevSession && localDevSession.includes(".")) {
    return response
  }

  // Owner-only consoles (Psathyrella GCS): on localhost/LAN in dev, keep them reachable so the
  // on-device iPad bench test works BEFORE the client mints its local-dev admin cookie (chicken/egg:
  // the page must load for the client to mint). Production is unaffected — isLocalDevHost is false for
  // the public host and NODE_ENV is production, so the owner-email gate below is enforced there.
  if (pathRequiresOwner(pathname) && process.env.NODE_ENV === "development" && isLocalDevHost(host)) {
    return response
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('error', 'config_missing')
    return NextResponse.redirect(url)
  }

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

  const { data: { user } } = await supabase.auth.getUser()

  // Auth gate: any route that requires auth (canonical route map)
  if (pathRequiresAuth(pathname)) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirectTo', `${pathname}${request.nextUrl.search}`)
      return NextResponse.redirect(url)
    }
    // Company gate: routes that require @mycosoft.org / @mycosoft.com
    if (pathRequiresCompanyEmail(pathname) && !isCompanyEmail(user.email)) {
      const url = request.nextUrl.clone()
      url.pathname = '/natureos'
      url.searchParams.set('error', 'company_access_required')
      return NextResponse.redirect(url)
    }
    // Owner gate: single-email allowlist (the Psathyrella GCS is owner-only). A logged-in
    // non-owner (even another @mycosoft.org employee) is bounced back to /natureos.
    if (pathRequiresOwner(pathname) && !OWNER_ALLOWED_EMAILS.includes((user.email || '').toLowerCase())) {
      const url = request.nextUrl.clone()
      url.pathname = '/natureos'
      url.searchParams.set('error', 'owner_only')
      return NextResponse.redirect(url)
    }
  }

  return response
}

// Exclude auth/continue and auth/callback - they handle session themselves and redirect immediately.
// Middleware's getUser() can overwrite response cookies that never get sent when page throws redirect().
export const config = {
  // Skip static media under /assets/ so Supabase getUser() does not run on large video requests.
  matcher: [
    '/((?!_next/static|_next/image|assets/|auth/login|auth/signup|auth/reset|auth/continue|auth/callback).*)',
  ],
}
