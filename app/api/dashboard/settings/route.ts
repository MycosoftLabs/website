import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth/api-auth'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const auth = await requireOwner()
  if (auth.error) return auth.error

  const supabase = await createClient()

  const { data } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'site_config')
    .single()

  return NextResponse.json({ settings: data?.value ?? {} })
}

export async function PUT(request: NextRequest) {
  const auth = await requireOwner()
  if (auth.error) return auth.error

  const body = await request.json()
  const { settings } = body

  if (!settings || typeof settings !== 'object') {
    return NextResponse.json({ error: 'settings object is required' }, { status: 400 })
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('site_settings')
    .upsert(
      { key: 'site_config', value: settings, updated_at: new Date().toISOString(), updated_by: auth.user.id },
      { onConflict: 'key' }
    )

  if (error) {
    return NextResponse.json({ error: 'Failed to save settings: ' + error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
