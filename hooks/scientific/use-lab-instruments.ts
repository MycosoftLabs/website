'use client'

import useSWR from 'swr'
import { useCallback } from 'react'

interface Instrument {
  id: string
  name: string
  type: string
  status: 'online' | 'offline' | 'busy' | 'maintenance'
  temperature?: number
  humidity?: number
  currentTask?: string
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useLabInstruments() {
  const { data, error, isLoading, mutate } = useSWR<{ instruments: Instrument[]; source: string }>(
    '/api/scientific/lab',
    fetcher,
    { refreshInterval: 5000 }
  )

  const calibrate = useCallback(async (instrumentId: string) => {
    try {
      await fetch(`/api/scientific/lab/${instrumentId}/calibrate`, { method: 'POST' })
      mutate()
    } catch (error) {
      console.error('Failed to calibrate instrument:', error)
    }
  }, [mutate])

  const addInstrument = useCallback(async (instrument: Partial<Instrument>) => {
    try {
      const response = await fetch('/api/scientific/lab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(instrument),
      })
      if (response.ok) {
        mutate()
        return await response.json()
      }
    } catch (error) {
      console.error('Failed to add instrument:', error)
    }
    return null
  }, [mutate])

  return {
    instruments: data?.instruments || [],
    isLive: data?.source === 'live',
    isLoading,
    error,
    calibrate,
    addInstrument,
    refresh: mutate,
  }
}
