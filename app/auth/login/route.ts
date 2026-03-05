/**
 * Password login Route Handler
 * Uses createClientForRedirect so session cookies are attached to the redirect response.
 * cookieStore.set() does not apply to custom NextResponse.redirect() - we must write
 * cookies to the redirect response directly.
 */
import { createClientForRedirect } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function getOrigin(request: Request): string {
  const requestOrigin = new URL(request.url).origin
  const isLocalDev = requestOrigin.includes('localhost') || requestOrigin.includes('127.0.0.1')
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
  return isLocalDev
    ? requestOrigin
    : forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : process.env.NEXT_PUBLIC_SITE_URL || requestOrigin
}

export async function POST(request: Request) {
  const url = new URL(request.url)
  const formData = await request.formData()
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  // Prefer URL (form action) so redirectTo survives even if hidden input is wrong
  const redirectTo =
    url.searchParams.get('redirectTo') ||
    (formData.get('redirectTo') as string) ||
    '/dashboard'

  const origin = getOrigin(request)

  if (!email || !password) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Email and password are required')}&redirectTo=${encodeURIComponent(redirectTo)}`,
      303
    )
  }

  const path = redirectTo.includes('://') ? '/dashboard' : redirectTo.startsWith('/') ? redirectTo : `/${redirectTo}`
  // Redirect to client-side page so cookies are sent before hitting protected page
  const continueUrl = `${origin}/auth/continue?next=${encodeURIComponent(path)}`
  const redirectResponse = NextResponse.redirect(continueUrl, 303)

  const supabase = createClientForRedirect(request, redirectResponse)
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}&redirectTo=${encodeURIComponent(redirectTo)}`,
      303
    )
  }

  return redirectResponse
}
