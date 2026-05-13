/**
 * Supabase Auth Callback Handler
 * Exchanges auth code for session after OAuth or magic link.
 * Uses createClientForRedirect so session cookies are set on the redirect response
 * (required for OAuth flow - standard createClient doesn't attach cookies to redirects).
 */
import { createClient, createClientForRedirect } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function getOrigin(request: Request): string {
  const requestUrl = new URL(request.url)
  const requestHost = request.headers.get('host') || requestUrl.host
  const isLocalDev =
    requestHost.includes('localhost') ||
    requestHost.startsWith('127.0.0.1') ||
    requestUrl.hostname === 'localhost' ||
    requestUrl.hostname === '127.0.0.1'

  if (isLocalDev) return requestUrl.origin

  const configuredSite = process.env.NEXT_PUBLIC_SITE_URL
  if (configuredSite) {
    try {
      return new URL(configuredSite).origin
    } catch {
      // Fall back to forwarded headers below if the env var is malformed.
    }
  }

  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https'
  const host = forwardedHost || requestHost || requestUrl.host
  return `${forwardedProto}://${host}`
}

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

  const origin = getOrigin(request)

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
