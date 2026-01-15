/**
 * OpenSky Network ADS-B Connector
 * 
 * Fetches real-time aircraft position data from OpenSky Network.
 * API Docs: https://openskynetwork.github.io/opensky-api/
 * 
 * Rate limits:
 * - Anonymous: 100 requests/day (10 second resolution)
 * - Registered: 400 requests/day (5 second resolution)
 */

import type { Entity, GeoLocation, GeoBounds, Provenance, AircraftEntity } from "@/types/oei"
import { getEventBus } from "../event-bus"

const OPENSKY_API_BASE = "https://opensky-network.org/api"

// =============================================================================
// TYPES
// =============================================================================

interface OpenSkyState {
  icao24: string              // [0] ICAO24 address
  callsign: string | null     // [1] Callsign
  origin_country: string      // [2] Origin country
  time_position: number | null // [3] Time of last position update
  last_contact: number        // [4] Time of last contact
  longitude: number | null    // [5] Longitude
  latitude: number | null     // [6] Latitude
  baro_altitude: number | null // [7] Barometric altitude in meters
  on_ground: boolean          // [8] Is on ground
  velocity: number | null     // [9] Velocity in m/s
  true_track: number | null   // [10] Track/heading in degrees
  vertical_rate: number | null // [11] Vertical rate in m/s
  sensors: number[] | null    // [12] Sensor IDs
  geo_altitude: number | null // [13] Geometric altitude in meters
  squawk: string | null       // [14] Transponder code
  spi: boolean                // [15] Special position indicator
  position_source: number     // [16] Position source (0=ADS-B, 1=ASTERIX, 2=MLAT)
  category: number            // [17] Aircraft category (if available)
}

interface OpenSkyResponse {
  time: number
  states: (string | number | boolean | null)[][] | null
}

export interface OpenSkyQuery {
  bounds?: GeoBounds          // Geographic bounding box
  icao24?: string[]           // Filter by ICAO24 addresses
  time?: number               // Unix timestamp for historical data
}

// =============================================================================
// HELPERS
// =============================================================================

function parseOpenSkyState(stateArray: (string | number | boolean | null)[]): OpenSkyState | null {
  if (!stateArray || stateArray.length < 17) return null
  
  return {
    icao24: stateArray[0] as string,
    callsign: stateArray[1] as string | null,
    origin_country: stateArray[2] as string,
    time_position: stateArray[3] as number | null,
    last_contact: stateArray[4] as number,
    longitude: stateArray[5] as number | null,
    latitude: stateArray[6] as number | null,
    baro_altitude: stateArray[7] as number | null,
    on_ground: stateArray[8] as boolean,
    velocity: stateArray[9] as number | null,
    true_track: stateArray[10] as number | null,
    vertical_rate: stateArray[11] as number | null,
    sensors: stateArray[12] as number[] | null,
    geo_altitude: stateArray[13] as number | null,
    squawk: stateArray[14] as string | null,
    spi: stateArray[15] as boolean,
    position_source: stateArray[16] as number,
    category: (stateArray[17] as number) || 0,
  }
}

function getCategoryName(category: number): string {
  const categories: Record<number, string> = {
    0: "No information",
    1: "No ADS-B emitter category",
    2: "Light (< 15,500 lbs)",
    3: "Small (15,500 - 75,000 lbs)",
    4: "Large (75,000 - 300,000 lbs)",
    5: "High vortex large",
    6: "Heavy (> 300,000 lbs)",
    7: "High performance",
    8: "Rotorcraft",
    9: "Glider/Sailplane",
    10: "Lighter than air",
    11: "Parachutist/Skydiver",
    12: "Ultralight/hang-glider",
    13: "Reserved",
    14: "UAV",
    15: "Space/trans-atmospheric",
    16: "Surface vehicle - Emergency",
    17: "Surface vehicle - Service",
    18: "Point obstacle",
    19: "Cluster obstacle",
    20: "Line obstacle",
  }
  return categories[category] || "Unknown"
}

function openSkyStateToEntity(state: OpenSkyState): AircraftEntity | null {
  if (!state.latitude || !state.longitude) return null

  const provenance: Provenance = {
    source: "opensky",
    sourceId: state.icao24,
    collectedAt: new Date().toISOString(),
    url: `https://opensky-network.org/aircraft-profile?icao24=${state.icao24}`,
    reliability: state.position_source === 0 ? 1.0 : 0.8,
    metadata: {
      position_source: state.position_source === 0 ? "ADS-B" : 
                        state.position_source === 1 ? "ASTERIX" : "MLAT",
      origin_country: state.origin_country,
    },
  }

  const location: GeoLocation = {
    latitude: state.latitude,
    longitude: state.longitude,
    altitude: state.geo_altitude || state.baro_altitude || undefined,
    source: "gps",
  }

  return {
    id: `opensky_${state.icao24}`,
    type: "aircraft",
    name: state.callsign?.trim() || state.icao24.toUpperCase(),
    description: `${getCategoryName(state.category)} from ${state.origin_country}`,
    location,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSeenAt: new Date(state.last_contact * 1000).toISOString(),
    status: "active",
    provenance,
    tags: [
      state.origin_country,
      state.on_ground ? "ground" : "airborne",
      getCategoryName(state.category),
    ],
    properties: {
      icao24: state.icao24,
      callsign: state.callsign?.trim(),
      origin: undefined,
      destination: undefined,
      altitude: state.geo_altitude || state.baro_altitude || undefined,
      velocity: state.velocity || undefined,
      heading: state.true_track || undefined,
      verticalRate: state.vertical_rate || undefined,
      squawk: state.squawk || undefined,
      onGround: state.on_ground,
      category: getCategoryName(state.category),
    },
  }
}

// =============================================================================
// API CLIENT
// =============================================================================

export class OpenSkyClient {
  private credentials?: { username: string; password: string }

  constructor(username?: string, password?: string) {
    if (username && password) {
      this.credentials = { username, password }
    }
  }

  /**
   * Fetch all current aircraft states
   */
  async fetchAllStates(query?: OpenSkyQuery): Promise<AircraftEntity[]> {
    const params = new URLSearchParams()
    
    if (query?.bounds) {
      params.set("lamin", String(query.bounds.south))
      params.set("lamax", String(query.bounds.north))
      params.set("lomin", String(query.bounds.west))
      params.set("lomax", String(query.bounds.east))
    }
    
    if (query?.icao24) {
      params.set("icao24", query.icao24.join(","))
    }
    
    if (query?.time) {
      params.set("time", String(query.time))
    }

    const url = `${OPENSKY_API_BASE}/states/all?${params.toString()}`
    
    const headers: Record<string, string> = {}
    if (this.credentials) {
      const auth = Buffer.from(
        `${this.credentials.username}:${this.credentials.password}`
      ).toString("base64")
      headers["Authorization"] = `Basic ${auth}`
    }

    const response = await fetch(url, { headers })

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("OpenSky API rate limit exceeded")
      }
      throw new Error(`OpenSky API error: ${response.status} ${response.statusText}`)
    }

    const data: OpenSkyResponse = await response.json()
    
    if (!data.states) {
      return []
    }

    const entities: AircraftEntity[] = []
    
    for (const stateArray of data.states) {
      const state = parseOpenSkyState(stateArray)
      if (state) {
        const entity = openSkyStateToEntity(state)
        if (entity) {
          entities.push(entity)
        }
      }
    }

    return entities
  }

  /**
   * Fetch aircraft within a bounding box
   */
  async fetchInBounds(bounds: GeoBounds): Promise<AircraftEntity[]> {
    return this.fetchAllStates({ bounds })
  }

  /**
   * Fetch specific aircraft by ICAO24 addresses
   */
  async fetchByIcao24(icao24: string[]): Promise<AircraftEntity[]> {
    return this.fetchAllStates({ icao24 })
  }

  /**
   * Fetch aircraft near a point
   */
  async fetchNearPoint(lat: number, lon: number, radiusDegrees = 1): Promise<AircraftEntity[]> {
    return this.fetchInBounds({
      north: lat + radiusDegrees,
      south: lat - radiusDegrees,
      east: lon + radiusDegrees,
      west: lon - radiusDegrees,
    })
  }

  /**
   * Fetch and publish entities to event bus
   */
  async fetchAndPublish(query?: OpenSkyQuery): Promise<{ published: number; entities: AircraftEntity[] }> {
    const entities = await this.fetchAllStates(query)
    const eventBus = getEventBus()

    let published = 0
    for (const entity of entities) {
      try {
        await eventBus.publishEntity(entity)
        published++
      } catch (error) {
        console.error(`[OpenSky] Failed to publish entity ${entity.id}:`, error)
      }
    }

    return { published, entities }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let clientInstance: OpenSkyClient | null = null

export function getOpenSkyClient(): OpenSkyClient {
  if (!clientInstance) {
    const username = process.env.OPENSKY_USERNAME
    const password = process.env.OPENSKY_PASSWORD
    clientInstance = new OpenSkyClient(username, password)
  }
  return clientInstance
}
