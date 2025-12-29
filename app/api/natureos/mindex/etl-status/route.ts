import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = process.env.MINDEX_API_BASE_URL || "http://localhost:8000"
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"

/**
 * MINDEX ETL Status API
 * 
 * Returns status of data scraping and ETL pipeline
 */
export async function GET() {
  try {
    // Get stats to determine ETL activity
    const statsResponse = await fetch(`${MINDEX_API_URL}/api/mindex/stats`, {
      headers: {
        "X-API-Key": MINDEX_API_KEY,
        "Content-Type": "application/json",
      },
      next: { revalidate: 30 },
    })

    if (!statsResponse.ok) {
      return NextResponse.json({
        status: "unknown",
        message: "Unable to fetch ETL status",
        timestamp: new Date().toISOString(),
      })
    }

    const stats = await statsResponse.json()

    // Determine ETL status based on data recency and volume
    const recentDataCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const hasRecentData = stats.observation_date_range?.latest && 
      new Date(stats.observation_date_range.latest) > new Date(recentDataCutoff)

    const status = {
      pipeline: hasRecentData ? "active" : "idle",
      sources: {
        inat: {
          status: stats.taxa_by_source?.inat > 0 ? "connected" : "disconnected",
          taxa: stats.taxa_by_source?.inat || 0,
          observations: stats.observations_by_source?.inat || 0,
        },
        gbif: {
          status: stats.taxa_by_source?.gbif > 0 ? "connected" : "disconnected",
          taxa: stats.taxa_by_source?.gbif || 0,
          observations: stats.observations_by_source?.gbif || 0,
        },
      },
      lastSync: stats.observation_date_range?.latest || "Unknown",
      nextSync: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      dataQuality: {
        withLocation: ((stats.observations_with_location / stats.total_observations) * 100).toFixed(1) + "%",
        withImages: ((stats.observations_with_images / stats.total_observations) * 100).toFixed(1) + "%",
        verified: ((stats.taxa_with_observations / stats.total_taxa) * 100).toFixed(1) + "%",
      },
      performance: {
        totalTaxa: stats.total_taxa,
        totalObservations: stats.total_observations,
        avgObservationsPerTaxon: (stats.total_observations / stats.taxa_with_observations).toFixed(1),
      },
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error("ETL status error:", error)
    return NextResponse.json({
      status: "error",
      message: "Failed to fetch ETL status",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}

