/**
 * POST /api/beta/onboard
 * Onboard beta user: create MINDEX beta_users record, generate API key.
 * Requires authenticated Supabase session.
 *
 * Body: { plan, user_type?, startup_fee_paid? }
 *   - user_type: "individual" | "developer" | "researcher" | "organization" (default: "individual")
 *   - startup_fee_paid: boolean — true when the $1 Stripe startup fee has been charged
 *
 * March 5, 2026 — MYCA Loop Closure (revenue validation)
 * March 19, 2026 — Added user_type and startup_fee_paid for segregated public/internal APIs
 */
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const MINDEX_BASE = process.env.MINDEX_API_URL || process.env.MINDEX_API_BASE_URL

const VALID_USER_TYPES = ['individual', 'developer', 'researcher', 'organization'] as const

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!MINDEX_BASE) {
      return NextResponse.json(
        { error: 'MINDEX_API_URL not configured' },
        { status: 503 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const plan = typeof body?.plan === 'string' ? body.plan.toLowerCase() : 'free'
    const userType = VALID_USER_TYPES.includes(body?.user_type) ? body.user_type : 'individual'
    const startupFeePaid = body?.startup_fee_paid === true

    const response = await fetch(`${MINDEX_BASE}/api/mindex/beta/onboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        plan,
        supabase_user_id: user.id,
        user_type: userType,
        startup_fee_paid: startupFeePaid,
      }),
      cache: 'no-store',
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.detail || 'Onboarding failed' },
        { status: response.status }
      )
    }

    return NextResponse.json({
      api_key: data.api_key,
      api_key_prefix: data.api_key_prefix,
      message: data.message,
    })
  } catch (err) {
    console.error('[API] /api/beta/onboard error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
