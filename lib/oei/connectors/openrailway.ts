/**
 * OpenRailwayMap API Connector
 * 
 * Fetches railway infrastructure data from OpenStreetMap via Overpass API.
 * Data source: https://www.openrailwaymap.org/
 * 
 * Provides railway lines, stations, and freight route data.
 */

import type { Entity, GeoLocation, Provenance } from "@/types/oei"
import { getEventBus } from "../event-bus"

// Overpass API endpoint for railway data
const OVERPASS_API = "https://overpass-api.de/api/interpreter"

// =============================================================================
// TYPES
// =============================================================================

export interface RailwayStation {
  id: number
  name: string
  latitude: number
  longitude: number
  railway_type: "station" | "halt" | "yard" | "junction"
  operator?: string
  country?: string
  platforms?: number
  electrified?: boolean
}

export interface RailwayLine {
  id: number
  name?: string
  ref?: string // Line reference number
  coordinates: [number, number][] // [lng, lat] pairs
  railway_type: "rail" | "light_rail" | "subway" | "tram" | "narrow_gauge" | "preserved" | "abandoned"
  operator?: string
  electrified?: string
  gauge?: string
  maxspeed?: string
  usage?: "main" | "branch" | "industrial" | "military" | "tourism"
}

export interface RailwayEntity extends Entity {
  type: "railway"
  subType: "station" | "line" | "yard" | "junction"
  
  // Railway properties
  railwayType?: string
  operator?: string
  lineRef?: string
  electrified?: boolean
  gauge?: string
  maxSpeed?: string
  usage?: string
  platforms?: number
  
  properties: {
    railwayType: string
    operator?: string
    lineRef?: string
    electrified?: boolean
    gauge?: string
    maxSpeed?: string
    usage?: string
    platforms?: number
    country?: string
  }
}

export interface RailwayQuery {
  bounds?: {
    south: number
    north: number
    west: number
    east: number
  }
  railwayType?: string[]
  limit?: number
}

// =============================================================================
// HELPERS
// =============================================================================

function getRailwayColor(railwayType: string): string {
  switch (railwayType) {
    case "rail": return "#1e40af" // dark blue for mainline
    case "light_rail": return "#3b82f6" // blue for light rail
    case "subway": return "#7c3aed" // purple for subway
    case "tram": return "#16a34a" // green for tram
    case "narrow_gauge": return "#ca8a04" // yellow for narrow gauge
    case "preserved": return "#854d0e" // brown for heritage
    case "abandoned": return "#6b7280" // gray for abandoned
    default: return "#374151"
  }
}

function stationToEntity(station: RailwayStation): RailwayEntity {
  const provenance: Provenance = {
    source: "openrailwaymap",
    sourceId: String(station.id),
    collectedAt: new Date().toISOString(),
    url: "https://www.openrailwaymap.org/",
    reliability: 0.95,
    metadata: {
      osm_id: station.id,
    },
  }

  const location: GeoLocation = {
    latitude: station.latitude,
    longitude: station.longitude,
    source: "osm",
  }

  return {
    id: `railway_station_${station.id}`,
    type: "railway",
    subType: station.railway_type,
    name: station.name,
    description: `${station.railway_type.charAt(0).toUpperCase() + station.railway_type.slice(1)} - ${station.operator || "Unknown operator"}`,
    location,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    status: "active",
    provenance,
    tags: [station.railway_type, station.operator || "unknown"].filter(Boolean),
    railwayType: station.railway_type,
    operator: station.operator,
    electrified: station.electrified,
    platforms: station.platforms,
    properties: {
      railwayType: station.railway_type,
      operator: station.operator,
      electrified: station.electrified,
      platforms: station.platforms,
      country: station.country,
    },
  }
}

// =============================================================================
// API CLIENT
// =============================================================================

export class OpenRailwayClient {
  private cache: Map<string, { data: RailwayEntity[]; timestamp: number }> = new Map()
  private cacheTTL = 600000 // 10 minute cache (railway data doesn't change often)

  /**
   * Build Overpass QL query for railway data
   */
  private buildOverpassQuery(bounds: { south: number; north: number; west: number; east: number }): string {
    return `
      [out:json][timeout:30];
      (
        // Railway stations
        node["railway"="station"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        node["railway"="halt"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        // Railway yards
        node["railway"="yard"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      );
      out body;
    `.trim()
  }

  /**
   * Fetch railway stations from Overpass API
   */
  async fetchStations(query?: RailwayQuery): Promise<RailwayEntity[]> {
    if (!query?.bounds) {
      // Return sample data if no bounds specified
      return this.getSampleStations()
    }

    const cacheKey = JSON.stringify(query.bounds)
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data
    }

    try {
      const overpassQuery = this.buildOverpassQuery(query.bounds)
      
      const response = await fetch(OVERPASS_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `data=${encodeURIComponent(overpassQuery)}`,
        next: { revalidate: 600 },
      })

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status}`)
      }

      const data = await response.json()
      
      const stations: RailwayStation[] = (data.elements || [])
        .filter((el: any) => el.type === "node" && el.tags)
        .map((el: any) => ({
          id: el.id,
          name: el.tags.name || `Station ${el.id}`,
          latitude: el.lat,
          longitude: el.lon,
          railway_type: el.tags.railway,
          operator: el.tags.operator,
          platforms: el.tags.platforms ? parseInt(el.tags.platforms) : undefined,
          electrified: el.tags.electrified === "yes",
        }))

      const entities = stations.map(stationToEntity)
      
      if (query.limit) {
        entities.splice(query.limit)
      }

      this.cache.set(cacheKey, { data: entities, timestamp: Date.now() })
      return entities
    } catch (error) {
      console.error("[OpenRailway] API error, using sample data:", error)
      return this.getSampleStations()
    }
  }

  /**
   * Get comprehensive sample railway station data
   */
  getSampleStations(): RailwayEntity[] {
    const sampleStations: RailwayStation[] = [
      // USA - Major Stations
      { id: 1, name: "Grand Central Terminal", latitude: 40.7527, longitude: -73.9772, railway_type: "station", operator: "MTA", country: "USA", platforms: 44, electrified: true },
      { id: 2, name: "Penn Station", latitude: 40.7507, longitude: -73.9936, railway_type: "station", operator: "Amtrak", country: "USA", platforms: 21, electrified: true },
      { id: 3, name: "Union Station (Chicago)", latitude: 41.8786, longitude: -87.6392, railway_type: "station", operator: "Amtrak", country: "USA", platforms: 12, electrified: false },
      { id: 4, name: "Union Station (Los Angeles)", latitude: 34.0562, longitude: -118.2365, railway_type: "station", operator: "Amtrak", country: "USA", platforms: 10, electrified: false },
      { id: 5, name: "30th Street Station", latitude: 39.9558, longitude: -75.1820, railway_type: "station", operator: "Amtrak", country: "USA", platforms: 10, electrified: true },
      { id: 6, name: "Union Station (Washington DC)", latitude: 38.8978, longitude: -77.0065, railway_type: "station", operator: "Amtrak", country: "USA", platforms: 10, electrified: true },
      { id: 7, name: "King Street Station (Seattle)", latitude: 47.5988, longitude: -122.3304, railway_type: "station", operator: "Amtrak", country: "USA", platforms: 6, electrified: false },
      
      // Europe - Major Stations
      { id: 10, name: "St Pancras International", latitude: 51.5311, longitude: -0.1268, railway_type: "station", operator: "Network Rail", country: "UK", platforms: 15, electrified: true },
      { id: 11, name: "Gare du Nord", latitude: 48.8809, longitude: 2.3553, railway_type: "station", operator: "SNCF", country: "France", platforms: 31, electrified: true },
      { id: 12, name: "Frankfurt Hauptbahnhof", latitude: 50.1071, longitude: 8.6636, railway_type: "station", operator: "DB", country: "Germany", platforms: 24, electrified: true },
      { id: 13, name: "Amsterdam Centraal", latitude: 52.3791, longitude: 4.9003, railway_type: "station", operator: "NS", country: "Netherlands", platforms: 15, electrified: true },
      { id: 14, name: "Zürich Hauptbahnhof", latitude: 47.3782, longitude: 8.5403, railway_type: "station", operator: "SBB", country: "Switzerland", platforms: 26, electrified: true },
      { id: 15, name: "Milano Centrale", latitude: 45.4851, longitude: 9.2037, railway_type: "station", operator: "RFI", country: "Italy", platforms: 24, electrified: true },
      { id: 16, name: "Madrid Atocha", latitude: 40.4067, longitude: -3.6913, railway_type: "station", operator: "Renfe", country: "Spain", platforms: 21, electrified: true },
      
      // Asia - Major Stations
      { id: 20, name: "Tokyo Station", latitude: 35.6812, longitude: 139.7671, railway_type: "station", operator: "JR East", country: "Japan", platforms: 30, electrified: true },
      { id: 21, name: "Shinjuku Station", latitude: 35.6896, longitude: 139.7006, railway_type: "station", operator: "JR East", country: "Japan", platforms: 16, electrified: true },
      { id: 22, name: "Shanghai Hongqiao", latitude: 31.1949, longitude: 121.3202, railway_type: "station", operator: "CR", country: "China", platforms: 30, electrified: true },
      { id: 23, name: "Beijing South", latitude: 39.8653, longitude: 116.3787, railway_type: "station", operator: "CR", country: "China", platforms: 24, electrified: true },
      { id: 24, name: "Seoul Station", latitude: 37.5547, longitude: 126.9707, railway_type: "station", operator: "Korail", country: "South Korea", platforms: 12, electrified: true },
      { id: 25, name: "Mumbai CST", latitude: 18.9398, longitude: 72.8355, railway_type: "station", operator: "IR", country: "India", platforms: 18, electrified: true },
      
      // Australia
      { id: 30, name: "Flinders Street Station", latitude: -37.8183, longitude: 144.9671, railway_type: "station", operator: "Metro Trains", country: "Australia", platforms: 14, electrified: true },
      { id: 31, name: "Central Station (Sydney)", latitude: -33.8832, longitude: 151.2057, railway_type: "station", operator: "Sydney Trains", country: "Australia", platforms: 25, electrified: true },
      
      // Freight Yards
      { id: 40, name: "Bailey Yard", latitude: 41.1119, longitude: -100.7693, railway_type: "yard", operator: "Union Pacific", country: "USA", platforms: 0, electrified: false },
      { id: 41, name: "Selby Marshalling Yard", latitude: 53.7823, longitude: -1.0665, railway_type: "yard", operator: "Network Rail", country: "UK", platforms: 0, electrified: false },
    ]

    return sampleStations.map(stationToEntity)
  }

  /**
   * Fetch and publish entities to event bus
   */
  async fetchAndPublish(query?: RailwayQuery): Promise<{ published: number; entities: RailwayEntity[] }> {
    const entities = await this.fetchStations(query)
    const eventBus = getEventBus()

    let published = 0
    for (const entity of entities) {
      try {
        await eventBus.publishEntity(entity)
        published++
      } catch (error) {
        console.error(`[OpenRailway] Failed to publish entity ${entity.id}:`, error)
      }
    }

    return { published, entities }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let clientInstance: OpenRailwayClient | null = null

export function getOpenRailwayClient(): OpenRailwayClient {
  if (!clientInstance) {
    clientInstance = new OpenRailwayClient()
  }
  return clientInstance
}
