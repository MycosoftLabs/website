/**
 * Middleware - Supabase session refresh + case-sensitive redirects + security flags
 * 1. Refreshes Supabase auth session and syncs cookies (required for server to see session)
 * 2. /MYCA (uppercase) -> /myca to support legacy links
 * 3. /admin -> /dashboard redirect (consolidated admin dashboard)
 * 4. Kill-switch: returns 503 for all non-super-admin requests when active
 * 5. Lockdown: upgrades all route gates to SUPER_ADMIN when active
 * 6. Route gating aligned with lib/access/routes.ts (auth + company-email gates)
 * 7. Gate overrides: dynamic route access changes from dashboard
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { pathRequiresAuth, pathRequiresCompanyEmail } from '@/lib/access/routes'
import { isCompanyEmail } from '@/lib/access/types'

const SUPER_ADMIN_EMAILS = ['morgan@mycosoft.org', 'admin@mycosoft.org']

// Cache security flags to avoid hitting DB on every request
let securityFlagsCache: { lockdown: boolean; killSwitch: boolean; killSwitchMessage: string; gateOverrides: Record<string, string> } | null = null
let securityFlagsCacheTime = 0
const CACHE_TTL = 5000 // 5 seconds

async function getSecurityFlags(supabaseUrl: string, supabaseKey: string): Promise<typeof securityFlagsCache> {
  const now = Date.now()
  if (securityFlagsCache && (now - securityFlagsCacheTime) < CACHE_TTL) {
    return securityFlagsCache
  }

  try {
    // Use direct Supabase REST API from middleware (edge-compatible)
    const res = await fetch(`${supabaseUrl}/rest/v1/site_settings?select=key,value&key=in.(lockdown,kill_switch,gate_overrides)`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      cache: 'no-store',
    })

    if (res.ok) {
      const data = await res.json()
      const lockdownSetting = data.find((s: { key: string; value: unknown }) => s.key === 'lockdown')
      const killSwitchSetting = data.find((s: { key: string; value: unknown }) => s.key === 'kill_switch')
      const gateOverridesSetting = data.find((s: { key: string; value: unknown }) => s.key === 'gate_overrides')

      securityFlagsCache = {
        lockdown: lockdownSetting?.value?.active ?? false,
        killSwitch: killSwitchSetting?.value?.active ?? false,
        killSwitchMessage: killSwitchSetting?.value?.message || 'We are currently performing maintenance. Please check back soon.',
        gateOverrides: {},
      }

      // Parse gate overrides into a simple path -> gate map
      if (gateOverridesSetting?.value && typeof gateOverridesSetting.value === 'object') {
        for (const [path, config] of Object.entries(gateOverridesSetting.value)) {
          if (config && typeof config === 'object' && 'gate' in config) {
            securityFlagsCache.gateOverrides[path] = (config as { gate: string }).gate
          }
        }
      }

      securityFlagsCacheTime = now
      return securityFlagsCache
    }
  } catch {
    // If we can't read security flags, fail open (don't block the site)
  }

  return { lockdown: false, killSwitch: false, killSwitchMessage: '', gateOverrides: {} }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Redirect /MYCA -> /myca
  if (pathname === "/MYCA") {
    return NextResponse.redirect(new URL("/myca", request.url), 302)
  }

  // Redirect /admin -> /dashboard
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url), 302)
  }

  const response = NextResponse.next({ request })

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
    const userEmail = user?.email || ''
    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(userEmail)

    // Check security flags
    const flags = await getSecurityFlags(supabaseUrl, supabaseAnonKey)

    // Kill switch: return 503 for all non-super-admin requests (except login, API health)
    if (flags?.killSwitch && !isSuperAdmin) {
      const isExempt = pathname === '/login' || pathname === '/api/health' || pathname.startsWith('/api/dashboard/')
      if (!isExempt) {
        return new NextResponse(
          `<!DOCTYPE html><html><head><title>Maintenance</title><style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0f172a;color:#e2e8f0;text-align:center;}.c{max-width:500px;padding:2rem;}.h{font-size:2rem;margin-bottom:1rem;color:#f59e0b;}</style></head><body><div class="c"><div class="h">Under Maintenance</div><p>${flags.killSwitchMessage}</p></div></body></html>`,
          { status: 503, headers: { 'Content-Type': 'text/html', 'Retry-After': '300' } }
        )
      }
    }

    // Lockdown: redirect non-super-admins away from all protected routes
    if (flags?.lockdown && !isSuperAdmin) {
      const isPublic = pathname === '/' || pathname === '/login' || pathname === '/signup' || pathname === '/about' || pathname.startsWith('/api/health')
      if (!isPublic && pathRequiresAuth(pathname)) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        url.searchParams.set('error', 'site_lockdown')
        return NextResponse.redirect(url)
      }
    }

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
  }

  return response
}

// Exclude auth/continue and auth/callback - they handle session themselves and redirect immediately.
// Middleware's getUser() can overwrite response cookies that never get sent when page throws redirect().
export const config = {
  matcher: ['/((?!_next/static|_next/image|auth/login|auth/signup|auth/reset|auth/continue|auth/callback).*)'],
}
