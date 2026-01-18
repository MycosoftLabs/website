/**
 * GBIF (Global Biodiversity Information Facility) Connector
 * 
 * Fetches biodiversity occurrence data from GBIF.
 * API Docs: https://www.gbif.org/developer/occurrence
 * 
 * No API key required for public data access.
 */

import type { Entity, GeoLocation, GeoBounds, Provenance } from "@/types/oei"
import { getEventBus } from "../event-bus"

const GBIF_API_BASE = "https://api.gbif.org/v1"

// =============================================================================
// TYPES
// =============================================================================

interface GBIFOccurrence {
  key: number
  datasetKey: string
  publishingOrgKey: string
  species?: string
  scientificName: string
  genericName?: string
  specificEpithet?: string
  taxonRank?: string
  kingdom?: string
  phylum?: string
  class?: string
  order?: string
  family?: string
  genus?: string
  decimalLatitude?: number
  decimalLongitude?: number
  coordinateUncertaintyInMeters?: number
  country?: string
  countryCode?: string
  stateProvince?: string
  locality?: string
  eventDate?: string
  year?: number
  month?: number
  day?: number
  basisOfRecord?: string
  identifiedBy?: string
  recordedBy?: string
  institutionCode?: string
  collectionCode?: string
  catalogNumber?: string
  occurrenceStatus?: string
  individualCount?: number
  license?: string
  rightsHolder?: string
  media?: Array<{
    type: string
    identifier: string
    format?: string
  }>
}

interface GBIFSearchResponse {
  offset: number
  limit: number
  endOfRecords: boolean
  count: number
  results: GBIFOccurrence[]
}

export interface GBIFQuery {
  // Taxonomy filters
  kingdom?: string
  phylum?: string
  class?: string
  order?: string
  family?: string
  genus?: string
  species?: string
  scientificName?: string
  
  // Location filters
  country?: string
  bounds?: GeoBounds
  
  // Time filters
  year?: number | string  // Can be "2020,2024" for range
  month?: number
  
  // Other filters
  basisOfRecord?: "HUMAN_OBSERVATION" | "PRESERVED_SPECIMEN" | "MACHINE_OBSERVATION" | "LIVING_SPECIMEN" | "FOSSIL_SPECIMEN"
  hasCoordinate?: boolean
  hasGeospatialIssue?: boolean
  mediaType?: "StillImage" | "Sound" | "MovingImage"
  
  // Pagination
  limit?: number
  offset?: number
}

export interface SpeciesEntity extends Entity {
  type: "species"
  properties: {
    scientificName: string
    commonName?: string
    kingdom?: string
    phylum?: string
    class?: string
    order?: string
    family?: string
    genus?: string
    species?: string
    taxonRank?: string
    basisOfRecord?: string
    eventDate?: string
    recordedBy?: string
    institutionCode?: string
    individualCount?: number
    mediaUrl?: string
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function gbifToSpeciesEntity(occurrence: GBIFOccurrence): SpeciesEntity | null {
  if (!occurrence.decimalLatitude || !occurrence.decimalLongitude) {
    return null
  }

  const provenance: Provenance = {
    source: "gbif",
    sourceId: String(occurrence.key),
    collectedAt: new Date().toISOString(),
    url: `https://www.gbif.org/occurrence/${occurrence.key}`,
    reliability: occurrence.coordinateUncertaintyInMeters 
      ? Math.max(0.5, 1 - (occurrence.coordinateUncertaintyInMeters / 10000))
      : 0.8,
    metadata: {
      datasetKey: occurrence.datasetKey,
      publishingOrg: occurrence.publishingOrgKey,
      license: occurrence.license,
      basisOfRecord: occurrence.basisOfRecord,
    },
  }

  const location: GeoLocation = {
    latitude: occurrence.decimalLatitude,
    longitude: occurrence.decimalLongitude,
    accuracy: occurrence.coordinateUncertaintyInMeters,
    source: "gps",
  }

  // Get first image if available
  const imageMedia = occurrence.media?.find(m => m.type === "StillImage")

  return {
    id: `gbif_${occurrence.key}`,
    type: "species",
    name: occurrence.species || occurrence.scientificName,
    description: `${occurrence.taxonRank || "Species"} observed in ${occurrence.country || "unknown location"}`,
    location,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSeenAt: occurrence.eventDate || new Date().toISOString(),
    status: "active",
    provenance,
    tags: [
      occurrence.kingdom || "Unknown Kingdom",
      occurrence.basisOfRecord || "Observation",
      occurrence.country || "Unknown",
    ].filter(Boolean),
    properties: {
      scientificName: occurrence.scientificName,
      commonName: undefined, // GBIF doesn't always provide common names
      kingdom: occurrence.kingdom,
      phylum: occurrence.phylum,
      class: occurrence.class,
      order: occurrence.order,
      family: occurrence.family,
      genus: occurrence.genus,
      species: occurrence.species,
      taxonRank: occurrence.taxonRank,
      basisOfRecord: occurrence.basisOfRecord,
      eventDate: occurrence.eventDate,
      recordedBy: occurrence.recordedBy,
      institutionCode: occurrence.institutionCode,
      individualCount: occurrence.individualCount,
      mediaUrl: imageMedia?.identifier,
    },
  }
}

// =============================================================================
// API CLIENT
// =============================================================================

export class GBIFClient {
  private cache: Map<string, { data: SpeciesEntity[]; timestamp: number }> = new Map()
  private cacheTTL = 300000 // 5 minute cache

  /**
   * Search GBIF occurrences
   */
  async searchOccurrences(query?: GBIFQuery): Promise<SpeciesEntity[]> {
    const params = new URLSearchParams()
    
    // Taxonomy filters
    if (query?.kingdom) params.set("kingdom", query.kingdom)
    if (query?.phylum) params.set("phylum", query.phylum)
    if (query?.class) params.set("class", query.class)
    if (query?.order) params.set("order", query.order)
    if (query?.family) params.set("family", query.family)
    if (query?.genus) params.set("genus", query.genus)
    if (query?.species) params.set("species", query.species)
    if (query?.scientificName) params.set("scientificName", query.scientificName)
    
    // Location filters
    if (query?.country) params.set("country", query.country)
    if (query?.bounds) {
      // GBIF uses WKT polygon for geometry filter
      const { north, south, east, west } = query.bounds
      params.set("geometry", `POLYGON((${west} ${south},${east} ${south},${east} ${north},${west} ${north},${west} ${south}))`)
    }
    
    // Time filters
    if (query?.year) params.set("year", String(query.year))
    if (query?.month) params.set("month", String(query.month))
    
    // Other filters
    if (query?.basisOfRecord) params.set("basisOfRecord", query.basisOfRecord)
    if (query?.hasCoordinate !== undefined) params.set("hasCoordinate", String(query.hasCoordinate))
    if (query?.hasGeospatialIssue !== undefined) params.set("hasGeospatialIssue", String(query.hasGeospatialIssue))
    if (query?.mediaType) params.set("mediaType", query.mediaType)
    
    // Pagination
    params.set("limit", String(query?.limit || 100))
    if (query?.offset) params.set("offset", String(query.offset))

    // Check cache
    const cacheKey = params.toString()
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data
    }

    const url = `${GBIF_API_BASE}/occurrence/search?${params.toString()}`

    try {
      const response = await fetch(url, {
        headers: {
          "Accept": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`GBIF API error: ${response.status} ${response.statusText}`)
      }

      const data: GBIFSearchResponse = await response.json()
      
      const entities = data.results
        .map(gbifToSpeciesEntity)
        .filter((e): e is SpeciesEntity => e !== null)

      // Cache results
      this.cache.set(cacheKey, { data: entities, timestamp: Date.now() })

      return entities
    } catch (error) {
      console.error("[GBIF] Search error:", error)
      throw error
    }
  }

  /**
   * Search for fungi observations
   */
  async searchFungi(query?: Omit<GBIFQuery, "kingdom">): Promise<SpeciesEntity[]> {
    return this.searchOccurrences({
      ...query,
      kingdom: "Fungi",
      hasCoordinate: true,
    })
  }

  /**
   * Search for observations in bounds
   */
  async searchInBounds(bounds: GeoBounds, options?: Partial<GBIFQuery>): Promise<SpeciesEntity[]> {
    return this.searchOccurrences({
      ...options,
      bounds,
      hasCoordinate: true,
    })
  }

  /**
   * Get species count by taxonomy
   */
  async getSpeciesCount(query?: GBIFQuery): Promise<number> {
    const params = new URLSearchParams()
    
    if (query?.kingdom) params.set("kingdom", query.kingdom)
    if (query?.country) params.set("country", query.country)
    if (query?.year) params.set("year", String(query.year))
    
    params.set("limit", "0") // Just get count

    const url = `${GBIF_API_BASE}/occurrence/search?${params.toString()}`

    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error("GBIF count error")
      
      const data: GBIFSearchResponse = await response.json()
      return data.count
    } catch (error) {
      console.error("[GBIF] Count error:", error)
      return 0
    }
  }

  /**
   * Fetch and publish to event bus
   */
  async fetchAndPublish(query?: GBIFQuery): Promise<{ published: number; entities: SpeciesEntity[] }> {
    const entities = await this.searchOccurrences(query)
    const eventBus = getEventBus()

    let published = 0
    for (const entity of entities) {
      try {
        await eventBus.publishEntity(entity)
        published++
      } catch (error) {
        console.error(`[GBIF] Failed to publish entity ${entity.id}:`, error)
      }
    }

    return { published, entities }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let clientInstance: GBIFClient | null = null

export function getGBIFClient(): GBIFClient {
  if (!clientInstance) {
    clientInstance = new GBIFClient()
  }
  return clientInstance
}
