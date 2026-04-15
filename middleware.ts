/**
 * Middleware - Supabase session refresh + case-sensitive redirects
 * 1. Refreshes Supabase auth session and syncs cookies (required for server to see session)
 * 2. /MYCA (uppercase) -> /myca to support legacy links
 * 3. Route gating aligned with lib/access/routes.ts (auth + company-email gates)
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { pathRequiresAuth, pathRequiresCompanyEmail } from '@/lib/access/routes'
import { isCompanyEmail } from '@/lib/access/types'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const response =
    pathname === "/MYCA"
      ? NextResponse.redirect(new URL("/myca", request.url), 302)
      : NextResponse.next({ request })

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
    (host === "localhost" || host === "127.0.0.1")
  if (localDevAuthBypass) {
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
      url.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(url)
    }
    // Company gate: routes that require @mycosoft.org / @mycosoft.com
    if (pathRequiresCompanyEmail(pathname) && !isCompanyEmail(user.email)) {
      const url = request.nextUrl.clone()
      url.pathname = '/natureos'
      url.searchParams.set('error', 'company_access_required')
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
