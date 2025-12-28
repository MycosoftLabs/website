import { NextRequest, NextResponse } from "next/server"

const INATURALIST_API = "https://api.inaturalist.org/v1"
const GBIF_API = "https://api.gbif.org/v1"

interface Observation {
  id: string
  species: string
  scientificName: string
  lat: number
  lng: number
  timestamp: string
  source: string
  verified: boolean
  observer: string
  imageUrl: string
}

// Fetch real observations from iNaturalist
async function fetchINaturalistObservations(limit: number, species?: string): Promise<Observation[]> {
  try {
    const params = new URLSearchParams({
      iconic_taxa: "Fungi",
      quality_grade: "research,needs_id",
      per_page: String(Math.min(limit, 200)),
      order: "desc",
      order_by: "observed_on",
      geo: "true",
      photos: "true",
    })

    if (species) {
      params.set("taxon_name", species)
    }

    const response = await fetch(`${INATURALIST_API}/observations?${params}`, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      console.error("iNaturalist API error:", response.status)
      return []
    }

    const data = await response.json()

    return (data.results || []).map((obs: any) => ({
      id: String(obs.id),
      species: obs.taxon?.preferred_common_name || obs.taxon?.name || "Unknown",
      scientificName: obs.taxon?.name || "Unknown",
      lat: obs.geojson?.coordinates?.[1] || obs.location?.split(",")[0] || 0,
      lng: obs.geojson?.coordinates?.[0] || obs.location?.split(",")[1] || 0,
      timestamp: obs.observed_on || obs.created_at,
      source: "iNaturalist",
      verified: obs.quality_grade === "research",
      observer: obs.user?.login || "Anonymous",
      imageUrl: obs.photos?.[0]?.url?.replace("square", "medium") || "",
    }))
  } catch (error) {
    console.error("Failed to fetch iNaturalist data:", error)
    return []
  }
}

// Fetch real observations from GBIF
async function fetchGBIFObservations(limit: number, species?: string): Promise<Observation[]> {
  try {
    const params = new URLSearchParams({
      kingdomKey: "5", // Fungi kingdom
      limit: String(Math.min(limit, 100)),
      hasCoordinate: "true",
      hasGeospatialIssue: "false",
    })

    if (species) {
      params.set("scientificName", species)
    }

    const response = await fetch(`${GBIF_API}/occurrence/search?${params}`, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 300 },
    })

    if (!response.ok) return []

    const data = await response.json()

    return (data.results || []).map((obs: any) => ({
      id: `gbif-${obs.key}`,
      species: obs.vernacularName || obs.species || "Unknown",
      scientificName: obs.scientificName || "Unknown",
      lat: obs.decimalLatitude || 0,
      lng: obs.decimalLongitude || 0,
      timestamp: obs.eventDate || obs.dateIdentified || new Date().toISOString(),
      source: "GBIF",
      verified: obs.issues?.length === 0,
      observer: obs.recordedBy || "Unknown",
      imageUrl: "",
    }))
  } catch (error) {
    console.error("Failed to fetch GBIF data:", error)
    return []
  }
}

// Check MAS/MINDEX local database
async function fetchLocalMINDEX(limit: number): Promise<Observation[]> {
  const mindexUrl = process.env.MINDEX_DATABASE_URL || "http://host.docker.internal:8001/api/mindex"
  
  try {
    const response = await fetch(`${mindexUrl}/observations?limit=${limit}`, {
      signal: AbortSignal.timeout(3000),
    })

    if (!response.ok) return []

    const data = await response.json()
    return data.observations || []
  } catch {
    // Local MINDEX not available, continue with external sources
    return []
  }
}

export async function GET(request: NextRequest) {
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "200")
  const species = request.nextUrl.searchParams.get("species") || undefined

  // Fetch from multiple sources in parallel
  const [iNatObs, gbifObs, localObs] = await Promise.all([
    fetchINaturalistObservations(Math.ceil(limit * 0.6), species),
    fetchGBIFObservations(Math.ceil(limit * 0.3), species),
    fetchLocalMINDEX(Math.ceil(limit * 0.1)),
  ])

  // Combine and deduplicate
  const allObservations = [...localObs, ...iNatObs, ...gbifObs]
  
  // Filter out observations without valid coordinates
  const validObservations = allObservations.filter(
    (obs) => obs.lat !== 0 && obs.lng !== 0 && !isNaN(obs.lat) && !isNaN(obs.lng)
  )

  // Limit to requested count
  const observations = validObservations.slice(0, limit)

  return NextResponse.json({
    observations,
    total: observations.length,
    sources: ["iNaturalist", "GBIF", "MINDEX"],
    realData: true,
    cached: false,
  })
}
