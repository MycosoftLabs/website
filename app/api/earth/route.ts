/**
 * Earth Intelligence API — /api/earth
 *
 * Unified proxy to MINDEX earth endpoints for all Earth Intelligence domains.
 * Supports:
 *   GET /api/earth                — Full earth stats
 *   GET /api/earth?bbox=N,S,E,W  — Spatial query (all layers in bbox)
 *   GET /api/earth?q=...         — Earth search across all domains
 *   GET /api/earth?domains=true  — List available domains
 *   GET /api/earth?layers=...    — Filter by specific layers
 *
 * MINDEX-first: queries local DB, falls back to OEI connectors.
 * Designed for CREP, MYCA, AVANI, and agent/MCP consumption.
 */

import { NextRequest, NextResponse } from "next/server"
import { API_URLS, MINDEX_ENDPOINTS } from "@/lib/config/api-urls"
import {
  getEarthDataByBbox,
  getEarthStats,
  fetchAllEarthData,
} from "@/lib/crep/crep-data-service"
import { searchEarthIntelligence } from "@/lib/search/earth-search-connectors"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const EARTH_DOMAINS = [
  "aircraft", "vessels", "satellites", "events", "weather",
  "emissions", "infrastructure", "devices", "space_weather",
  "species", "fungal", "compounds", "genetics", "research",
  // MINDEX extended domains
  "hydrology", "military", "signals", "atmospheric",
  "monitor", "transport",
] as const

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const bbox = params.get("bbox")
  const query = params.get("q")
  const domains = params.get("domains")
  const layers = params.get("layers")
  const limit = parseInt(params.get("limit") || "50", 10)

  try {
    // List available domains
    if (domains === "true") {
      // Try MINDEX domains endpoint first
      try {
        const res = await fetch(MINDEX_ENDPOINTS.EARTH_DOMAINS, {
          signal: AbortSignal.timeout(5000),
        })
        if (res.ok) {
          const data = await res.json()
          return NextResponse.json({ success: true, domains: data.domains || EARTH_DOMAINS })
        }
      } catch {
        // fallback
      }
      return NextResponse.json({ success: true, domains: EARTH_DOMAINS })
    }

    // Spatial query by bounding box
    if (bbox) {
      const [north, south, east, west] = bbox.split(",").map(Number)
      if ([north, south, east, west].some(isNaN)) {
        return NextResponse.json(
          { success: false, error: "Invalid bbox format. Use: north,south,east,west" },
          { status: 400 }
        )
      }

      const layerList = layers ? layers.split(",") : undefined
      const data = await getEarthDataByBbox({
        north, south, east, west,
        layers: layerList,
        limit,
      })

      const counts = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])
      )

      return NextResponse.json({
        success: true,
        bbox: { north, south, east, west },
        data,
        counts,
        timestamp: new Date().toISOString(),
      })
    }

    // Search query across all earth domains
    if (query) {
      const origin = params.get("origin") || ""
      const results = await searchEarthIntelligence(query, origin, limit)

      const counts = Object.fromEntries(
        Object.entries(results).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])
      )

      return NextResponse.json({
        success: true,
        query,
        results,
        counts,
        timestamp: new Date().toISOString(),
      })
    }

    // Default: return earth stats
    const stats = await getEarthStats()
    return NextResponse.json({
      success: true,
      stats,
      domains: EARTH_DOMAINS,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Earth API] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/earth — Ingest earth data into MINDEX
 * Used for fire-and-forget data ingestion from search results, CREP, etc.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body

    if (!type || !data) {
      return NextResponse.json(
        { success: false, error: "Missing 'type' and 'data' fields" },
        { status: 400 }
      )
    }

    // Forward to MINDEX ingest
    try {
      const res = await fetch(MINDEX_ENDPOINTS.EARTH_INGEST, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, data }),
        signal: AbortSignal.timeout(10000),
      })
      if (res.ok) {
        const result = await res.json()
        return NextResponse.json({ success: true, ingested: result.count || data.length })
      }
    } catch {
      // MINDEX unavailable — data not ingested but not an error for the caller
    }

    return NextResponse.json({
      success: true,
      ingested: 0,
      message: "MINDEX unavailable, data not persisted",
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
