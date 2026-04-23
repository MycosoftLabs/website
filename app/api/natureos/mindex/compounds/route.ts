import { NextResponse } from "next/server"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = resolveMindexServerBaseUrl()
const MINDEX_API_KEY = process.env.MINDEX_API_KEY?.trim() || ""

/**
 * MINDEX Compounds API Proxy
 * 
 * Fetches compound data from MINDEX database
 */
export async function GET() {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (MINDEX_API_KEY) headers["X-API-Key"] = MINDEX_API_KEY
    const response = await fetch(`${MINDEX_API_URL}/api/mindex/compounds`, {
      headers,
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






























