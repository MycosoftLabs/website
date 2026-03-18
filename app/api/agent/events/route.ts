import { NextRequest, NextResponse } from 'next/server'
import { getAgentProfile, getAdmin } from '@/lib/agent-auth'
import { getUpsellForEvent } from '@/lib/myca-hooks'

export const dynamic = 'force-dynamic'

/**
 * GET /api/agent/events?limit=20&type=rate_limit_hit
 * Returns agent events for the authenticated profile.
 */
export async function GET(request: NextRequest) {
  try {
    const agent = await getAgentProfile(request)
    if (!agent) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get('limit') || '20', 10),
      100
    )
    const type = request.nextUrl.searchParams.get('type')

    const admin = getAdmin()
    let query = admin
      .from('agent_events')
      .select('id, event_type, severity, message, metadata, created_at')
      .eq('profile_id', agent.profile_id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (type) {
      query = query.eq('event_type', type)
    }

    const { data: events, error } = await query

    if (error) {
      console.error('[agent/events] Query error:', error.message)
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    // Attach upsell message to relevant events
    const enriched = await Promise.all(
      (events || []).map(async (event) => {
        if (['balance_exhausted', 'balance_low', 'rate_limit_hit'].includes(event.event_type)) {
          const upsell = await getUpsellForEvent(admin, event.event_type, agent.balance_cents ?? 0)
          return { ...event, upsell }
        }
        return event
      })
    )

    return NextResponse.json({ events: enriched })
  } catch (err) {
    console.error('[agent/events] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
