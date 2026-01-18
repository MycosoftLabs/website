/**
 * eBird Connector
 * 
 * Fetches bird observation data from the eBird API (Cornell Lab of Ornithology).
 * API Docs: https://documenter.getpostman.com/view/664302/S1ENwy59
 * 
 * Requires an API key from https://ebird.org/api/keygen
 */

import type { Entity, GeoLocation, GeoBounds, Provenance } from "@/types/oei"
import { getEventBus } from "../event-bus"

const EBIRD_API_BASE = "https://api.ebird.org/v2"

// =============================================================================
// TYPES
// =============================================================================

interface EBirdObservation {
  speciesCode: string
  comName: string
  sciName: string
  locId: string
  locName: string
  obsDt: string
  howMany?: number
  lat: number
  lng: number
  obsValid: boolean
  obsReviewed: boolean
  locationPrivate: boolean
  subId: string
}

interface EBirdHotspot {
  locId: string
  locName: string
  countryCode: string
  subnational1Code: string
  lat: number
  lng: number
  latestObsDt: string
  numSpeciesAllTime: number
}

export interface EBirdQuery {
  lat?: number
  lng?: number
  dist?: number  // km, max 50
  back?: number  // days back, max 30
  hotspot?: boolean
  includeProvisional?: boolean
  maxResults?: number
  speciesCode?: string
  regionCode?: string  // e.g., "US-CA"
}

export interface BirdObservationEntity extends Entity {
  type: "species"
  properties: {
    speciesCode: string
    commonName: string
    scientificName: string
    locationId: string
    locationName: string
    observationDate: string
    count?: number
    isValid: boolean
    isReviewed: boolean
    isPrivateLocation: boolean
    checklistId: string
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function ebirdToBirdEntity(obs: EBirdObservation): BirdObservationEntity {
  const provenance: Provenance = {
    source: "ebird",
    sourceId: obs.subId,
    collectedAt: new Date().toISOString(),
    url: `https://ebird.org/checklist/${obs.subId}`,
    reliability: obs.obsReviewed ? 1.0 : obs.obsValid ? 0.9 : 0.7,
    metadata: {
      locationId: obs.locId,
      speciesCode: obs.speciesCode,
    },
  }

  const location: GeoLocation = {
    latitude: obs.lat,
    longitude: obs.lng,
    source: "gps",
  }

  return {
    id: `ebird_${obs.subId}_${obs.speciesCode}`,
    type: "species",
    name: obs.comName,
    description: `${obs.sciName} observed at ${obs.locName}`,
    location,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSeenAt: obs.obsDt,
    status: "active",
    provenance,
    tags: [
      "Aves",
      "Bird",
      obs.obsReviewed ? "Reviewed" : "Unreviewed",
    ],
    properties: {
      speciesCode: obs.speciesCode,
      commonName: obs.comName,
      scientificName: obs.sciName,
      locationId: obs.locId,
      locationName: obs.locName,
      observationDate: obs.obsDt,
      count: obs.howMany,
      isValid: obs.obsValid,
      isReviewed: obs.obsReviewed,
      isPrivateLocation: obs.locationPrivate,
      checklistId: obs.subId,
    },
  }
}

// =============================================================================
// API CLIENT
// =============================================================================

export class EBirdClient {
  private apiKey?: string
  private cache: Map<string, { data: BirdObservationEntity[]; timestamp: number }> = new Map()
  private cacheTTL = 60000 // 1 minute cache (eBird data updates frequently)

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.EBIRD_API_KEY
  }

  /**
   * Get recent observations near a location
   */
  async getRecentNearby(lat: number, lng: number, options?: Partial<EBirdQuery>): Promise<BirdObservationEntity[]> {
    if (!this.apiKey) {
      console.warn("[eBird] No API key configured, returning sample data")
      return this.getSampleData()
    }

    const params = new URLSearchParams()
    params.set("lat", String(lat))
    params.set("lng", String(lng))
    if (options?.dist) params.set("dist", String(Math.min(options.dist, 50)))
    if (options?.back) params.set("back", String(Math.min(options.back, 30)))
    if (options?.hotspot !== undefined) params.set("hotspot", String(options.hotspot))
    if (options?.includeProvisional) params.set("includeProvisional", "true")
    if (options?.maxResults) params.set("maxResults", String(options.maxResults))

    const cacheKey = `nearby_${params.toString()}`
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data
    }

    try {
      const response = await fetch(
        `${EBIRD_API_BASE}/data/obs/geo/recent?${params.toString()}`,
        {
          headers: {
            "X-eBirdApiToken": this.apiKey,
          },
        }
      )

      if (!response.ok) {
        if (response.status === 429) {
          console.warn("[eBird] Rate limit hit, returning cached/sample data")
          return this.getSampleData()
        }
        throw new Error(`eBird API error: ${response.status}`)
      }

      const observations: EBirdObservation[] = await response.json()
      const entities = observations.map(ebirdToBirdEntity)

      this.cache.set(cacheKey, { data: entities, timestamp: Date.now() })
      return entities
    } catch (error) {
      console.error("[eBird] API error:", error)
      return this.getSampleData()
    }
  }

  /**
   * Get recent observations of a specific species
   */
  async getRecentSpecies(speciesCode: string, regionCode: string, options?: Partial<EBirdQuery>): Promise<BirdObservationEntity[]> {
    if (!this.apiKey) {
      return this.getSampleData()
    }

    const params = new URLSearchParams()
    if (options?.back) params.set("back", String(Math.min(options.back, 30)))
    if (options?.maxResults) params.set("maxResults", String(options.maxResults))

    try {
      const response = await fetch(
        `${EBIRD_API_BASE}/data/obs/${regionCode}/recent/${speciesCode}?${params.toString()}`,
        {
          headers: {
            "X-eBirdApiToken": this.apiKey,
          },
        }
      )

      if (!response.ok) {
        throw new Error(`eBird API error: ${response.status}`)
      }

      const observations: EBirdObservation[] = await response.json()
      return observations.map(ebirdToBirdEntity)
    } catch (error) {
      console.error("[eBird] Species search error:", error)
      return []
    }
  }

  /**
   * Get notable (rare) observations in a region
   */
  async getNotableObservations(regionCode: string, options?: Partial<EBirdQuery>): Promise<BirdObservationEntity[]> {
    if (!this.apiKey) {
      return this.getSampleData()
    }

    const params = new URLSearchParams()
    if (options?.back) params.set("back", String(Math.min(options.back, 30)))
    if (options?.maxResults) params.set("maxResults", String(options.maxResults))

    try {
      const response = await fetch(
        `${EBIRD_API_BASE}/data/obs/${regionCode}/recent/notable?${params.toString()}`,
        {
          headers: {
            "X-eBirdApiToken": this.apiKey,
          },
        }
      )

      if (!response.ok) {
        throw new Error(`eBird API error: ${response.status}`)
      }

      const observations: EBirdObservation[] = await response.json()
      return observations.map(ebirdToBirdEntity)
    } catch (error) {
      console.error("[eBird] Notable search error:", error)
      return []
    }
  }

  /**
   * Sample data for demo when no API key
   */
  private getSampleData(): BirdObservationEntity[] {
    const sampleBirds = [
      { code: "baleag", common: "Bald Eagle", sci: "Haliaeetus leucocephalus", lat: 47.6, lng: -122.3, loc: "Seattle, WA" },
      { code: "amecro", common: "American Crow", sci: "Corvus brachyrhynchos", lat: 40.7, lng: -74.0, loc: "New York, NY" },
      { code: "norcar", common: "Northern Cardinal", sci: "Cardinalis cardinalis", lat: 39.1, lng: -84.5, loc: "Cincinnati, OH" },
      { code: "rebwoo", common: "Red-bellied Woodpecker", sci: "Melanerpes carolinus", lat: 33.7, lng: -84.4, loc: "Atlanta, GA" },
      { code: "blujay", common: "Blue Jay", sci: "Cyanocitta cristata", lat: 42.4, lng: -71.1, loc: "Boston, MA" },
      { code: "canvas", common: "Canvasback", sci: "Aythya valisineria", lat: 38.9, lng: -77.0, loc: "Washington, DC" },
      { code: "grbher3", common: "Great Blue Heron", sci: "Ardea herodias", lat: 29.7, lng: -95.4, loc: "Houston, TX" },
      { code: "rewbla", common: "Red-winged Blackbird", sci: "Agelaius phoeniceus", lat: 34.1, lng: -118.2, loc: "Los Angeles, CA" },
      { code: "houspa", common: "House Sparrow", sci: "Passer domesticus", lat: 41.9, lng: -87.6, loc: "Chicago, IL" },
      { code: "amegfi", common: "American Goldfinch", sci: "Spinus tristis", lat: 45.5, lng: -122.7, loc: "Portland, OR" },
    ]

    return sampleBirds.map((bird, idx) => ({
      id: `ebird_sample_${idx}`,
      type: "species" as const,
      name: bird.common,
      description: `${bird.sci} - sample data`,
      location: {
        latitude: bird.lat,
        longitude: bird.lng,
        source: "gps" as const,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      status: "active" as const,
      provenance: {
        source: "ebird",
        sourceId: `sample_${idx}`,
        collectedAt: new Date().toISOString(),
        reliability: 0.5,
        metadata: { sample: true },
      },
      tags: ["Aves", "Bird", "Sample"],
      properties: {
        speciesCode: bird.code,
        commonName: bird.common,
        scientificName: bird.sci,
        locationId: `L${idx}`,
        locationName: bird.loc,
        observationDate: new Date().toISOString(),
        count: Math.floor(Math.random() * 10) + 1,
        isValid: true,
        isReviewed: false,
        isPrivateLocation: false,
        checklistId: `S${idx}`,
      },
    }))
  }

  /**
   * Fetch and publish to event bus
   */
  async fetchAndPublish(lat: number, lng: number, options?: Partial<EBirdQuery>): Promise<{ published: number; entities: BirdObservationEntity[] }> {
    const entities = await this.getRecentNearby(lat, lng, options)
    const eventBus = getEventBus()

    let published = 0
    for (const entity of entities) {
      try {
        await eventBus.publishEntity(entity)
        published++
      } catch (error) {
        console.error(`[eBird] Failed to publish entity ${entity.id}:`, error)
      }
    }

    return { published, entities }
  }

  /**
   * Check if API key is configured
   */
  hasApiKey(): boolean {
    return !!this.apiKey
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let clientInstance: EBirdClient | null = null

export function getEBirdClient(): EBirdClient {
  if (!clientInstance) {
    clientInstance = new EBirdClient()
  }
  return clientInstance
}
