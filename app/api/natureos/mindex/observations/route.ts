/**
 * MINDEX Observations API Route (BFF Proxy)
 * 
 * Proxies requests to MINDEX /api/mindex/observations endpoint
 * Returns field observations with geolocation and media
 * 
 * Supports:
 * - taxon_id: Filter by taxon ID
 * - limit: Number of results (default 100, max 1000)
 * - offset: Pagination offset
 * - has_location: Filter for observations with GPS coordinates
 * - has_images: Filter for observations with photos
 * - source: Filter by data source (iNaturalist, etc.)
 * 
 * NO MOCK DATA - all data comes from real MINDEX database
 */

import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

interface ObservationResponse {
  observations: Array<{
    id: string
    taxon_id: string
    observed_at: string
    location?: {
      type: string
      coordinates: [number, number]
    }
    latitude?: number
    longitude?: number
    place_guess?: string
    media?: Array<{
      type: string
      url: string
      attribution?: string
    }>
    source: string
    observer?: string
    metadata?: Record<string, unknown>
    created_at: string
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
    // Forward and normalize query parameters
    const searchParams = request.nextUrl.searchParams
    
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000)
    const offset = parseInt(searchParams.get("offset") || "0")
    const taxonId = searchParams.get("taxon_id") || ""
    const hasLocation = searchParams.get("has_location")
    const hasImages = searchParams.get("has_images")
    const source = searchParams.get("source") || ""
    
    // Build MINDEX query string
    const params = new URLSearchParams()
    params.set("limit", limit.toString())
    params.set("offset", offset.toString())
    if (taxonId) params.set("taxon_id", taxonId)
    if (hasLocation) params.set("has_location", hasLocation)
    if (hasImages) params.set("has_images", hasImages)
    if (source) params.set("source", source)
    
    const url = `${mindexUrl}/api/mindex/observations?${params.toString()}`

    const response = await fetch(url, {
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    })

    if (!response.ok) {
      console.error(`MINDEX observations API error: HTTP ${response.status}`)
      return NextResponse.json(
        { 
          observations: [],
          total: 0,
          limit,
          offset,
          has_more: false,
          error: `MINDEX API returned HTTP ${response.status}`,
        },
        { status: response.status }
      )
    }

    const rawData = await response.json()
    
    // Normalize response structure
    const data: ObservationResponse = {
      observations: rawData.observations || rawData.data || rawData.results || [],
      total: rawData.total || rawData.count || 0,
      limit,
      offset,
      has_more: (rawData.total || 0) > offset + limit,
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error("MINDEX observations proxy error:", error)
    
    // Return empty result with error details - NO MOCK DATA
    return NextResponse.json(
      { 
        observations: [],
        total: 0,
        limit: 100,
        offset: 0,
        has_more: false,
        error: "MINDEX service unavailable",
        message: error instanceof Error ? error.message : "Unknown error",
        mindex_url: mindexUrl,
      },
      { status: 503 }
    )
  }
}
