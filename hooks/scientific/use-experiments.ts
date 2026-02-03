'use client'

import useSWR from 'swr'
import { useCallback } from 'react'

interface Experiment {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  currentStep: number
  totalSteps: number
  startedAt?: string
}

interface ExperimentStats {
  running: number
  pending: number
  completed: number
  failed: number
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useExperiments() {
  const { data, error, isLoading, mutate } = useSWR<{
    experiments: Experiment[]
    stats: ExperimentStats
    source: string
  }>(
    '/api/scientific/experiments',
    fetcher,
    { refreshInterval: 5000 }
  )

  const createExperiment = useCallback(async (name: string, parameters: Record<string, unknown>) => {
    try {
      const response = await fetch('/api/scientific/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parameters }),
      })
      if (response.ok) {
        mutate()
        return await response.json()
      }
    } catch (error) {
      console.error('Failed to create experiment:', error)
    }
    return null
  }, [mutate])

  const controlExperiment = useCallback(async (id: string, action: 'start' | 'pause' | 'cancel') => {
    try {
      await fetch(`/api/scientific/experiments/${id}/${action}`, { method: 'POST' })
      mutate()
    } catch (error) {
      console.error(`Failed to ${action} experiment:`, error)
    }
  }, [mutate])

  return {
    experiments: data?.experiments || [],
    stats: data?.stats || { running: 0, pending: 0, completed: 0, failed: 0 },
    isLive: data?.source === 'live',
    isLoading,
    error,
    createExperiment,
    controlExperiment,
    refresh: mutate,
  }
}
