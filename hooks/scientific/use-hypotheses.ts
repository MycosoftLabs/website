'use client'

import useSWR from 'swr'
import { useCallback } from 'react'

interface Hypothesis {
  id: string
  statement: string
  status: 'proposed' | 'testing' | 'validated' | 'rejected'
  confidence?: number
  experiments?: string[]
}

interface HypothesesStats {
  proposed: number
  testing: number
  validated: number
  rejected: number
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useHypotheses() {
  const { data, error, isLoading, mutate } = useSWR<{
    hypotheses: Hypothesis[]
    stats: HypothesesStats
    source: string
  }>(
    '/api/scientific/hypotheses',
    fetcher,
    { refreshInterval: 10000 }
  )

  const createHypothesis = useCallback(async (statement: string) => {
    try {
      const response = await fetch('/api/scientific/hypotheses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statement }),
      })
      if (response.ok) {
        mutate()
        return await response.json()
      }
    } catch (error) {
      console.error('Failed to create hypothesis:', error)
    }
    return null
  }, [mutate])

  const testHypothesis = useCallback(async (id: string) => {
    try {
      await fetch(`/api/scientific/hypotheses/${id}/test`, { method: 'POST' })
      mutate()
    } catch (error) {
      console.error('Failed to test hypothesis:', error)
    }
  }, [mutate])

  return {
    hypotheses: data?.hypotheses || [],
    stats: data?.stats || { proposed: 0, testing: 0, validated: 0, rejected: 0 },
    isLive: data?.source === 'live',
    isLoading,
    error,
    createHypothesis,
    testHypothesis,
    refresh: mutate,
  }
}
