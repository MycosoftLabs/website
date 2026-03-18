import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { getAgentProfile, getAdmin } from '@/lib/agent-auth'
import { fireAgentEvent } from '@/lib/myca-hooks'

export const dynamic = 'force-dynamic'

/**
 * GET /api/agent/keys — List all keys for the authenticated profile
 */
export async function GET(request: NextRequest) {
  try {
    const agent = await getAgentProfile(request)
    if (!agent) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const admin = getAdmin()
    const { data: keys, error } = await admin
      .from('agent_api_keys')
      .select('id, key_prefix, name, is_active, scopes, rate_limit_per_minute, rate_limit_per_day, requests_today, last_used_at, created_at, revoked_at')
      .eq('profile_id', agent.profile_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[agent/keys] List error:', error.message)
      return NextResponse.json({ error: 'Failed to list keys' }, { status: 500 })
    }

    return NextResponse.json({ keys })
  } catch (err) {
    console.error('[agent/keys] GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/agent/keys — Create or rotate a key
 * Body: { action: 'create' | 'rotate', name?: string, key_id?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const agent = await getAgentProfile(request)
    if (!agent) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { action, name, key_id } = body

    if (action !== 'create' && action !== 'rotate') {
      return NextResponse.json({ error: 'action must be "create" or "rotate"' }, { status: 400 })
    }

    const admin = getAdmin()

    // If rotating, revoke the old key first
    if (action === 'rotate') {
      if (!key_id) {
        return NextResponse.json({ error: 'key_id required for rotate' }, { status: 400 })
      }

      const { error: revokeErr } = await admin
        .from('agent_api_keys')
        .update({ is_active: false, revoked_at: new Date().toISOString() })
        .eq('id', key_id)
        .eq('profile_id', agent.profile_id)

      if (revokeErr) {
        console.error('[agent/keys] Revoke old key error:', revokeErr.message)
        return NextResponse.json({ error: 'Failed to revoke old key' }, { status: 500 })
      }
    }

    // Generate new key
    const rawKey = `mk_${randomBytes(32).toString('hex')}`
    const keyHash = createHash('sha256').update(rawKey).digest('hex')
    const keyPrefix = rawKey.slice(0, 11)

    const { data: newKey, error: insertErr } = await admin
      .from('agent_api_keys')
      .insert({
        profile_id: agent.profile_id,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        name: name || 'Default',
        scopes: ['agent:read', 'agent:write'],
        is_active: true,
        rotated_from: action === 'rotate' ? key_id : null,
      })
      .select('id, key_prefix')
      .single()

    if (insertErr) {
      console.error('[agent/keys] Insert error:', insertErr.message)
      return NextResponse.json({ error: 'Failed to create key' }, { status: 500 })
    }

    // Fire event
    await fireAgentEvent(admin, {
      profile_id: agent.profile_id,
      api_key_id: newKey.id,
      event_type: action === 'rotate' ? 'key_rotated' : 'key_created',
      message: action === 'rotate'
        ? `API key rotated. Old key ${key_id} revoked.`
        : `New API key created: ${keyPrefix}...`,
    })

    return NextResponse.json({
      api_key: rawKey,
      id: newKey.id,
      key_prefix: newKey.key_prefix,
    })
  } catch (err) {
    console.error('[agent/keys] POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/agent/keys — Revoke a key
 * Body: { key_id: string, reason?: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const agent = await getAgentProfile(request)
    if (!agent) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { key_id, reason } = body

    if (!key_id) {
      return NextResponse.json({ error: 'key_id is required' }, { status: 400 })
    }

    const admin = getAdmin()
    const { error } = await admin
      .from('agent_api_keys')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoke_reason: reason || null,
      })
      .eq('id', key_id)
      .eq('profile_id', agent.profile_id)

    if (error) {
      console.error('[agent/keys] Revoke error:', error.message)
      return NextResponse.json({ error: 'Failed to revoke key' }, { status: 500 })
    }

    await fireAgentEvent(admin, {
      profile_id: agent.profile_id,
      api_key_id: key_id,
      event_type: 'key_revoked',
      message: `API key revoked.${reason ? ` Reason: ${reason}` : ''}`,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[agent/keys] DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
