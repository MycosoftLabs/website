/**
 * Supabase Auth Callback Handler
 * Exchanges auth code for session after OAuth or magic link.
 * Uses createClientForRedirect so session cookies are set on the redirect response
 * (required for OAuth flow - standard createClient doesn't attach cookies to redirects).
 */
import { getAuthOrigin } from '@/lib/auth/get-auth-origin'
import { createClient, createClientForRedirect } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function getSupabaseStorageKey(): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return null

  try {
    const host = new URL(supabaseUrl).hostname
    const projectRef = host.split('.')[0]
    return projectRef ? `sb-${projectRef}-auth-token` : null
  } catch {
    return null
  }
}

function hasPkceVerifierCookie(request: Request): boolean {
  const storageKey = getSupabaseStorageKey()
  if (!storageKey) return false

  const verifierName = `${storageKey}-code-verifier`
  const cookieHeader = request.headers.get('cookie') ?? ''
  return parseCookieString(cookieHeader).some((cookie) => cookie.name === verifierName)
}

function parseCookieString(cookieHeader: string): { name: string; value: string }[] {
  if (!cookieHeader) return []
  return cookieHeader
    .split(';')
    .map((pair) => {
      const [name, ...valueParts] = pair.trim().split('=')
      return { name: name?.trim() ?? '', value: valueParts.join('=').trim() ?? '' }
    })
    .filter((cookie) => cookie.name)
}

function createClientCallbackUrl(origin: string, code: string, next: string): string {
  const url = new URL('/auth/client-callback', origin)
  url.searchParams.set('code', code)
  url.searchParams.set('next', next)
  return url.toString()
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

  const origin = getAuthOrigin(request)

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
    if (!hasPkceVerifierCookie(request)) {
      return NextResponse.redirect(createClientCallbackUrl(origin, code, next))
    }

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
