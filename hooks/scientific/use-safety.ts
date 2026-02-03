'use client'

import useSWR from 'swr'

interface SafetyMetric {
  name: string
  value: number
  max: number
  status: 'normal' | 'warning' | 'critical'
}

interface SafetyData {
  overallStatus: string
  metrics: SafetyMetric[]
  source: string
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useSafety() {
  const { data, error, isLoading, mutate } = useSWR<SafetyData>(
    '/api/scientific/safety',
    fetcher,
    { refreshInterval: 5000 }
  )

  return {
    overallStatus: data?.overallStatus || 'unknown',
    metrics: data?.metrics || [],
    isLive: data?.source === 'live',
    isLoading,
    error,
    refresh: mutate,
  }
}
