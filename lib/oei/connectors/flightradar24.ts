/**
 * FlightRadar24 API Connector
 * 
 * Fetches real-time flight tracking data from FlightRadar24.
 * This connector uses the FlightRadar24 data feed API.
 * 
 * API Key format: user_key|app_key
 */

import type { Entity, GeoLocation, GeoBounds, Provenance, AircraftEntity } from "@/types/oei"
import { getEventBus } from "../event-bus"

const FR24_API_BASE = "https://data-cloud.flightradar24.com/zones/fcgi/feed.js"
const FR24_FLIGHT_API = "https://data-live.flightradar24.com/clickhandler/"

// =============================================================================
// TYPES
// =============================================================================

export interface FR24Query {
  bounds?: GeoBounds
  airline?: string
  limit?: number
}

interface FR24FlightData {
  flightId: string
  icao24: string
  latitude: number
  longitude: number
  heading: number
  altitude: number
  groundSpeed: number
  squawk: string
  aircraftType: string
  registration: string
  timestamp: number
  origin: string
  destination: string
  flightNumber: string
  callsign: string
  isGround: boolean
  verticalSpeed: number
}

interface FR24ApiResponse {
  full_count: number
  version: number
  [flightId: string]: unknown
}

// =============================================================================
// HELPERS
// =============================================================================

function parseFR24Response(data: FR24ApiResponse): FR24FlightData[] {
  const flights: FR24FlightData[] = []
  
  for (const [key, value] of Object.entries(data)) {
    // Skip metadata fields
    if (key === "full_count" || key === "version" || key === "stats") continue
    
    if (Array.isArray(value)) {
      const flightData: FR24FlightData = {
        flightId: key,
        icao24: value[0] || "",
        latitude: value[1] || 0,
        longitude: value[2] || 0,
        heading: value[3] || 0,
        altitude: value[4] || 0,
        groundSpeed: value[5] || 0,
        squawk: value[6] || "",
        aircraftType: value[8] || "",
        registration: value[9] || "",
        timestamp: value[10] || Date.now() / 1000,
        origin: value[11] || "",
        destination: value[12] || "",
        flightNumber: value[13] || "",
        callsign: value[16] || "",
        isGround: value[14] === 1,
        verticalSpeed: value[15] || 0,
      }
      
      if (flightData.latitude && flightData.longitude) {
        flights.push(flightData)
      }
    }
  }
  
  return flights
}

function getAircraftCategory(type: string): string {
  const widebody = ["B77", "B78", "A35", "A38", "A33", "A34", "B74", "B76"]
  const narrowbody = ["A32", "A31", "A20", "B73", "B75", "E19", "E17", "CRJ"]
  const regional = ["AT7", "AT5", "E14", "E13", "DH8"]
  const cargo = ["B74F", "B77F", "A30F", "MD1"]
  
  if (widebody.some(w => type.startsWith(w))) return "Wide-body"
  if (narrowbody.some(n => type.startsWith(n))) return "Narrow-body"
  if (regional.some(r => type.startsWith(r))) return "Regional"
  if (cargo.some(c => type.includes(c))) return "Cargo"
  if (type.startsWith("H") || type.includes("EC") || type.includes("AS")) return "Helicopter"
  return "Aircraft"
}

function fr24FlightToEntity(flight: FR24FlightData): AircraftEntity {
  const provenance: Provenance = {
    source: "flightradar24",
    sourceId: flight.flightId,
    collectedAt: new Date().toISOString(),
    url: `https://www.flightradar24.com/${flight.callsign || flight.flightId}`,
    reliability: 0.95,
    metadata: {
      registration: flight.registration,
      aircraftType: flight.aircraftType,
    },
  }

  const location: GeoLocation = {
    latitude: flight.latitude,
    longitude: flight.longitude,
    altitude: flight.altitude * 0.3048, // Convert feet to meters
    source: "gps",
  }

  return {
    id: `fr24_${flight.flightId}`,
    type: "aircraft",
    name: flight.callsign || flight.flightNumber || flight.flightId,
    description: `${flight.aircraftType} ${flight.registration} - ${flight.origin} to ${flight.destination}`,
    location,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSeenAt: new Date(flight.timestamp * 1000).toISOString(),
    lastSeen: new Date(flight.timestamp * 1000).toISOString(),
    status: "active",
    provenance,
    tags: [
      getAircraftCategory(flight.aircraftType),
      flight.isGround ? "ground" : "airborne",
      flight.aircraftType,
    ].filter(Boolean),
    // Top-level flight properties for marker rendering
    icao24: flight.icao24,
    callsign: flight.callsign,
    origin: flight.origin,
    destination: flight.destination,
    altitude: flight.altitude,
    velocity: flight.groundSpeed,
    heading: flight.heading,
    verticalRate: flight.verticalSpeed,
    onGround: flight.isGround,
    squawk: flight.squawk,
    transponder: true,
    airline: "",
    aircraftType: flight.aircraftType,
    registration: flight.registration,
    flightNumber: flight.flightNumber,
    // Legacy properties object for backwards compatibility
    properties: {
      icao24: flight.icao24,
      callsign: flight.callsign,
      origin: flight.origin,
      destination: flight.destination,
      altitude: flight.altitude,
      velocity: flight.groundSpeed,
      heading: flight.heading,
      verticalRate: flight.verticalSpeed,
      squawk: flight.squawk,
      onGround: flight.isGround,
      category: getAircraftCategory(flight.aircraftType),
      registration: flight.registration,
      aircraftType: flight.aircraftType,
      flightNumber: flight.flightNumber,
    },
  }
}

// =============================================================================
// API CLIENT
// =============================================================================

export class FlightRadar24Client {
  private apiKey?: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey
  }

  /**
   * Fetch flights within a bounding box
   */
  async fetchFlights(query?: FR24Query): Promise<AircraftEntity[]> {
    const params = new URLSearchParams()
    
    // Default to world view if no bounds
    const bounds = query?.bounds || {
      north: 90,
      south: -90,
      east: 180,
      west: -180,
    }
    
    params.set("bounds", `${bounds.north},${bounds.south},${bounds.west},${bounds.east}`)
    params.set("faa", "1")
    params.set("satellite", "1")
    params.set("mlat", "1")
    params.set("flarm", "1")
    params.set("adsb", "1")
    params.set("gnd", "1")
    params.set("air", "1")
    params.set("vehicles", "0")
    params.set("estimated", "0")
    params.set("maxage", "14400")
    params.set("gliders", "0")
    params.set("stats", "0")
    
    if (query?.airline) {
      params.set("airline", query.airline)
    }

    const url = `${FR24_API_BASE}?${params.toString()}`
    
    const headers: Record<string, string> = {
      "Accept": "application/json",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
      "Origin": "https://www.flightradar24.com",
      "Referer": "https://www.flightradar24.com/",
    }

    try {
      const response = await fetch(url, { 
        headers,
        next: { revalidate: 10 } // Cache for 10 seconds
      })

      if (!response.ok) {
        throw new Error(`FlightRadar24 API error: ${response.status}`)
      }

      const data: FR24ApiResponse = await response.json()
      const flights = parseFR24Response(data)
      
      let entities = flights.map(fr24FlightToEntity)
      
      if (query?.limit) {
        entities = entities.slice(0, query.limit)
      }
      
      return entities
    } catch (error) {
      console.error("[FR24] API error:", error)
      // No mock data - throw error to signal failure
      throw error
    }
  }

  /**
   * Fetch flights near a point
   */
  async fetchNearPoint(lat: number, lon: number, radiusDegrees = 2): Promise<AircraftEntity[]> {
    return this.fetchFlights({
      bounds: {
        north: lat + radiusDegrees,
        south: lat - radiusDegrees,
        east: lon + radiusDegrees,
        west: lon - radiusDegrees,
      },
    })
  }

  /**
   * Fetch and publish entities to event bus
   */
  async fetchAndPublish(query?: FR24Query): Promise<{ published: number; entities: AircraftEntity[] }> {
    const entities = await this.fetchFlights(query)
    const eventBus = getEventBus()

    let published = 0
    for (const entity of entities) {
      try {
        await eventBus.publishEntity(entity)
        published++
      } catch (error) {
        console.error(`[FR24] Failed to publish entity ${entity.id}:`, error)
      }
    }

    return { published, entities }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let clientInstance: FlightRadar24Client | null = null

export function getFlightRadar24Client(): FlightRadar24Client {
  if (!clientInstance) {
    const apiKey = process.env.FLIGHTRADAR24_API_KEY
    clientInstance = new FlightRadar24Client(apiKey)
  }
  return clientInstance
}
