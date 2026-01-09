import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = process.env.MINDEX_API_BASE_URL || "http://localhost:8000"
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"

/**
 * MINDEX Search API
 * 
 * Unified search across taxa, observations, compounds, and research
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q") || ""
    const type = searchParams.get("type") || "all" // all, taxa, observations, compounds
    const limit = parseInt(searchParams.get("limit") || "50")

    if (!query) {
      return NextResponse.json({
        results: [],
        query: "",
        timestamp: new Date().toISOString(),
      })
    }

    // Search taxa
    const taxaResults = type === "all" || type === "taxa" ? await searchTaxa(query, limit) : []
    
    // Search observations
    const observationResults = type === "all" || type === "observations" ? await searchObservations(query, limit) : []
    
    // Search compounds (from local data for now)
    const compoundResults = type === "all" || type === "compounds" ? await searchCompounds(query, limit) : []

    return NextResponse.json({
      results: {
        taxa: taxaResults,
        observations: observationResults,
        compounds: compoundResults,
      },
      query,
      total: taxaResults.length + observationResults.length + compoundResults.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("MINDEX search error:", error)
    return NextResponse.json({
      results: { taxa: [], observations: [], compounds: [] },
      query: "",
      error: "Search failed",
      timestamp: new Date().toISOString(),
    })
  }
}

async function searchTaxa(query: string, limit: number) {
  try {
    const response = await fetch(`${MINDEX_API_URL}/api/mindex/taxa?search=${encodeURIComponent(query)}&limit=${limit}`, {
      headers: {
        "X-API-Key": MINDEX_API_KEY,
        "Content-Type": "application/json",
      },
      next: { revalidate: 60 },
    })

    if (!response.ok) return []

    const data = await response.json()
    return data.taxa || []
  } catch {
    return []
  }
}

async function searchObservations(query: string, limit: number) {
  try {
    const response = await fetch(`${MINDEX_API_URL}/api/mindex/observations?search=${encodeURIComponent(query)}&limit=${limit}`, {
      headers: {
        "X-API-Key": MINDEX_API_KEY,
        "Content-Type": "application/json",
      },
      next: { revalidate: 60 },
    })

    if (!response.ok) return []

    const data = await response.json()
    return data.observations || []
  } catch {
    return []
  }
}

async function searchCompounds(query: string, limit: number) {
  // For now, return empty - will be populated as compound data is added to MINDEX
  return []
}






























