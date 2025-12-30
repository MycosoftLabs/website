/**
 * MINDEX Sync API Route
 * 
 * Triggers data synchronization from external sources (iNaturalist, GBIF, etc.)
 */

import { NextRequest, NextResponse } from "next/server"

const MINDEX_API_URL = process.env.MINDEX_API_BASE_URL || "http://localhost:8000"
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    // Parse request body for sync options
    let body = {}
    try {
      body = await request.json()
    } catch {
      // Empty body is fine
    }

    const { sources, limit } = body as { sources?: string[], limit?: number }

    const url = `${MINDEX_API_URL}/api/mindex/sync`

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-API-Key": MINDEX_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sources: sources || ["iNaturalist", "GBIF", "MycoBank", "GenBank"],
        limit: limit || 1000,
      }),
    })

    if (!response.ok) {
      return NextResponse.json(
        { 
          error: "Failed to trigger MINDEX sync",
          status: response.status 
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json({
      success: true,
      message: "Sync started successfully",
      ...data,
    })
  } catch (error) {
    console.error("MINDEX sync error:", error)
    
    // If MINDEX is not running, return a helpful message
    return NextResponse.json(
      { 
        error: "MINDEX service unavailable",
        message: "Please ensure the MINDEX Docker container is running: docker-compose -f docker-compose.mindex.yml up -d",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 503 }
    )
  }
}

// GET endpoint to check sync status
export async function GET(request: NextRequest) {
  try {
    const url = `${MINDEX_API_URL}/api/mindex/etl-status`

    const response = await fetch(url, {
      headers: {
        "X-API-Key": MINDEX_API_KEY,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { 
          error: "Failed to fetch ETL status",
          status: response.status 
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("MINDEX ETL status error:", error)
    return NextResponse.json(
      { 
        error: "MINDEX service unavailable",
        status: "unknown",
        available_sources: ["iNaturalist", "GBIF", "MycoBank", "FungiDB", "GenBank"],
        recent_syncs: [],
      },
      { status: 503 }
    )
  }
}




