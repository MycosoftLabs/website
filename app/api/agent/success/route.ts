import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

let _admin: ReturnType<typeof createClient> | null = null
function getAdmin() {
  if (_admin) return _admin
  _admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  return _admin
}

/**
 * GET /api/agent/success?session_id=cs_xxx
 * Fetches the temporary API key after Stripe checkout redirect.
 * One-time retrieval — the temp key is deleted after fetch.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id')
    if (!sessionId) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 })
    }

    const admin = getAdmin()

    // Look up temp key
    const { data: tempKey, error } = await (admin
      .from('agent_temp_keys') as any)
      .select('id, raw_key, profile_id, expires_at')
      .eq('session_id', sessionId)
      .single() as { data: any; error: any }

    if (error || !tempKey) {
      return NextResponse.json({ error: 'Key not found or expired' }, { status: 404 })
    }

    // Check expiry
    if (new Date(tempKey.expires_at) < new Date()) {
      // Clean up expired key
      await (admin.from('agent_temp_keys') as any).delete().eq('id', tempKey.id)
      return NextResponse.json({ error: 'Key not found or expired' }, { status: 404 })
    }

    // Get balance
    const { data: profile } = await (admin
      .from('profiles') as any)
      .select('balance_cents')
      .eq('id', tempKey.profile_id)
      .single() as { data: any }

    // Delete temp key (one-time fetch)
    await (admin.from('agent_temp_keys') as any).delete().eq('id', tempKey.id)

    return NextResponse.json({
      api_key: tempKey.raw_key,
      balance_cents: profile?.balance_cents ?? 0,
      message: 'Payment confirmed. Your API key is ready to use.',
    })
  } catch (err) {
    console.error('[agent/success] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
