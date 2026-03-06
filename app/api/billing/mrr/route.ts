/**
 * GET /api/billing/mrr
 * MRR and beta stats for super admin dashboard.
 * Super admin only (morgan@mycosoft.org).
 * Fetches from MINDEX beta_users; no mock data.
 * March 5, 2026 — MYCA Loop Closure (revenue validation)
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MINDEX_BASE = process.env.MINDEX_API_URL || process.env.MINDEX_API_BASE_URL

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

    const res = await fetch(`${MINDEX_BASE}/api/mindex/beta/stats`, {
      cache: 'no-store',
    })
    const stats = await res.json().catch(() => ({}))
    const active_users = stats.active_users ?? 0
    const api_calls = stats.total_api_calls ?? 0
    const users_by_plan = stats.users_by_plan ?? {}

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
