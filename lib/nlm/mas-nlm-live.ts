import { resolveMasServerBaseUrl } from '@/lib/mas-server-url'
import { masServiceHeaders } from '@/lib/auth/verified-identity'

export interface LiveNlmConsole {
  mas?: {
    reachable?: boolean
    ui_status?: string
    skip_startup?: boolean
    health_note?: string
  }
  nlm?: {
    status?: string
    model_loaded?: boolean
    model_name?: string
    model_version?: string
    display_name?: string
    description?: string
    bound_to_ollama?: boolean
    forecast_qualified?: boolean
    forecast_p?: number | null
    qualification_status?: string
    training_origin?: string
    architecture_family?: string
    weights_sha256?: string
    model_dir?: string
  }
  mindex?: {
    reachable?: boolean
    stats?: Record<string, unknown> | null
    taxa_count?: number | null
    observation_count?: number | null
    compound_count?: number | null
    taxa?: Record<string, unknown>[]
    compounds?: Record<string, unknown>[]
  }
  training?: {
    jobs_available?: boolean
    reason?: string
    active_run_id?: string | null
    runs?: unknown[]
    run_count?: number
  }
  checkpoints?: unknown[]
  bound_to_ollama?: boolean
  forecast_qualified?: boolean
  forecast_p?: number | null
}

export function mindexServiceHeaders(): HeadersInit {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const apiKey = process.env.MINDEX_API_KEY || ''
  const token =
    process.env.MINDEX_INTERNAL_TOKEN ||
    process.env.MAS_INTERNAL_TOKEN ||
    (process.env.MINDEX_INTERNAL_TOKENS || '').split(',')[0] ||
    ''
  if (apiKey) headers['X-API-Key'] = apiKey
  if (token.trim()) headers['X-Internal-Token'] = token.trim()
  return headers
}

export async function fetchJson(
  baseUrl: string,
  paths: string[],
  timeoutMs = 8000,
  headers?: HeadersInit,
): Promise<any | null> {
  const base = baseUrl.replace(/\/$/, '')
  for (const path of paths) {
    try {
      const response = await fetch(`${base}${path}`, {
        headers,
        signal: AbortSignal.timeout(timeoutMs),
        cache: 'no-store',
      })
      if (!response.ok) continue
      return await response.json()
    } catch {
      // try next known path
    }
  }
  return null
}

export async function fetchMasNlmConsole(): Promise<LiveNlmConsole | null> {
  const masBase = resolveMasServerBaseUrl()
  const headers = masServiceHeaders({ Accept: 'application/json' })
  const consolePayload = await fetchJson(
    masBase,
    ['/api/nlm/training/console'],
    15000,
    headers,
  )
  if (consolePayload?.nlm || consolePayload?.mas) {
    return consolePayload
  }

  const [nlmHealth, masHealth] = await Promise.all([
    fetchJson(masBase, ['/api/nlm/health'], 12000, headers),
    fetchJson(masBase, ['/health', '/api/myca/status'], 8000, headers),
  ])
  if (!nlmHealth && !masHealth) return null

  return {
    mas: {
      reachable: Boolean(masHealth),
      ui_status: masHealth ? 'online' : 'offline',
      skip_startup: JSON.stringify(masHealth || {}).includes('MAS_SKIP_BACKGROUND_STARTUP'),
      health_note: masHealth
        ? 'Orchestrator is up. Skip-startup collectors are not a MAS outage.'
        : undefined,
    },
    nlm: nlmHealth
      ? {
          status: nlmHealth.model_loaded ? 'loaded' : nlmHealth.status,
          model_loaded: Boolean(nlmHealth.model_loaded),
          model_name: nlmHealth.model_name || nlmHealth.name || 'nlm',
          model_version: nlmHealth.model_version || nlmHealth.version,
          display_name: nlmHealth.display_name || nlmHealth.model_display_name || 'Nature Learning Model',
          description: nlmHealth.description,
          bound_to_ollama: false,
          forecast_qualified: false,
          forecast_p: null,
          qualification_status: nlmHealth.qualification_status || 'unqualified',
          training_origin: nlmHealth.training_origin,
          architecture_family: nlmHealth.architecture_family,
          weights_sha256: nlmHealth.weights_sha256,
          model_dir: nlmHealth.model_dir,
        }
      : undefined,
    mindex: { reachable: false, taxa: [], compounds: [] },
    training: {
      jobs_available: false,
      reason: 'Training compute is fail-closed on MAS 188. Catalogs and the loaded NLM remain available.',
    },
    bound_to_ollama: false,
    forecast_qualified: false,
    forecast_p: null,
  }
}

export function liveNlmModelCard(nlm: LiveNlmConsole['nlm'] | null | undefined) {
  if (!nlm) return null
  return {
    id: 'nlm-live',
    name: nlm.display_name || nlm.model_name || 'Nature Learning Model',
    description:
      nlm.description ||
      'Live Nature Learning Model on MAS. Not Ollama. Forecast unqualified until calibrated.',
    status: nlm.model_loaded ? 'loaded' : nlm.status || 'unloaded',
    ownerId: 'mas',
    version: nlm.model_version || '0.1.0',
    accuracy: null,
    source: 'mas-nlm',
    config: {
      bound_to_ollama: false,
      forecast_qualified: Boolean(nlm.forecast_qualified),
      forecast_p: nlm.forecast_p ?? null,
      qualification_status: nlm.qualification_status || 'unqualified',
      training_origin: nlm.training_origin || 'none',
      architecture_family: nlm.architecture_family,
      weights_sha256: nlm.weights_sha256,
      model_dir: nlm.model_dir,
    },
    createdAt: null,
    updatedAt: null,
  }
}
