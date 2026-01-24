/**
 * MINDEX Search API
 * 
 * Unified search across taxa, observations, compounds, and research
 * Proxies to real MINDEX backend
 * 
 * NO MOCK DATA - all results come from real MINDEX database
 */

import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const mindexUrl = env.mindexApiBaseUrl
  const apiKey = env.mindexApiKey || "local-dev-key"

  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q") || ""
    const type = searchParams.get("type") || "all" // all, taxa, observations, compounds
    const limit = parseInt(searchParams.get("limit") || "50")

    if (!query) {
      return NextResponse.json({
        results: { taxa: [], observations: [], compounds: [] },
        query: "",
        total: 0,
        timestamp: new Date().toISOString(),
      })
    }

    // Search all types in parallel
    const [taxaResults, observationResults, compoundResults] = await Promise.all([
      type === "all" || type === "taxa" ? searchTaxa(mindexUrl, apiKey, query, limit) : Promise.resolve([]),
      type === "all" || type === "observations" ? searchObservations(mindexUrl, apiKey, query, limit) : Promise.resolve([]),
      type === "all" || type === "compounds" ? searchCompounds(mindexUrl, apiKey, query, limit) : Promise.resolve([]),
    ])

    return NextResponse.json({
      results: {
        taxa: taxaResults,
        observations: observationResults,
        compounds: compoundResults,
      },
      query,
      total: taxaResults.length + observationResults.length + compoundResults.length,
      timestamp: new Date().toISOString(),
      data_source: "live",
    })
  } catch (error) {
    console.error("MINDEX search error:", error)
    return NextResponse.json({
      results: { taxa: [], observations: [], compounds: [] },
      query: "",
      total: 0,
      error: error instanceof Error ? error.message : "Search failed",
      data_source: "unavailable",
      timestamp: new Date().toISOString(),
    }, { status: 503 })
  }
}

async function searchTaxa(mindexUrl: string, apiKey: string, query: string, limit: number) {
  try {
    const response = await fetch(`${mindexUrl}/api/mindex/taxa?q=${encodeURIComponent(query)}&limit=${limit}`, {
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    })

    if (!response.ok) return []

    const data = await response.json()
    return data.data || data.taxa || []
  } catch {
    return []
  }
}

async function searchObservations(mindexUrl: string, apiKey: string, query: string, limit: number) {
  try {
    const response = await fetch(`${mindexUrl}/api/mindex/observations?q=${encodeURIComponent(query)}&limit=${limit}`, {
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    })

    if (!response.ok) return []

    const data = await response.json()
    return data.observations || data.data || []
  } catch {
    return []
  }
}

async function searchCompounds(mindexUrl: string, apiKey: string, query: string, limit: number) {
  try {
    const response = await fetch(`${mindexUrl}/api/mindex/compounds?q=${encodeURIComponent(query)}&limit=${limit}`, {
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    })

    if (!response.ok) return []

    const data = await response.json()
    return data.compounds || data.data || []
  } catch {
    return []
  }
}






























