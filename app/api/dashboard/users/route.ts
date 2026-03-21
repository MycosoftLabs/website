import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth/api-auth'
import { createClient } from '@/lib/supabase/server'

const MACHINE_ACCOUNTS = [
  { id: 'machine-myca', email: 'myca@system.mycosoft.org', full_name: 'MYCA Orchestrator', role: 'admin', subscription_tier: 'enterprise', type: 'machine' as const },
  { id: 'machine-cursor', email: 'cursor@system.mycosoft.org', full_name: 'Cursor AI Agent', role: 'admin', subscription_tier: 'enterprise', type: 'machine' as const },
  { id: 'machine-claude', email: 'claude@system.mycosoft.org', full_name: 'Claude API', role: 'admin', subscription_tier: 'enterprise', type: 'machine' as const },
  { id: 'machine-openai', email: 'openai@system.mycosoft.org', full_name: 'OpenAI GPT-4', role: 'user', subscription_tier: 'enterprise', type: 'machine' as const },
  { id: 'machine-grok', email: 'grok@system.mycosoft.org', full_name: 'Grok xAI', role: 'user', subscription_tier: 'enterprise', type: 'machine' as const },
  { id: 'machine-n8n', email: 'n8n@system.mycosoft.org', full_name: 'N8N Automation', role: 'user', subscription_tier: 'enterprise', type: 'machine' as const },
  { id: 'machine-discord', email: 'discord@system.mycosoft.org', full_name: 'Discord Bot', role: 'user', subscription_tier: 'free', type: 'machine' as const },
  { id: 'machine-mycobrain', email: 'mycobrain@system.mycosoft.org', full_name: 'MycoBrain Device Auth', role: 'user', subscription_tier: 'enterprise', type: 'machine' as const },
  { id: 'machine-mindex', email: 'mindex@system.mycosoft.org', full_name: 'MINDEX Indexer', role: 'user', subscription_tier: 'enterprise', type: 'machine' as const },
]

export async function GET() {
  const auth = await requireOwner()
  if (auth.error) return auth.error

  const supabase = await createClient()

  // Fetch human users from profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, subscription_tier, avatar_url, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }

  const humanUsers = (profiles || []).map(p => ({
    ...p,
    is_banned: false,
    type: 'human' as const,
    last_sign_in_at: null,
  }))

  const machineUsers = MACHINE_ACCOUNTS.map(m => ({
    ...m,
    avatar_url: null,
    created_at: '2025-01-01T00:00:00Z',
    is_banned: false,
    last_sign_in_at: null,
  }))

  return NextResponse.json({
    users: [...humanUsers, ...machineUsers],
  })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireOwner()
  if (auth.error) return auth.error

  const body = await request.json()
  const { userId, role, is_banned } = body

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  // Don't allow changes to machine accounts through this endpoint
  if (userId.startsWith('machine-')) {
    return NextResponse.json({ error: 'Cannot modify machine accounts' }, { status: 400 })
  }

  const supabase = await createClient()

  const updates: Record<string, unknown> = {}
  if (role !== undefined) updates.role = role
  if (is_banned !== undefined) updates.is_banned = is_banned

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)

  if (error) {
    return NextResponse.json({ error: 'Failed to update user: ' + error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
