'use client'

import useSWR from 'swr'
import { useCallback } from 'react'

interface Simulation {
  id: string
  name: string
  type: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'paused'
  progress: number
  eta?: string
  gpu?: string
}

interface SimulationConfig {
  type: string
  name: string
  config: Record<string, unknown>
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useSimulations() {
  const { data, error, isLoading, mutate } = useSWR<{
    simulations: Simulation[]
    gpuUtilization: number
    queueLength: number
    source: string
  }>(
    '/api/scientific/simulation',
    fetcher,
    { refreshInterval: 3000 }
  )

  const startSimulation = useCallback(async (config: SimulationConfig) => {
    try {
      const response = await fetch('/api/scientific/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (response.ok) {
        mutate()
        return await response.json()
      }
    } catch (error) {
      console.error('Failed to start simulation:', error)
    }
    return null
  }, [mutate])

  const controlSimulation = useCallback(async (id: string, action: 'pause' | 'resume' | 'cancel') => {
    try {
      await fetch(`/api/scientific/simulation/${id}/${action}`, { method: 'POST' })
      mutate()
    } catch (error) {
      console.error(`Failed to ${action} simulation:`, error)
    }
  }, [mutate])

  return {
    simulations: data?.simulations || [],
    gpuUtilization: data?.gpuUtilization || 0,
    queueLength: data?.queueLength || 0,
    isLive: data?.source === 'live',
    isLoading,
    error,
    startSimulation,
    controlSimulation,
    refresh: mutate,
  }
}
