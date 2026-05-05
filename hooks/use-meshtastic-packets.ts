"use client"

import useSWR from "swr"

import type { MeshtasticPacketRow, MeshtasticPacketsResponse } from "@/lib/meshtastic/types"

export function meshtasticPacketsSwrKey(limit: number) {
  return `/api/meshtastic/packets?limit=${limit}`
}

async function fetchPackets(url: string): Promise<MeshtasticPacketRow[]> {
  const res = await fetch(url, { cache: "no-store" })
  const body = (await res.json()) as MeshtasticPacketsResponse & { error?: string }
  if (!res.ok) {
    const err = new Error(body.error || `http_${res.status}`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return body.items ?? []
}

export interface UseMeshtasticPacketsOptions {
  limit?: number
  enabled?: boolean
}

export function useMeshtasticPackets(options: UseMeshtasticPacketsOptions = {}) {
  const { limit = 800, enabled = true } = options
  const key = enabled ? meshtasticPacketsSwrKey(limit) : null

  const swr = useSWR<MeshtasticPacketRow[]>(key, fetchPackets, {
    dedupingInterval: 10_000,
    revalidateOnFocus: false,
    refreshInterval: 15_000,
    keepPreviousData: true,
    errorRetryInterval: 8_000,
  })

  const errorMessage =
    swr.error instanceof Error ? swr.error.message : swr.error ? String(swr.error) : null

  return {
    packets: swr.data ?? [],
    error: errorMessage,
    isLoading: swr.isLoading,
    isValidating: swr.isValidating,
    mutate: swr.mutate,
  }
}
