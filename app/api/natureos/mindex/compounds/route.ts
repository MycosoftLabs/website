import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = process.env.MINDEX_API_BASE_URL || "http://localhost:8000"
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"

/**
 * MINDEX Compounds API Proxy
 * 
 * Fetches compound data from MINDEX database
 */
export async function GET() {
  try {
    const response = await fetch(`${MINDEX_API_URL}/api/mindex/compounds`, {
      headers: {
        "X-API-Key": MINDEX_API_KEY,
        "Content-Type": "application/json",
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      // Return empty array if MINDEX is unavailable
      return NextResponse.json({
        compounds: [],
        source: "fallback",
        timestamp: new Date().toISOString(),
      })
    }

    const data = await response.json()

    return NextResponse.json({
      compounds: data.compounds || [],
      source: "mindex",
      timestamp: new Date().toISOString(),
      count: data.count || 0,
    })
  } catch (error) {
    console.error("MINDEX compounds API error:", error)
    return NextResponse.json({
      compounds: [],
      source: "error",
      error: "Failed to fetch compounds from MINDEX",
      timestamp: new Date().toISOString(),
    })
  }
}





