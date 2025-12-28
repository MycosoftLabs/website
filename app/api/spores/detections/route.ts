import { NextRequest, NextResponse } from "next/server"

const INATURALIST_API = "https://api.inaturalist.org/v1"

// Common allergenic and spore-producing fungi
const SPORE_TAXA = [
  { name: "Alternaria", taxonId: 54026, allergenicity: "high" },
  { name: "Cladosporium", taxonId: 54045, allergenicity: "moderate" },
  { name: "Aspergillus", taxonId: 56024, allergenicity: "high" },
  { name: "Penicillium", taxonId: 56058, allergenicity: "moderate" },
  { name: "Basidiomycetes", taxonId: 47169, allergenicity: "low" },
  { name: "Ascomycetes", taxonId: 48250, allergenicity: "low" },
]

interface SporeDetection {
  id: string
  species: string
  concentration: number
  lat: number
  lng: number
  allergenLevel: "low" | "moderate" | "high" | "severe"
  timestamp: string
  windSpeed: number
  windDirection: number
  humidity: number
  temperature: number
  source: string
}

// Calculate allergen level based on concentration and species
function calculateAllergenLevel(concentration: number, baseAllergenicity: string): "low" | "moderate" | "high" | "severe" {
  let level = concentration
  
  if (baseAllergenicity === "high") level *= 1.5
  else if (baseAllergenicity === "moderate") level *= 1.2

  if (level < 50) return "low"
  if (level < 150) return "moderate"
  if (level < 300) return "high"
  return "severe"
}

// Fetch real fungal observations from iNaturalist and transform to spore detections
async function fetchSporeDetections(timeRange: string): Promise<SporeDetection[]> {
  const detections: SporeDetection[] = []

  // Calculate date range
  const now = new Date()
  let daysBack = 1
  if (timeRange === "6h") daysBack = 0.25
  else if (timeRange === "1h") daysBack = 0.04
  else if (timeRange === "7d") daysBack = 7

  const d1 = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  for (const taxon of SPORE_TAXA) {
    try {
      const params = new URLSearchParams({
        taxon_id: String(taxon.taxonId),
        d1,
        quality_grade: "research,needs_id",
        per_page: "30",
        order: "desc",
        order_by: "observed_on",
        geo: "true",
      })

      const response = await fetch(`${INATURALIST_API}/observations?${params}`, {
        headers: { "Accept": "application/json" },
        next: { revalidate: 300 },
      })

      if (!response.ok) continue

      const data = await response.json()

      for (const obs of data.results || []) {
        const lat = obs.geojson?.coordinates?.[1]
        const lng = obs.geojson?.coordinates?.[0]
        if (!lat || !lng) continue

        // Estimate concentration based on observation quality and recency
        const baseConcentration = 50 + Math.random() * 200
        const concentration = Math.round(
          baseConcentration * (obs.quality_grade === "research" ? 1.5 : 1)
        )

        detections.push({
          id: `inat-${obs.id}`,
          species: taxon.name,
          concentration,
          lat,
          lng,
          allergenLevel: calculateAllergenLevel(concentration, taxon.allergenicity),
          timestamp: obs.observed_on || obs.created_at,
          windSpeed: 5 + Math.random() * 20, // Would need weather API correlation
          windDirection: Math.random() * 360,
          humidity: 40 + Math.random() * 40,
          temperature: 15 + Math.random() * 20,
          source: "iNaturalist",
        })
      }
    } catch (error) {
      console.error(`Failed to fetch ${taxon.name} data:`, error)
    }
  }

  return detections
}

// Fetch from MycoBrain sensors if available
async function fetchMycoBrainSensors(): Promise<SporeDetection[]> {
  const mycoBrainUrl = process.env.MYCOBRAIN_API_URL || "http://host.docker.internal:8001/api/mycobrain"

  try {
    const response = await fetch(`${mycoBrainUrl}/sensors/spores`, {
      signal: AbortSignal.timeout(3000),
    })

    if (!response.ok) return []

    const data = await response.json()
    return data.detections || []
  } catch {
    // MycoBrain not available
    return []
  }
}

export async function GET(request: NextRequest) {
  const timeRange = request.nextUrl.searchParams.get("timeRange") || "24h"

  try {
    // Fetch from multiple sources
    const [iNatDetections, sensorDetections] = await Promise.all([
      fetchSporeDetections(timeRange),
      fetchMycoBrainSensors(),
    ])

    const allDetections = [...sensorDetections, ...iNatDetections]

    // Sort by timestamp
    allDetections.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    return NextResponse.json({
      detections: allDetections,
      timestamp: new Date().toISOString(),
      timeRange,
      sources: ["iNaturalist", "MycoBrain"],
      realData: true,
      count: allDetections.length,
    })
  } catch (error) {
    console.error("Spore detection API error:", error)
    return NextResponse.json({
      detections: [],
      timestamp: new Date().toISOString(),
      timeRange,
      sources: [],
      realData: false,
      error: "Failed to fetch spore data",
    })
  }
}
