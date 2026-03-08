/**
 * MINDEX-CREP Bidirectional Data Pipeline
 *
 * Connects MINDEX fungal/biodiversity database with CREP map visualization.
 *
 * MINDEX → CREP:
 * - Fungal observation geopoints for map markers
 * - Species data enrichment for popups/details
 * - Research data for CREP entity analysis
 * - Biodiversity hotspot heatmaps
 *
 * CREP → MINDEX:
 * - Viewport-bounded observation queries
 * - Device sensor data enrichment (correlate environmental with fungal)
 * - Event-observation correlation (weather events → fungal growth)
 * - CREP entity data for MINDEX research analysis
 *
 * Uses centralized API_URLS config.
 */

import { API_URLS, MINDEX_ENDPOINTS } from "@/lib/config/api-urls"
import type { UnifiedEntity } from "@/lib/crep/entities/unified-entity-schema"
import { makePoint, isValidCoordinate } from "@/lib/crep/entities/entity-converters"
import type { GeoBounds } from "@/types/oei"

// ============================================================================
// Types
// ============================================================================

export interface MINDEXObservation {
  id: string
  species_name: string
  scientific_name: string
  common_name?: string
  latitude: number
  longitude: number
  observed_on: string
  observer?: string
  image_url?: string
  thumbnail_url?: string
  source: "mindex" | "inaturalist" | "gbif"
  source_url?: string
  quality_grade?: "research" | "needs_id" | "casual"
  is_toxic?: boolean
  habitat?: string
  notes?: string
}

export interface MINDEXSpeciesDetail {
  id: string
  scientific_name: string
  common_name: string
  kingdom: string
  phylum: string
  class: string
  order: string
  family: string
  genus: string
  description?: string
  edibility?: "edible" | "inedible" | "toxic" | "deadly" | "unknown"
  habitat?: string[]
  season?: string[]
  images: Array<{ url: string; attribution?: string }>
  observation_count: number
  compounds?: Array<{ name: string; type: string }>
}

export interface MINDEXSearchParams {
  query?: string
  bounds?: GeoBounds
  species?: string
  source?: "mindex" | "inaturalist" | "gbif"
  limit?: number
  offset?: number
  quality?: "research" | "needs_id" | "casual"
  since?: string
}

export interface MINDEXSearchResult {
  observations: MINDEXObservation[]
  total: number
  page: number
  hasMore: boolean
  sources: {
    mindex: number
    inaturalist: number
    gbif: number
  }
}

// ============================================================================
// MINDEX → CREP: Fetch & Convert
// ============================================================================

/** Fetch fungal observations from MINDEX within map bounds */
export async function fetchMINDEXObservations(
  params: MINDEXSearchParams
): Promise<MINDEXSearchResult> {
  try {
    const url = new URL(`${API_URLS.LOCAL_BASE}/api/crep/fungal`)

    if (params.query) url.searchParams.set("q", params.query)
    if (params.species) url.searchParams.set("species", params.species)
    if (params.source) url.searchParams.set("source", params.source)
    if (params.limit) url.searchParams.set("limit", String(params.limit))
    if (params.offset) url.searchParams.set("offset", String(params.offset))
    if (params.quality) url.searchParams.set("quality", params.quality)
    if (params.since) url.searchParams.set("since", params.since)

    if (params.bounds) {
      url.searchParams.set("north", String(params.bounds.north))
      url.searchParams.set("south", String(params.bounds.south))
      url.searchParams.set("east", String(params.bounds.east))
      url.searchParams.set("west", String(params.bounds.west))
    }

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      console.warn(`[MINDEX] Fetch failed: ${response.status}`)
      return { observations: [], total: 0, page: 0, hasMore: false, sources: { mindex: 0, inaturalist: 0, gbif: 0 } }
    }

    const data = await response.json()

    // Normalize response format
    const observations: MINDEXObservation[] = (data.observations || data.results || []).map(
      (obs: Record<string, unknown>) => ({
        id: obs.id || obs.uuid || `obs-${Math.random().toString(36).slice(2)}`,
        species_name: obs.species_name || obs.species || obs.taxon_name || "Unknown",
        scientific_name: obs.scientific_name || obs.scientificName || obs.species_name || "Unknown",
        common_name: obs.common_name || obs.commonName,
        latitude: Number(obs.latitude || obs.lat || 0),
        longitude: Number(obs.longitude || obs.lng || obs.lon || 0),
        observed_on: obs.observed_on || obs.observedOn || obs.observed_at || new Date().toISOString(),
        observer: obs.observer || obs.user_name,
        image_url: obs.image_url || obs.imageUrl,
        thumbnail_url: obs.thumbnail_url || obs.thumbnailUrl,
        source: obs.source || "mindex",
        source_url: obs.source_url || obs.sourceUrl,
        quality_grade: obs.quality_grade || obs.qualityGrade,
        is_toxic: obs.is_toxic || obs.isToxic,
        habitat: obs.habitat,
        notes: obs.notes,
      })
    )

    return {
      observations,
      total: data.total || observations.length,
      page: data.page || 0,
      hasMore: data.hasMore ?? observations.length === (params.limit || 50),
      sources: data.sources || { mindex: observations.length, inaturalist: 0, gbif: 0 },
    }
  } catch (error) {
    console.error("[MINDEX] Fetch error:", error)
    return { observations: [], total: 0, page: 0, hasMore: false, sources: { mindex: 0, inaturalist: 0, gbif: 0 } }
  }
}

/** Convert MINDEX observations to UnifiedEntities for CREP map */
export function convertMINDEXToEntities(observations: MINDEXObservation[]): UnifiedEntity[] {
  return observations
    .filter((obs) => isValidCoordinate(obs.longitude, obs.latitude))
    .map((obs) => ({
      id: obs.id,
      type: "fungal" as const,
      geometry: makePoint(obs.longitude, obs.latitude),
      state: {
        classification: obs.scientific_name,
      },
      time: {
        observed_at: obs.observed_on,
        valid_from: obs.observed_on,
      },
      confidence: obs.quality_grade === "research" ? 0.95 : obs.quality_grade === "needs_id" ? 0.6 : 0.4,
      source: obs.source,
      properties: {
        species: obs.species_name,
        scientificName: obs.scientific_name,
        commonName: obs.common_name,
        observer: obs.observer,
        imageUrl: obs.image_url,
        thumbnailUrl: obs.thumbnail_url,
        sourceUrl: obs.source_url,
        isToxic: obs.is_toxic,
        habitat: obs.habitat,
        qualityGrade: obs.quality_grade,
      },
      s2_cell: "",
    }))
}

/** Fetch species details from MINDEX for entity enrichment */
export async function fetchSpeciesDetails(
  scientificName: string
): Promise<MINDEXSpeciesDetail | null> {
  try {
    const response = await fetch(
      `${API_URLS.LOCAL_BASE}/api/natureos/mindex/search?q=${encodeURIComponent(scientificName)}&limit=1`,
      { signal: AbortSignal.timeout(10000) }
    )

    if (!response.ok) return null

    const data = await response.json()
    const species = data.results?.[0] || data.species?.[0]
    if (!species) return null

    return {
      id: species.id || scientificName,
      scientific_name: species.scientific_name || species.scientificName || scientificName,
      common_name: species.common_name || species.commonName || "",
      kingdom: species.kingdom || "Fungi",
      phylum: species.phylum || "",
      class: species.class || "",
      order: species.order || "",
      family: species.family || "",
      genus: species.genus || "",
      description: species.description,
      edibility: species.edibility,
      habitat: species.habitat,
      season: species.season,
      images: species.images || [],
      observation_count: species.observation_count || species.observationCount || 0,
      compounds: species.compounds,
    }
  } catch (error) {
    console.warn("[MINDEX] Species detail fetch error:", error)
    return null
  }
}

// ============================================================================
// CREP → MINDEX: Context & Enrichment
// ============================================================================

/** Build environmental context from CREP data for MINDEX enrichment */
export function buildEnvironmentalContext(
  entities: UnifiedEntity[],
  viewport: { center: [number, number]; zoom: number }
): Record<string, unknown> {
  // Count entity types in viewport
  const typeCounts: Record<string, number> = {}
  for (const e of entities) {
    typeCounts[e.type] = (typeCounts[e.type] || 0) + 1
  }

  // Find weather events that could affect fungal growth
  const weatherEvents = entities
    .filter((e) => e.type === "weather" || e.type === "earthquake")
    .map((e) => ({
      type: e.properties.eventType || e.state.classification,
      severity: e.properties.severity,
      title: e.properties.title,
    }))

  // Find device sensor data
  const deviceReadings = entities
    .filter((e) => e.type === "device" && e.properties.status === "online")
    .map((e) => ({
      name: e.properties.name,
      humidity: e.properties.humidity,
      temperature: e.properties.temperature,
      pressure: e.properties.pressure,
    }))

  return {
    viewport: {
      center: viewport.center,
      zoom: viewport.zoom,
    },
    entityCounts: typeCounts,
    weatherEvents,
    deviceReadings,
    timestamp: new Date().toISOString(),
  }
}

/** Correlate weather events with fungal observation density */
export function correlateWeatherWithFungal(
  weatherEntities: UnifiedEntity[],
  fungalEntities: UnifiedEntity[],
  radiusKm = 100
): Array<{
  event: UnifiedEntity
  nearbyFungalCount: number
  correlation: string
}> {
  const results: Array<{
    event: UnifiedEntity
    nearbyFungalCount: number
    correlation: string
  }> = []

  for (const event of weatherEntities) {
    if (event.geometry.type !== "Point") continue
    const [eLng, eLat] = event.geometry.coordinates

    let nearbyCount = 0
    for (const fungal of fungalEntities) {
      if (fungal.geometry.type !== "Point") continue
      const [fLng, fLat] = fungal.geometry.coordinates
      const dist = haversineDistance(eLat, eLng, fLat, fLng)
      if (dist <= radiusKm) nearbyCount++
    }

    const eventType = String(event.state.classification || "")
    let correlation = "none"
    if (nearbyCount > 10) {
      correlation = eventType.includes("rain") || eventType.includes("storm")
        ? "high_moisture_fungal_bloom"
        : eventType.includes("fire")
          ? "post_fire_pioneer_species"
          : "spatial_correlation"
    } else if (nearbyCount > 0) {
      correlation = "weak_spatial_correlation"
    }

    results.push({ event, nearbyFungalCount: nearbyCount, correlation })
  }

  return results
}

/** Simple haversine distance in km */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
