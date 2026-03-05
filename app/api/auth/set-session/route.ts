/**
 * POST /api/auth/set-session
 * Persists Supabase session to server-side cookies and redirects.
 * Password sign-in stores in localStorage only; this syncs to cookies so
 * server layout/middleware can see the session.
 * Uses createClientForRedirect so session cookies are attached to the redirect
 * response; cookieStore.set() does NOT apply to custom NextResponse.redirect().
 * Accepts: application/json or application/x-www-form-urlencoded
 */
import { createClientForRedirect } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function parseBody(request: Request): Promise<{ access_token?: string; refresh_token?: string; redirectTo?: string }> {
  const ct = request.headers.get('content-type') ?? ''
  if (ct.includes('application/json')) {
    return request.json().catch(() => ({}))
  }
  if (ct.includes('application/x-www-form-urlencoded')) {
    const text = await request.text()
    const params = new URLSearchParams(text)
    return {
      access_token: params.get('access_token') ?? undefined,
      refresh_token: params.get('refresh_token') ?? undefined,
      redirectTo: params.get('redirectTo') ?? undefined,
    }
  }
  return {}
}

export async function POST(request: Request) {
  try {
    const body = await parseBody(request)
    const access_token = body.access_token
    const refresh_token = body.refresh_token
    const redirectTo = body.redirectTo || '/'
    const safePath = redirectTo.startsWith('/') ? redirectTo : '/'

    if (!access_token || !refresh_token) {
      return NextResponse.json({ ok: false, error: 'Missing access_token or refresh_token' }, { status: 400 })
    }

    const origin = new URL(request.url).origin
    const redirectUrl = `${origin}${safePath}`
    const redirectResponse = NextResponse.redirect(redirectUrl, 303)

    const supabase = createClientForRedirect(request, redirectResponse)
    const { error } = await supabase.auth.setSession({ access_token, refresh_token })

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    }

    return redirectResponse
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'Failed to set session' }, { status: 500 })
  }
}
