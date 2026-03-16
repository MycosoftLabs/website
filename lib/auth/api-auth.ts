/**
 * API Route Authentication Helper
 *
 * Single active auth path: Supabase Auth only.
 * NextAuth is not used for production gating.
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isCompanyEmail } from '@/lib/access/types'

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
 * Uses Supabase Auth only (no NextAuth fallback).
 */
export async function requireAuth(): Promise<
  { user: AuthenticatedUser; error?: never } | { user?: never; error: NextResponse }
> {
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

/**
 * Require company email authentication (@mycosoft.org or @mycosoft.com).
 * Used for infrastructure API routes.
 */
export async function requireCompanyAuth(): Promise<
  { user: AuthenticatedUser; error?: never } | { user?: never; error: NextResponse }
> {
  const result = await requireAuth()
  if (result.error) return result

  if (!isCompanyEmail(result.user.email)) {
    return {
      error: NextResponse.json(
        { error: 'Company access required. Only @mycosoft.org and @mycosoft.com emails are authorized.' },
        { status: 403 }
      ),
    }
  }

  return result
}
