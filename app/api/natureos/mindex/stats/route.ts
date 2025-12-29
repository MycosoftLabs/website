/**
 * MINDEX Statistics API Route (BFF Proxy)
 * 
 * Proxies requests to MINDEX /api/mindex/stats endpoint
 * Returns database statistics and ETL sync status
 */

import { NextRequest, NextResponse } from "next/server"

const MINDEX_API_URL = process.env.MINDEX_API_BASE_URL || "http://localhost:8000/api/mindex"
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const url = `${MINDEX_API_URL}/stats`

    const response = await fetch(url, {
      headers: {
        "X-API-Key": MINDEX_API_KEY,
        "Content-Type": "application/json",
      },
      next: { revalidate: 30 }, // Cache for 30 seconds
    })

    if (!response.ok) {
      return NextResponse.json(
        { 
          error: "Failed to fetch MINDEX statistics", 
          status: response.status
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("MINDEX stats proxy error:", error)
    return NextResponse.json(
      { 
        error: "MINDEX service unavailable",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 503 }
    )
  }
}
