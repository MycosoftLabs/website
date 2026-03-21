import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth/api-auth'
import { createClient } from '@/lib/supabase/server'
import { ALL_ROUTES } from '@/lib/access/routes'

export async function GET() {
  const auth = await requireOwner()
  if (auth.error) return auth.error

  const supabase = await createClient()

  // Load gate overrides from site_settings
  const { data: settingsData } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'gate_overrides')
    .single()

  const overrides: Record<string, { gate: string; overriddenAt: string }> = settingsData?.value ?? {}

  const routes = ALL_ROUTES.map(route => {
    const override = overrides[route.path]
    return {
      path: route.path,
      description: route.description,
      defaultGate: route.gate,
      currentGate: override ? override.gate : route.gate,
      isOverridden: !!override,
      overriddenAt: override?.overriddenAt,
    }
  })

  return NextResponse.json({ routes })
}

export async function PUT(request: NextRequest) {
  const auth = await requireOwner()
  if (auth.error) return auth.error

  const body = await request.json()

  const supabase = await createClient()

  // Reset all overrides
  if (body.resetAll) {
    const { error } = await supabase
      .from('site_settings')
      .upsert(
        { key: 'gate_overrides', value: {}, updated_at: new Date().toISOString(), updated_by: auth.user.id },
        { onConflict: 'key' }
      )

    if (error) {
      return NextResponse.json({ error: 'Failed to reset gates' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  // Update single route gate
  const { path, gate } = body

  if (!path || !gate) {
    return NextResponse.json({ error: 'path and gate are required' }, { status: 400 })
  }

  const validGates = ['PUBLIC', 'FREEMIUM', 'AUTHENTICATED', 'PREMIUM', 'COMPANY', 'ADMIN', 'SUPER_ADMIN']
  if (!validGates.includes(gate)) {
    return NextResponse.json({ error: 'Invalid gate level' }, { status: 400 })
  }

  // Load current overrides
  const { data: settingsData } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'gate_overrides')
    .single()

  const overrides: Record<string, { gate: string; overriddenAt: string }> = settingsData?.value ?? {}

  // Check if this matches the default gate — if so, remove the override
  const route = ALL_ROUTES.find(r => r.path === path)
  if (route && route.gate === gate) {
    delete overrides[path]
  } else {
    overrides[path] = { gate, overriddenAt: new Date().toISOString() }
  }

  const { error } = await supabase
    .from('site_settings')
    .upsert(
      { key: 'gate_overrides', value: overrides, updated_at: new Date().toISOString(), updated_by: auth.user.id },
      { onConflict: 'key' }
    )

  if (error) {
    return NextResponse.json({ error: 'Failed to update gate: ' + error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
