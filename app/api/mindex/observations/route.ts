import { NextRequest, NextResponse } from "next/server"

const INATURALIST_API = "https://api.inaturalist.org/v1"
const GBIF_API = "https://api.gbif.org/v1"

function isTimeoutError(error: unknown) {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")
}

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
  kingdom?: string
  iconicTaxon?: string
}

// iNaturalist iconic taxa for ALL life - used to categorize observations
const ALL_ICONIC_TAXA = [
  "Fungi",
  "Plantae",
  "Aves",
  "Mammalia",
  "Reptilia",
  "Amphibia",
  "Actinopterygii",
  "Mollusca",
  "Arachnida",
  "Insecta",
] as const

// GBIF kingdom keys for ALL life
const GBIF_KINGDOMS: Record<string, string> = {
  "Fungi": "5",
  "Plantae": "6",
  "Animalia": "1",
  "Chromista": "4",
  "Protozoa": "7",
  "Bacteria": "3",
}

// Fetch real observations from iNaturalist for a specific iconic taxon (or all)
async function fetchINaturalistObservations(
  limit: number,
  species?: string,
  iconicTaxon?: string,
): Promise<Observation[]> {
  try {
    const params = new URLSearchParams({
      quality_grade: "research,needs_id",
      per_page: String(Math.min(limit, 200)),
      order: "desc",
      order_by: "observed_on",
      geo: "true",
      photos: "true",
    })

    // If specific iconic taxon requested, filter to it; otherwise fetch all life
    if (iconicTaxon) {
      params.set("iconic_taxa", iconicTaxon)
    }

    if (species) {
      params.set("taxon_name", species)
    }

    const response = await fetch(`${INATURALIST_API}/observations?${params}`, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    })

    if (!response.ok) return []

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
      kingdom: obs.taxon?.iconic_taxon_name || "Unknown",
      iconicTaxon: obs.taxon?.iconic_taxon_name || "Unknown",
    }))
  } catch (error) {
    if (!isTimeoutError(error)) {
      console.error("Failed to fetch iNaturalist data:", error)
    }
    return []
  }
}

// Fetch real observations from GBIF for a specific kingdom (or all)
async function fetchGBIFObservations(
  limit: number,
  species?: string,
  kingdomKey?: string,
): Promise<Observation[]> {
  try {
    const params = new URLSearchParams({
      limit: String(Math.min(limit, 100)),
      hasCoordinate: "true",
      hasGeospatialIssue: "false",
    })

    // Filter to specific kingdom if provided
    if (kingdomKey) {
      params.set("kingdomKey", kingdomKey)
    }

    if (species) {
      params.set("scientificName", species)
    }

    const response = await fetch(`${GBIF_API}/occurrence/search?${params}`, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
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
      kingdom: obs.kingdom || "Unknown",
      iconicTaxon: obs.kingdom || "Unknown",
    }))
  } catch (error) {
    if (!isTimeoutError(error)) {
      console.error("Failed to fetch GBIF data:", error)
    }
    return []
  }
}

// Check MINDEX API (VM 189:8000 or local)
async function fetchLocalMINDEX(limit: number): Promise<Observation[]> {
  const mindexUrl =
    process.env.MINDEX_API_URL ||
    process.env.MINDEX_API_BASE_URL ||
    process.env.MINDEX_DATABASE_URL ||
    "http://localhost:8000"

  try {
    const url = mindexUrl.includes("/api/") ? `${mindexUrl}/observations` : `${mindexUrl}/api/mindex/observations`
    const response = await fetch(`${url}?limit=${limit}`, {
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
  // kingdom filter: "Fungi", "Plantae", "Animalia", "all" (default: "all" for all life)
  const kingdom = request.nextUrl.searchParams.get("kingdom") || "all"
  // iconic_taxa filter for iNaturalist-specific filtering
  const iconicTaxon = request.nextUrl.searchParams.get("iconic_taxa") || undefined

  // Determine which iconic taxa and GBIF kingdoms to fetch
  const inatTaxa = kingdom === "all"
    ? ALL_ICONIC_TAXA
    : [kingdom === "Animalia" ? "Mammalia" : kingdom]
  const gbifKeys = kingdom === "all"
    ? Object.values(GBIF_KINGDOMS)
    : [GBIF_KINGDOMS[kingdom] || "5"]

  // Fetch from ALL iconic taxa in parallel for comprehensive coverage
  const iNatPerTaxon = Math.ceil((limit * 0.6) / inatTaxa.length)
  const gbifPerKingdom = Math.ceil((limit * 0.3) / gbifKeys.length)

  const fetchPromises: Promise<Observation[]>[] = []

  // iNaturalist: fetch each iconic taxon
  for (const taxon of inatTaxa) {
    fetchPromises.push(
      fetchINaturalistObservations(iNatPerTaxon, species, iconicTaxon || taxon)
    )
  }

  // GBIF: fetch each kingdom
  for (const key of gbifKeys) {
    fetchPromises.push(
      fetchGBIFObservations(gbifPerKingdom, species, key)
    )
  }

  // Local MINDEX
  fetchPromises.push(fetchLocalMINDEX(Math.ceil(limit * 0.1)))

  const results = await Promise.all(fetchPromises)
  const allObservations = results.flat()

  // Filter out observations without valid coordinates
  const validObservations = allObservations.filter(
    (obs) => obs.lat !== 0 && obs.lng !== 0 && !isNaN(obs.lat) && !isNaN(obs.lng)
  )

  // Limit to requested count
  const observations = validObservations.slice(0, limit)

  // Count by kingdom for metadata
  const kingdomCounts: Record<string, number> = {}
  for (const obs of observations) {
    const k = obs.kingdom || obs.iconicTaxon || "Unknown"
    kingdomCounts[k] = (kingdomCounts[k] || 0) + 1
  }

  return NextResponse.json({
    observations,
    total: observations.length,
    sources: ["iNaturalist", "GBIF", "MINDEX"],
    kingdoms: kingdomCounts,
    realData: true,
    cached: false,
  })
}
