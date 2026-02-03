'use client'

import useSWR from 'swr'
import { useCallback } from 'react'

interface FCISession {
  id: string
  species: string
  strain?: string
  status: 'recording' | 'stimulating' | 'idle' | 'paused'
  duration: number
  electrodesActive: number
  totalElectrodes: number
  sampleRate: number
}

interface ElectrodeStatus {
  index: number
  active: boolean
  impedance: number
  signal: number
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useFCI() {
  const { data, error, isLoading, mutate } = useSWR<{
    sessions: FCISession[]
    electrodeStatus: ElectrodeStatus[]
    signalQuality: number
    source: string
  }>(
    '/api/bio/fci',
    fetcher,
    { refreshInterval: 2000 }
  )

  const startSession = useCallback(async (species: string, strain?: string) => {
    try {
      const response = await fetch('/api/bio/fci', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ species, strain }),
      })
      if (response.ok) {
        mutate()
        return await response.json()
      }
    } catch (error) {
      console.error('Failed to start FCI session:', error)
    }
    return null
  }, [mutate])

  const controlSession = useCallback(async (id: string, action: 'start' | 'pause' | 'stop' | 'stimulate') => {
    try {
      await fetch(`/api/bio/fci/${id}/${action}`, { method: 'POST' })
      mutate()
    } catch (error) {
      console.error(`Failed to ${action} session:`, error)
    }
  }, [mutate])

  return {
    sessions: data?.sessions || [],
    electrodeStatus: data?.electrodeStatus || [],
    signalQuality: data?.signalQuality || 0,
    isLive: data?.source === 'live',
    isLoading,
    error,
    startSession,
    controlSession,
    refresh: mutate,
  }
}
