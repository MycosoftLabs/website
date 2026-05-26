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
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"
import bboxPolygon from "@turf/bbox-polygon"
import area from "@turf/area"
import { logDataCollection, logAPIError } from "@/lib/oei/mindex-logger"
import { ingestBatchToMINDEX } from "@/lib/crep/species-catalog"
import { isPlausibleNatureMarkerPlacement } from "@/lib/crep/nature-land-filter"

const INATURALIST_API = "https://api.inaturalist.org/v1"
const GBIF_API = "https://api.gbif.org/v1"
// MINDEX runs on port 8000 (Docker container)
const MINDEX_API = resolveMindexServerBaseUrl()

const EXTERNAL_API_TIMEOUT_MS = 10000 // 10s per request
const EXTERNAL_API_MAX_RETRIES = 2
const configuredMindexObservationTimeout = Number(process.env.CREP_MINDEX_OBSERVATIONS_TIMEOUT_MS)
const MINDEX_OBSERVATIONS_TIMEOUT_MS =
  Number.isFinite(configuredMindexObservationTimeout) && configuredMindexObservationTimeout > 0
    ? configuredMindexObservationTimeout
    : process.env.NODE_ENV === "development"
      ? 1500
      : 5000

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
      const { next: _next, ...safeOptions } = options as RequestInit & { next?: unknown }
      const res = await fetch(url, { ...safeOptions, signal, cache: "no-store" })
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
  kingdom: string
}

interface MindexTaxonLookupRecord {
  canonical_name: string
  common_name?: string
  kingdom?: string
  iconic_taxon_name?: string
}

let dataCache: CachedData | null = null
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
// Next.js response payload limit ~2MB - skip cache for large payloads
const MAX_CACHE_PAYLOAD_BYTES = 1.5 * 1024 * 1024 // 1.5 MB

function isCacheValid(): boolean {
  if (!dataCache) return false
  return Date.now() - dataCache.timestamp < CACHE_TTL_MS
}

function getCachedData(kingdom: string): CachedData | null {
  if (isCacheValid()) {
    if (normalizeTaxonToken(dataCache?.kingdom) !== normalizeTaxonToken(kingdom)) {
      return null
    }
    console.log(`[CREP/Fungal] ⚡ Using cached data (${dataCache?.observations.length} observations, ${Math.round((Date.now() - dataCache!.timestamp) / 1000)}s old)`)
    return dataCache
  }
  return null
}

function setCachedData(
  observations: FungalObservation[],
  sources: { mindex: number; iNaturalist: number; gbif: number },
  kingdom: string,
): void {
  // NEVER cache empty/near-empty responses. An empty cache entry with a
  // 5-minute TTL would serve every request as blank for 5 min and suppress
  // the fallback path. If we have nothing useful, don't cache — retry next
  // request.
  if (observations.length < 10) {
    console.log(`[CREP/Fungal] Skipping cache: only ${observations.length} observations — will retry next request`)
    return
  }
  const payloadSize = new Blob([JSON.stringify(observations)]).size
  if (payloadSize > MAX_CACHE_PAYLOAD_BYTES) {
    console.log(`[CREP/Fungal] Skipping cache: payload ${(payloadSize / 1024 / 1024).toFixed(2)}MB exceeds ${(MAX_CACHE_PAYLOAD_BYTES / 1024 / 1024).toFixed(1)}MB limit`)
    return
  }
  dataCache = {
    observations,
    timestamp: Date.now(),
    sources,
    kingdom,
  }
  console.log(`[CREP/Fungal] Cached ${observations.length} observations (${(payloadSize / 1024).toFixed(0)}KB)`)
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
  timeoutMs = MINDEX_OBSERVATIONS_TIMEOUT_MS,
  kingdom?: string,
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
      const remaining = MAX_OBSERVATIONS - allObservations.length
      const params = new URLSearchParams({
        limit: String(Math.min(BATCH_SIZE, remaining)),
        offset: String(offset),
        order_by: "observed_at",
        order: "desc",
      })
      if (bboxStr) {
        params.set("bbox", bboxStr)
      }
      // MINDEX nature-stream ingest currently stores coordinates only (no taxon_id /
      // kingdom). Kingdom filtering is done after merge with iNaturalist live data.

      const response = await fetch(`${MINDEX_API}/api/mindex/observations?${params}`, {
        signal: AbortSignal.timeout(timeoutMs),
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
      
      allObservations.push(...observations.slice(0, remaining))
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
    
    const taxaLookup = await fetchTaxaForObservations(allObservations, timeoutMs)
    
    const transformed = transformMINDEXData(allObservations, taxaLookup)
    // Drop unlabeled MINDEX rows (no taxon join) so they never masquerade as fungi.
    return transformed.filter((obs) => {
      const kingdomToken = normalizeTaxonToken(obs.kingdom)
      const iconicToken = normalizeTaxonToken(obs.iconicTaxon)
      if (kingdomToken && kingdomToken !== "unknown") return true
      if (iconicToken && iconicToken !== "unknown") return true
      const speciesToken = normalizeTaxonToken(obs.species || obs.scientificName)
      return speciesToken && speciesToken !== "unknown" && speciesToken !== "unknown species" && Boolean(obs.taxonId)
    })
  } catch (error) {
    console.error("[CREP/Fungal] Failed to fetch MINDEX data:", error)
    return []
  }
}

/**
 * Fetch taxa by IDs only (batch lookup) - much faster than loading all ~19K taxa.
 * MINDEX supports ?ids=uuid1,uuid2,... for targeted fetch. Single request, ~100-500 IDs typical.
 */
async function fetchTaxaForObservations(
  observations: Record<string, unknown>[],
  timeoutMs = MINDEX_OBSERVATIONS_TIMEOUT_MS,
): Promise<Map<string, MindexTaxonLookupRecord>> {
  const uniqueIds = [...new Set(
    observations
      .map((obs: Record<string, unknown>) => obs.taxon_id as string)
      .filter((id): id is string => !!id && typeof id === "string")
  )] as string[]

  if (uniqueIds.length === 0) {
    return new Map()
  }

  const lookup = new Map<string, MindexTaxonLookupRecord>()

  try {
    const idsParam = uniqueIds.slice(0, 500).join(",")
    const response = await fetch(
      `${MINDEX_API}/api/mindex/taxa?ids=${encodeURIComponent(idsParam)}&limit=1000`,
      {
        headers: {
          "Accept": "application/json",
          "X-API-Key": process.env.MINDEX_API_KEY || "local-dev-key",
        },
        signal: AbortSignal.timeout(Math.min(timeoutMs, 3000)),
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
        kingdom: taxon.kingdom,
        iconic_taxon_name: taxon.iconic_taxon_name,
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
function normalizeTaxonToken(value: unknown): string {
  return String(value || "").trim().toLowerCase()
}

function isFungiClassification(value: unknown): boolean {
  const token = normalizeTaxonToken(value)
  return token === "fungi" || token === "fungus"
}

function isFungiOnlyRequest(kingdom?: string): boolean {
  return isFungiClassification(kingdom)
}

const NON_FUNGAL_KINGDOM_TOKENS = new Set([
  "animalia",
  "plantae",
  "chromista",
  "protozoa",
  "bacteria",
  "archaea",
  "viruses",
  "viridae",
])

const NON_FUNGAL_ICONIC_TAXON_TOKENS = new Set([
  "aves",
  "mammalia",
  "reptilia",
  "amphibia",
  "actinopterygii",
  "arachnida",
  "insecta",
  "mollusca",
  "animalia",
  "plantae",
  "chromista",
])

function resolveMindexKingdom(
  obs: Record<string, unknown>,
  taxon?: MindexTaxonLookupRecord,
): { kingdom: string; iconicTaxon: string } {
  const kingdom =
    taxon?.kingdom ||
    obs.kingdom ||
    obs.taxon?.kingdom ||
    (obs.metadata as { kingdom?: string } | undefined)?.kingdom ||
    ""
  const iconic =
    taxon?.iconic_taxon_name ||
    obs.iconic_taxon_name ||
    obs.taxon?.iconic_taxon_name ||
    (obs.metadata as { iconic_taxon_name?: string } | undefined)?.iconic_taxon_name ||
    ""
  const kingdomToken = normalizeTaxonToken(kingdom)
  const iconicToken = normalizeTaxonToken(iconic)
  if (isFungiClassification(kingdomToken) || isFungiClassification(iconicToken)) {
    return { kingdom: "Fungi", iconicTaxon: iconicToken === "fungi" ? "Fungi" : (iconic || "Fungi") }
  }
  if (iconicToken && iconicToken !== "unknown") {
    return { kingdom: kingdom || iconic, iconicTaxon: iconic }
  }
  if (kingdomToken && kingdomToken !== "unknown") {
    return { kingdom: String(kingdom), iconicTaxon: iconic || String(kingdom) }
  }
  return { kingdom: "Unknown", iconicTaxon: "Unknown" }
}

function isValidCoordinatePair(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  if (lat === 0 && lng === 0) return false
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false
  return true
}

function normalizeCoordinatePair(lat: number, lng: number): { lat: number; lng: number } | null {
  if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
    const swappedLat = lng
    const swappedLng = lat
    if (isValidCoordinatePair(swappedLat, swappedLng)) {
      return { lat: swappedLat, lng: swappedLng }
    }
  }
  if (!isValidCoordinatePair(lat, lng)) return null
  return { lat, lng }
}

function isExplicitlyNonFungi(signals: unknown[]): boolean {
  for (const value of signals) {
    const token = normalizeTaxonToken(value)
    if (!token) continue
    if (NON_FUNGAL_KINGDOM_TOKENS.has(token) || NON_FUNGAL_ICONIC_TAXON_TOKENS.has(token)) {
      return true
    }
  }
  return false
}

function transformMINDEXData(
  observations: Record<string, unknown>[],
  taxaLookup: Map<string, MindexTaxonLookupRecord>,
): FungalObservation[] {
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
                            "Unknown species"
      const commonName = taxon?.common_name || 
                         obs.taxon?.common_name || 
                         obs.vernacular_name || 
                         obs.common_name
      
      const { kingdom: normalizedKingdom, iconicTaxon: normalizedIconicTaxon } = resolveMindexKingdom(obs, taxon)

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
        kingdom: normalizedKingdom,
        iconicTaxon: normalizedIconicTaxon,
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
    return normalizeCoordinatePair(obs.latitude, obs.longitude)
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
          return normalizeCoordinatePair(lat, lng)
        }
      }
    }
    // GeoJSON format: [lng, lat]
    if (Array.isArray(coordStr)) {
      return normalizeCoordinatePair(coordStr[1], coordStr[0])
    }
  }

  // Try location.lat/lng
  if (obs.location?.lat != null && obs.location?.lng != null) {
    return normalizeCoordinatePair(parseFloat(obs.location.lat), parseFloat(obs.location.lng))
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
  { name: "Los Angeles Basin", north: 34.35, south: 33.65, east: -117.85, west: -118.70 },
  { name: "San Francisco Bay Area", north: 37.95, south: 37.60, east: -122.25, west: -122.60 },
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

// Planet-scale fallback regions (used when no viewport bbox is provided).
// This avoids hotspot-only bias and provides true global species sampling.
const GLOBAL_FETCH_REGIONS = [
  { name: "North America West", north: 72.0, south: 14.0, east: -100.0, west: -170.0 },
  { name: "North America East", north: 72.0, south: 14.0, east: -52.0, west: -100.0 },
  { name: "South America West", north: 14.0, south: -57.0, east: -55.0, west: -82.0 },
  { name: "South America East", north: 14.0, south: -57.0, east: -30.0, west: -55.0 },
  { name: "Europe West", north: 72.0, south: 35.0, east: 10.0, west: -12.0 },
  { name: "Europe East", north: 72.0, south: 35.0, east: 45.0, west: 10.0 },
  { name: "Africa North", north: 37.0, south: 0.0, east: 52.0, west: -20.0 },
  { name: "Africa South", north: 0.0, south: -35.0, east: 52.0, west: -20.0 },
  { name: "Middle East", north: 43.0, south: 12.0, east: 64.0, west: 34.0 },
  { name: "Central Asia", north: 56.0, south: 32.0, east: 95.0, west: 45.0 },
  { name: "South Asia", north: 36.0, south: 6.0, east: 92.0, west: 64.0 },
  { name: "East Asia North", north: 55.0, south: 30.0, east: 145.0, west: 95.0 },
  { name: "East Asia South", north: 30.0, south: 5.0, east: 145.0, west: 95.0 },
  { name: "Southeast Asia", north: 25.0, south: -11.0, east: 150.0, west: 92.0 },
  { name: "Australia", north: -10.0, south: -45.0, east: 154.0, west: 112.0 },
  { name: "New Zealand", north: -33.0, south: -48.0, east: 179.0, west: 166.0 },
]

async function fetchMINDEXGlobalSample(
  limit: number,
  timeoutMs = MINDEX_OBSERVATIONS_TIMEOUT_MS,
  kingdom?: string,
): Promise<FungalObservation[]> {
  const regions = [...GLOBAL_FETCH_REGIONS, ...FUNGAL_HOTSPOT_REGIONS]
  const perRegionLimit = Math.max(250, Math.ceil(limit / Math.max(1, regions.length)))
  const observations: FungalObservation[] = []
  const seenIds = new Set<string>()

  for (let i = 0; i < regions.length; i += 4) {
    const batch = regions.slice(i, i + 4)
    const batchResults = await Promise.all(
      batch.map((region) =>
        fetchMINDEXObservations(perRegionLimit, {
          north: region.north,
          south: region.south,
          east: region.east,
          west: region.west,
        }, timeoutMs, kingdom).catch(() => [] as FungalObservation[]),
      ),
    )
    for (const rows of batchResults) {
      for (const row of rows) {
        const id = String(row.id || "")
        if (!id || seenIds.has(id)) continue
        seenIds.add(id)
        observations.push(row)
      }
    }
    if (observations.length >= limit * 2) break
  }

  // Deterministic spatial-ish ordering to avoid single-region clumping.
  observations.sort((a, b) => {
    const latA = Math.round((a.latitude || 0) * 10)
    const latB = Math.round((b.latitude || 0) * 10)
    if (latA !== latB) return latB - latA
    const lngA = Math.round((a.longitude || 0) * 10)
    const lngB = Math.round((b.longitude || 0) * 10)
    return lngA - lngB
  })

  return observations.slice(0, limit)
}

// All iNaturalist iconic taxa for comprehensive all-life coverage
const ALL_ICONIC_TAXA = [
  "Fungi", "Plantae", "Aves", "Mammalia", "Reptilia",
  "Amphibia", "Actinopterygii", "Mollusca", "Arachnida", "Insecta",
]

function resolveIconicTaxon(obs: Record<string, unknown>, fallbackTaxon?: string): string {
  const taxon = obs.taxon as { iconic_taxon_name?: string; kingdom?: string } | undefined
  const candidates = [
    taxon?.iconic_taxon_name,
    (obs as { iconic_taxon_name?: string }).iconic_taxon_name,
    taxon?.kingdom,
    (obs as { kingdom?: string }).kingdom,
    fallbackTaxon,
  ]
  for (const candidate of candidates) {
    const label = String(candidate || "").trim()
    if (label && label.toLowerCase() !== "unknown") return label
  }
  return "Unknown"
}

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

  const regionsToFetch = bounds
    ? [{ name: "Custom", ...bounds }]
    : [...GLOBAL_FETCH_REGIONS, ...FUNGAL_HOTSPOT_REGIONS]
  const perRegionLimit = Math.max(
    200,
    Math.ceil(limit / Math.max(1, regionsToFetch.length * taxaToFetch.length)),
  )

  // If specific bounds provided, use those; otherwise fetch from all hotspots
  // Throttle: stagger requests to avoid iNaturalist 429 rate limit
  // Process 3 at a time with 200ms delay between batches
  const allTasks = regionsToFetch.flatMap((region) =>
    taxaToFetch.map((taxon) => ({ region, taxon }))
  );
  // Apr 19, 2026 (Morgan: "massive 3005+m observations of nature are not
  // shown at zoom levels … imperial beach chula vista camp pendleton
  // coronado point loma … almost all of it is missing"). iNaturalist caps
  // per_page at 200 — previous single-page fetch per (region × taxon) maxed
  // at ~2000 total. Dense urban/coastal bounds have 10k+ observations. Now:
  // paginate each (region × taxon) up to PAGES_PER_TAXON pages (10 × 200 =
  // 2000 per taxon × 10 taxa = 20k ceiling), stopping early when a page
  // returns < 200 results. Still throttled in batches of 3 concurrent
  // calls so we don't hit iNat's 60 req/min limit.
  const PAGES_PER_TAXON = Math.max(1, Math.ceil(perRegionLimit / 200))
  for (let i = 0; i < allTasks.length; i += 3) {
    const batch = allTasks.slice(i, i + 3);
    await Promise.all(batch.map(async ({ region, taxon }) => {
      try {
        let fetchedForTaxon = 0
        for (let page = 1; page <= PAGES_PER_TAXON; page++) {
          // Stop paginating once we've reached the per-taxon budget
          if (fetchedForTaxon >= perRegionLimit) break
          const params = new URLSearchParams({
            iconic_taxa: taxon,
            quality_grade: "research,needs_id",
            per_page: String(200),
            page: String(page),
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
            console.warn(`[CREP/Life] iNaturalist API error for ${region.name}/${taxon} page ${page}:`, response.status)
            break
          }

          const data = await response.json()
          const results = Array.isArray(data.results) ? data.results : []
          if (results.length > 0) {
            console.log(`[CREP/Life] Fetched ${results.length} ${taxon} from ${region.name} (page ${page})`)
          }

          const regionObs = results
            .filter((obs: any) => obs.geojson?.coordinates || obs.location)
            .map((obs: any) => {
              let lat = obs.geojson?.coordinates?.[1]
              let lng = obs.geojson?.coordinates?.[0]
              if (lat == null || lng == null) {
                const parts = obs.location?.split(",")
                if (parts?.length >= 2) {
                  lat = parseFloat(parts[0])
                  lng = parseFloat(parts[1])
                }
              }
              const normalized = normalizeCoordinatePair(Number(lat) || 0, Number(lng) || 0)
              if (!normalized) return null
              return {
                id: `inat-${obs.id}`,
                species: obs.taxon?.preferred_common_name || obs.taxon?.name || "Unknown",
                scientificName: obs.taxon?.name || "Unknown",
                commonName: obs.taxon?.preferred_common_name,
                latitude: normalized.lat,
                longitude: normalized.lng,
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
                kingdom: resolveIconicTaxon(obs, taxon),
                iconicTaxon: resolveIconicTaxon(obs, taxon),
                taxonId: obs.taxon?.id,
                sourceUrl: `https://www.inaturalist.org/observations/${obs.id}`,
              }
            })
            .filter((row): row is FungalObservation => row != null)

          allObservations.push(...regionObs)
          fetchedForTaxon += results.length
          // Early-exit: no more pages available
          if (results.length < 200) break
          // Brief pause between pages of the same taxon
          if (page < PAGES_PER_TAXON) await new Promise(r => setTimeout(r, 150))
        }
      } catch (error) {
        console.error(`[CREP/Life] Failed to fetch ${taxon} data for ${region.name}:`, error)
      }
    }));
    // 200ms delay between (region × taxon) batches to avoid iNat 429
    if (i + 3 < allTasks.length) await new Promise(r => setTimeout(r, 200));
  }

  console.log(`[CREP/Life] Total iNaturalist observations fetched: ${allObservations.length} (PAGES_PER_TAXON=${PAGES_PER_TAXON})`)
  return allObservations
}

/**
 * Fast single-call iNaturalist fetch for quick-mode instant-paint.
 *
 * Unlike fetchINaturalistObservations which fans out across 10 regions × 10
 * taxa (100 calls, ~5-10s), this makes ONE global call with no taxon filter,
 * no retries, and a tight 5s timeout. Purpose: if MINDEX is unreachable from
 * the prod container, the user still sees species dots in <2s instead of an
 * empty map.
 */
/**
 * Quick parallel fetch across all iconic taxa — one paginated call per taxon so
 * plants/birds/mammals appear on first paint, not only Fungi from a single call.
 */
async function fetchINaturalistQuickAllTaxa(
  limit: number,
  bounds?: { north: number; south: number; east: number; west: number },
): Promise<FungalObservation[]> {
  const merged: FungalObservation[] = []
  const seen = new Set<string>()

  const push = (rows: FungalObservation[]) => {
    for (const obs of rows) {
      const id = String(obs.id ?? "")
      if (!id || seen.has(id)) continue
      seen.add(id)
      merged.push(obs)
    }
  }

  // One mixed bbox call first — fast, diverse, and avoids iNat 429s from 10 parallel hits.
  const mixedBudget = Math.min(Math.max(240, Math.floor(limit * 0.4)), 2000)
  const mixed = await fetchINaturalistQuick(mixedBudget, bounds).catch(() => [] as FungalObservation[])
  push(mixed)

  const remaining = Math.max(0, limit - merged.length)
  const perTaxon = Math.max(40, Math.ceil(remaining / ALL_ICONIC_TAXA.length))

  // Per-taxon top-up in batches of 3 (rate-limit friendly).
  for (let i = 0; i < ALL_ICONIC_TAXA.length; i += 3) {
    const slice = ALL_ICONIC_TAXA.slice(i, i + 3)
    const batch = await Promise.all(
      slice.map(async (taxon) => {
        const rows = await fetchINaturalistQuick(perTaxon, bounds, taxon).catch(() => [] as FungalObservation[])
        return rows.map((obs) => {
          const label =
            obs.kingdom && obs.kingdom !== "Unknown"
              ? obs.kingdom
              : obs.iconicTaxon && obs.iconicTaxon !== "Unknown"
                ? obs.iconicTaxon
                : taxon
          return { ...obs, kingdom: label, iconicTaxon: label }
        })
      }),
    )
    push(batch.flat())
    if (merged.length >= limit) break
  }

  console.log(
    `[CREP/Life] Quick iNat all-taxa: ${merged.length} observations (mixed=${mixed.length}, taxa batches, ~${perTaxon}/taxon)`,
  )
  return merged.slice(0, limit)
}

async function fetchINaturalistQuick(
  limit: number,
  bounds?: { north: number; south: number; east: number; west: number },
  kingdom?: string,
): Promise<FungalObservation[]> {
  try {
    const requested = Math.max(1, Math.min(limit || 200, 20000))
    const pages = Math.max(1, Math.min(Math.ceil(requested / 200), 100))
    const allResults: any[] = []

    for (let page = 1; page <= pages; page++) {
      const params = new URLSearchParams({
        quality_grade: "research,needs_id",
        per_page: "200",
        page: String(page),
        order: "desc",
        order_by: "observed_on",
        geo: "true",
        photos: "true",
      })

      // Only constrain by taxon when the user explicitly asked for one
      if (kingdom && kingdom !== "all") params.set("iconic_taxa", kingdom)

      // Only constrain by bounds when the dashboard is zoomed in
      if (bounds) {
        params.set("nelat", String(bounds.north))
        params.set("nelng", String(bounds.east))
        params.set("swlat", String(bounds.south))
        params.set("swlng", String(bounds.west))
      }

      const res = await fetch(`${INATURALIST_API}/observations?${params}`, {
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(bounds ? 8000 : 5000),
        cache: "no-store",
      })

      if (!res.ok) {
        console.warn(`[CREP/Fungal] Quick iNat returned ${res.status} (page ${page})`)
        break
      }

      const data = await res.json()
      const results = Array.isArray(data.results) ? data.results : []
      if (results.length === 0) break
      allResults.push(...results)
      if (results.length < 200) break
      if (allResults.length >= requested) break
    }

    const obs = allResults
      .slice(0, requested)
      .filter((o: any) => o.geojson?.coordinates || o.location)
      .map((o: any) => {
        let lat = o.geojson?.coordinates?.[1]
        let lng = o.geojson?.coordinates?.[0]
        if (lat == null || lng == null) {
          const parts = o.location?.split(",")
          if (parts?.length >= 2) {
            lat = parseFloat(parts[0])
            lng = parseFloat(parts[1])
          }
        }
        const normalized = normalizeCoordinatePair(Number(lat) || 0, Number(lng) || 0)
        if (!normalized) return null
        const iconic = resolveIconicTaxon(o, kingdom)
        return {
          id: `inat-${o.id}`,
          species: o.taxon?.preferred_common_name || o.taxon?.name || "Unknown",
          scientificName: o.taxon?.name || "Unknown",
          commonName: o.taxon?.preferred_common_name,
          latitude: normalized.lat,
          longitude: normalized.lng,
          timestamp: o.observed_on || o.created_at,
          source: "iNaturalist" as const,
          verified: o.quality_grade === "research",
          observer: o.user?.login || "Anonymous",
          imageUrl: o.photos?.[0]?.url?.replace("square", "medium"),
          thumbnailUrl: o.photos?.[0]?.url,
          location: o.place_guess,
          notes: o.description,
          hasGps: true,
          geocodeStatus: "complete" as const,
          kingdom: iconic,
          iconicTaxon: iconic,
          taxonId: o.taxon?.id,
          externalId: String(o.id),
          sourceUrl: `https://www.inaturalist.org/observations/${o.id}`,
        }
      })
      .filter((row): row is FungalObservation => row != null)

    console.log(`[CREP/Fungal] Quick iNat: ${obs.length} observations fetched (requested=${requested})`)
    return obs
  } catch (error) {
    console.warn("[CREP/Fungal] Quick iNat fetch error:", (error as Error)?.message)
    return []
  }
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
  // FAST PATH: `?quick=true` or `?source=mindex-only` returns MINDEX-only in <500ms.
  // Skips iNat/GBIF live fetches entirely. Used by the dashboard for instant
  // first-paint, then the full dual-source fetch runs as background enrichment.
  const quickMode = searchParams.get("quick") === "true" || searchParams.get("source") === "mindex-only"
  const liveFallbackEnabled =
    fallbackOnly ||
    searchParams.get("live") === "true" ||
    searchParams.get("fallbackLive") === "true" ||
    process.env.CREP_ENABLE_LIVE_NATURE_FALLBACK === "1"
  const emergencyFallbackEnabled =
    !quickMode &&
    (searchParams.get("emergencyFallback") === "true" ||
      process.env.CREP_ENABLE_EMERGENCY_INAT_FALLBACK === "1")
  const mindexWritebackEnabled =
    searchParams.get("persist") === "true" ||
    process.env.CREP_ENABLE_NATURE_MINDEX_WRITEBACK === "1"
  // Kingdom filter: iconic taxon name or "all" (default all-life for Earth Simulator / CREP)
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
  // Bounds-scoped requests should always hit live data for that viewport.
  // A single global cache object can otherwise replay one city's dataset for
  // another city and create sparse/incorrect regional coverage.
  if (!bounds && !noCache && !fallbackOnly) {
    const cached = getCachedData(kingdom)
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

    const mindexOnlyRequest = quickMode && (source === "mindex-only" || source === "mindex")

    // Always fetch MINDEX (local DB — fast, no rate limits)
    if (!fallbackOnly && (!source || source === "all" || source === "mindex" || source === "mindex-only" || quickMode)) {
      const mindexTimeoutForRequest = quickMode
        ? Math.max(5000, MINDEX_OBSERVATIONS_TIMEOUT_MS)
        : MINDEX_OBSERVATIONS_TIMEOUT_MS
      const mindexLimit =
        kingdom !== "all" && bounds && limit
          ? limit
          : kingdom === "all" && bounds && limit
            ? Math.min(2500, Math.max(400, Math.floor(limit / 3)))
            : quickMode && kingdom === "all" && limit
              ? Math.min(1200, Math.max(200, Math.floor(limit / 4)))
              : limit
      fetchPromises.push(
        (bounds
          ? fetchMINDEXObservations(mindexLimit, bounds, mindexTimeoutForRequest, kingdom)
          : fetchMINDEXGlobalSample(mindexLimit || 30000, mindexTimeoutForRequest, kingdom)
        ).catch((err) => {
          console.warn("[CREP/Fungal] MINDEX fetch failed:", err?.message)
          return [] as FungalObservation[]
        })
      )
    }

    // QUICK MODE: iNat first — MINDEX rows lack taxon/kingdom until ETL enrichment.
    if (quickMode && !mindexOnlyRequest) {
      const quickLimit = bounds
        ? Math.max(limit || 500, isFungiOnlyRequest(kingdom) ? 2000 : 2400)
        : (limit || 500)
      fetchPromises.push(
        (kingdom === "all"
          ? fetchINaturalistQuickAllTaxa(quickLimit, bounds)
          : fetchINaturalistQuick(quickLimit, bounds, kingdom)
        ).catch((err) => {
          console.warn("[CREP/Fungal] Quick iNat fallback failed:", err?.message)
          return [] as FungalObservation[]
        }),
      )
    }

    // Skip full live iNaturalist / GBIF fetches in quickMode so the response
    // is near-instant. The dashboard calls the full (non-quick) endpoint as a
    // background enrichment step to bring in fresh observations that aren't
    // yet ingested into MINDEX.
    if (!quickMode) {
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
    }

    const results = await Promise.all(fetchPromises)
    allObservations = results.flat()

    if (quickMode) {
      // Drop unlabeled MINDEX junk so iNat rows with real kingdom labels win first paint.
      allObservations = allObservations.filter((obs) => {
        if (obs.source !== "MINDEX") return true
        const kingdomToken = normalizeTaxonToken(obs.kingdom || obs.iconicTaxon)
        if (kingdomToken && kingdomToken !== "unknown") return true
        const speciesToken = normalizeTaxonToken(obs.species || obs.scientificName)
        if (!speciesToken || speciesToken === "unknown" || speciesToken === "unknown species") {
          return false
        }
        return Boolean(obs.taxonId)
      })
    } else {
      allObservations = allObservations.filter((obs) => {
        if (obs.source !== "MINDEX") return true
        const kingdomToken = normalizeTaxonToken(obs.kingdom || obs.iconicTaxon)
        if (kingdomToken && kingdomToken !== "unknown") return true
        return Boolean(obs.taxonId) && normalizeTaxonToken(obs.species) !== "unknown"
      })
    }

    console.log(`[CREP/Life] Dual-source total: ${allObservations.length} observations (MINDEX + live APIs merged)`)

    // EMERGENCY iNat FALLBACK: if after all requested sources we still have
    // < 500 observations, fire the FULL multi-region / multi-taxa fanout
    // (fetchINaturalistObservations — 10 hotspot regions × 10 iconic taxa).
    // This returns 2000-5000 observations and saturates the map.
    // A sparse nature layer is unacceptable for demo quality.
    if (emergencyFallbackEnabled && allObservations.length < 500) {
      console.warn(
        `[CREP/Life] Only ${allObservations.length} obs — firing emergency FULL iNat fallback`,
      )
      try {
        // fetchINaturalistObservations does the multi-region fanout
        const emergency = await fetchINaturalistObservations(
          limit && limit > 500 ? limit : 3000,
          bounds,
          kingdom,
        )
        // Merge rather than replace so we keep MINDEX data we already have
        const seenIds = new Set(allObservations.map((o) => o.id))
        for (const o of emergency) {
          if (!seenIds.has(o.id)) allObservations.push(o)
        }
        console.log(
          `[CREP/Life] Emergency full iNat fallback added ${emergency.length} obs (total now ${allObservations.length})`,
        )
      } catch (e) {
        console.warn(
          "[CREP/Life] Emergency full iNat fallback failed, trying quick:",
          (e as Error)?.message,
        )
        // Quick single-call as last resort
        try {
          const quick = await fetchINaturalistQuick(500, bounds, kingdom)
          const seenIds = new Set(allObservations.map((o) => o.id))
          for (const o of quick) if (!seenIds.has(o.id)) allObservations.push(o)
        } catch (e2) {
          console.warn(
            "[CREP/Life] Quick fallback also failed:",
            (e2 as Error)?.message,
          )
        }
      }
    }

    if (mindexWritebackEnabled) {
      cloneToMINDEX(allObservations)
      ingestBatchToMINDEX(allObservations).catch(() => {})
    }

    // Apply kingdom filter if not "all" and data came from MINDEX (which has mixed kingdoms)
    if (kingdom !== "all") {
      const kingdomLower = kingdom.toLowerCase()
      const fungiFilter = kingdomLower === "fungi"
      allObservations = allObservations.filter((obs) => {
        const kingdomToken = normalizeTaxonToken(obs.kingdom)
        const iconicToken = normalizeTaxonToken(obs.iconicTaxon)
        if (fungiFilter) {
          if (isExplicitlyNonFungi([obs.kingdom, obs.iconicTaxon, obs.scientificName, obs.species])) {
            return false
          }
          return isFungiClassification(kingdomToken) || isFungiClassification(iconicToken)
        }
        return kingdomToken === kingdomLower || iconicToken === kingdomLower
      })
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

    const { kept: landPlausibleObservations, filteredWater } = filterTerrestrialWaterPlacements(validObservations)
    if (filteredWater > 0) {
      console.log(`[CREP/Life] Filtered ${filteredWater} terrestrial observations placed in open water`)
    }

    // Apply geographic filter if bounds provided
    const filteredObservations = bounds
      ? landPlausibleObservations.filter(
          (obs) =>
            obs.latitude >= bounds.south &&
            obs.latitude <= bounds.north &&
            obs.longitude >= bounds.west &&
            obs.longitude <= bounds.east
        )
      : landPlausibleObservations

    // Sort by timestamp (most recent first)
    const sortedObservations = filteredObservations
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Only apply limit if explicitly requested
    const finalObservations = limit && limit > 0
      ? kingdom === "all"
        ? stratifiedObservationLimit(sortedObservations, limit)
        : sortedObservations.slice(0, limit)
      : sortedObservations

    // Queue background geocoding for MINDEX observations without GPS
    const pendingGeocode = mindexWritebackEnabled ? await queuePendingGeocoding() : 0

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
    if (!bounds) {
      setCachedData(finalObservations, sources, kingdom)
    }

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
        filteredWater,
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

function stratifiedObservationLimit(
  observations: FungalObservation[],
  cap: number,
): FungalObservation[] {
  if (cap <= 0 || observations.length <= cap) return observations.slice(0, cap)
  const buckets = new Map<string, FungalObservation[]>()
  for (const obs of observations) {
    const key = String(obs.iconicTaxon || obs.kingdom || "Unknown")
    const list = buckets.get(key) || []
    list.push(obs)
    buckets.set(key, list)
  }
  const knownKeys = [...buckets.keys()].filter((k) => k && k !== "Unknown")
  const unknownRows = buckets.get("Unknown") || []
  if (knownKeys.length === 0) {
    // All rows unlabeled — prefer returning fewer rows over painting useless Unknown-only markers.
    return unknownRows.length > 0 ? [] : observations.slice(0, cap)
  }

  const unknownBudget = Math.min(unknownRows.length, Math.max(20, Math.floor(cap * 0.1)))
  const perKnown = Math.max(25, Math.floor((cap - unknownBudget) / knownKeys.length))
  const picked: FungalObservation[] = []
  const seen = new Set<string>()

  for (const key of knownKeys) {
    const rows = (buckets.get(key) || [])
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, perKnown)
    for (const row of rows) {
      if (seen.has(row.id)) continue
      seen.add(row.id)
      picked.push(row)
    }
  }
  for (const row of unknownRows.slice(0, unknownBudget)) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    picked.push(row)
  }
  if (picked.length < cap) {
    for (const obs of observations) {
      if (seen.has(obs.id)) continue
      seen.add(obs.id)
      picked.push(obs)
      if (picked.length >= cap) break
    }
  }
  return picked.slice(0, cap)
}

function filterTerrestrialWaterPlacements(observations: FungalObservation[]): {
  kept: FungalObservation[]
  filteredWater: number
} {
  let filteredWater = 0
  const kept = observations.filter((obs) => {
    const plausible = isPlausibleNatureMarkerPlacement(
      obs.latitude,
      obs.longitude,
      obs.kingdom,
      obs.iconicTaxon,
    )
    if (!plausible) filteredWater += 1
    return plausible
  })
  return { kept, filteredWater }
}

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
