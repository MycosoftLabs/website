/**
 * MINDEX Taxa API Route (BFF Proxy)
 * 
 * Proxies requests to MINDEX /api/mindex/taxa endpoint
 * Returns all-life taxonomy data with pagination
 * 
 * Supports:
 * - q: Search query (canonical_name, common_name)
 * - limit: Number of results (default 50, max 1000)
 * - offset: Pagination offset
 * - source: Filter by data source (iNaturalist, GBIF, MycoBank, etc.)
 * - rank: Filter by taxonomic rank (species, genus, family, etc.)
 * - kingdom: Filter by top-level kingdom/domain view when MINDEX exposes it
 * 
 * NO MOCK DATA - all data comes from real MINDEX database
 */

import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"
import { fetchMindexWithAuthRetry } from "@/lib/mindex-bff-auth"

export const dynamic = "force-dynamic"

interface TaxonResponse {
  data: Array<{
    id: string
    canonical_name: string
    rank: string
    kingdom?: string | null
    lineage?: string[] | null
    lineage_ids?: string[] | null
    common_name?: string
    authority?: string
    description?: string
    source: string
    external_ids?: Record<string, string | number | null | undefined> | null
    obs_count?: number
    image_count?: number
    video_count?: number
    audio_count?: number
    genome_count?: number
    compound_link_count?: number
    interaction_count?: number
    publication_count?: number
    characteristic_count?: number
    metadata?: Record<string, unknown>
    created_at: string
    updated_at: string
  }>
  total: number
  limit: number
  offset: number
  has_more: boolean
}

export async function GET(request: NextRequest) {
  const mindexUrl = env.mindexApiBaseUrl

  try {
    // Forward all query parameters to MINDEX
    const searchParams = request.nextUrl.searchParams
    
    // Normalize parameters
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 1000)
    const offset = parseInt(searchParams.get("offset") || "0")
    const query = searchParams.get("q") || searchParams.get("search") || ""
    const source = searchParams.get("source") || ""
    const rank = searchParams.get("rank") || ""
    const kingdom = searchParams.get("kingdom") || ""
    const lineageContains = searchParams.get("lineage_contains") || ""
    const orderBy = searchParams.get("order_by") || ""
    const order = searchParams.get("order") || ""
    
    // Build MINDEX query string
    const params = new URLSearchParams()
    params.set("limit", limit.toString())
    params.set("offset", offset.toString())
    if (query) params.set("q", query)
    if (source) params.set("source", source)
    if (rank) params.set("rank", rank)
    if (kingdom) params.set("kingdom", kingdom)
    if (lineageContains) params.set("lineage_contains", lineageContains)
    if (orderBy) params.set("order_by", orderBy)
    if (order) params.set("order", order)
    
    const url = `${mindexUrl}/api/mindex/taxa?${params.toString()}`

    const response = await fetchMindexWithAuthRetry(url, {
      signal: AbortSignal.timeout(30000),
      cache: "no-store",
    })

    if (!response.ok) {
      const details = await response.text().catch(() => "")
      console.error(`MINDEX taxa API error: HTTP ${response.status}`)
      return NextResponse.json(
        { 
          data: [],
          total: 0,
          limit,
          offset,
          has_more: false,
          error: `MINDEX API returned HTTP ${response.status}`,
          message:
            response.status >= 500
              ? "MINDEX all-life taxa are not available yet. Species profiles will populate when the all-life catalog is ready."
              : details.slice(0, 500),
        },
        { status: response.status }
      )
    }

    const rawData = await response.json()
    const rows = rawData.data || rawData.taxa || rawData.results || []
    const total =
      rawData.pagination?.total ??
      rawData.total ??
      rawData.count ??
      rows.length
    
    // Normalize response structure (MINDEX API may return different formats)
    const data: TaxonResponse = {
      data: rows,
      total,
      limit,
      offset,
      has_more:
        rawData.pagination?.has_next ??
        rawData.has_more ??
        total > offset + limit,
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error("MINDEX taxa proxy error:", error)
    
    // Return empty result with error details - NO MOCK DATA
    return NextResponse.json(
      { 
        data: [],
        total: 0,
        limit: 50,
        offset: 0,
        has_more: false,
        error: "MINDEX service unavailable",
        message: "MINDEX all-life taxa are not available yet. Species profiles will populate when the all-life catalog is ready.",
      },
      { status: 503 }
    )
  }
}
