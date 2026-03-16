/**
 * Middleware - Supabase session refresh + case-sensitive redirects
 * 1. Refreshes Supabase auth session and syncs cookies (required for server to see session)
 * 2. /MYCA (uppercase) -> /myca to support legacy links
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Infrastructure routes gated to company emails only (@mycosoft.org / @mycosoft.com)
const INFRASTRUCTURE_PATHS = [
  '/natureos/devices', '/natureos/mycobrain', '/natureos/sporebase',
  '/natureos/fci', '/natureos/crep', '/natureos/fusarium',
  '/natureos/mindex', '/natureos/storage', '/natureos/containers',
  '/natureos/monitoring',
]

const COMPANY_EMAIL_DOMAINS = ['mycosoft.org', 'mycosoft.com']

function isCompanyEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const domain = email.split('@')[1]?.toLowerCase()
  return COMPANY_EMAIL_DOMAINS.includes(domain)
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const response =
    pathname === "/MYCA"
      ? NextResponse.redirect(new URL("/myca", request.url), 302)
      : NextResponse.next({ request })

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
    const { data: { user } } = await supabase.auth.getUser()

    // COMPANY GATE: Infrastructure routes require @mycosoft.org or @mycosoft.com email
    const isInfrastructureRoute = INFRASTRUCTURE_PATHS.some(
      p => pathname === p || pathname.startsWith(p + '/')
    )

    if (isInfrastructureRoute) {
      if (!user) {
        // Not logged in — redirect to login
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('redirectTo', pathname)
        return NextResponse.redirect(url)
      }
      if (!isCompanyEmail(user.email)) {
        // Logged in but not a company email — redirect to NatureOS with error
        const url = request.nextUrl.clone()
        url.pathname = '/natureos'
        url.searchParams.set('error', 'company_access_required')
        return NextResponse.redirect(url)
      }
    }
  }

  return response
}

// Exclude auth routes and login - they handle session themselves and redirect immediately.
// Middleware's getUser() can overwrite response cookies that never get sent when page throws redirect().
// Also exclude /api/health and static assets to reduce unnecessary auth checks.
export const config = {
  matcher: ['/((?!_next/static|_next/image|login|auth/login|auth/signup|auth/reset|auth/continue|auth/callback|api/health|favicon\\.ico|assets/).*)'],
}
