/**
 * OBIS (Ocean Biodiversity Information System) Connector
 * 
 * Fetches marine species observation data from OBIS.
 * API Docs: https://obis.org/manual/api/
 * 
 * No API key required for public data access.
 */

import type { Entity, GeoLocation, GeoBounds, Provenance } from "@/types/oei"
import { getEventBus } from "../event-bus"

const OBIS_API_BASE = "https://api.obis.org/v3"

// =============================================================================
// TYPES
// =============================================================================

interface OBISOccurrence {
  id: number
  decimalLongitude: number
  decimalLatitude: number
  scientificName: string
  scientificNameAuthorship?: string
  kingdom?: string
  phylum?: string
  class?: string
  order?: string
  family?: string
  genus?: string
  species?: string
  taxonRank?: string
  eventDate?: string
  year?: number
  month?: number
  day?: number
  depth?: number
  minimumDepthInMeters?: number
  maximumDepthInMeters?: number
  datasetName?: string
  institutionCode?: string
  collectionCode?: string
  catalogNumber?: string
  recordedBy?: string
  basisOfRecord?: string
  occurrenceStatus?: string
  individualCount?: number
  country?: string
  locality?: string
  waterBody?: string
}

interface OBISResponse {
  total: number
  results: OBISOccurrence[]
}

interface OBISTaxon {
  taxonID: number
  scientificName: string
  scientificNameAuthorship?: string
  taxonRank: string
  kingdom?: string
  phylum?: string
  class?: string
  order?: string
  family?: string
  genus?: string
  records: number
}

export interface OBISQuery {
  // Taxonomy filters
  taxonid?: number
  scientificname?: string
  
  // Location filters
  geometry?: string  // WKT geometry
  bounds?: GeoBounds
  areaid?: number
  
  // Depth filters
  startdepth?: number
  enddepth?: number
  
  // Time filters
  startdate?: string
  enddate?: string
  year?: number
  
  // Other
  datasetid?: string
  institutionid?: string
  flags?: string[]
  
  // Pagination
  size?: number
  offset?: number
}

export interface MarineSpeciesEntity extends Entity {
  type: "species"
  properties: {
    scientificName: string
    scientificNameAuthorship?: string
    kingdom?: string
    phylum?: string
    class?: string
    order?: string
    family?: string
    genus?: string
    species?: string
    taxonRank?: string
    eventDate?: string
    depth?: number
    minDepth?: number
    maxDepth?: number
    datasetName?: string
    institutionCode?: string
    recordedBy?: string
    basisOfRecord?: string
    waterBody?: string
    isMarine: boolean
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function obisToMarineEntity(occurrence: OBISOccurrence): MarineSpeciesEntity {
  const provenance: Provenance = {
    source: "obis",
    sourceId: String(occurrence.id),
    collectedAt: new Date().toISOString(),
    url: `https://obis.org/occurrence/${occurrence.id}`,
    reliability: 0.9,
    metadata: {
      datasetName: occurrence.datasetName,
      institutionCode: occurrence.institutionCode,
      basisOfRecord: occurrence.basisOfRecord,
    },
  }

  const location: GeoLocation = {
    latitude: occurrence.decimalLatitude,
    longitude: occurrence.decimalLongitude,
    altitude: occurrence.depth ? -occurrence.depth : undefined, // Negative for depth
    source: "gps",
  }

  const depth = occurrence.depth || 
    (occurrence.minimumDepthInMeters && occurrence.maximumDepthInMeters 
      ? (occurrence.minimumDepthInMeters + occurrence.maximumDepthInMeters) / 2 
      : undefined)

  return {
    id: `obis_${occurrence.id}`,
    type: "species",
    name: occurrence.species || occurrence.scientificName,
    description: `Marine ${occurrence.taxonRank || "species"} from ${occurrence.waterBody || "ocean"}`,
    location,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSeenAt: occurrence.eventDate || new Date().toISOString(),
    status: "active",
    provenance,
    tags: [
      "Marine",
      occurrence.kingdom || "Unknown Kingdom",
      occurrence.phylum || "Unknown Phylum",
      occurrence.waterBody || "Ocean",
    ].filter(Boolean),
    properties: {
      scientificName: occurrence.scientificName,
      scientificNameAuthorship: occurrence.scientificNameAuthorship,
      kingdom: occurrence.kingdom,
      phylum: occurrence.phylum,
      class: occurrence.class,
      order: occurrence.order,
      family: occurrence.family,
      genus: occurrence.genus,
      species: occurrence.species,
      taxonRank: occurrence.taxonRank,
      eventDate: occurrence.eventDate,
      depth,
      minDepth: occurrence.minimumDepthInMeters,
      maxDepth: occurrence.maximumDepthInMeters,
      datasetName: occurrence.datasetName,
      institutionCode: occurrence.institutionCode,
      recordedBy: occurrence.recordedBy,
      basisOfRecord: occurrence.basisOfRecord,
      waterBody: occurrence.waterBody,
      isMarine: true,
    },
  }
}

// =============================================================================
// API CLIENT
// =============================================================================

export class OBISClient {
  private cache: Map<string, { data: MarineSpeciesEntity[]; timestamp: number }> = new Map()
  private cacheTTL = 300000 // 5 minute cache

  /**
   * Search OBIS occurrences
   */
  async searchOccurrences(query?: OBISQuery): Promise<MarineSpeciesEntity[]> {
    const params = new URLSearchParams()
    
    // Taxonomy
    if (query?.taxonid) params.set("taxonid", String(query.taxonid))
    if (query?.scientificname) params.set("scientificname", query.scientificname)
    
    // Location
    if (query?.bounds) {
      const { north, south, east, west } = query.bounds
      params.set("geometry", `POLYGON((${west} ${south},${east} ${south},${east} ${north},${west} ${north},${west} ${south}))`)
    } else if (query?.geometry) {
      params.set("geometry", query.geometry)
    }
    if (query?.areaid) params.set("areaid", String(query.areaid))
    
    // Depth
    if (query?.startdepth) params.set("startdepth", String(query.startdepth))
    if (query?.enddepth) params.set("enddepth", String(query.enddepth))
    
    // Time
    if (query?.startdate) params.set("startdate", query.startdate)
    if (query?.enddate) params.set("enddate", query.enddate)
    if (query?.year) params.set("year", String(query.year))
    
    // Other
    if (query?.datasetid) params.set("datasetid", query.datasetid)
    if (query?.institutionid) params.set("institutionid", query.institutionid)
    
    // Pagination
    params.set("size", String(query?.size || 100))
    if (query?.offset) params.set("offset", String(query.offset))

    const cacheKey = params.toString()
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data
    }

    try {
      const response = await fetch(`${OBIS_API_BASE}/occurrence?${params.toString()}`, {
        headers: { "Accept": "application/json" },
      })

      if (!response.ok) {
        throw new Error(`OBIS API error: ${response.status}`)
      }

      const data: OBISResponse = await response.json()
      const entities = data.results.map(obisToMarineEntity)

      this.cache.set(cacheKey, { data: entities, timestamp: Date.now() })
      return entities
    } catch (error) {
      console.error("[OBIS] Search error:", error)
      return this.getSampleData()
    }
  }

  /**
   * Search for specific taxon
   */
  async searchTaxon(scientificName: string): Promise<OBISTaxon[]> {
    try {
      const response = await fetch(
        `${OBIS_API_BASE}/taxon/autocomplete?scientificname=${encodeURIComponent(scientificName)}`,
        { headers: { "Accept": "application/json" } }
      )

      if (!response.ok) {
        throw new Error(`OBIS taxon search error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("[OBIS] Taxon search error:", error)
      return []
    }
  }

  /**
   * Search in bounding box
   */
  async searchInBounds(bounds: GeoBounds, options?: Partial<OBISQuery>): Promise<MarineSpeciesEntity[]> {
    return this.searchOccurrences({
      ...options,
      bounds,
    })
  }

  /**
   * Get deep sea observations (depth > 200m)
   */
  async getDeepSeaObservations(options?: Partial<OBISQuery>): Promise<MarineSpeciesEntity[]> {
    return this.searchOccurrences({
      ...options,
      startdepth: 200,
    })
  }

  /**
   * Sample data for demo
   */
  private getSampleData(): MarineSpeciesEntity[] {
    const marineLife = [
      { name: "Delphinidae", common: "Dolphin", lat: 25.0, lng: -80.0, depth: 50, phylum: "Chordata" },
      { name: "Chelonia mydas", common: "Green Sea Turtle", lat: 21.5, lng: -157.0, depth: 15, phylum: "Chordata" },
      { name: "Carcharodon carcharias", common: "Great White Shark", lat: -34.0, lng: 18.5, depth: 100, phylum: "Chordata" },
      { name: "Octopus vulgaris", common: "Common Octopus", lat: 36.0, lng: -6.0, depth: 80, phylum: "Mollusca" },
      { name: "Hippocampus kuda", common: "Spotted Seahorse", lat: 10.0, lng: 120.0, depth: 20, phylum: "Chordata" },
      { name: "Manta birostris", common: "Giant Manta Ray", lat: -8.0, lng: 115.0, depth: 30, phylum: "Chordata" },
      { name: "Balaenoptera musculus", common: "Blue Whale", lat: -55.0, lng: -70.0, depth: 200, phylum: "Chordata" },
      { name: "Architeuthis dux", common: "Giant Squid", lat: 40.0, lng: -30.0, depth: 900, phylum: "Mollusca" },
      { name: "Pagurus bernhardus", common: "Hermit Crab", lat: 55.0, lng: -5.0, depth: 40, phylum: "Arthropoda" },
      { name: "Acropora millepora", common: "Staghorn Coral", lat: -18.0, lng: 147.0, depth: 10, phylum: "Cnidaria" },
    ]

    return marineLife.map((species, idx) => ({
      id: `obis_sample_${idx}`,
      type: "species" as const,
      name: species.common,
      description: `Marine species ${species.name}`,
      location: {
        latitude: species.lat,
        longitude: species.lng,
        altitude: -species.depth,
        source: "gps" as const,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      status: "active" as const,
      provenance: {
        source: "obis",
        sourceId: `sample_${idx}`,
        collectedAt: new Date().toISOString(),
        reliability: 0.5,
        metadata: { sample: true },
      },
      tags: ["Marine", species.phylum, "Sample"],
      properties: {
        scientificName: species.name,
        kingdom: "Animalia",
        phylum: species.phylum,
        depth: species.depth,
        waterBody: "Ocean",
        isMarine: true,
      },
    }))
  }

  /**
   * Fetch and publish to event bus
   */
  async fetchAndPublish(query?: OBISQuery): Promise<{ published: number; entities: MarineSpeciesEntity[] }> {
    const entities = await this.searchOccurrences(query)
    const eventBus = getEventBus()

    let published = 0
    for (const entity of entities) {
      try {
        await eventBus.publishEntity(entity)
        published++
      } catch (error) {
        console.error(`[OBIS] Failed to publish entity ${entity.id}:`, error)
      }
    }

    return { published, entities }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let clientInstance: OBISClient | null = null

export function getOBISClient(): OBISClient {
  if (!clientInstance) {
    clientInstance = new OBISClient()
  }
  return clientInstance
}
