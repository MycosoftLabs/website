import { NextRequest, NextResponse } from 'next/server'
import { getAgentProfile, getAdmin } from '@/lib/agent-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/agent/usage — Usage summary for the authenticated profile
 */
export async function GET(request: NextRequest) {
  try {
    const agent = await getAgentProfile(request)
    if (!agent) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const admin = getAdmin()
    const { data, error } = await admin.rpc('get_agent_usage_summary', {
      p_profile_id: agent.profile_id,
    })

    if (error) {
      console.error('[agent/usage] RPC error:', error.message)
      return NextResponse.json({ error: 'Failed to fetch usage summary' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('[agent/usage] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
