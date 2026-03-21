import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = process.env.MINDEX_API_BASE_URL || "http://localhost:8000"
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"

export async function GET(request: NextRequest) {
  try {
    const baseUrl = MINDEX_API_URL.endsWith('/api/mindex') ? MINDEX_API_URL : `${MINDEX_API_URL}/api/mindex`
    const url = `${baseUrl}/mwave`

    const response = await fetch(url, {
      headers: {
        "X-API-Key": MINDEX_API_KEY,
        "Content-Type": "application/json",
      },
      next: { revalidate: 30 }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch mwave status, status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("MINDEX MWave proxy error:", error)
    return NextResponse.json({
        status: "offline",
        last_updated: new Date().toISOString(),
        sensor_count: 0,
        active_correlations: 0,
        prediction_confidence: 0,
        earthquakes: { hour: [], count_hour: 0, count_day: 0, max_magnitude_24h: 0 },
        alerts: [],
        data_source: "unavailable",
    }, { status: 503 })
  }
}
