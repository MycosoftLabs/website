/**
 * Supabase Auth Callback Handler
 * Exchanges auth code for session after OAuth or magic link
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  // Support both 'next' and 'redirectTo' query params
  const next = searchParams.get('next') || searchParams.get('redirectTo') || '/dashboard'
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')

  // Get the correct origin - use X-Forwarded-Host header (from tunnel/proxy) or NEXT_PUBLIC_SITE_URL
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
  const origin = forwardedHost 
    ? `${forwardedProto}://${forwardedHost}`
    : process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin

  // Handle OAuth errors
  if (error) {
    console.error('Auth callback error:', error, error_description)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error_description || error)}`
    )
  }

  if (code) {
    const supabase = await createClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!exchangeError) {
      // Successful authentication
      return NextResponse.redirect(`${origin}${next}`)
    }
    
    console.error('Code exchange error:', exchangeError)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`
    )
  }

  // No code provided
  return NextResponse.redirect(`${origin}/login?error=No authentication code provided`)
}
