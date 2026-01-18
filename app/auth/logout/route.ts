/**
 * Supabase Auth Logout Handler
 * Signs out the user and redirects to login
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  
  await supabase.auth.signOut()
  
  const { origin } = new URL(request.url)
  return NextResponse.redirect(`${origin}/login?message=Successfully signed out`)
}

export async function GET(request: Request) {
  const supabase = await createClient()
  
  await supabase.auth.signOut()
  
  const { origin } = new URL(request.url)
  return NextResponse.redirect(`${origin}/login?message=Successfully signed out`)
}
