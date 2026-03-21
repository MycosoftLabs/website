import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = process.env.MINDEX_API_BASE_URL || "http://localhost:8000"
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"

export async function GET(request: NextRequest) {
  try {
    const baseUrl = MINDEX_API_URL.endsWith('/api/mindex') ? MINDEX_API_URL : `${MINDEX_API_URL}/api/mindex`
    const url = `${baseUrl}/etl-status`

    const response = await fetch(url, {
      headers: {
        "X-API-Key": MINDEX_API_KEY,
        "Content-Type": "application/json",
      },
      next: { revalidate: 30 }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch etl status, status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("MINDEX ETL proxy error:", error)
    return NextResponse.json({
        status: "error",
        message: "Failed to fetch ETL status",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}
