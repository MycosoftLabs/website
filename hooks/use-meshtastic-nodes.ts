"use client"

import useSWR from "swr"

import type { MeshtasticNodeRow, MeshtasticNodesResponse } from "@/lib/meshtastic/types"

/** Single SWR key so MeshMap, LiveScope, NodeTable share one in-flight request and cache. */
export const MESHTASTIC_NODES_SWR_KEY = "/api/meshtastic/nodes?limit=500"

async function fetchMeshtasticNodes(url: string): Promise<MeshtasticNodeRow[]> {
  const res = await fetch(url, { cache: "no-store" })
  const body = (await res.json()) as MeshtasticNodesResponse & { error?: string }
  if (!res.ok) {
    const err = new Error(body.error || `http_${res.status}`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return body.items ?? []
}

export interface UseMeshtasticNodesOptions {
  /** When false, no fetch (e.g. SSR-only shell). */
  enabled?: boolean
}

export function useMeshtasticNodes(options: UseMeshtasticNodesOptions = {}) {
  const { enabled = true } = options

  const swr = useSWR<MeshtasticNodeRow[]>(
    enabled ? MESHTASTIC_NODES_SWR_KEY : null,
    fetchMeshtasticNodes,
    {
      dedupingInterval: 12_000,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 90_000,
      errorRetryInterval: 8_000,
      keepPreviousData: true,
      onErrorRetry(err, _key, _config, revalidate, { retryCount }) {
        const status = (err as Error & { status?: number }).status
        if (status === 429) {
          const delay = Math.min(90_000, 12_000 * 2 ** Math.min(retryCount, 4))
          setTimeout(() => void revalidate({ retryCount }), delay)
          return
        }
        if (retryCount >= 6) return
        const delay = Math.min(30_000, 2000 * 2 ** retryCount)
        setTimeout(() => void revalidate({ retryCount }), delay)
      },
    }
  )

  const errorMessage =
    swr.error instanceof Error ? swr.error.message : swr.error ? String(swr.error) : null

  return {
    nodes: swr.data ?? [],
    error: errorMessage,
    errorStatus:
      swr.error instanceof Error && typeof (swr.error as Error & { status?: number }).status === "number"
        ? (swr.error as Error & { status?: number }).status
        : undefined,
    isLoading: swr.isLoading,
    isValidating: swr.isValidating,
    mutate: swr.mutate,
  }
}
