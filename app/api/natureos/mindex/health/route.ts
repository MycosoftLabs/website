/**
 * MINDEX Health API Route (BFF Proxy)
 * 
 * Proxies requests to MINDEX /api/mindex/health endpoint
 * Returns API and database health status
 */

import { NextRequest, NextResponse } from "next/server"

const MINDEX_API_URL = process.env.MINDEX_API_BASE_URL || "http://localhost:8000"
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const url = `${MINDEX_API_URL}/api/mindex/health`

    const response = await fetch(url, {
      headers: {
        "X-API-Key": MINDEX_API_KEY,
        "Content-Type": "application/json",
      },
      next: { revalidate: 10 }, // Cache for 10 seconds
    })

    if (!response.ok) {
      return NextResponse.json(
        { 
          status: "unhealthy",
          error: "Failed to fetch MINDEX health", 
          http_status: response.status
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("MINDEX health proxy error:", error)
    return NextResponse.json(
      { 
        status: "unhealthy",
        error: "MINDEX service unavailable",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 503 }
    )
  }
}
