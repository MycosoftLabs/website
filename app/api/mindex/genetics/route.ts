import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

/**
 * Genetics API - Fetch DNA sequences from MINDEX
 * 
 * Query params:
 * - search: Search by accession, species, or gene name
 * - limit: Max results (default 50)
 * - offset: Pagination offset
 */

const MINDEX_API_URL = process.env.MINDEX_API_URL || env.mindexApiBaseUrl.replace(/\/api\/v1$/, "")

interface GeneticsSequence {
  id: string
  accession: string
  species_name: string
  gene?: string
  sequence: string
  length: number
  created_at?: string
  source?: string
  description?: string
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get("search") || ""
  const limit = parseInt(searchParams.get("limit") || "50", 10)
  const offset = parseInt(searchParams.get("offset") || "0", 10)

  // Try to fetch from MINDEX backend
  try {
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    })
    
    if (search) {
      queryParams.set("search", search)
    }

    const res = await fetch(`${MINDEX_API_URL}/api/genetics?${queryParams}`, {
      headers: {
        "X-API-Key": env.mindexApiKey || "",
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    })

    if (res.ok) {
      const data = await res.json()
      // Normalize response format
      const sequences: GeneticsSequence[] = Array.isArray(data) 
        ? data 
        : data.sequences ?? data.results ?? data.data ?? []
      
      return NextResponse.json({
        sequences,
        total: data.total ?? sequences.length,
        limit,
        offset,
      })
    }

    // If MINDEX genetics endpoint doesn't exist yet, return empty
    if (res.status === 404) {
      return NextResponse.json({
        sequences: [],
        total: 0,
        limit,
        offset,
        message: "Genetics endpoint not yet configured on MINDEX. Connect to MINDEX API /api/genetics.",
      })
    }

    throw new Error(`MINDEX returned status ${res.status}`)
  } catch (error) {
    // Return empty data with info message when MINDEX is unavailable
    return NextResponse.json({
      sequences: [],
      total: 0,
      limit,
      offset,
      error: "Unable to connect to MINDEX genetics API",
      details: error instanceof Error ? error.message : String(error),
      info: "Configure MINDEX_API_URL in environment and ensure /api/genetics endpoint is available on MINDEX VM (192.168.0.189:8000)",
    })
  }
}
