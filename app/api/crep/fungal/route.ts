/**
 * CREP Observation Data API - PRIMARY DATA ENDPOINT
 *
 * This is the main data source for the CREP dashboard's biodiversity layers.
 * Serves ALL life data (fungi, plants, animals, birds, insects, marine) through MINDEX.
 *
 * DATA PRIORITY:
 * 1. MINDEX (local biodiversity database) - PRIMARY, NO LIMIT
 * 2. Fallback to iNaturalist/GBIF only if MINDEX is unavailable
 *
 * MINDEX contains all iNaturalist/GBIF data already imported via ETL.
 * This provides instant access to THOUSANDS of observations without
 * external API rate limits.
 *
 * Supports kingdom filtering via ?kingdom= parameter:
 * - "all" (default) - All life
 * - "Fungi" - Fungal observations only
 * - "Plantae" - Plants only
 * - "Animalia" - Animals only
 * - etc.
 *
 * @route GET /api/crep/fungal
 */

import { NextRequest, NextResponse } from "next/server"
import { logDataCollection, logAPIError } from "@/lib/oei/mindex-logger"

const INATURALIST_API = "https://api.inaturalist.org/v1"
const GBIF_API = "https://api.gbif.org/v1"
// MINDEX runs on port 8000 (Docker container)
const MINDEX_API = process.env.MINDEX_API_URL || "http://localhost:8000"

// ═══════════════════════════════════════════════════════════════════════════
// CACHING SYSTEM - Reduces MINDEX latency to near-instant for repeat loads
// Cache expires after 5 minutes to balance freshness with performance
// ═══════════════════════════════════════════════════════════════════════════
interface CachedData {
  observations: FungalObservation[]
  timestamp: number
  sources: { mindex: number; iNaturalist: number; gbif: number }
}

let dataCache: CachedData | null = null
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function isCacheValid(): boolean {
  if (!dataCache) return false
  return Date.now() - dataCache.timestamp < CACHE_TTL_MS
}

function getCachedData(): CachedData | null {
  if (isCacheValid()) {
    console.log(`[CREP/Fungal] ⚡ Using cached data (${dataCache?.observations.length} observations, ${Math.round((Date.now() - dataCache!.timestamp) / 1000)}s old)`)
    return dataCache
  }
  return null
}

function setCachedData(observations: FungalObservation[], sources: { mindex: number; iNaturalist: number; gbif: number }): void {
  dataCache = {
    observations,
    timestamp: Date.now(),
    sources,
  }
  console.log(`[CREP/Fungal] 💾 Cached ${observations.length} observations`)
}

export interface FungalObservation {
  id: string
  species: string
  scientificName: string
  commonName?: string
  latitude: number
  longitude: number
  timestamp: string
  source: "MINDEX" | "iNaturalist" | "GBIF"
  verified: boolean
  observer?: string
  imageUrl?: string
  thumbnailUrl?: string
  location?: string
  habitat?: string
  notes?: string
  // GPS and geocoding status
  hasGps: boolean
  geocodeStatus?: "complete" | "pending" | "failed"
  // Source links for "View on iNaturalist" etc.
  sourceUrl?: string
  externalId?: string
  // Kingdom/taxa classification for all-life support
  kingdom?: string
  iconicTaxon?: string
  taxonId?: number
}

/**
 * Fetch ALL observations from local MINDEX database
 * 
 * MINDEX is the PRIMARY source - contains pre-imported iNaturalist/GBIF data.
 * No artificial limits. Filters for quality data:
 * - Must have GPS coordinates
 * - Must have photo/image
 * - Must have species name
 * - Must have timestamp
 * - From last 10 years preferred
 */
async function fetchMINDEXObservations(limit?: number): Promise<FungalObservation[]> {
  try {
    // MINDEX API has a server-side limit of 1000 per request
    // We need to paginate to get all data
    const BATCH_SIZE = 1000
    const MAX_OBSERVATIONS = limit || 25000 // Cap at 25k for performance
    
    const allObservations: Record<string, unknown>[] = []
    let offset = 0
    let hasMore = true
    
    console.log(`[CREP/Fungal] Fetching from MINDEX with pagination (max ${MAX_OBSERVATIONS})...`)
    
    while (hasMore && allObservations.length < MAX_OBSERVATIONS) {
      const params = new URLSearchParams({
        limit: String(BATCH_SIZE),
        offset: String(offset),
        order_by: "observed_at",
        order: "desc",
      })
      
      const response = await fetch(`${MINDEX_API}/api/mindex/observations?${params}`, {
        signal: AbortSignal.timeout(15000), // 15 second timeout per batch
        headers: { 
          "Accept": "application/json",
          "X-API-Key": process.env.MINDEX_API_KEY || "local-dev-key",
        },
      })

      if (!response.ok) {
        console.warn(`[CREP/Fungal] MINDEX returned ${response.status} at offset ${offset}`)
        break
      }

      const data = await response.json()
      const observations = data.data || data.observations || []
      const totalInDb = data.pagination?.total || 0
      
      if (observations.length === 0) {
        hasMore = false
        break
      }
      
      allObservations.push(...observations)
      offset += observations.length
      
      // Check if we've fetched everything
      if (offset >= totalInDb || observations.length < BATCH_SIZE) {
        hasMore = false
      }
      
      console.log(`[CREP/Fungal] Fetched batch: ${allObservations.length}/${totalInDb} observations`)
    }
    
    console.log(`[CREP/Fungal] MINDEX total fetched: ${allObservations.length} observations`)
    
    if (allObservations.length === 0) {
      console.warn("[CREP/Fungal] MINDEX returned 0 observations, will use external fallback")
      return []
    }
    
    // Fetch taxa lookup for species names (batch)
    const taxaLookup = await fetchTaxaLookup(allObservations)
    
    return transformMINDEXData(allObservations, taxaLookup)
  } catch (error) {
    console.error("[CREP/Fungal] Failed to fetch MINDEX data:", error)
    return []
  }
}

// In-memory taxa cache (populated on first request)
let taxaLookupCache: Map<string, { canonical_name: string; common_name?: string }> | null = null
let taxaCacheExpiry: number = 0

/**
 * Fetch ALL taxa into a lookup table (cached for 30 minutes)
 * Since MINDEX API doesn't support filtering by IDs, we fetch all ~19K taxa
 * and cache them for efficient lookups
 */
async function fetchTaxaLookup(_observations: Record<string, unknown>[]): Promise<Map<string, { canonical_name: string; common_name?: string }>> {
  // Return cached lookup if still valid
  if (taxaLookupCache && Date.now() < taxaCacheExpiry) {
    console.log(`[CREP/Fungal] Using cached taxa lookup (${taxaLookupCache.size} taxa)`)
    return taxaLookupCache
  }
  
  const lookup = new Map<string, { canonical_name: string; common_name?: string }>()
  
  try {
    console.log("[CREP/Fungal] Fetching ALL taxa for name lookup (will be cached)...")
    
    // Paginate through all taxa (MINDEX has ~19K taxa)
    const BATCH_SIZE = 1000
    let offset = 0
    let hasMore = true
    
    while (hasMore) {
      const response = await fetch(`${MINDEX_API}/api/mindex/taxa?limit=${BATCH_SIZE}&offset=${offset}`, {
        headers: { 
          "Accept": "application/json",
          "X-API-Key": process.env.MINDEX_API_KEY || "local-dev-key",
        },
        signal: AbortSignal.timeout(15000),
      })
      
      if (!response.ok) {
        console.warn(`[CREP/Fungal] Taxa fetch failed at offset ${offset}: ${response.status}`)
        break
      }
      
      const data = await response.json()
      const taxa = data.data || data.taxa || []
      const total = data.pagination?.total || 0
      
      if (taxa.length === 0) {
        hasMore = false
        break
      }
      
      for (const taxon of taxa) {
        lookup.set(taxon.id, {
          canonical_name: taxon.canonical_name,
          common_name: taxon.common_name,
        })
      }
      
      offset += taxa.length
      console.log(`[CREP/Fungal] Taxa fetch progress: ${lookup.size}/${total}`)
      
      if (offset >= total || taxa.length < BATCH_SIZE) {
        hasMore = false
      }
    }
    
    console.log(`[CREP/Fungal] ✅ Fetched ${lookup.size} taxa names for lookup`)
    
    // Cache for 30 minutes
    taxaLookupCache = lookup
    taxaCacheExpiry = Date.now() + 30 * 60 * 1000
    
  } catch (error) {
    console.warn("[CREP/Fungal] Failed to fetch taxa lookup:", error)
  }
  
  return lookup
}

/**
 * Transform MINDEX observation data to FungalObservation format
 * 
 * MINDEX API returns observations with:
 * - location.coordinates: [lng, lat] GeoJSON array
 * - metadata.uri: direct iNaturalist/GBIF link
 * - media[]: array of {url, attribution, license_code}
 * - source: "inat" or "gbif"
 * - source_id: external observation ID
 */
function transformMINDEXData(observations: Record<string, unknown>[], taxaLookup: Map<string, { canonical_name: string; common_name?: string }>): FungalObservation[] {
  return observations
    .filter((obs) => {
      // Parse coordinates from MINDEX format ("lng lat" string)
      const coords = parseCoordinates(obs)
      if (!coords || coords.lat === 0 || coords.lng === 0) return false
      
      // Must have timestamp
      const timestamp = obs.observed_at || obs.created_at || obs.eventDate
      if (!timestamp) return false
      
      return true
    })
    .map((obs) => {
      // Parse coordinates
      const coords = parseCoordinates(obs)!
      
      // Determine original source and get source URL
      const originalSource = (obs.source || "").toLowerCase()
      const externalId = obs.source_id || obs.metadata?.inat_id || obs.id
      
      // Use metadata.uri directly if available (best option!)
      let sourceUrl = obs.metadata?.uri || ""
      let displaySource: "MINDEX" | "iNaturalist" | "GBIF" = "MINDEX"
      
      if (originalSource === "inat" || originalSource.includes("inaturalist")) {
        displaySource = "iNaturalist"
        if (!sourceUrl && externalId) {
          sourceUrl = `https://www.inaturalist.org/observations/${externalId}`
        }
      } else if (originalSource === "gbif" || originalSource.includes("gbif")) {
        displaySource = "GBIF"
        if (!sourceUrl && externalId) {
          sourceUrl = `https://www.gbif.org/occurrence/${externalId}`
        }
      }
      
      // Get image URL from media array (MINDEX format)
      // Media objects are like: {url, attribution, license_code}
      let imageUrl = ""
      let thumbnailUrl = ""
      
      if (obs.media && Array.isArray(obs.media) && obs.media.length > 0) {
        // Media might be objects or strings (PowerShell formatting)
        const firstMedia = obs.media[0]
        if (typeof firstMedia === "string") {
          // PowerShell formatted: "@{url=...; attribution=...}"
          const urlMatch = firstMedia.match(/url=([^;}\s]+)/)
          if (urlMatch) {
            imageUrl = urlMatch[1]
          }
        } else if (firstMedia?.url) {
          imageUrl = firstMedia.url
        }
        
        // Generate thumbnail from large image
        if (imageUrl) {
          thumbnailUrl = imageUrl.replace("/large.", "/square.").replace("/medium.", "/square.")
        }
      }
      
      // Fallback to other image fields
      if (!imageUrl) {
        imageUrl = obs.photos?.[0]?.url || obs.image_url || ""
      }
      
      // Get taxon name from lookup
      const taxon = obs.taxon_id ? taxaLookup.get(obs.taxon_id) : undefined
      const canonicalName = taxon?.canonical_name || 
                            obs.taxon?.name || 
                            obs.species_name || 
                            obs.scientific_name ||
                            "Unknown Fungus"
      const commonName = taxon?.common_name || 
                         obs.taxon?.common_name || 
                         obs.vernacular_name || 
                         obs.common_name
      
      return {
        id: `mindex-${obs.id}`,
        species: commonName || canonicalName,
        scientificName: canonicalName,
        commonName: commonName,
        latitude: coords.lat,
        longitude: coords.lng,
        timestamp: obs.observed_at || obs.created_at,
        source: displaySource,
        verified: obs.quality_grade === "research" || obs.verified === true,
        observer: obs.observer || obs.user?.name || "Unknown",
        imageUrl,
        thumbnailUrl,
        location: obs.metadata?.place_guess || obs.location_name || obs.locality,
        habitat: obs.habitat,
        notes: obs.notes || obs.description,
        hasGps: true,
        geocodeStatus: "complete" as const,
        sourceUrl,
        externalId: externalId?.toString(),
        kingdom: obs.kingdom || obs.iconic_taxon_name || obs.taxon?.kingdom || "Fungi",
        iconicTaxon: obs.iconic_taxon_name || obs.taxon?.iconic_taxon_name || "Fungi",
        taxonId: obs.taxon_id,
      }
    })
}

/**
 * Parse coordinates from MINDEX location format
 * MINDEX stores coordinates as: location.coordinates = "lng lat" (space-separated string)
 */
function parseCoordinates(obs: Record<string, unknown>): { lat: number; lng: number } | null {
  // Try direct lat/lng fields first
  if (typeof obs.latitude === "number" && typeof obs.longitude === "number") {
    return { lat: obs.latitude, lng: obs.longitude }
  }
  
  // Parse MINDEX format: location.coordinates = "lng lat"
  if (obs.location?.coordinates) {
    const coordStr = obs.location.coordinates
    if (typeof coordStr === "string") {
      const parts = coordStr.trim().split(/\s+/)
      if (parts.length >= 2) {
        const lng = parseFloat(parts[0])
        const lat = parseFloat(parts[1])
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng }
        }
      }
    }
    // GeoJSON format: [lng, lat]
    if (Array.isArray(coordStr)) {
      return { lat: coordStr[1], lng: coordStr[0] }
    }
  }
  
  // Try location.lat/lng
  if (obs.location?.lat && obs.location?.lng) {
    return { lat: parseFloat(obs.location.lat), lng: parseFloat(obs.location.lng) }
  }
  
  return null
}

/**
 * Key regions for fungal data - ensures global coverage with emphasis on priority areas
 */
const FUNGAL_HOTSPOT_REGIONS = [
  // ═══════════════════════════════════════════════════════════════════════════
  // PRIORITY 1 - User's primary location (San Diego County, CA)
  // ═══════════════════════════════════════════════════════════════════════════
  { name: "San Diego County", north: 33.5, south: 32.5, east: -116.0, west: -117.6 },
  { name: "Southern California", north: 35.0, south: 32.0, east: -114.0, west: -121.0 },
  // ═══════════════════════════════════════════════════════════════════════════
  // PRIORITY 2 - Major fungal hotspots
  // ═══════════════════════════════════════════════════════════════════════════
  { name: "Pacific Northwest", north: 49.0, south: 42.0, east: -116.0, west: -125.0 },
  { name: "Northern California", north: 42.0, south: 35.0, east: -119.0, west: -125.0 },
  { name: "UK & Ireland", north: 60.0, south: 49.0, east: 2.0, west: -11.0 },
  { name: "Central Europe", north: 55.0, south: 45.0, east: 20.0, west: 0.0 },
  { name: "Scandinavia", north: 71.0, south: 55.0, east: 32.0, west: 4.0 },
  // ═══════════════════════════════════════════════════════════════════════════
  // GLOBAL COVERAGE
  // ═══════════════════════════════════════════════════════════════════════════
  { name: "Japan", north: 46.0, south: 30.0, east: 146.0, west: 128.0 },
  { name: "Australia/NZ", north: -10.0, south: -47.0, east: 180.0, west: 110.0 },
  { name: "East Coast USA", north: 45.0, south: 35.0, east: -70.0, west: -85.0 },
]

// All iNaturalist iconic taxa for comprehensive all-life coverage
const ALL_ICONIC_TAXA = [
  "Fungi", "Plantae", "Aves", "Mammalia", "Reptilia",
  "Amphibia", "Actinopterygii", "Mollusca", "Arachnida", "Insecta",
]

/**
 * Fetch observations from iNaturalist - ALL LIFE, MULTI-REGION
 * Fetches all iconic taxa for comprehensive biodiversity coverage
 */
async function fetchINaturalistObservations(
  limit: number,
  bounds?: { north: number; south: number; east: number; west: number },
  kingdom?: string,
): Promise<FungalObservation[]> {
  const allObservations: FungalObservation[] = []

  // Determine which taxa to fetch
  const taxaToFetch = kingdom && kingdom !== "all"
    ? [kingdom]
    : ALL_ICONIC_TAXA

  const perRegionLimit = Math.ceil(limit / (bounds ? taxaToFetch.length : FUNGAL_HOTSPOT_REGIONS.length * taxaToFetch.length))

  // If specific bounds provided, use those; otherwise fetch from all hotspots
  const regionsToFetch = bounds
    ? [{ name: "Custom", ...bounds }]
    : FUNGAL_HOTSPOT_REGIONS

  await Promise.all(
    regionsToFetch.flatMap((region) =>
      taxaToFetch.map(async (taxon) => {
        try {
          const params = new URLSearchParams({
            iconic_taxa: taxon,
            quality_grade: "research,needs_id",
            per_page: String(Math.min(perRegionLimit, 200)),
            order: "desc",
            order_by: "observed_on",
            geo: "true",
            photos: "true",
            nelat: String(region.north),
            nelng: String(region.east),
            swlat: String(region.south),
            swlng: String(region.west),
          })

          const response = await fetch(`${INATURALIST_API}/observations?${params}`, {
            headers: { "Accept": "application/json" },
            next: { revalidate: 300 },
          })

          if (!response.ok) {
            console.warn(`[CREP/Life] iNaturalist API error for ${region.name}/${taxon}:`, response.status)
            return
          }

          const data = await response.json()
          if (data.results?.length > 0) {
            console.log(`[CREP/Life] Fetched ${data.results.length} ${taxon} from ${region.name}`)
          }

          const regionObs = (data.results || [])
            .filter((obs: Record<string, unknown>) => (obs.geojson as Record<string, unknown>)?.coordinates || obs.location)
            .map((obs: Record<string, unknown>) => ({
              id: `inat-${obs.id}`,
              species: obs.taxon?.preferred_common_name || obs.taxon?.name || "Unknown",
              scientificName: obs.taxon?.name || "Unknown",
              commonName: obs.taxon?.preferred_common_name,
              latitude: obs.geojson?.coordinates?.[1] || parseFloat(obs.location?.split(",")[0]) || 0,
              longitude: obs.geojson?.coordinates?.[0] || parseFloat(obs.location?.split(",")[1]) || 0,
              timestamp: obs.observed_on || obs.created_at,
              source: "iNaturalist" as const,
              verified: obs.quality_grade === "research",
              observer: obs.user?.login || "Anonymous",
              imageUrl: obs.photos?.[0]?.url?.replace("square", "medium"),
              thumbnailUrl: obs.photos?.[0]?.url,
              location: obs.place_guess || region.name,
              notes: obs.description,
              hasGps: true,
              geocodeStatus: "complete" as const,
              kingdom: obs.taxon?.iconic_taxon_name || taxon,
              iconicTaxon: obs.taxon?.iconic_taxon_name || taxon,
              taxonId: obs.taxon?.id,
            }))

          allObservations.push(...regionObs)
        } catch (error) {
          console.error(`[CREP/Life] Failed to fetch ${taxon} data for ${region.name}:`, error)
        }
      })
    )
  )

  console.log(`[CREP/Life] Total iNaturalist observations fetched: ${allObservations.length}`)
  return allObservations
}

// GBIF kingdom keys for all-life coverage
const GBIF_KINGDOMS: Record<string, string> = {
  Fungi: "5", Plantae: "6", Animalia: "1", Chromista: "4", Protozoa: "7", Bacteria: "3",
}

/**
 * Fetch observations from GBIF - ALL LIFE
 */
async function fetchGBIFObservations(limit: number, kingdom?: string): Promise<FungalObservation[]> {
  const allObs: FungalObservation[] = []
  const kingdomsToFetch = kingdom && kingdom !== "all" && GBIF_KINGDOMS[kingdom]
    ? [[kingdom, GBIF_KINGDOMS[kingdom]]]
    : Object.entries(GBIF_KINGDOMS)
  const perKingdom = Math.ceil(limit / kingdomsToFetch.length)

  await Promise.all(
    kingdomsToFetch.map(async ([kName, kKey]) => {
      try {
        const params = new URLSearchParams({
          kingdomKey: kKey,
          limit: String(Math.min(perKingdom, 100)),
          hasCoordinate: "true",
          hasGeospatialIssue: "false",
        })

        const response = await fetch(`${GBIF_API}/occurrence/search?${params}`, {
          headers: { "Accept": "application/json" },
          next: { revalidate: 300 },
        })

        if (!response.ok) return

        const data = await response.json()
        const obs = (data.results || [])
          .filter((o: Record<string, unknown>) => o.decimalLatitude && o.decimalLongitude)
          .map((o: Record<string, unknown>) => ({
            id: `gbif-${o.key}`,
            species: o.vernacularName || o.species || "Unknown",
            scientificName: o.scientificName || "Unknown",
            commonName: o.vernacularName,
            latitude: o.decimalLatitude,
            longitude: o.decimalLongitude,
            timestamp: o.eventDate || o.dateIdentified || new Date().toISOString(),
            source: "GBIF" as const,
            verified: !o.issues?.length,
            observer: o.recordedBy || "Unknown",
            imageUrl: undefined,
            thumbnailUrl: undefined,
            location: o.locality || o.country,
            habitat: o.habitat,
            hasGps: true,
            geocodeStatus: "complete" as const,
            kingdom: o.kingdom || kName,
            iconicTaxon: o.kingdom || kName,
          }))
        allObs.push(...obs)
      } catch (error) {
        console.error(`[CREP/Life] Failed to fetch GBIF ${kName} data:`, error)
      }
    })
  )
  return allObs
}

/**
 * Queue pending observations for geocoding
 */
async function queuePendingGeocoding(): Promise<number> {
  try {
    const response = await fetch(`${MINDEX_API}/api/v1/observations?has_gps=false&limit=100`, {
      signal: AbortSignal.timeout(3000),
    })

    if (!response.ok) return 0

    const data = await response.json()
    const pendingCount = data.observations?.length || 0

    if (pendingCount > 0) {
      // Trigger background geocoding job
      fetch(`${MINDEX_API}/api/v1/geocoding/queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observation_ids: data.observations.map((o: Record<string, unknown>) => o.id) }),
      }).catch(() => {
        // Fire and forget - geocoding runs in background
      })
    }

    return pendingCount
  } catch {
    return 0
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const searchParams = request.nextUrl.searchParams
  // Default to no limit (get everything from MINDEX)
  const limitParam = searchParams.get("limit")
  const limit = limitParam ? parseInt(limitParam) : undefined
  const source = searchParams.get("source") // "mindex" | "inat" | "gbif" | "all"
  const fallbackOnly = searchParams.get("fallback") === "true" // Force external API fallback
  const noCache = searchParams.get("nocache") === "true" // Force cache bypass
  // Kingdom filter: "Fungi", "Plantae", "Animalia", "all" (default: "all")
  const kingdom = searchParams.get("kingdom") || "all"

  // Bounds for geographic filtering
  const north = searchParams.get("north") ? parseFloat(searchParams.get("north")!) : undefined
  const south = searchParams.get("south") ? parseFloat(searchParams.get("south")!) : undefined
  const east = searchParams.get("east") ? parseFloat(searchParams.get("east")!) : undefined
  const west = searchParams.get("west") ? parseFloat(searchParams.get("west")!) : undefined

  const bounds = north && south && east && west ? { north, south, east, west } : undefined

  // ═══════════════════════════════════════════════════════════════════════════
  // CACHE CHECK - Return cached data if valid (for near-instant response)
  // ═══════════════════════════════════════════════════════════════════════════
  if (!noCache && !fallbackOnly) {
    const cached = getCachedData()
    if (cached) {
      // Apply bounds filter to cached data if provided
      let filteredObs = cached.observations
      if (bounds) {
        filteredObs = cached.observations.filter(obs =>
          obs.latitude >= bounds.south &&
          obs.latitude <= bounds.north &&
          obs.longitude >= bounds.west &&
          obs.longitude <= bounds.east
        )
      }
      
      // Apply limit if provided
      const finalObs = limit ? filteredObs.slice(0, limit) : filteredObs
      
      // Log cache hit to MINDEX
      const latency = Date.now() - startTime
      logDataCollection("fungal", "mindex-cache", finalObs.length, latency, true, "memory")
      
      return NextResponse.json({
        observations: finalObs,
        meta: {
          total: finalObs.length,
          sources: cached.sources,
          cached: true,
          cacheAge: Math.round((Date.now() - cached.timestamp) / 1000),
          timestamp: new Date().toISOString(),
        },
      })
    }
  }

  let allObservations: FungalObservation[] = []

  // ═══════════════════════════════════════════════════════════════════════════
  // MINDEX IS PRIMARY - Get all data from local database first
  // Only fall back to external APIs if MINDEX fails or is empty
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (!fallbackOnly && (!source || source === "all" || source === "mindex")) {
    console.log("[CREP/Fungal] Fetching PRIMARY data from MINDEX (no limit)...")
    const mindexObs = await fetchMINDEXObservations(limit)
    
    if (mindexObs.length > 0) {
      console.log(`[CREP/Fungal] ✅ MINDEX returned ${mindexObs.length} observations - using as primary source`)
      allObservations = mindexObs
      
      // If we got good data from MINDEX, we don't need external APIs
      // MINDEX already contains iNaturalist/GBIF data from ETL
    } else {
      console.log("[CREP/Fungal] ⚠️ MINDEX returned 0 observations, falling back to external APIs")
    }
  }
  
  // Fallback to external APIs only if MINDEX failed or was explicitly disabled
  if (allObservations.length === 0 || fallbackOnly) {
    console.log("[CREP/Life] Using external API fallback (iNaturalist + GBIF) for ALL LIFE...")

    const fetchPromises: Promise<FungalObservation[]>[] = []

    if (!source || source === "all" || source === "inat") {
      fetchPromises.push(fetchINaturalistObservations(limit || 2000, bounds, kingdom))
    }
    if (!source || source === "all" || source === "gbif") {
      fetchPromises.push(fetchGBIFObservations(limit ? Math.ceil(limit * 0.3) : 500, kingdom))
    }

    const results = await Promise.all(fetchPromises)
    allObservations = results.flat()
    console.log(`[CREP/Life] External APIs returned ${allObservations.length} observations across all kingdoms`)
  }

  // Apply kingdom filter if not "all" and data came from MINDEX (which has mixed kingdoms)
  if (kingdom !== "all") {
    allObservations = allObservations.filter(obs =>
      (obs.kingdom || "").toLowerCase() === kingdom.toLowerCase() ||
      (obs.iconicTaxon || "").toLowerCase() === kingdom.toLowerCase()
    )
  }

  // Deduplicate by species name + coordinates (close proximity = same observation)
  const uniqueObservations = deduplicateObservations(allObservations)

  // Filter to valid coordinates only
  const validObservations = uniqueObservations.filter(
    (obs) => 
      obs.latitude !== 0 && 
      obs.longitude !== 0 && 
      !isNaN(obs.latitude) && 
      !isNaN(obs.longitude)
  )

  // Apply geographic filter if bounds provided
  const filteredObservations = bounds
    ? validObservations.filter(
        (obs) =>
          obs.latitude >= bounds.south &&
          obs.latitude <= bounds.north &&
          obs.longitude >= bounds.west &&
          obs.longitude <= bounds.east
      )
    : validObservations

  // Sort by timestamp (most recent first)
  const sortedObservations = filteredObservations
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // Only apply limit if explicitly requested
  const finalObservations = limit && limit > 0 
    ? sortedObservations.slice(0, limit) 
    : sortedObservations

  // Queue background geocoding for MINDEX observations without GPS
  const pendingGeocode = await queuePendingGeocoding()

  // Build sources object
  const sources = {
    mindex: finalObservations.filter(o => o.source === "MINDEX").length,
    iNaturalist: finalObservations.filter(o => o.source === "iNaturalist").length,
    gbif: finalObservations.filter(o => o.source === "GBIF").length,
  }

  // Build kingdom breakdown
  const kingdoms: Record<string, number> = {}
  for (const obs of finalObservations) {
    const k = obs.kingdom || obs.iconicTaxon || "Unknown"
    kingdoms[k] = (kingdoms[k] || 0) + 1
  }

  // Cache the data for near-instant subsequent requests
  setCachedData(finalObservations, sources)

  // Log to MINDEX
  const latency = Date.now() - startTime
  const primarySource = sources.mindex > 0 ? "mindex" : sources.iNaturalist > 0 ? "inaturalist" : "gbif"
  logDataCollection("fungal", primarySource, finalObservations.length, latency, false)

  console.log(`[CREP/Life] Returning ${finalObservations.length} observations across ${Object.keys(kingdoms).length} kingdoms`)

  return NextResponse.json({
    observations: finalObservations,
    meta: {
      total: finalObservations.length,
      sources,
      kingdoms,
      pendingGeocode,
      cached: false,
      timestamp: new Date().toISOString(),
      dataSource: allObservations.length > 0 && finalObservations[0]?.source !== "MINDEX"
        ? "external_fallback"
        : "mindex_primary",
    },
  })
}

/**
 * Deduplicate observations by ID and by proximity
 * (same species within ~100m = likely same observation from different sources)
 */
function deduplicateObservations(observations: FungalObservation[]): FungalObservation[] {
  const seen = new Map<string, FungalObservation>()
  
  for (const obs of observations) {
    // Primary key: exact ID
    if (seen.has(obs.id)) continue
    
    // Secondary check: same species at same location (within ~0.001 degrees ≈ 100m)
    const locationKey = `${obs.species}-${obs.latitude.toFixed(3)}-${obs.longitude.toFixed(3)}`
    if (seen.has(locationKey)) continue
    
    seen.set(obs.id, obs)
    seen.set(locationKey, obs)
  }
  
  // Return unique observations only
  return Array.from(new Map([...seen.entries()].filter(([key]) => key.startsWith("mindex-") || key.startsWith("inat-") || key.startsWith("gbif-"))).values())
}
