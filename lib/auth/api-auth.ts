/**
 * API Route Authentication Helper
 *
 * Provides consistent authentication checks for API routes.
 * Uses Supabase Auth (primary) with NextAuth fallback.
 */

import { createClient } from '@/lib/supabase/server'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'

export interface AuthenticatedUser {
  id: string
  email: string
  role: string
  isAdmin: boolean
  isOwner: boolean
}

const OWNER_EMAILS = ['morgan@mycosoft.org']
const ADMIN_EMAILS = [
  'morgan@mycosoft.org',
  'garret@mycosoft.org',
  'rj@mycosoft.org',
  'admin@mycosoft.org',
]

/**
 * Require authentication on an API route.
 * Returns the authenticated user or a 401 response.
 */
export async function requireAuth(): Promise<
  { user: AuthenticatedUser; error?: never } | { user?: never; error: NextResponse }
> {
  // Try Supabase Auth first
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (user && !error) {
      const email = user.email || ''
      const isOwner = OWNER_EMAILS.includes(email)
      const isAdmin = ADMIN_EMAILS.includes(email) || isOwner

      return {
        user: {
          id: user.id,
          email,
          role: isOwner ? 'owner' : isAdmin ? 'admin' : 'user',
          isAdmin,
          isOwner,
        },
      }
    }
  } catch {
    // Supabase not available, try NextAuth
  }

  // Fallback to NextAuth
  try {
    const { authOptions } = await import('@/app/api/auth/[...nextauth]/route')
    const session = await getServerSession(authOptions)
    if (session?.user) {
      const sessionUser = session.user as any
      const email = sessionUser.email || ''
      const isOwner = OWNER_EMAILS.includes(email) || sessionUser.isOwner
      const isAdmin = ADMIN_EMAILS.includes(email) || sessionUser.isAdmin || isOwner

      return {
        user: {
          id: sessionUser.id || '',
          email,
          role: sessionUser.role || (isOwner ? 'owner' : isAdmin ? 'admin' : 'user'),
          isAdmin,
          isOwner,
        },
      }
    }
  } catch {
    // NextAuth not available
  }

  return {
    error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
  }
}

/**
 * Require admin-level authentication.
 * Returns the authenticated admin user or a 401/403 response.
 */
export async function requireAdmin(): Promise<
  { user: AuthenticatedUser; error?: never } | { user?: never; error: NextResponse }
> {
  const result = await requireAuth()
  if (result.error) return result

  if (!result.user.isAdmin) {
    return {
      error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }),
    }
  }

  return result
}

/**
 * Require owner-level authentication.
 */
export async function requireOwner(): Promise<
  { user: AuthenticatedUser; error?: never } | { user?: never; error: NextResponse }
> {
  const result = await requireAuth()
  if (result.error) return result

  if (!result.user.isOwner) {
    return {
      error: NextResponse.json({ error: 'Owner access required' }, { status: 403 }),
    }
  }

  return result
}
