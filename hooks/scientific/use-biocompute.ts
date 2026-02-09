'use client'

import useSWR from 'swr'
import { useCallback } from 'react'

interface ComputeJob {
  id: string
  mode: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  priority: string
  processingTime?: number
  confidence?: number
  submittedAt: string
}

interface DNAStorageItem {
  id: string
  name: string
  size: number
  storedAt: string
  verified: boolean
}

interface MycoBrainStats {
  status: string
  health: number
  activeJobs: number
  queuedJobs: number
  completedToday: number
  avgProcessingTime: number
  temperature: number
  humidity: number
  nodeCount: number
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export function useBioCompute() {
  const { data, error, isLoading, mutate } = useSWR<{ stats: MycoBrainStats, jobs: ComputeJob[], storage: DNAStorageItem[] }>(
    '/api/bio/mycobrain',
    fetcher,
    { refreshInterval: 3000, revalidateOnFocus: true }
  )

  const submitJob = useCallback(async (mode: string, input: string) => {
    const res = await fetch('/api/bio/mycobrain/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, input }),
    })
    if (!res.ok) throw new Error('Failed to submit job')
    const result = await res.json()
    await mutate()
    return result
  }, [mutate])

  const storeData = useCallback(async (name: string, data: string) => {
    const res = await fetch('/api/bio/dna-storage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, data }),
    })
    if (!res.ok) throw new Error('Failed to store data')
    const result = await res.json()
    await mutate()
    return result
  }, [mutate])

  const retrieveData = useCallback(async (id: string) => {
    const res = await fetch(`/api/bio/dna-storage/${id}`)
    if (!res.ok) throw new Error('Failed to retrieve data')
    return res.json()
  }, [])

  return {
    stats: data?.stats || {
      status: 'offline',
      health: 0,
      activeJobs: 0,
      queuedJobs: 0,
      completedToday: 0,
      avgProcessingTime: 0,
      temperature: 0,
      humidity: 0,
      nodeCount: 0,
    },
    jobs: data?.jobs || [],
    storage: data?.storage || [],
    isLoading,
    error,
    isLive: !error,
    submitJob,
    storeData,
    retrieveData,
    refresh: () => mutate(),
  }
}
