import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth/api-auth'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const auth = await requireOwner()
  if (auth.error) return auth.error

  const supabase = await createClient()

  // Get lockdown and kill-switch status
  const { data: settings } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', ['lockdown', 'kill_switch'])

  const lockdownSetting = settings?.find(s => s.key === 'lockdown')
  const killSwitchSetting = settings?.find(s => s.key === 'kill_switch')

  // Get security status
  let securityData = { threatLevel: 'low', eventsToday: 0, criticalEvents: 0, failedLogins24h: 0, blockedIps: 0, activeSessions: 0 }
  try {
    const secRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/security?action=status`, {
      cache: 'no-store',
    })
    if (secRes.ok) {
      const data = await secRes.json()
      securityData = {
        threatLevel: data.threatLevel || data.threat_level || 'low',
        eventsToday: data.eventsToday || data.events_today || 0,
        criticalEvents: data.criticalEvents || data.critical_events || 0,
        failedLogins24h: data.failedLogins24h || data.failed_logins_24h || 0,
        blockedIps: data.blockedIps || data.blocked_ips || 0,
        activeSessions: data.activeSessions || data.active_sessions || 0,
      }
    }
  } catch {
    // Security endpoint may not be available
  }

  return NextResponse.json({
    lockdown: {
      active: lockdownSetting?.value?.active ?? false,
      activatedAt: lockdownSetting?.value?.activatedAt ?? null,
      activatedBy: lockdownSetting?.value?.activatedBy ?? null,
    },
    killSwitch: {
      active: killSwitchSetting?.value?.active ?? false,
      activatedAt: killSwitchSetting?.value?.activatedAt ?? null,
    },
    ...securityData,
  })
}

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

  // Upsert the lockdown setting
  const { error } = await supabase
    .from('site_settings')
    .upsert(
      { key: 'lockdown', value, updated_at: new Date().toISOString(), updated_by: auth.user.id },
      { onConflict: 'key' }
    )

  if (error) {
    return NextResponse.json({ error: 'Failed to update lockdown: ' + error.message }, { status: 500 })
  }

  return NextResponse.json({ lockdown: value })
}
