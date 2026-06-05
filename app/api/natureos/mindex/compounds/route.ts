import { NextRequest, NextResponse } from "next/server"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"
import { fetchMindexWithAuthRetry } from "@/lib/mindex-bff-auth"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = resolveMindexServerBaseUrl()
/**
 * MINDEX Compounds API Proxy
 * 
 * Fetches compound data from MINDEX database
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const query = url.searchParams.toString()
    const response = await fetchMindexWithAuthRetry(`${MINDEX_API_URL}/api/mindex/compounds${query ? `?${query}` : ""}`, {
      cache: "no-store",
    })

    if (!response.ok) {
      const errBody = await response.text().catch(() => "")
      return NextResponse.json({
        compounds: [],
        source: "mindex",
        count: 0,
        message: `MINDEX compounds unavailable (HTTP ${response.status})`,
        detail: errBody.slice(0, 200),
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





























