/**
 * MINDEX Single Taxon API Route (BFF Proxy)
 * 
 * Proxies requests to MINDEX /api/mindex/taxa/{id} endpoint
 * Accessible at: /api/natureos/mindex/taxa/{id}
 */

import { NextRequest, NextResponse } from "next/server"

const MINDEX_API_URL = process.env.MINDEX_API_BASE_URL || "http://localhost:8000/api/mindex"
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const response = await fetch(`${MINDEX_API_URL}/taxa/${id}`, {
      headers: {
        "X-API-Key": MINDEX_API_KEY,
        "Content-Type": "application/json",
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      return NextResponse.json(
        { 
          error: "Failed to fetch taxon", 
          status: response.status
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("MINDEX taxon proxy error:", error)
    return NextResponse.json(
      { 
        error: "MINDEX service unavailable",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 503 }
    )
  }
}
