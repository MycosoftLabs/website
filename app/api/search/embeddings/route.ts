/**
 * Embedding Atlas Search API - Mar 2026
 *
 * Provides embedding-space search and data for the embedding-atlas visualization.
 *
 * GET  /api/search/embeddings?q=query&types=species,aircraft&limit=500
 *   → Returns compressed embedding batch for atlas rendering
 *
 * POST /api/search/embeddings
 *   → Body: { query, types[], limit, bounds?, timeRange? }
 *   → Returns embedding batch with CREP + search data merged
 *
 * Features:
 * - Merges CREP real-time entities with MINDEX search results
 * - Delta compression for efficient transfer
 * - LSH-powered similarity search within embedding space
 * - Category-aware filtering
 * - Geo-bounded queries via CREP bbox
 */

import { NextRequest, NextResponse } from "next/server"
import { API_URLS } from "@/lib/config/api-urls"
import {
  searchResultsToEmbeddings,
  crepEntitiesToEmbeddings,
  compressEmbeddingBatch,
  EmbeddingLSH,
  type EmbeddingPoint,
  type CREPEntity,
  CATEGORY_MAP,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
} from "@/lib/search/embedding-engine"
import type { UnifiedSearchResults } from "@/lib/search/unified-search-sdk"

export const dynamic = "force-dynamic"

// Server-side LSH index for fast re-queries
let serverIndex: EmbeddingLSH | null = null
let indexTimestamp = 0
const INDEX_TTL = 30_000 // 30s cache

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q") || ""
  const types = searchParams.get("types")?.split(",") || []
  const limit = Math.min(parseInt(searchParams.get("limit") || "500"), 5000)
  const includeCrep = searchParams.get("crep") !== "false"
  const startTime = Date.now()

  try {
    const allPoints: EmbeddingPoint[] = []

    // 1. Fetch search results if query provided
    if (query) {
      const searchResults = await fetchSearchResults(query, types, limit)
      if (searchResults) {
        allPoints.push(...searchResultsToEmbeddings(searchResults))
      }
    }

    // 2. Fetch CREP entities for geo-spatial overlay
    if (includeCrep) {
      const crepEntities = await fetchCrepEntities(query, types, limit)
      allPoints.push(...crepEntitiesToEmbeddings(crepEntities))
    }

    // 3. Deduplicate by ID
    const seen = new Set<string>()
    const deduped = allPoints.filter((p) => {
      if (seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })

    // 4. Update server LSH index
    serverIndex = new EmbeddingLSH(0.03)
    serverIndex.insertAll(deduped)
    indexTimestamp = Date.now()

    // 5. Compress and return
    const batch = compressEmbeddingBatch(deduped.slice(0, limit))

    return NextResponse.json({
      batch,
      meta: {
        query,
        totalPoints: deduped.length,
        returnedPoints: batch.totalCount,
        compressionRatio: batch.compressionRatio,
        categoryMap: CATEGORY_MAP,
        categoryColors: CATEGORY_COLORS,
        categoryLabels: CATEGORY_LABELS,
        latencyMs: Date.now() - startTime,
      },
    })
  } catch (error) {
    console.error("[Embeddings API] Error:", error)
    return NextResponse.json(
      {
        batch: null,
        meta: {
          query,
          totalPoints: 0,
          returnedPoints: 0,
          error: error instanceof Error ? error.message : "Embedding generation failed",
          latencyMs: Date.now() - startTime,
        },
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { query = "", types = [], limit = 500, bounds, timeRange } = body

    const allPoints: EmbeddingPoint[] = []

    // Parallel fetch: search + CREP
    const [searchResults, crepEntities] = await Promise.all([
      query ? fetchSearchResults(query, types, limit) : null,
      fetchCrepEntities(query, types, limit, bounds),
    ])

    if (searchResults) {
      allPoints.push(...searchResultsToEmbeddings(searchResults))
    }
    allPoints.push(...crepEntitiesToEmbeddings(crepEntities))

    // Deduplicate
    const seen = new Set<string>()
    let deduped = allPoints.filter((p) => {
      if (seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })

    // Apply time filter if provided
    if (timeRange?.start || timeRange?.end) {
      const start = timeRange.start ? new Date(timeRange.start).getTime() : 0
      const end = timeRange.end ? new Date(timeRange.end).getTime() : Infinity
      deduped = deduped.filter((p) => p.timestamp >= start && p.timestamp <= end)
    }

    // Apply type filter
    if (types.length > 0) {
      deduped = deduped.filter((p) => types.includes(p.type))
    }

    // Update server index
    serverIndex = new EmbeddingLSH(0.03)
    serverIndex.insertAll(deduped)
    indexTimestamp = Date.now()

    // If query provided, also return LSH-based similarity results
    let similarPoints: EmbeddingPoint[] = []
    if (query && serverIndex) {
      similarPoints = serverIndex.search(query, 20)
    }

    const batch = compressEmbeddingBatch(deduped.slice(0, limit))

    return NextResponse.json({
      batch,
      similar: similarPoints.map((p) => ({
        id: p.id,
        label: p.label,
        type: p.type,
        score: p.score,
        lat: p.lat,
        lng: p.lng,
      })),
      meta: {
        query,
        totalPoints: deduped.length,
        returnedPoints: batch.totalCount,
        compressionRatio: batch.compressionRatio,
        categoryMap: CATEGORY_MAP,
        categoryColors: CATEGORY_COLORS,
        categoryLabels: CATEGORY_LABELS,
        latencyMs: Date.now() - startTime,
      },
    })
  } catch (error) {
    console.error("[Embeddings API] POST Error:", error)
    return NextResponse.json(
      { batch: null, similar: [], meta: { error: "Failed" } },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// Data fetchers
// ---------------------------------------------------------------------------

async function fetchSearchResults(
  query: string,
  types: string[],
  limit: number
): Promise<UnifiedSearchResults | null> {
  try {
    const params = new URLSearchParams({ q: query, limit: String(limit) })
    if (types.length > 0) params.set("types", types.join(","))

    const response = await fetch(
      `${API_URLS.LOCAL_BASE}/api/search/unified?${params}`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (!response.ok) return null
    const data = await response.json()
    return data.results || null
  } catch {
    return null
  }
}

async function fetchCrepEntities(
  query: string,
  types: string[],
  limit: number,
  bounds?: { north: number; south: number; east: number; west: number }
): Promise<CREPEntity[]> {
  try {
    const params = new URLSearchParams({ limit: String(Math.min(limit, 200)) })
    if (query) params.set("q", query)
    if (types.length > 0) params.set("type", types[0])
    if (bounds) {
      params.set("north", String(bounds.north))
      params.set("south", String(bounds.south))
      params.set("east", String(bounds.east))
      params.set("west", String(bounds.west))
    }

    const response = await fetch(
      `${API_URLS.LOCAL_BASE}/api/search/crep?${params}`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (!response.ok) return []
    const data = await response.json()
    return (data.results || []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      type: String(r.type),
      title: String(r.title),
      description: String(r.description || ""),
      latitude: Number(r.latitude || 0),
      longitude: Number(r.longitude || 0),
      timestamp: String(r.timestamp || new Date().toISOString()),
      source: String(r.source || "CREP"),
      properties: (r.properties as Record<string, unknown>) || {},
      relevance: Number(r.relevance || 0.5),
    }))
  } catch {
    return []
  }
}
