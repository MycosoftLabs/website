/**
 * GET /api/billing/mrr
 * MRR and beta stats for super admin dashboard.
 * Super admin only (morgan@mycosoft.org).
 * Fetches from MINDEX internal API; no mock data.
 *
 * March 5, 2026 — MYCA Loop Closure (revenue validation)
 * March 19, 2026 — Migrated to /api/mindex/internal/beta/stats with internal token
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MINDEX_BASE = process.env.MINDEX_API_URL || process.env.MINDEX_API_BASE_URL
const MINDEX_INTERNAL_TOKEN = process.env.MINDEX_INTERNAL_TOKEN || process.env.INTERNAL_API_SECRET

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isSuperAdmin =
      profile?.role === 'super_admin' && user.email === 'morgan@mycosoft.org'

    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!MINDEX_BASE) {
      return NextResponse.json({
        mrr: 0,
        active_users: 0,
        api_calls: 0,
        users_by_plan: {},
        message: 'MINDEX_API_URL not configured',
      })
    }

    // Use internal MINDEX endpoint with internal token for admin calls.
    // Falls back to the old public endpoint if the internal one isn't available yet.
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (MINDEX_INTERNAL_TOKEN) {
      headers['x-internal-token'] = MINDEX_INTERNAL_TOKEN
    }

    let stats: Record<string, unknown> = {}

    // Try new internal endpoint first
    const internalRes = await fetch(`${MINDEX_BASE}/api/mindex/internal/beta/stats`, {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    }).catch(() => null)

    if (internalRes?.ok) {
      stats = await internalRes.json().catch(() => ({}))
    } else {
      // Fall back to legacy public endpoint
      const fallbackRes = await fetch(`${MINDEX_BASE}/api/mindex/beta/stats`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      }).catch(() => null)
      stats = await fallbackRes?.json().catch(() => ({})) ?? {}
    }

    const active_users = (stats.active_users as number) ?? 0
    const api_calls = (stats.total_api_calls as number) ?? 0
    const users_by_plan = (stats.users_by_plan as Record<string, number>) ?? {}

    // MRR: approximate from beta_users plans (free=0, pro=29, enterprise=99, etc.)
    // Real MRR would come from Stripe; for now derive from plan counts
    const planMRR: Record<string, number> = {
      free: 0,
      pro: 29,
      enterprise: 99,
    }
    let mrr = 0
    for (const [plan, count] of Object.entries(users_by_plan)) {
      mrr += (planMRR[plan as keyof typeof planMRR] ?? 0) * (count as number)
    }

    return NextResponse.json({
      mrr,
      active_users,
      api_calls,
      users_by_plan,
    })
  } catch (err) {
    console.error('[API] /api/billing/mrr error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
