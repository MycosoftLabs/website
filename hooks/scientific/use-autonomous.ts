'use client'

import useSWR from 'swr'
import { useCallback } from 'react'

interface AutoExperiment {
  id: string
  name: string
  hypothesis: string
  status: 'planning' | 'running' | 'paused' | 'completed' | 'failed'
  currentStep: number
  totalSteps: number
  progress: number
  startedAt?: string
  adaptations: number
}

interface ExperimentStep {
  id: string
  name: string
  type: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  duration?: number
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export function useAutonomousExperiments() {
  const { data, error, isLoading, mutate } = useSWR<{ experiments: AutoExperiment[], steps: ExperimentStep[] }>(
    '/api/autonomous/experiments',
    fetcher,
    { refreshInterval: 5000, revalidateOnFocus: true }
  )

  const createExperiment = useCallback(async (hypothesis: string) => {
    const res = await fetch('/api/autonomous/experiments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hypothesis }),
    })
    if (!res.ok) throw new Error('Failed to create experiment')
    const result = await res.json()
    await mutate()
    return result
  }, [mutate])

  const controlExperiment = useCallback(async (id: string, action: 'start' | 'pause' | 'stop' | 'reset') => {
    const res = await fetch(\/api/autonomous/experiments/\/\\, { method: 'POST' })
    if (!res.ok) throw new Error(\Failed to \ experiment\)
    const result = await res.json()
    await mutate()
    return result
  }, [mutate])

  const getSteps = useCallback(async (experimentId: string) => {
    const res = await fetch(\/api/autonomous/experiments/\/steps\)
    if (!res.ok) throw new Error('Failed to fetch steps')
    return res.json()
  }, [])

  return {
    experiments: data?.experiments || [],
    steps: data?.steps || [],
    isLoading,
    error,
    isLive: !error,
    createExperiment,
    controlExperiment,
    getSteps,
    refresh: () => mutate(),
  }
}
