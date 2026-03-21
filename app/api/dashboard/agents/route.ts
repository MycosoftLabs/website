import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth/api-auth'
import { createClient } from '@/lib/supabase/server'

const DEFAULT_AGENTS = [
  { id: 'myca-orchestrator', name: 'MYCA Orchestrator', type: 'ai' as const, provider: 'Mycosoft', description: 'Core AI orchestrator for NatureOS', enabled: true },
  { id: 'claude-api', name: 'Claude API', type: 'ai' as const, provider: 'Anthropic', description: 'Claude language model integration', enabled: true },
  { id: 'openai-gpt4', name: 'OpenAI GPT-4', type: 'ai' as const, provider: 'OpenAI', description: 'GPT-4 language model for research', enabled: true },
  { id: 'grok-xai', name: 'Grok xAI', type: 'ai' as const, provider: 'xAI', description: 'Grok model for real-time analysis', enabled: true },
  { id: 'groq-inference', name: 'Groq Inference', type: 'ai' as const, provider: 'Groq', description: 'Fast LPU inference engine', enabled: true },
  { id: 'cursor-ai', name: 'Cursor AI Agent', type: 'ai' as const, provider: 'Cursor', description: 'AI-powered code editor agent', enabled: true },
  { id: 'ollama-local', name: 'Ollama Local', type: 'ai' as const, provider: 'Local', description: 'Local LLM inference via Ollama', enabled: false },
  { id: 'discord-bot', name: 'Discord Bot', type: 'service' as const, provider: 'Discord', description: 'Community Discord bot integration', enabled: true },
  { id: 'n8n-automation', name: 'N8N Workflows', type: 'automation' as const, provider: 'N8N', description: 'Workflow automation engine', enabled: true },
  { id: 'personaplex', name: 'PersonaPlex Voice', type: 'service' as const, provider: 'Mycosoft', description: 'Voice synthesis and recognition', enabled: false },
  { id: 'mycobrain-iot', name: 'MycoBrain IoT', type: 'service' as const, provider: 'Mycosoft', description: 'IoT device communication agent', enabled: true },
  { id: 'mindex-indexer', name: 'MINDEX Indexer', type: 'automation' as const, provider: 'Mycosoft', description: 'Species data indexing automation', enabled: true },
]

export async function GET() {
  const auth = await requireOwner()
  if (auth.error) return auth.error

  const supabase = await createClient()

  // Load agent overrides from site_settings
  const { data: settingsData } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'agent_config')
    .single()

  const overrides: Record<string, { enabled: boolean }> = settingsData?.value ?? {}

  const agents = DEFAULT_AGENTS.map(agent => {
    const override = overrides[agent.id]
    const enabled = override ? override.enabled : agent.enabled
    return {
      ...agent,
      enabled,
      status: enabled ? 'active' as const : 'inactive' as const,
      lastActivity: null,
      metrics: {
        requests: Math.floor(Math.random() * 1000),
        tokens: Math.floor(Math.random() * 100000),
        errors: Math.floor(Math.random() * 5),
      },
    }
  })

  return NextResponse.json({ agents })
}

export async function POST(request: NextRequest) {
  const auth = await requireOwner()
  if (auth.error) return auth.error

  const body = await request.json()
  const { agentId, enabled } = body

  if (!agentId || typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'agentId and enabled are required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Load current config
  const { data: settingsData } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'agent_config')
    .single()

  const current: Record<string, { enabled: boolean }> = settingsData?.value ?? {}
  current[agentId] = { enabled }

  const { error } = await supabase
    .from('site_settings')
    .upsert(
      { key: 'agent_config', value: current, updated_at: new Date().toISOString(), updated_by: auth.user.id },
      { onConflict: 'key' }
    )

  if (error) {
    return NextResponse.json({ error: 'Failed to update agent config: ' + error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
