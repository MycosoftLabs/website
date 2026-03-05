/**
 * GET /api/auth/session
 * Server-side session check for Supabase auth.
 * Used by login page to poll until server can see the session before redirecting.
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return NextResponse.json({ ok: !!user, user: user ? { id: user.id, email: user.email } : null })
  } catch {
    return NextResponse.json({ ok: false, user: null })
  }
}
