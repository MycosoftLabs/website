/**
 * useEmbeddingAtlas - Mar 2026
 *
 * React hook for fetching and managing embedding-atlas data.
 * Integrates with the /api/search/embeddings endpoint and provides:
 * - Auto-fetch on query change with debouncing
 * - Decompressed typed arrays ready for rendering
 * - LSH-based local search within fetched embeddings
 * - Category filtering
 * - Progressive loading state
 */

"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import useSWR from "swr"
import {
  decompressEmbeddingBatch,
  EmbeddingLSH,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  CATEGORY_MAP,
  type EmbeddingPoint,
  type EmbeddingBatch,
} from "@/lib/search/embedding-engine"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmbeddingAtlasData {
  x: Float32Array
  y: Float32Array
  category: Uint8Array
  points: EmbeddingBatch["points"]
  totalCount: number
}

export interface EmbeddingAtlasState {
  data: EmbeddingAtlasData | null
  loading: boolean
  error: string | null
  meta: {
    totalPoints: number
    compressionRatio: number
    latencyMs: number
    categoryColors: string[]
    categoryLabels: string[]
  }
  /** Search within fetched embeddings using LSH */
  searchLocal: (query: string, limit?: number) => EmbeddingBatch["points"]
  /** Refresh data */
  refresh: () => void
  /** Category statistics */
  categoryStats: Array<{ index: number; label: string; color: string; count: number }>
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

const embeddingFetcher = async (url: string): Promise<{
  batch: EmbeddingBatch | null
  meta: Record<string, unknown>
}> => {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useEmbeddingAtlas(
  query: string,
  options: {
    limit?: number
    includeCrep?: boolean
    types?: string[]
    enabled?: boolean
  } = {}
): EmbeddingAtlasState {
  const { limit = 500, includeCrep = true, types = [], enabled = true } = options
  const lshRef = useRef<EmbeddingLSH>(new EmbeddingLSH(0.03))

  // Build URL
  const url = useMemo(() => {
    if (!query || query.length < 2 || !enabled) return null
    const params = new URLSearchParams({
      q: query,
      limit: String(limit),
      crep: String(includeCrep),
    })
    if (types.length > 0) params.set("types", types.join(","))
    return `/api/search/embeddings?${params}`
  }, [query, limit, includeCrep, types, enabled])

  const { data, error, isLoading, mutate } = useSWR(url, embeddingFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
    errorRetryCount: 2,
  })

  // Decompress and index data
  const atlasData = useMemo<EmbeddingAtlasData | null>(() => {
    if (!data?.batch) return null
    try {
      const decoded = decompressEmbeddingBatch(data.batch)
      // Rebuild LSH index
      const lsh = new EmbeddingLSH(0.03)
      for (let i = 0; i < decoded.points.length; i++) {
        lsh.insert({
          id: decoded.points[i].id,
          x: decoded.x[i],
          y: decoded.y[i],
          category: decoded.category[i],
          label: decoded.points[i].label,
          description: decoded.points[i].description,
          type: decoded.points[i].type as EmbeddingPoint["type"],
          lat: decoded.points[i].lat,
          lng: decoded.points[i].lng,
          metadata: {},
          score: decoded.points[i].score,
          timestamp: decoded.points[i].timestamp,
        })
      }
      lshRef.current = lsh
      return {
        x: decoded.x,
        y: decoded.y,
        category: decoded.category,
        points: decoded.points,
        totalCount: data.batch.totalCount,
      }
    } catch {
      return null
    }
  }, [data])

  // Category stats
  const categoryStats = useMemo(() => {
    if (!atlasData) return []
    const counts = new Map<number, number>()
    for (let i = 0; i < atlasData.category.length; i++) {
      const c = atlasData.category[i]
      counts.set(c, (counts.get(c) || 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([cat, count]) => ({
        index: cat,
        label: CATEGORY_LABELS[cat] || "Unknown",
        color: CATEGORY_COLORS[cat] || "#666",
        count,
      }))
      .sort((a, b) => b.count - a.count)
  }, [atlasData])

  // Local search within embeddings
  const searchLocal = useCallback(
    (q: string, searchLimit = 20): EmbeddingBatch["points"] => {
      if (!q || q.length < 2) return []
      const results = lshRef.current.search(q, searchLimit)
      return results.map((r) => ({
        id: r.id,
        label: r.label,
        description: r.description,
        type: r.type,
        score: r.score,
        lat: r.lat,
        lng: r.lng,
        timestamp: r.timestamp,
      }))
    },
    []
  )

  const meta = useMemo(
    () => ({
      totalPoints: (data?.meta?.totalPoints as number) || 0,
      compressionRatio: (data?.meta?.compressionRatio as number) || 1,
      latencyMs: (data?.meta?.latencyMs as number) || 0,
      categoryColors: CATEGORY_COLORS,
      categoryLabels: CATEGORY_LABELS,
    }),
    [data]
  )

  return {
    data: atlasData,
    loading: isLoading,
    error: error?.message || null,
    meta,
    searchLocal,
    refresh: () => mutate(),
    categoryStats,
  }
}

export default useEmbeddingAtlas
