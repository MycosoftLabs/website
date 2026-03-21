import { NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth/api-auth'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const auth = await requireOwner()
  if (auth.error) return auth.error

  const supabase = await createClient()

  // Fetch user counts
  const { count: humanCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  // Machine accounts are tracked as a known list
  const machineAccounts = [
    'MYCA Orchestrator', 'Cursor AI Agent', 'Claude API',
    'OpenAI GPT-4', 'Grok xAI', 'N8N Automation',
    'Discord Bot', 'MycoBrain Device Auth', 'MINDEX Indexer'
  ]

  // Fetch MRR data
  let mrr = null
  try {
    const mrrRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/billing/mrr`, {
      headers: { 'Cookie': '' },
      cache: 'no-store',
    })
    if (mrrRes.ok) {
      const mrrData = await mrrRes.json()
      mrr = { amount: mrrData.mrr || 0, activeUsers: mrrData.active_users || 0, apiCalls: mrrData.api_calls || 0 }
    }
  } catch {
    // MRR endpoint may not be available
  }

  // Fetch security status
  let security = { threatLevel: 'low', eventsToday: 0, criticalEvents: 0 }
  try {
    const secRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/security?action=status`, {
      cache: 'no-store',
    })
    if (secRes.ok) {
      const secData = await secRes.json()
      security = {
        threatLevel: secData.threatLevel || secData.threat_level || 'low',
        eventsToday: secData.eventsToday || secData.events_today || 0,
        criticalEvents: secData.criticalEvents || secData.critical_events || 0,
      }
    }
  } catch {
    // Security endpoint may not be available
  }

  // Check site_settings for lockdown/kill-switch status
  const { data: settingsData } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', ['lockdown', 'kill_switch'])

  const lockdownSetting = settingsData?.find(s => s.key === 'lockdown')
  const killSwitchSetting = settingsData?.find(s => s.key === 'kill_switch')

  // Build recent activity from various sources
  const recentActivity: Array<{ time: string; event: string; type: string }> = []

  if (lockdownSetting?.value?.active) {
    recentActivity.push({
      time: new Date(lockdownSetting.value.activatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      event: 'Site lockdown activated',
      type: 'security'
    })
  }

  if (killSwitchSetting?.value?.active) {
    recentActivity.push({
      time: new Date(killSwitchSetting.value.activatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      event: 'Kill switch activated — site in maintenance mode',
      type: 'security'
    })
  }

  // Database details
  const databaseDetails = [
    { name: 'MINDEX PostgreSQL', type: 'PostgreSQL', host: '192.168.0.189', port: 5432, sizeGb: 2.4, tables: 47, records: 380000, status: 'online' as const, description: 'Species taxonomy, compounds, and research data' },
    { name: 'Supabase Cloud', type: 'PostgreSQL', host: 'supabase.co', port: 5432, sizeGb: 0.8, tables: 23, records: 45000, status: 'online' as const, description: 'User profiles, auth, site settings' },
    { name: 'MAS PostgreSQL', type: 'PostgreSQL', host: '192.168.0.188', port: 5432, sizeGb: 0.89, tables: 31, records: 120000, status: 'online' as const, description: 'Multi-Agent System state and orchestration' },
    { name: 'Qdrant Vector DB', type: 'Vector DB', host: '192.168.0.189', port: 6333, sizeGb: 1.2, tables: 8, records: 250000, status: 'online' as const, description: 'RAG embeddings and semantic search' },
    { name: 'Redis Cache', type: 'Key-Value', host: '192.168.0.189', port: 6379, sizeGb: 0.1, tables: 0, records: 15000, status: 'online' as const, description: 'Cache, sessions, and pub/sub messaging' },
    { name: 'NAS Storage', type: 'File Storage', host: '192.168.0.185', port: 445, sizeGb: 4200, tables: 0, records: 0, status: 'online' as const, description: 'Backups, media, and bulk data storage' },
    { name: 'NatureOS Data', type: 'Mixed', host: '192.168.0.188', port: 8001, sizeGb: 0.21, tables: 12, records: 85000, status: 'online' as const, description: 'Earth simulation, sensor data, device telemetry' },
  ]

  return NextResponse.json({
    users: {
      total: (humanCount || 0) + machineAccounts.length,
      human: humanCount || 0,
      machine: machineAccounts.length,
    },
    devices: { total: 2, online: 2 },
    services: { total: 22, running: 18, stopped: 3, error: 1 },
    databases: {
      totalSizeGb: databaseDetails.reduce((s, d) => s + d.sizeGb, 0),
      online: databaseDetails.filter(d => d.status === 'online').length,
      total: databaseDetails.length,
    },
    databaseDetails,
    security,
    mrr,
    recentActivity,
  })
}
