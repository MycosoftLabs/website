import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth/api-auth'
import { createClient } from '@/lib/supabase/server'
import { API_URLS } from '@/lib/config/api-urls'

interface ServiceDef {
  name: string
  port: number | null
  type: string
  category: string
  description: string
  healthEndpoint?: string
  healthUrl?: string
}

const SERVICES: ServiceDef[] = [
  // Always-On
  { name: 'Website (Next.js)', port: 3000, type: 'Frontend', category: 'Always-On', description: 'Main web application', healthUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/health` },
  { name: 'Supabase Auth', port: null, type: 'Cloud', category: 'Always-On', description: 'Authentication and user management' },
  { name: 'Redis Cache', port: 6379, type: 'Database', category: 'Always-On', description: 'Caching and pub/sub messaging' },
  { name: 'Qdrant Vector DB', port: 6333, type: 'Database', category: 'Always-On', description: 'Vector embeddings for RAG' },
  // MAS Stack
  { name: 'MAS Orchestrator', port: 8001, type: 'API', category: 'MAS Stack', description: 'Multi-Agent System core', healthUrl: `${API_URLS.MAS}/health` },
  { name: 'MINDEX API', port: 8000, type: 'API', category: 'MAS Stack', description: 'Mycological Index Database', healthUrl: `${API_URLS.MINDEX}/health` },
  { name: 'Ollama LLM', port: 11434, type: 'AI', category: 'MAS Stack', description: 'Local LLM inference', healthUrl: `${API_URLS.OLLAMA}/api/tags` },
  { name: 'N8N Workflows', port: 5678, type: 'Automation', category: 'MAS Stack', description: 'Workflow automation engine' },
  { name: 'MYCA Core', port: 8010, type: 'AI', category: 'MAS Stack', description: 'MYCA consciousness engine' },
  { name: 'PersonaPlex Voice', port: 8999, type: 'Voice', category: 'MAS Stack', description: 'Voice synthesis and recognition' },
  { name: 'MycoBrain Hub', port: 8020, type: 'IoT', category: 'MAS Stack', description: 'IoT device management hub' },
  { name: 'SporeBase Monitor', port: 8030, type: 'Monitoring', category: 'MAS Stack', description: 'Environmental monitoring service' },
  { name: 'FCI Engine', port: 8040, type: 'AI', category: 'MAS Stack', description: 'Fungal Chemistry Interface' },
  { name: 'CREP Processor', port: 8050, type: 'API', category: 'MAS Stack', description: 'Common Relevant Environmental Picture' },
  { name: 'AVANI Governance', port: 8060, type: 'API', category: 'MAS Stack', description: 'AI governance and ethics engine' },
  { name: 'Earth Simulator', port: 8070, type: 'AI', category: 'MAS Stack', description: 'Geospatial simulation engine' },
  { name: 'FUSARIUM Engine', port: 8080, type: 'AI', category: 'MAS Stack', description: 'Fungal relationship analysis' },
  { name: 'Mycorrhizae Protocol', port: 8002, type: 'API', category: 'MAS Stack', description: 'API key and service mesh management' },
  // Cloud
  { name: 'Vercel Hosting', port: null, type: 'Cloud', category: 'Cloud', description: 'Production hosting and CDN' },
  { name: 'Cloudflare DNS', port: null, type: 'Cloud', category: 'Cloud', description: 'DNS and edge protection' },
  { name: 'Stripe Payments', port: null, type: 'Cloud', category: 'Cloud', description: 'Payment processing' },
  // Infrastructure
  { name: 'NAS Storage', port: 445, type: 'Storage', category: 'Infrastructure', description: 'Network-attached storage for backups' },
]

export async function GET() {
  const auth = await requireOwner()
  if (auth.error) return auth.error

  const supabase = await createClient()

  // Load service overrides from site_settings
  const { data: settingsData } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'service_config')
    .single()

  const overrides: Record<string, { enabled: boolean }> = settingsData?.value ?? {}

  // Check health of services with URLs (with timeout)
  const healthChecks = await Promise.allSettled(
    SERVICES.filter(s => s.healthUrl).map(async (s) => {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 3000)
        const res = await fetch(s.healthUrl!, { signal: controller.signal, cache: 'no-store' })
        clearTimeout(timeout)
        return { name: s.name, status: res.ok ? 'running' : 'error' }
      } catch {
        return { name: s.name, status: 'stopped' }
      }
    })
  )

  const healthMap: Record<string, string> = {}
  for (const result of healthChecks) {
    if (result.status === 'fulfilled') {
      healthMap[result.value.name] = result.value.status
    }
  }

  const services = SERVICES.map(s => {
    const override = overrides[s.name]
    const enabled = override ? override.enabled : true
    const status = !enabled ? 'stopped' : (healthMap[s.name] || (s.port ? 'running' : 'running'))

    return {
      name: s.name,
      port: s.port,
      status,
      type: s.type,
      category: s.category,
      description: s.description,
      lastChecked: new Date().toISOString(),
      enabled,
    }
  })

  return NextResponse.json({ services })
}

export async function POST(request: NextRequest) {
  const auth = await requireOwner()
  if (auth.error) return auth.error

  const body = await request.json()
  const { name, enabled } = body

  if (!name || typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'name and enabled are required' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: settingsData } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'service_config')
    .single()

  const current: Record<string, { enabled: boolean }> = settingsData?.value ?? {}
  current[name] = { enabled }

  const { error } = await supabase
    .from('site_settings')
    .upsert(
      { key: 'service_config', value: current, updated_at: new Date().toISOString(), updated_by: auth.user.id },
      { onConflict: 'key' }
    )

  if (error) {
    return NextResponse.json({ error: 'Failed to update service config' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
