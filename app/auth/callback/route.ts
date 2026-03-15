/**
 * Supabase Auth Callback Handler
 * Exchanges auth code for session after OAuth or magic link.
 * Uses createClientForRedirect so session cookies are set on the redirect response
 * (required for OAuth flow - standard createClient doesn't attach cookies to redirects).
 */
import { createClient, createClientForRedirect } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  // Support 'next', 'redirectTo', and 'redirect' (agent uses ?redirect=/agent)
  // SECURITY: Validate redirect target to prevent open redirect attacks
  const rawNext =
    searchParams.get('next') ||
    searchParams.get('redirectTo') ||
    searchParams.get('redirect') ||
    '/'
  const next = (rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.includes('://'))
    ? rawNext
    : '/'
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')

  // Get the correct origin from the request URL (needed before any redirect)
  // For local development, always use the request URL origin to avoid redirecting to sandbox
  const requestOrigin = new URL(request.url).origin

  // Detect if this is a localhost request - ALWAYS use localhost origin for local dev
  const isLocalDev = requestOrigin.includes('localhost') || requestOrigin.includes('127.0.0.1')

  // For production/sandbox, check for forwarded headers from Cloudflare/proxy
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'

  // Origin priority:
  // 1. Localhost always uses request origin (prevents sandbox redirect)
  // 2. Forwarded host for production behind proxy/tunnel
  // 3. NEXT_PUBLIC_SITE_URL as fallback
  // 4. Request origin as final fallback
  const origin = isLocalDev
    ? requestOrigin
    : forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : process.env.NEXT_PUBLIC_SITE_URL || requestOrigin

  // Handle OAuth errors
  if (error) {
    console.error('Auth callback error:', error, error_description)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error_description || error)}`
    )
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Sign-in is not configured. Missing Supabase env.')}&redirectTo=${encodeURIComponent(next)}`
    )
  }

  if (code) {
    // Create redirect response first - session cookies MUST be set on this response
    // so they are sent when user lands on the target page (e.g. /ethics-training)
    const redirectUrl = `${origin}${next}`
    const redirectResponse = NextResponse.redirect(redirectUrl)
    const supabase = createClientForRedirect(request, redirectResponse)
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (!exchangeError) {
      return redirectResponse
    }

    console.error('Code exchange error:', exchangeError)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(exchangeError.message)}&redirectTo=${encodeURIComponent(next)}`
    )
  }

  // No code: password login flow - session is in cookies from redirect
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    return NextResponse.redirect(`${origin}${next}`)
  }
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent('Session not found')}&redirectTo=${encodeURIComponent(next)}`
  )
}
