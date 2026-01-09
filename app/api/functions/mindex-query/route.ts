import { NextRequest, NextResponse } from "next/server"
import { mindexQuery, mindexBatchQuery, type MINDEXQueryInput } from "@/lib/natureos-functions/mindex-query"

export const dynamic = "force-dynamic"

/**
 * MINDEX Query Function API
 * 
 * Serverless function endpoint for MINDEX operations
 * Can be called from workflows, other APIs, or client applications
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Check if batch operation
    if (Array.isArray(body)) {
      const results = await mindexBatchQuery(body as MINDEXQueryInput[])
      return NextResponse.json({
        batch: true,
        results,
        count: results.length,
      })
    }

    // Single operation
    const result = await mindexQuery(body as MINDEXQueryInput)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Function execution error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Function execution failed",
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // Return function documentation
  return NextResponse.json({
    name: "mindex-query",
    description: "Query MINDEX fungal intelligence database",
    version: "1.0.0",
    operations: [
      {
        name: "search",
        description: "Search across taxa, observations, and compounds",
        params: {
          query: "string (required)",
          type: "all | taxa | observations | compounds",
          limit: "number (default: 50)"
        }
      },
      {
        name: "getTaxa",
        description: "Get list of fungal species",
        params: {
          search: "string (optional)",
          rank: "string (optional)",
          family: "string (optional)",
          limit: "number (default: 50)",
          offset: "number (default: 0)"
        }
      },
      {
        name: "getObservations",
        description: "Get field observations",
        params: {
          taxonId: "number (optional)",
          hasLocation: "boolean (optional)",
          hasPhotos: "boolean (optional)",
          limit: "number (default: 50)"
        }
      },
      {
        name: "getStats",
        description: "Get database statistics",
        params: {}
      },
      {
        name: "getTaxon",
        description: "Get specific taxon by ID",
        params: {
          id: "number (required)"
        }
      }
    ],
    examples: [
      {
        description: "Search for Agaricus",
        request: {
          operation: "search",
          params: { query: "Agaricus", limit: 10 }
        }
      },
      {
        description: "Get all Agaricaceae family",
        request: {
          operation: "getTaxa",
          params: { family: "Agaricaceae", limit: 100 }
        }
      },
      {
        description: "Get observations with photos",
        request: {
          operation: "getObservations",
          params: { hasPhotos: true, limit: 50 }
        }
      }
    ]
  })
}






























