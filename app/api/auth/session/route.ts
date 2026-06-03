/**
 * GET /api/auth/session
 * Server-side session check for Supabase auth.
 * Used by login page to poll until server can see the session before redirecting.
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { LOCAL_DEV_ADMIN_COOKIE, verifyLocalDevAdminSession } from '@/lib/auth/local-dev-session'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const localDevSession = verifyLocalDevAdminSession(cookieStore.get(LOCAL_DEV_ADMIN_COOKIE)?.value)
    if (localDevSession) {
      return NextResponse.json({
        ok: true,
        user: {
          id: 'local-dev-morgan',
          email: localDevSession.email,
          role: localDevSession.role,
          localDev: true,
        },
      })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return NextResponse.json({ ok: !!user, user: user ? { id: user.id, email: user.email } : null })
  } catch {
    return NextResponse.json({ ok: false, user: null })
  }
}
