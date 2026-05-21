import { NextRequest, NextResponse } from "next/server"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = resolveMindexServerBaseUrl()
const MINDEX_API_KEY = process.env.MINDEX_API_KEY

function buildMindexPath(baseUrl: string): string {
  return baseUrl.endsWith("/api/mindex") ? baseUrl : `${baseUrl}/api/mindex`
}

export async function GET(_request: NextRequest) {
  try {
    if (!MINDEX_API_KEY) {
      return NextResponse.json(
        {
          status: "error",
          message: "MINDEX_API_KEY is not configured",
          error: "MINDEX_API_KEY_MISSING",
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      )
    }

    const baseUrl = buildMindexPath(MINDEX_API_URL)
    const response = await fetch(`${baseUrl}/etl-status`, {
      headers: {
        "X-API-Key": MINDEX_API_KEY,
        "Content-Type": "application/json",
      },
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(20_000),
    })

    if (response.ok) {
      const data = await response.json()
      return NextResponse.json(data)
    }

    const fallbackResponse = await fetch(`${baseUrl}/etl/status`, {
      headers: {
        "X-API-Key": MINDEX_API_KEY,
        "Content-Type": "application/json",
      },
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(20_000),
    })

    if (fallbackResponse.ok) {
      const data = await fallbackResponse.json()
      return NextResponse.json(data)
    }

    const upstreamBody = await fallbackResponse.text().catch(() => "")
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch live ETL status from MINDEX",
        error: "MINDEX_ETL_STATUS_UNAVAILABLE",
        upstream_status: fallbackResponse.status,
        upstream_body_preview: upstreamBody.slice(0, 500),
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  } catch (error) {
    console.error("MINDEX ETL proxy error:", error)
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch ETL status",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
