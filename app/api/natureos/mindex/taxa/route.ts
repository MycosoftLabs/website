/**
 * MINDEX Taxa API Route (BFF Proxy)
 * 
 * Proxies requests to MINDEX /api/mindex/taxa endpoint
 * Returns fungal species taxonomy data
 */

import { NextRequest, NextResponse } from "next/server"

const MINDEX_API_URL = process.env.MINDEX_API_BASE_URL || "http://localhost:8000/api/mindex"
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    // Forward all query parameters to MINDEX
    const searchParams = request.nextUrl.searchParams
    const queryString = searchParams.toString()
    const url = `${MINDEX_API_URL}/taxa${queryString ? `?${queryString}` : ""}`

    const response = await fetch(url, {
      headers: {
        "X-API-Key": MINDEX_API_KEY,
        "Content-Type": "application/json",
      },
      next: { revalidate: 60 }, // Cache for 1 minute
    })

    if (!response.ok) {
      return NextResponse.json(
        { 
          error: "Failed to fetch taxa", 
          status: response.status
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("MINDEX taxa proxy error:", error)
    return NextResponse.json(
      { 
        error: "MINDEX service unavailable",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 503 }
    )
  }
}
