/**
 * Ancestry Data Quality API
 * Returns species completeness stats from MINDEX for monitoring.
 * GET /api/ancestry/data-quality
 */

import { NextResponse } from "next/server"

const MINDEX_API_URL = process.env.MINDEX_API_URL || process.env.MINDEX_API_BASE_URL || "http://192.168.0.189:8000"
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"

export interface DataQualityStats {
  total_species: number
  with_images: number
  with_description: number
  with_genetics: number
  missing_images: number
  missing_description: number
  missing_genetics: number
  incomplete_count: number
}

export async function GET() {
  try {
    const url = `${MINDEX_API_URL}/api/mindex/stats/species-completeness`
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": MINDEX_API_KEY,
      },
      next: { revalidate: 300 }, // Cache 5 minutes
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        {
          error: "MINDEX unavailable",
          detail: text || res.statusText,
          stats: null,
        },
        { status: res.status }
      )
    }

    const stats: DataQualityStats = await res.json()
    return NextResponse.json({ stats })
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to fetch data quality stats",
        detail: err instanceof Error ? err.message : "Unknown error",
        stats: null,
      },
      { status: 500 }
    )
  }
}
