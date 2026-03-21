import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth/api-auth'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const auth = await requireOwner()
  if (auth.error) return auth.error

  const body = await request.json()
  const { active } = body

  if (typeof active !== 'boolean') {
    return NextResponse.json({ error: 'active must be a boolean' }, { status: 400 })
  }

  const supabase = await createClient()

  const value = active
    ? { active: true, activatedAt: new Date().toISOString(), activatedBy: auth.user.email }
    : { active: false, activatedAt: null, activatedBy: null }

  const { error } = await supabase
    .from('site_settings')
    .upsert(
      { key: 'kill_switch', value, updated_at: new Date().toISOString(), updated_by: auth.user.id },
      { onConflict: 'key' }
    )

  if (error) {
    return NextResponse.json({ error: 'Failed to update kill switch: ' + error.message }, { status: 500 })
  }

  return NextResponse.json({ killSwitch: value })
}
