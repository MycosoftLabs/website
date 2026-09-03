/**
 * API Route Authentication Helper
 *
 * Single active auth path: Supabase Auth only.
 * NextAuth is not used for production gating.
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isCompanyEmail } from '@/lib/access/types'
import { cookies } from 'next/headers'
import { LOCAL_DEV_ADMIN_COOKIE, verifyLocalDevAdminSession } from '@/lib/auth/local-dev-session'

export interface AuthenticatedUser {
  id: string
  email: string
  role: string
  isAdmin: boolean
  isOwner: boolean
}

// Authorized users: Morgan (owner) and RJ. Former staff (Garret, Alberto, Chris)
// no longer work at the company and must not retain admin/SOC access.
const OWNER_EMAILS = ['morgan@mycosoft.org']
const ADMIN_EMAILS = [
  'morgan@mycosoft.org',
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
  const localDevCookie = (await cookies()).get(LOCAL_DEV_ADMIN_COOKIE)?.value
  const localDevSession = verifyLocalDevAdminSession(localDevCookie)
  if (localDevSession) {
    return {
      user: {
        id: 'local-dev-morgan',
        email: localDevSession.email,
        role: 'owner',
        isAdmin: true,
        isOwner: true,
      },
    }
  }

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
 * Fusarium operational console: existing Supabase project only.
 * Local-dev admin cookies are not owner proof.
 */
export async function requireFusariumOwner(): Promise<
  { user: AuthenticatedUser; error?: never } | { user?: never; error: NextResponse }
> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (!user || error) {
    return {
      error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    }
  }

  const email = (user.email || "").toLowerCase().trim()
  if (!OWNER_EMAILS.includes(email)) {
    return {
      error: NextResponse.json({ error: 'Owner access required' }, { status: 403 }),
    }
  }

  return {
    user: {
      id: user.id,
      email,
      role: 'owner',
      isAdmin: true,
      isOwner: true,
    },
  }
}

const OPERATIONAL_DENY_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie, Authorization",
} as const

/** 401/403 JSON for operational telemetry and LAN topology. Never includes device rows. */
export function fusariumOperationalDeniedResponse(status: 401 | 403): NextResponse {
  return NextResponse.json(
    {
      error: status === 403 ? "Owner access required" : "Authentication required",
      data_state: "withheld",
      access: {
        scope: "public",
        operational_device_data: "withheld",
        required_role: "owner",
        read_only: true,
      },
    },
    { status, headers: OPERATIONAL_DENY_HEADERS },
  )
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
