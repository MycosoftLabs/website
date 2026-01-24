/**
 * MINDEX Taxa API Route (BFF Proxy)
 * 
 * Proxies requests to MINDEX /api/mindex/taxa endpoint
 * Returns fungal species taxonomy data with pagination
 * 
 * Supports:
 * - q: Search query (canonical_name, common_name)
 * - limit: Number of results (default 50, max 1000)
 * - offset: Pagination offset
 * - source: Filter by data source (iNaturalist, GBIF, MycoBank, etc.)
 * - rank: Filter by taxonomic rank (species, genus, family, etc.)
 * 
 * NO MOCK DATA - all data comes from real MINDEX database
 */

import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

interface TaxonResponse {
  data: Array<{
    id: string
    canonical_name: string
    rank: string
    common_name?: string
    authority?: string
    description?: string
    source: string
    fungi_type?: string
    is_edible?: boolean
    is_medicinal?: boolean
    is_poisonous?: boolean
    image_url?: string
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
  const apiKey = env.mindexApiKey || "local-dev-key"

  try {
    // Forward all query parameters to MINDEX
    const searchParams = request.nextUrl.searchParams
    
    // Normalize parameters
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 1000)
    const offset = parseInt(searchParams.get("offset") || "0")
    const query = searchParams.get("q") || searchParams.get("search") || ""
    const source = searchParams.get("source") || ""
    const rank = searchParams.get("rank") || ""
    
    // Build MINDEX query string
    const params = new URLSearchParams()
    params.set("limit", limit.toString())
    params.set("offset", offset.toString())
    if (query) params.set("q", query)
    if (source) params.set("source", source)
    if (rank) params.set("rank", rank)
    
    const url = `${mindexUrl}/api/mindex/taxa?${params.toString()}`

    const response = await fetch(url, {
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    })

    if (!response.ok) {
      console.error(`MINDEX taxa API error: HTTP ${response.status}`)
      return NextResponse.json(
        { 
          data: [],
          total: 0,
          limit,
          offset,
          has_more: false,
          error: `MINDEX API returned HTTP ${response.status}`,
          troubleshooting: {
            mindex_url: mindexUrl,
            endpoint: url,
          }
        },
        { status: response.status }
      )
    }

    const rawData = await response.json()
    
    // Normalize response structure (MINDEX API may return different formats)
    const data: TaxonResponse = {
      data: rawData.data || rawData.taxa || rawData.results || [],
      total: rawData.total || rawData.count || 0,
      limit,
      offset,
      has_more: (rawData.total || 0) > offset + limit,
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
        message: error instanceof Error ? error.message : "Unknown error",
        mindex_url: mindexUrl,
        troubleshooting: {
          check_vm: "SSH to 192.168.0.187 and verify MINDEX container is running",
          check_api: `curl ${mindexUrl}/api/mindex/health`,
          restart: "docker-compose -f docker-compose.always-on.yml restart mindex-api",
        }
      },
      { status: 503 }
    )
  }
}
