import { NextRequest, NextResponse } from "next/server"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"

export const dynamic = "force-dynamic"

/**
 * Genetics API - Fetch DNA sequences from MINDEX
 * 
 * Query params:
 * - search: Search by accession, species, or gene name
 * - limit: Max results (default 50)
 * - offset: Pagination offset
 */

const MINDEX_API_KEY = process.env.MINDEX_API_KEY?.trim() || ""
const MINDEX_GENETICS_TIMEOUT_MS = Number(process.env.MINDEX_GENETICS_TIMEOUT_MS || 15000)

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

  try {
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    })
    
    if (search) {
      queryParams.set("search", search)
    }

    const headers: Record<string, string> = { Accept: "application/json" }
    if (MINDEX_API_KEY) headers["X-API-Key"] = MINDEX_API_KEY

    const url = new URL("/api/mindex/genetics", resolveMindexServerBaseUrl())
    queryParams.forEach((value, key) => url.searchParams.set(key, value))
    const res = await fetch(url.toString(), {
      headers,
      signal: AbortSignal.timeout(MINDEX_GENETICS_TIMEOUT_MS),
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
      }, { headers: { "Cache-Control": "no-store", "X-MINDEX-Source": "mindex" } })
    }

    if (res.status === 404) {
      return NextResponse.json({
        sequences: [],
        total: 0,
        limit,
        offset,
      }, { headers: { "Cache-Control": "no-store", "X-MINDEX-Source": "empty" } })
    }

    throw new Error(`MINDEX returned status ${res.status}`)
  } catch (error) {
    return NextResponse.json({
      sequences: [],
      total: 0,
      limit,
      offset,
      details: error instanceof Error ? error.message : String(error),
    }, { headers: { "Cache-Control": "no-store", "X-MINDEX-Source": "unavailable" } })
  }
}
