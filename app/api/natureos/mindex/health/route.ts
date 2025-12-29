/**
 * MINDEX Health API Route (BFF Proxy)
 * 
 * Proxies requests to MINDEX /api/mindex/health endpoint
 * Accessible at: /api/natureos/mindex/health
 */

import { NextResponse } from "next/server"

const MINDEX_API_URL = process.env.MINDEX_API_BASE_URL || "http://localhost:8000/api/mindex"
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const response = await fetch(`${MINDEX_API_URL}/health`, {
      headers: {
        "X-API-Key": MINDEX_API_KEY,
        "Content-Type": "application/json",
      },
      next: { revalidate: 10 }, // Cache for 10 seconds
    })

    if (!response.ok) {
      return NextResponse.json(
        { 
          error: "MINDEX health check failed", 
          status: response.status
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
        service: "mindex",
        error: "MINDEX service unavailable",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 503 }
    )
  }
}
