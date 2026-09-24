/**
 * NLM product data hooks — Supabase/MINDEX/MAS BFF only.
 * Firebase is banned on the NLM product path (plan P0).
 * Missing sensors / rows → empty arrays, never fabricated metrics.
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSupabaseAuth } from './supabase-auth-hooks'

const BASE = '/api/natureos/nlm-training'

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(path, { cache: 'no-store', ...init })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

function usePoll<T>(
  loader: () => Promise<T>,
  deps: unknown[],
  intervalMs = 15000,
  refreshEvent = 'nlm-models-refresh'
): { data: T; loading: boolean; reload: () => void } {
  const [data, setData] = useState<T>(null as unknown as T)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    let cancelled = false
    ;(async () => {
      try {
        const next = await loader()
        if (!cancelled) setData(next)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, deps)

  useEffect(() => {
    const cancel = reload()
    const interval = window.setInterval(() => {
      void loader().then(setData)
    }, intervalMs)
    const onRefresh = () => {
      void loader().then(setData)
    }
    window.addEventListener(refreshEvent, onRefresh)
    return () => {
      cancel?.()
      window.clearInterval(interval)
      window.removeEventListener(refreshEvent, onRefresh)
    }
  }, [reload, intervalMs, refreshEvent, loader])

  return { data, loading, reload: () => void loader().then(setData) }
}

/** Auth: Supabase only (Firebase auth removed). */
export function useAuth() {
  const { user, loading } = useSupabaseAuth()
  return { user, loading }
}

export function useModels(userId: string | undefined, _isAdmin?: boolean) {
  const [models, setModels] = useState<any[]>([])
  const [loadedUserId, setLoadedUserId] = useState<string | undefined>(undefined)
  const loading = loadedUserId === undefined

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await fetchJson<{ models?: any[] }>(`${BASE}/models`)
        if (!cancelled) setModels(Array.isArray(data?.models) ? data!.models : [])
      } catch {
        if (!cancelled) setModels([])
      } finally {
        if (!cancelled) setLoadedUserId(userId || 'anonymous')
      }
    }
    load()
    const interval = window.setInterval(load, 15000)
    const onRefresh = () => {
      void load()
    }
    window.addEventListener('nlm-models-refresh', onRefresh)
    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener('nlm-models-refresh', onRefresh)
    }
  }, [userId, _isAdmin])

  return { models, loading }
}

/** Firestore models path retired — same as useModels. */
export function useFirestoreModels(userId: string | undefined, isAdmin?: boolean) {
  return useModels(userId, isAdmin)
}

export function useModel(modelId: string | undefined) {
  const [model, setModel] = useState<any>(null)
  const [loadedModelId, setLoadedModelId] = useState<string | undefined>(undefined)
  const loading = modelId ? modelId !== loadedModelId : false

  useEffect(() => {
    if (!modelId) return
    let cancelled = false
    const load = async () => {
      const data = await fetchJson<{ model?: any; models?: any[] }>(
        `${BASE}/models/${encodeURIComponent(modelId)}`
      )
      if (cancelled) return
      if (data?.model) setModel(data.model)
      else if (Array.isArray(data?.models)) {
        setModel(data.models.find((m) => m.id === modelId) || null)
      } else {
        const list = await fetchJson<{ models?: any[] }>(`${BASE}/models`)
        setModel(list?.models?.find((m) => m.id === modelId) || null)
      }
      setLoadedModelId(modelId)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [modelId])

  return { model, loading }
}

export function useTrainingRuns(modelId: string | undefined, _userId?: string, _isAdmin?: boolean) {
  const [runs, setRuns] = useState<any[]>([])
  const [loadedModelId, setLoadedModelId] = useState<string | undefined>(undefined)
  const loading = modelId ? modelId !== loadedModelId : false

  useEffect(() => {
    if (!modelId) return
    let cancelled = false
    const load = async () => {
      const qs = new URLSearchParams({ modelId, limit: '20' })
      const data = await fetchJson<{ runs?: any[] }>(`${BASE}/runs?${qs}`)
      if (!cancelled) {
        setRuns(Array.isArray(data?.runs) ? data!.runs : [])
        setLoadedModelId(modelId)
      }
    }
    void load()
    const interval = window.setInterval(load, 10000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [modelId])

  return { runs, loading }
}

export function useAllTrainingRuns(userId: string | undefined, _isAdmin?: boolean) {
  const [runs, setRuns] = useState<any[]>([])
  const [loadedUserId, setLoadedUserId] = useState<string | undefined>(undefined)
  const loading = userId ? userId !== loadedUserId : false

  useEffect(() => {
    if (!userId) {
      setRuns([])
      setLoadedUserId(undefined)
      return
    }
    let cancelled = false
    const load = async () => {
      const data = await fetchJson<{ runs?: any[] }>(`${BASE}/runs?limit=20`)
      if (!cancelled) {
        setRuns(Array.isArray(data?.runs) ? data!.runs : [])
        setLoadedUserId(userId)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [userId])

  return { runs, loading }
}

export function useTrainingRun(runId: string | undefined) {
  const [run, setRun] = useState<any>(null)
  const [loadedRunId, setLoadedRunId] = useState<string | undefined>(undefined)
  const loading = runId ? runId !== loadedRunId : false

  useEffect(() => {
    if (!runId) return
    let cancelled = false
    const load = async () => {
      const data = await fetchJson<{ run?: any }>(`${BASE}/runs/${encodeURIComponent(runId)}`)
      if (!cancelled) {
        setRun(data?.run || null)
        setLoadedRunId(runId)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [runId])

  return { run, loading }
}

export function useFrames(modelId: string | undefined) {
  const [frames, setFrames] = useState<any[]>([])
  const [loadedModelId, setLoadedModelId] = useState<string | undefined>(undefined)
  const loading = modelId ? modelId !== loadedModelId : false

  useEffect(() => {
    if (!modelId) return
    let cancelled = false
    const load = async () => {
      const data = await fetchJson<{ frames?: any[]; items?: any[] }>(
        `${BASE}/mindex?modelId=${encodeURIComponent(modelId)}&limit=50`
      )
      if (!cancelled) {
        const rows = data?.frames || data?.items || (Array.isArray(data) ? data : [])
        setFrames(Array.isArray(rows) ? rows : [])
        setLoadedModelId(modelId)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [modelId])

  return { frames, loading }
}

export function useAllFrames(_userId?: string, _isAdmin?: boolean) {
  const [frames, setFrames] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const data = await fetchJson<{ frames?: any[]; items?: any[] } | any[]>(
        `${BASE}/mindex?limit=50`
      )
      if (cancelled) return
      if (Array.isArray(data)) setFrames(data)
      else setFrames(data?.frames || data?.items || [])
      setLoading(false)
    }
    void load()
    const interval = window.setInterval(load, 15000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [_userId, _isAdmin])

  return { frames, loading }
}

export function useFingerprints(frameRoot: string | undefined) {
  const [fingerprints, setFingerprints] = useState<any[]>([])
  const [loadedRoot, setLoadedRoot] = useState<string | undefined>(undefined)
  const loading = frameRoot ? frameRoot !== loadedRoot : false

  useEffect(() => {
    if (!frameRoot) return
    let cancelled = false
    const load = async () => {
      const data = await fetchJson<{ fingerprints?: any[] }>(
        `${BASE}/mindex?frameRoot=${encodeURIComponent(frameRoot)}&type=fingerprint`
      )
      if (!cancelled) {
        setFingerprints(Array.isArray(data?.fingerprints) ? data!.fingerprints : [])
        setLoadedRoot(frameRoot)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [frameRoot])

  return { fingerprints, loading }
}

export function useVariants(userId?: string, _isAdmin?: boolean) {
  const [variants, setVariants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await fetchJson<{ variants?: any[] }>(`${BASE}/variants`)
        if (!cancelled) setVariants(Array.isArray(data?.variants) ? data!.variants : [])
      } catch {
        if (!cancelled) setVariants([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const interval = window.setInterval(load, 15000)
    const onRefresh = () => {
      void load()
    }
    window.addEventListener('nlm-models-refresh', onRefresh)
    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener('nlm-models-refresh', onRefresh)
    }
  }, [userId, _isAdmin])

  return { variants, loading }
}

/** Empty-safe: no Firebase judgments store. */
export function useJudgments(_targetId: string | undefined, _userId?: string, _isAdmin?: boolean) {
  const [judgments] = useState<any[]>([])
  const [loading] = useState(false)
  return { judgments, loading }
}

export function usePipelines(userId: string | undefined, _isAdmin?: boolean) {
  const [pipelines, setPipelines] = useState<any[]>([])
  const [loadedUserId, setLoadedUserId] = useState<string | undefined>(undefined)
  const loading = userId ? userId !== loadedUserId : false

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    const load = async () => {
      const data = await fetchJson<{ pipelines?: any[]; runs?: any[] }>(`${BASE}/runs?limit=20`)
      if (cancelled) return
      // Map training runs into pipeline-like rows when dedicated pipelines table absent
      const runs = data?.pipelines || data?.runs || []
      setPipelines(
        runs.map((r: any) => ({
          id: r.id || r.pipelineId,
          name: r.name || `Run ${r.id?.slice?.(0, 8) || '—'}`,
          status: r.status || 'idle',
          ownerId: r.ownerId,
          modelId: r.modelId,
          ...r,
        }))
      )
      setLoadedUserId(userId)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [userId])

  return { pipelines, loading }
}

export function useCheckpoints(modelId: string | undefined) {
  const [checkpoints, setCheckpoints] = useState<any[]>([])
  const [loadedModelId, setLoadedModelId] = useState<string | undefined>(undefined)
  const loading = modelId ? modelId !== loadedModelId : false

  useEffect(() => {
    if (!modelId) return
    let cancelled = false
    ;(async () => {
      const data = await fetchJson<{ checkpoints?: any[] }>(
        `${BASE}/runs?modelId=${encodeURIComponent(modelId)}&limit=20`
      )
      if (!cancelled) {
        setCheckpoints(Array.isArray(data?.checkpoints) ? data!.checkpoints : [])
        setLoadedModelId(modelId)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [modelId])

  return { checkpoints, loading }
}

export function useMutations(modelId: string | undefined) {
  const [mutations] = useState<any[]>([])
  const loadedModelId = modelId
  const loading = false
  void loadedModelId
  return { mutations, loading }
}

export function useCognitiveGraphs(modelId: string | undefined, _frameId?: string) {
  const [graphs] = useState<any[]>([])
  const loading = false
  void modelId
  return { graphs, loading }
}

export function useMutationRecipes(userId: string | undefined, _isAdmin?: boolean) {
  const [recipes] = useState<any[]>([])
  const loading = false
  void userId
  return { recipes, loading }
}

export function useModelVersions(modelId: string | undefined) {
  const [versions] = useState<any[]>([])
  const loading = false
  void modelId
  return { versions, loading }
}

/** Agents from MAS registry when available; else empty. */
export function useAgents(userId: string | undefined, _isAdmin?: boolean) {
  const [agents, setAgents] = useState<any[]>([])
  const [loadedUserId, setLoadedUserId] = useState<string | undefined>(undefined)
  const loading = userId ? userId !== loadedUserId : false

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    ;(async () => {
      const data = await fetchJson<{ agents?: any[] }>('/api/agents')
      if (!cancelled) {
        setAgents(Array.isArray(data?.agents) ? data!.agents : [])
        setLoadedUserId(userId)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  return { agents, loading }
}

export function useAgentTasks(userId: string | undefined, agentId?: string, _isAdmin?: boolean) {
  const [tasks, setTasks] = useState<any[]>([])
  const [loadedKey, setLoadedKey] = useState<string | undefined>(undefined)
  const currentKey = userId ? `${userId}-${agentId || ''}` : undefined
  const loading = currentKey ? currentKey !== loadedKey : false

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    ;(async () => {
      const qs = agentId ? `?agentId=${encodeURIComponent(agentId)}` : ''
      const data = await fetchJson<{ tasks?: any[] }>(`/api/agents/tasks${qs}`)
      if (!cancelled) {
        setTasks(Array.isArray(data?.tasks) ? data!.tasks : [])
        setLoadedKey(currentKey)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId, agentId, currentKey])

  return { tasks, loading }
}

export function useAutomationPolicies(userId: string | undefined, _isAdmin?: boolean) {
  const [policies] = useState<any[]>([])
  const loading = false
  void userId
  return { policies, loading }
}

/** Live ingest devices — empty when no MycoBrain/MAS devices. */
export function useLiveIngest() {
  const [devices, setDevices] = useState<any[]>([])
  const [sensors, setSensors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<'empty' | 'live'>('empty')
  const [networkMapHref, setNetworkMapHref] = useState('/natureos/devices/network')
  const [note, setNote] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const data = await fetchJson<{
        devices?: any[]
        sensors?: any[]
        source?: string
        note?: string
        network_map_href?: string
      }>(`${BASE}/ingest/live`)
      if (cancelled) return
      setDevices(Array.isArray(data?.devices) ? data!.devices : [])
      setSensors(Array.isArray(data?.sensors) ? data!.sensors : [])
      setSource(data?.source === 'live' ? 'live' : 'empty')
      if (data?.network_map_href) setNetworkMapHref(data.network_map_href)
      setNote(data?.note || '')
      setLoading(false)
    }
    void load()
    const interval = window.setInterval(load, 10000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  return { devices, sensors, loading, source, networkMapHref, note }
}
