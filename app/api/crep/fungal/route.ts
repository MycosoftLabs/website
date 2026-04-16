/**
 * CREP Observation Data API - PRIMARY DATA ENDPOINT
 *
 * This is the main data source for the CREP dashboard's biodiversity layers.
 * Serves ALL life data (fungi, plants, animals, birds, insects, marine).
 *
 * DATA STRATEGY — DUAL-SOURCE + CLONE-ON-DISPLAY:
 * 1. MINDEX (local DB) + iNaturalist API fetched IN PARALLEL every request
 * 2. Results merged & deduplicated so the dashboard shows ALL available data
 * 3. New iNaturalist observations are async-cloned to MINDEX for ETL ingest
 *
 * This ensures users, MYCA, and the Worldview API see live iNaturalist data
 * at the same time it is being scraped into MINDEX.
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
import bboxPolygon from "@turf/bbox-polygon"
import area from "@turf/area"
import { logDataCollection, logAPIError } from "@/lib/oei/mindex-logger"
import { ingestBatchToMINDEX } from "@/lib/crep/species-catalog"

const INATURALIST_API = "https://api.inaturalist.org/v1"
const GBIF_API = "https://api.gbif.org/v1"
// MINDEX runs on port 8000 (Docker container)
const MINDEX_API = process.env.MINDEX_API_URL || "http://localhost:8000"

const EXTERNAL_API_TIMEOUT_MS = 10000 // 10s per request
const EXTERNAL_API_MAX_RETRIES = 2

/** Fetch with timeout and retry for external APIs (iNaturalist, GBIF) to reduce ConnectTimeoutError */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = EXTERNAL_API_MAX_RETRIES,
): Promise<Response> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    const signal = AbortSignal.timeout(EXTERNAL_API_TIMEOUT_MS)
    try {
      const res = await fetch(url, { ...options, signal })
      return res
    } catch (err) {
      lastErr = err
      if (attempt < retries) {
        const delay = 500 * Math.pow(2, attempt)
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  }
  throw lastErr
}

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
// Next.js response payload limit ~2MB - skip cache for large payloads
const MAX_CACHE_PAYLOAD_BYTES = 1.5 * 1024 * 1024 // 1.5 MB

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
  const payloadSize = new Blob([JSON.stringify(observations)]).size
  if (payloadSize > MAX_CACHE_PAYLOAD_BYTES) {
    console.log(`[CREP/Fungal] ⚠️ Skipping cache: payload ${(payloadSize / 1024 / 1024).toFixed(2)}MB exceeds ${(MAX_CACHE_PAYLOAD_BYTES / 1024 / 1024).toFixed(1)}MB limit`)
    return
  }
  dataCache = {
    observations,
    timestamp: Date.now(),
    sources,
  }
  console.log(`[CREP/Fungal] 💾 Cached ${observations.length} observations (${(payloadSize / 1024).toFixed(0)}KB)`)
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
 * Fetch observations from local MINDEX database
 * 
 * MINDEX is the PRIMARY source - contains pre-imported iNaturalist/GBIF data.
 * Supports bbox for viewport-based fetching (iNaturalist-style).
 */
async function fetchMINDEXObservations(
  limit?: number,
  bounds?: { north: number; south: number; east: number; west: number },
): Promise<FungalObservation[]> {
  try {
    const BATCH_SIZE = 1000
    const MAX_OBSERVATIONS = limit || 25000
    
    const allObservations: Record<string, unknown>[] = []
    let offset = 0
    let hasMore = true
    
    const bboxStr = bounds
      ? `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`
      : undefined
    
    console.log(`[CREP/Fungal] Fetching from MINDEX (bbox=${bboxStr ? "yes" : "no"}, max ${MAX_OBSERVATIONS})...`)
    
    while (hasMore && allObservations.length < MAX_OBSERVATIONS) {
      const params = new URLSearchParams({
        limit: String(BATCH_SIZE),
        offset: String(offset),
        order_by: "observed_at",
        order: "desc",
      })
      if (bboxStr) {
        params.set("bbox", bboxStr)
      }
      
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
    
    const taxaLookup = await fetchTaxaForObservations(allObservations)
    
    return transformMINDEXData(allObservations, taxaLookup)
  } catch (error) {
    console.error("[CREP/Fungal] Failed to fetch MINDEX data:", error)
    return []
  }
}

/**
 * Fetch taxa by IDs only (batch lookup) - much faster than loading all ~19K taxa.
 * MINDEX supports ?ids=uuid1,uuid2,... for targeted fetch. Single request, ~100-500 IDs typical.
 */
async function fetchTaxaForObservations(observations: Record<string, unknown>[]): Promise<Map<string, { canonical_name: string; common_name?: string }>> {
  const uniqueIds = [...new Set(
    observations
      .map((obs: Record<string, unknown>) => obs.taxon_id as string)
      .filter((id): id is string => !!id && typeof id === "string")
  )] as string[]

  if (uniqueIds.length === 0) {
    return new Map()
  }

  const lookup = new Map<string, { canonical_name: string; common_name?: string }>()

  try {
    const idsParam = uniqueIds.slice(0, 500).join(",")
    const response = await fetch(
      `${MINDEX_API}/api/mindex/taxa?ids=${encodeURIComponent(idsParam)}&limit=1000`,
      {
        headers: {
          "Accept": "application/json",
          "X-API-Key": process.env.MINDEX_API_KEY || "local-dev-key",
        },
        signal: AbortSignal.timeout(8000),
      }
    )

    if (!response.ok) {
      console.warn(`[CREP/Fungal] Taxa batch fetch failed: ${response.status}`)
      return lookup
    }

    const data = await response.json()
    const taxa = data.data || data.taxa || []

    for (const taxon of taxa) {
      lookup.set(String(taxon.id), {
        canonical_name: taxon.canonical_name || "Unknown",
        common_name: taxon.common_name,
      })
    }

    console.log(`[CREP/Fungal] ✅ Fetched ${lookup.size} taxa for ${uniqueIds.length} unique IDs (batch)`)
  } catch (error) {
    console.warn("[CREP/Fungal] Failed to fetch taxa batch:", error)
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
    .filter((obs: any) => {
      // Parse coordinates from MINDEX format ("lng lat" string)
      const coords = parseCoordinates(obs)
      if (!coords || coords.lat === 0 || coords.lng === 0) return false

      // Must have timestamp
      const timestamp = obs.observed_at || obs.created_at || obs.eventDate
      if (!timestamp) return false

      return true
    })
    .map((obs: any) => {
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
function parseCoordinates(obs: any): { lat: number; lng: number } | null {
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

  // Throttle: stagger requests to avoid iNaturalist 429 rate limit
  // Process 3 at a time with 200ms delay between batches
  const allTasks = regionsToFetch.flatMap((region) =>
    taxaToFetch.map((taxon) => ({ region, taxon }))
  );
  for (let i = 0; i < allTasks.length; i += 3) {
    const batch = allTasks.slice(i, i + 3);
    await Promise.all(batch.map(async ({ region, taxon }) => {
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

          const response = await fetchWithRetry(`${INATURALIST_API}/observations?${params}`, {
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
            .filter((obs: any) => obs.geojson?.coordinates || obs.location)
            .map((obs: any) => {
              // iNaturalist: geojson.coordinates is [lng, lat]; location is "lat,lng" string
              let lat = obs.geojson?.coordinates?.[1]
              let lng = obs.geojson?.coordinates?.[0]
              if (lat == null || lng == null) {
                const parts = obs.location?.split(",")
                if (parts?.length >= 2) {
                  lat = parseFloat(parts[0])
                  lng = parseFloat(parts[1])
                }
              }
              return {
              id: `inat-${obs.id}`,
              species: obs.taxon?.preferred_common_name || obs.taxon?.name || "Unknown",
              scientificName: obs.taxon?.name || "Unknown",
              commonName: obs.taxon?.preferred_common_name,
              latitude: Number(lat) || 0,
              longitude: Number(lng) || 0,
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
              sourceUrl: `https://www.inaturalist.org/observations/${obs.id}`,
            }})

          allObservations.push(...regionObs)
        } catch (error) {
          console.error(`[CREP/Life] Failed to fetch ${taxon} data for ${region.name}:`, error)
        }
      }));
    // 200ms delay between batches to avoid iNaturalist 429 rate limit
    if (i + 3 < allTasks.length) await new Promise(r => setTimeout(r, 200));
  }

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

        const response = await fetchWithRetry(`${GBIF_API}/occurrence/search?${params}`, {
          headers: { "Accept": "application/json" },
          next: { revalidate: 300 },
        })

        if (!response.ok) return

        const data = await response.json()
        const obs = (data.results || [])
          .filter((o: any) => o.decimalLatitude && o.decimalLongitude)
          .map((o: any) => ({
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
 * CLONE-ON-DISPLAY: Async-write live iNaturalist observations to MINDEX
 *
 * When the dashboard fetches fresh iNat data, we fire-and-forget a POST
 * to MINDEX so the ETL layer ingests them. This means the data is
 * simultaneously visible to the user AND being scraped into MINDEX.
 *
 * Deduplication happens server-side in MINDEX (unique on source + source_id).
 */
function cloneToMINDEX(observations: FungalObservation[]): void {
  // Only clone iNaturalist-sourced observations that aren't already from MINDEX
  const inatObs = observations.filter(
    (obs) => obs.source === "iNaturalist" && obs.externalId
  )
  if (inatObs.length === 0) return

  const payload = inatObs.map((obs) => ({
    source: "inat",
    source_id: obs.externalId,
    observed_at: obs.timestamp,
    observer: obs.observer,
    lat: obs.latitude,
    lng: obs.longitude,
    taxon_name: obs.scientificName,
    taxon_common_name: obs.commonName,
    taxon_inat_id: obs.taxonId,
    iconic_taxon_name: obs.iconicTaxon || obs.kingdom,
    photos: obs.imageUrl
      ? [{ url: obs.imageUrl, attribution: "© iNaturalist", license_code: "CC-BY-NC" }]
      : [],
    notes: obs.notes,
    metadata: {
      uri: obs.sourceUrl,
      place_guess: obs.location,
      quality_grade: obs.verified ? "research" : "needs_id",
      clone_source: "crep-display",
    },
  }))

  // Fire and forget — don't block the response
  fetch(`${MINDEX_API}/api/mindex/observations/bulk`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.MINDEX_API_KEY || "local-dev-key",
    },
    body: JSON.stringify({ observations: payload }),
    signal: AbortSignal.timeout(30000),
  })
    .then((res) => {
      if (res.ok) {
        console.log(`[CREP/Clone] ✅ Cloned ${payload.length} iNat observations to MINDEX`)
      } else {
        console.warn(`[CREP/Clone] MINDEX bulk ingest returned ${res.status}`)
      }
    })
    .catch((err) => {
      console.warn("[CREP/Clone] Failed to clone to MINDEX (non-blocking):", err?.message)
    })
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

  // Bounds for geographic filtering (optional bbox validation via Turf)
  const north = searchParams.get("north") ? parseFloat(searchParams.get("north")!) : undefined
  const south = searchParams.get("south") ? parseFloat(searchParams.get("south")!) : undefined
  const east = searchParams.get("east") ? parseFloat(searchParams.get("east")!) : undefined
  const west = searchParams.get("west") ? parseFloat(searchParams.get("west")!) : undefined

  let bounds: { north: number; south: number; east: number; west: number } | undefined =
    north != null && south != null && east != null && west != null ? { north, south, east, west } : undefined

  const hadBoundsParams = north != null || south != null || east != null || west != null
  if (bounds) {
    try {
      const bbox = [bounds.west, bounds.south, bounds.east, bounds.north] as [number, number, number, number]
      const poly = bboxPolygon(bbox)
      const a = area(poly)
      if (
        !Number.isFinite(a) ||
        a <= 0 ||
        bounds.south >= bounds.north ||
        bounds.west >= bounds.east ||
        bounds.south < -90 ||
        bounds.north > 90 ||
        bounds.west < -180 ||
        bounds.east > 180
      ) {
        if (hadBoundsParams) {
          return NextResponse.json(
            { error: "Invalid bounds", detail: "Bounds must be valid: -90<=lat<=90, -180<=lng<=180, south<north, west<east" },
            { status: 400 }
          )
        }
        bounds = undefined
      }
    } catch {
      if (hadBoundsParams) {
        return NextResponse.json({ error: "Invalid bounds", detail: "Bounds could not be parsed" }, { status: 400 })
      }
      bounds = undefined
    }
  }

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

  try {
    // ═══════════════════════════════════════════════════════════════════════════
    // DUAL-SOURCE: MINDEX + iNaturalist fetched IN PARALLEL
    // Shows ALL available data — ETL'd + live. New live data cloned to MINDEX.
    // ═══════════════════════════════════════════════════════════════════════════

    const fetchPromises: Promise<FungalObservation[]>[] = []

    // Always fetch MINDEX (local DB — fast, no rate limits)
    if (!fallbackOnly && (!source || source === "all" || source === "mindex")) {
      fetchPromises.push(
        fetchMINDEXObservations(limit, bounds).catch((err) => {
          console.warn("[CREP/Fungal] MINDEX fetch failed:", err?.message)
          return [] as FungalObservation[]
        })
      )
    }

    // Always fetch iNaturalist live (unless source=mindex only)
    if (!source || source === "all" || source === "inat" || fallbackOnly) {
      fetchPromises.push(
        fetchINaturalistObservations(limit || 2000, bounds, kingdom).catch((err) => {
          console.warn("[CREP/Life] iNaturalist fetch failed:", err?.message)
          return [] as FungalObservation[]
        })
      )
    }

    // Optionally include GBIF
    if (!source || source === "all" || source === "gbif") {
      fetchPromises.push(
        fetchGBIFObservations(limit ? Math.ceil(limit * 0.3) : 500, kingdom).catch((err) => {
          console.warn("[CREP/Life] GBIF fetch failed:", err?.message)
          return [] as FungalObservation[]
        })
      )
    }

    const results = await Promise.all(fetchPromises)
    allObservations = results.flat()
    console.log(`[CREP/Life] Dual-source total: ${allObservations.length} observations (MINDEX + live APIs merged)`)

    // Clone-on-display: async-write new iNat observations to MINDEX
    // This runs in the background — does NOT block the response
    cloneToMINDEX(allObservations)

    // Fire-and-forget: persist ALL observations to MINDEX species catalog for offline access
    ingestBatchToMINDEX(allObservations).catch(() => {})

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
    const primarySource = sources.mindex > 0 && sources.iNaturalist > 0 ? "dual-source" : sources.mindex > 0 ? "mindex" : sources.iNaturalist > 0 ? "inaturalist" : "gbif"
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
        dataSource: sources.mindex > 0 && (sources.iNaturalist > 0 || sources.gbif > 0)
          ? "dual_source_merged"
          : sources.mindex > 0
          ? "mindex_primary"
          : "live_api",
      },
    })
  } catch (error) {
    console.error("[CREP/Fungal] Unhandled error fetching observations:", error)
    // Return 200 with empty data when all sources fail - never 500
    const latency = Date.now() - startTime
    logAPIError("fungal", "crep-fungal-route", String(error), latency)
    return NextResponse.json({
      observations: [],
      meta: {
        total: 0,
        sources: { mindex: 0, iNaturalist: 0, gbif: 0 },
        kingdoms: {},
        pendingGeocode: 0,
        cached: false,
        timestamp: new Date().toISOString(),
        dataSource: "error_fallback",
        error: "Data sources temporarily unavailable",
      },
    })
  }
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
