/**
 * MINDEX Statistics API Route (BFF Proxy)
 * 
 * Proxies requests to MINDEX /api/mindex/stats endpoint
 * Returns database statistics and ETL sync status
 * Transforms response to ensure dashboard compatibility
 */

import { NextRequest, NextResponse } from "next/server"

const MINDEX_API_URL = process.env.MINDEX_API_BASE_URL || "http://localhost:8000"
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const url = `${MINDEX_API_URL}/api/mindex/stats`

    const response = await fetch(url, {
      headers: {
        "X-API-Key": MINDEX_API_KEY,
        "Content-Type": "application/json",
      },
      next: { revalidate: 30 }, // Cache for 30 seconds
    })

    if (!response.ok) {
      return NextResponse.json(
        { 
          error: "Failed to fetch MINDEX statistics", 
          status: response.status
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // Transform response for dashboard compatibility
    // The dashboard expects 'total_taxa' but MINDEX may return 'total_species'
    const transformedData = {
      ...data,
      // Ensure both field names are available
      total_taxa: data.total_taxa ?? data.total_species ?? 0,
      total_species: data.total_species ?? data.total_taxa ?? 0,
      // Ensure taxa_by_source exists (dashboard expects this)
      taxa_by_source: data.taxa_by_source ?? data.species_by_source ?? {},
      // Ensure observations_by_source exists
      observations_by_source: data.observations_by_source ?? {},
      // Ensure etl_status exists
      etl_status: data.etl_status ?? data.etl ?? "unknown",
      // Default values for dashboard
      observations_with_location: data.observations_with_location ?? 0,
      observations_with_images: data.observations_with_images ?? 0,
      taxa_with_observations: data.taxa_with_observations ?? 0,
      genome_records: data.genome_records ?? data.total_genetic_records ?? 0,
      trait_records: data.trait_records ?? 0,
      synonym_records: data.synonym_records ?? 0,
    }
    
    return NextResponse.json(transformedData)
  } catch (error) {
    console.error("MINDEX stats proxy error:", error)
    return NextResponse.json(
      { 
        error: "MINDEX service unavailable",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 503 }
    )
  }
}
