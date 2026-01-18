/**
 * Earth Simulator Fungal Data API
 * 
 * Returns fungal observation data in GeoJSON format optimized for
 * Google Earth Engine visualization and heatmap generation.
 * 
 * Features:
 * - GeoJSON FeatureCollection output
 * - Heatmap intensity values
 * - Time-series data for animation
 * - Aggregation by grid cells for performance
 * 
 * @route GET /api/earth/fungal
 */

import { NextRequest, NextResponse } from "next/server"

const INATURALIST_API = "https://api.inaturalist.org/v1"
const MINDEX_API = process.env.MINDEX_API_URL || "http://localhost:8001"

interface GeoJSONFeature {
  type: "Feature"
  geometry: {
    type: "Point"
    coordinates: [number, number] // [lng, lat]
  }
  properties: {
    id: string
    species: string
    scientificName: string
    timestamp: string
    source: string
    verified: boolean
    intensity: number // For heatmap visualization
    imageUrl?: string
    observer?: string
  }
}

interface GeoJSONFeatureCollection {
  type: "FeatureCollection"
  features: GeoJSONFeature[]
  metadata: {
    total: number
    sources: Record<string, number>
    timeRange: { start: string; end: string }
    timestamp: string
  }
}

/**
 * Fetch from MINDEX and convert to GeoJSON
 */
async function fetchMINDEXGeoJSON(limit: number): Promise<GeoJSONFeature[]> {
  try {
    const response = await fetch(`${MINDEX_API}/api/v1/observations?limit=${limit}&has_gps=true&format=geojson`, {
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) return []

    const data = await response.json()
    
    // If MINDEX returns GeoJSON directly
    if (data.type === "FeatureCollection") {
      return data.features.map((f: any) => ({
        ...f,
        properties: {
          ...f.properties,
          source: "MINDEX",
          intensity: f.properties.verified ? 1.0 : 0.7,
        },
      }))
    }

    // Otherwise convert observations to GeoJSON
    return (data.observations || [])
      .filter((obs: any) => obs.latitude && obs.longitude)
      .map((obs: any) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [obs.longitude, obs.latitude],
        },
        properties: {
          id: `mindex-${obs.id}`,
          species: obs.species_name || "Unknown",
          scientificName: obs.scientific_name || "Unknown",
          timestamp: obs.observed_at || obs.created_at,
          source: "MINDEX",
          verified: obs.verified === true,
          intensity: obs.verified ? 1.0 : 0.7,
          imageUrl: obs.photos?.[0]?.url,
          observer: obs.observer,
        },
      }))
  } catch (error) {
    console.error("[Earth/Fungal] Failed to fetch MINDEX data:", error)
    return []
  }
}

/**
 * Fetch from iNaturalist and convert to GeoJSON
 */
async function fetchINaturalistGeoJSON(
  limit: number,
  daysBack: number = 30
): Promise<GeoJSONFeature[]> {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)

    const params = new URLSearchParams({
      iconic_taxa: "Fungi",
      quality_grade: "research,needs_id",
      per_page: String(Math.min(limit, 200)),
      d1: startDate.toISOString().split("T")[0],
      order: "desc",
      order_by: "observed_on",
      geo: "true",
      photos: "true",
    })

    const response = await fetch(`${INATURALIST_API}/observations?${params}`, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 300 },
    })

    if (!response.ok) return []

    const data = await response.json()

    return (data.results || [])
      .filter((obs: any) => obs.geojson?.coordinates)
      .map((obs: any) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: obs.geojson.coordinates,
        },
        properties: {
          id: `inat-${obs.id}`,
          species: obs.taxon?.preferred_common_name || obs.taxon?.name || "Unknown",
          scientificName: obs.taxon?.name || "Unknown",
          timestamp: obs.observed_on || obs.created_at,
          source: "iNaturalist",
          verified: obs.quality_grade === "research",
          intensity: obs.quality_grade === "research" ? 1.0 : 0.6,
          imageUrl: obs.photos?.[0]?.url?.replace("square", "medium"),
          observer: obs.user?.login,
        },
      }))
  } catch (error) {
    console.error("[Earth/Fungal] Failed to fetch iNaturalist data:", error)
    return []
  }
}

/**
 * Aggregate points into grid cells for heatmap performance
 */
function aggregateToGrid(
  features: GeoJSONFeature[],
  cellSize: number = 1.0 // degrees
): GeoJSONFeature[] {
  const grid = new Map<string, { count: number; totalIntensity: number; features: GeoJSONFeature[] }>()

  for (const feature of features) {
    const [lng, lat] = feature.geometry.coordinates
    const cellX = Math.floor(lng / cellSize)
    const cellY = Math.floor(lat / cellSize)
    const key = `${cellX}:${cellY}`

    if (!grid.has(key)) {
      grid.set(key, { count: 0, totalIntensity: 0, features: [] })
    }

    const cell = grid.get(key)!
    cell.count++
    cell.totalIntensity += feature.properties.intensity
    cell.features.push(feature)
  }

  // Convert grid cells to aggregated features
  return Array.from(grid.entries()).map(([key, cell]) => {
    const [cellX, cellY] = key.split(":").map(Number)
    const centerLng = (cellX + 0.5) * cellSize
    const centerLat = (cellY + 0.5) * cellSize

    // Use the first feature as representative
    const representative = cell.features[0]

    return {
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [centerLng, centerLat] as [number, number],
      },
      properties: {
        ...representative.properties,
        id: `grid-${key}`,
        intensity: Math.min(cell.totalIntensity / cell.count * Math.log10(cell.count + 1), 1.0),
        count: cell.count,
        aggregated: true,
      },
    }
  })
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get("limit") || "1000")
  const daysBack = parseInt(searchParams.get("days") || "30")
  const aggregate = searchParams.get("aggregate") === "true"
  const cellSize = parseFloat(searchParams.get("cellSize") || "1.0")
  const format = searchParams.get("format") || "geojson"

  // Fetch from all sources
  const [mindexFeatures, inatFeatures] = await Promise.all([
    fetchMINDEXGeoJSON(Math.ceil(limit * 0.5)),
    fetchINaturalistGeoJSON(Math.ceil(limit * 0.5), daysBack),
  ])

  let allFeatures = [...mindexFeatures, ...inatFeatures]

  // Deduplicate
  const uniqueFeatures = Array.from(
    new Map(allFeatures.map(f => [f.properties.id, f])).values()
  )

  // Aggregate if requested (for heatmap performance)
  const finalFeatures = aggregate
    ? aggregateToGrid(uniqueFeatures, cellSize)
    : uniqueFeatures.slice(0, limit)

  // Calculate time range
  const timestamps = finalFeatures
    .map(f => new Date(f.properties.timestamp).getTime())
    .filter(t => !isNaN(t))
  const timeRange = {
    start: timestamps.length ? new Date(Math.min(...timestamps)).toISOString() : new Date().toISOString(),
    end: timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : new Date().toISOString(),
  }

  const featureCollection: GeoJSONFeatureCollection = {
    type: "FeatureCollection",
    features: finalFeatures,
    metadata: {
      total: finalFeatures.length,
      sources: {
        MINDEX: finalFeatures.filter(f => f.properties.source === "MINDEX").length,
        iNaturalist: finalFeatures.filter(f => f.properties.source === "iNaturalist").length,
      },
      timeRange,
      timestamp: new Date().toISOString(),
    },
  }

  // Return as GeoJSON with appropriate content type
  if (format === "geojson") {
    return new NextResponse(JSON.stringify(featureCollection), {
      headers: {
        "Content-Type": "application/geo+json",
        "Cache-Control": "public, max-age=300",
      },
    })
  }

  // Default JSON response
  return NextResponse.json(featureCollection)
}
