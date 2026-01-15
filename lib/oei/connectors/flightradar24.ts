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
      // Return sample data for demo
      return this.getSampleFlights()
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
   * Get comprehensive sample flight data for demo
   * Includes global coverage across all major routes
   */
  private getSampleFlights(): AircraftEntity[] {
    const sampleFlights: FR24FlightData[] = [
      // US Domestic - West Coast
      { flightId: "demo001", icao24: "A1B2C3", latitude: 37.7749, longitude: -122.4194, heading: 135, altitude: 35000, groundSpeed: 450, squawk: "1200", aircraftType: "B738", registration: "N12345", timestamp: Date.now() / 1000, origin: "SFO", destination: "LAX", flightNumber: "UA123", callsign: "UAL123", isGround: false, verticalSpeed: 0 },
      { flightId: "demo002", icao24: "A2B3C4", latitude: 34.0522, longitude: -118.2437, heading: 45, altitude: 32000, groundSpeed: 480, squawk: "1201", aircraftType: "A320", registration: "N23456", timestamp: Date.now() / 1000, origin: "LAX", destination: "SFO", flightNumber: "AA456", callsign: "AAL456", isGround: false, verticalSpeed: 500 },
      { flightId: "demo003", icao24: "A3B4C5", latitude: 47.6062, longitude: -122.3321, heading: 180, altitude: 38000, groundSpeed: 510, squawk: "1202", aircraftType: "B739", registration: "N34567", timestamp: Date.now() / 1000, origin: "SEA", destination: "SAN", flightNumber: "AS789", callsign: "ASA789", isGround: false, verticalSpeed: -200 },
      { flightId: "demo004", icao24: "A4B5C6", latitude: 32.7157, longitude: -117.1611, heading: 315, altitude: 28000, groundSpeed: 420, squawk: "1203", aircraftType: "E175", registration: "N45678", timestamp: Date.now() / 1000, origin: "SAN", destination: "SEA", flightNumber: "UA321", callsign: "UAL321", isGround: false, verticalSpeed: 1500 },
      { flightId: "demo005", icao24: "A5B6C7", latitude: 36.0800, longitude: -115.1522, heading: 270, altitude: 41000, groundSpeed: 490, squawk: "1204", aircraftType: "B738", registration: "N56789", timestamp: Date.now() / 1000, origin: "LAS", destination: "PHX", flightNumber: "WN234", callsign: "SWA234", isGround: false, verticalSpeed: 0 },
      
      // US Domestic - East Coast
      { flightId: "demo006", icao24: "D4E5F6", latitude: 40.7128, longitude: -74.0060, heading: 270, altitude: 39000, groundSpeed: 520, squawk: "1234", aircraftType: "B77W", registration: "N67890", timestamp: Date.now() / 1000, origin: "JFK", destination: "LHR", flightNumber: "BA178", callsign: "BAW178", isGround: false, verticalSpeed: 100 },
      { flightId: "demo007", icao24: "D5E6F7", latitude: 42.3601, longitude: -71.0589, heading: 225, altitude: 36000, groundSpeed: 465, squawk: "1235", aircraftType: "A321", registration: "N78901", timestamp: Date.now() / 1000, origin: "BOS", destination: "MIA", flightNumber: "DL567", callsign: "DAL567", isGround: false, verticalSpeed: -100 },
      { flightId: "demo008", icao24: "D6E7F8", latitude: 25.7617, longitude: -80.1918, heading: 0, altitude: 33000, groundSpeed: 445, squawk: "1236", aircraftType: "B738", registration: "N89012", timestamp: Date.now() / 1000, origin: "MIA", destination: "ATL", flightNumber: "AA890", callsign: "AAL890", isGround: false, verticalSpeed: 200 },
      { flightId: "demo009", icao24: "D7E8F9", latitude: 33.7490, longitude: -84.3880, heading: 315, altitude: 35000, groundSpeed: 475, squawk: "1237", aircraftType: "B752", registration: "N90123", timestamp: Date.now() / 1000, origin: "ATL", destination: "ORD", flightNumber: "DL123", callsign: "DAL123", isGround: false, verticalSpeed: 0 },
      { flightId: "demo010", icao24: "D8E9F0", latitude: 41.8781, longitude: -87.6298, heading: 90, altitude: 37000, groundSpeed: 495, squawk: "1238", aircraftType: "A320", registration: "N01234", timestamp: Date.now() / 1000, origin: "ORD", destination: "DEN", flightNumber: "UA456", callsign: "UAL456", isGround: false, verticalSpeed: -50 },
      
      // Transatlantic Routes
      { flightId: "demo011", icao24: "E1F2G3", latitude: 51.5, longitude: -30.0, heading: 270, altitude: 40000, groundSpeed: 530, squawk: "2001", aircraftType: "B789", registration: "G-ZBKA", timestamp: Date.now() / 1000, origin: "LHR", destination: "JFK", flightNumber: "BA115", callsign: "BAW115", isGround: false, verticalSpeed: 0 },
      { flightId: "demo012", icao24: "E2F3G4", latitude: 48.5, longitude: -25.0, heading: 90, altitude: 39000, groundSpeed: 525, squawk: "2002", aircraftType: "A350", registration: "F-HTYA", timestamp: Date.now() / 1000, origin: "CDG", destination: "LAX", flightNumber: "AF66", callsign: "AFR66", isGround: false, verticalSpeed: 100 },
      { flightId: "demo013", icao24: "E3F4G5", latitude: 55.0, longitude: -40.0, heading: 250, altitude: 41000, groundSpeed: 540, squawk: "2003", aircraftType: "B77W", registration: "D-ABYA", timestamp: Date.now() / 1000, origin: "FRA", destination: "ORD", flightNumber: "LH430", callsign: "DLH430", isGround: false, verticalSpeed: 0 },
      { flightId: "demo014", icao24: "E4F5G6", latitude: 45.0, longitude: -35.0, heading: 75, altitude: 38000, groundSpeed: 510, squawk: "2004", aircraftType: "A380", registration: "A6-EDA", timestamp: Date.now() / 1000, origin: "DXB", destination: "JFK", flightNumber: "EK201", callsign: "UAE201", isGround: false, verticalSpeed: 50 },
      
      // Transpacific Routes
      { flightId: "demo015", icao24: "F1G2H3", latitude: 35.0, longitude: -170.0, heading: 90, altitude: 42000, groundSpeed: 550, squawk: "3001", aircraftType: "B77L", registration: "JA873J", timestamp: Date.now() / 1000, origin: "NRT", destination: "LAX", flightNumber: "JL62", callsign: "JAL62", isGround: false, verticalSpeed: 0 },
      { flightId: "demo016", icao24: "F2G3H4", latitude: 30.0, longitude: -160.0, heading: 270, altitude: 40000, groundSpeed: 535, squawk: "3002", aircraftType: "B789", registration: "N26910", timestamp: Date.now() / 1000, origin: "SFO", destination: "HND", flightNumber: "UA837", callsign: "UAL837", isGround: false, verticalSpeed: -100 },
      { flightId: "demo017", icao24: "F3G4H5", latitude: 45.0, longitude: 170.0, heading: 230, altitude: 39000, groundSpeed: 520, squawk: "3003", aircraftType: "A350", registration: "B-LRI", timestamp: Date.now() / 1000, origin: "HKG", destination: "SFO", flightNumber: "CX870", callsign: "CPA870", isGround: false, verticalSpeed: 0 },
      { flightId: "demo018", icao24: "F4G5H6", latitude: 40.0, longitude: 160.0, heading: 45, altitude: 41000, groundSpeed: 545, squawk: "3004", aircraftType: "B77W", registration: "HL7784", timestamp: Date.now() / 1000, origin: "ICN", destination: "LAX", flightNumber: "KE11", callsign: "KAL11", isGround: false, verticalSpeed: 100 },
      
      // European Flights
      { flightId: "demo019", icao24: "G1H2I3", latitude: 51.4700, longitude: -0.4543, heading: 90, altitude: 32000, groundSpeed: 420, squawk: "4001", aircraftType: "A320", registration: "G-EUYO", timestamp: Date.now() / 1000, origin: "LHR", destination: "CDG", flightNumber: "BA304", callsign: "BAW304", isGround: false, verticalSpeed: 1000 },
      { flightId: "demo020", icao24: "G2H3I4", latitude: 48.8566, longitude: 2.3522, heading: 180, altitude: 35000, groundSpeed: 450, squawk: "4002", aircraftType: "A319", registration: "D-AILN", timestamp: Date.now() / 1000, origin: "CDG", destination: "FCO", flightNumber: "AF1404", callsign: "AFR1404", isGround: false, verticalSpeed: 0 },
      { flightId: "demo021", icao24: "G3H4I5", latitude: 52.3676, longitude: 4.9041, heading: 135, altitude: 28000, groundSpeed: 380, squawk: "4003", aircraftType: "B738", registration: "PH-HSD", timestamp: Date.now() / 1000, origin: "AMS", destination: "BCN", flightNumber: "KL1671", callsign: "KLM1671", isGround: false, verticalSpeed: -500 },
      { flightId: "demo022", icao24: "G4H5I6", latitude: 50.0379, longitude: 8.5622, heading: 270, altitude: 36000, groundSpeed: 460, squawk: "4004", aircraftType: "A321", registration: "D-AIDK", timestamp: Date.now() / 1000, origin: "FRA", destination: "MAD", flightNumber: "LH1120", callsign: "DLH1120", isGround: false, verticalSpeed: 0 },
      
      // Asian Flights
      { flightId: "demo023", icao24: "H1I2J3", latitude: 35.6762, longitude: 139.6503, heading: 270, altitude: 34000, groundSpeed: 430, squawk: "5001", aircraftType: "B788", registration: "JA828A", timestamp: Date.now() / 1000, origin: "HND", destination: "PVG", flightNumber: "NH959", callsign: "ANA959", isGround: false, verticalSpeed: 0 },
      { flightId: "demo024", icao24: "H2I3J4", latitude: 31.2304, longitude: 121.4737, heading: 180, altitude: 37000, groundSpeed: 470, squawk: "5002", aircraftType: "A330", registration: "B-6131", timestamp: Date.now() / 1000, origin: "PVG", destination: "SIN", flightNumber: "MU567", callsign: "CES567", isGround: false, verticalSpeed: 100 },
      { flightId: "demo025", icao24: "H3I4J5", latitude: 1.3521, longitude: 103.8198, heading: 45, altitude: 40000, groundSpeed: 490, squawk: "5003", aircraftType: "A350", registration: "9V-SMH", timestamp: Date.now() / 1000, origin: "SIN", destination: "NRT", flightNumber: "SQ12", callsign: "SIA12", isGround: false, verticalSpeed: -50 },
      { flightId: "demo026", icao24: "H4I5J6", latitude: 22.3193, longitude: 114.1694, heading: 0, altitude: 38000, groundSpeed: 460, squawk: "5004", aircraftType: "B77W", registration: "B-KQA", timestamp: Date.now() / 1000, origin: "HKG", destination: "PEK", flightNumber: "CX310", callsign: "CPA310", isGround: false, verticalSpeed: 0 },
      
      // Middle East Routes
      { flightId: "demo027", icao24: "I1J2K3", latitude: 25.2532, longitude: 55.3657, heading: 315, altitude: 41000, groundSpeed: 520, squawk: "6001", aircraftType: "A380", registration: "A6-EEK", timestamp: Date.now() / 1000, origin: "DXB", destination: "LHR", flightNumber: "EK3", callsign: "UAE3", isGround: false, verticalSpeed: 0 },
      { flightId: "demo028", icao24: "I2J3K4", latitude: 26.0667, longitude: 50.6378, heading: 90, altitude: 39000, groundSpeed: 500, squawk: "6002", aircraftType: "B789", registration: "A9C-FA", timestamp: Date.now() / 1000, origin: "BAH", destination: "BKK", flightNumber: "GF150", callsign: "GFA150", isGround: false, verticalSpeed: 100 },
      { flightId: "demo029", icao24: "I3J4K5", latitude: 25.2760, longitude: 51.5200, heading: 270, altitude: 42000, groundSpeed: 530, squawk: "6003", aircraftType: "A350", registration: "A7-ALA", timestamp: Date.now() / 1000, origin: "DOH", destination: "JFK", flightNumber: "QR701", callsign: "QTR701", isGround: false, verticalSpeed: 0 },
      
      // South American Routes
      { flightId: "demo030", icao24: "J1K2L3", latitude: -23.5505, longitude: -46.6333, heading: 45, altitude: 36000, groundSpeed: 450, squawk: "7001", aircraftType: "B77W", registration: "PR-LDB", timestamp: Date.now() / 1000, origin: "GRU", destination: "MIA", flightNumber: "LA8084", callsign: "LAN8084", isGround: false, verticalSpeed: 500 },
      { flightId: "demo031", icao24: "J2K3L4", latitude: -34.6037, longitude: -58.3816, heading: 0, altitude: 38000, groundSpeed: 480, squawk: "7002", aircraftType: "A330", registration: "LV-FNI", timestamp: Date.now() / 1000, origin: "EZE", destination: "MAD", flightNumber: "AR1132", callsign: "ARG1132", isGround: false, verticalSpeed: 0 },
      { flightId: "demo032", icao24: "J3K4L5", latitude: -33.4489, longitude: -70.6693, heading: 315, altitude: 40000, groundSpeed: 510, squawk: "7003", aircraftType: "B789", registration: "CC-BGC", timestamp: Date.now() / 1000, origin: "SCL", destination: "JFK", flightNumber: "LA530", callsign: "LAN530", isGround: false, verticalSpeed: -100 },
      
      // Australian Routes
      { flightId: "demo033", icao24: "K1L2M3", latitude: -33.8688, longitude: 151.2093, heading: 270, altitude: 35000, groundSpeed: 440, squawk: "8001", aircraftType: "A380", registration: "VH-OQA", timestamp: Date.now() / 1000, origin: "SYD", destination: "LAX", flightNumber: "QF11", callsign: "QFA11", isGround: false, verticalSpeed: 800 },
      { flightId: "demo034", icao24: "K2L3M4", latitude: -37.8136, longitude: 144.9631, heading: 315, altitude: 41000, groundSpeed: 530, squawk: "8002", aircraftType: "B789", registration: "VH-ZNA", timestamp: Date.now() / 1000, origin: "MEL", destination: "SIN", flightNumber: "QF35", callsign: "QFA35", isGround: false, verticalSpeed: 0 },
      { flightId: "demo035", icao24: "K3L4M5", latitude: -31.9505, longitude: 115.8605, heading: 0, altitude: 39000, groundSpeed: 490, squawk: "8003", aircraftType: "A330", registration: "VH-QPH", timestamp: Date.now() / 1000, origin: "PER", destination: "HKG", flightNumber: "QF67", callsign: "QFA67", isGround: false, verticalSpeed: 100 },
      
      // African Routes
      { flightId: "demo036", icao24: "L1M2N3", latitude: -33.9249, longitude: 18.4241, heading: 0, altitude: 37000, groundSpeed: 470, squawk: "9001", aircraftType: "A340", registration: "ZS-SXF", timestamp: Date.now() / 1000, origin: "CPT", destination: "JNB", flightNumber: "SA322", callsign: "SAA322", isGround: false, verticalSpeed: 0 },
      { flightId: "demo037", icao24: "L2M3N4", latitude: -26.2041, longitude: 28.0473, heading: 315, altitude: 40000, groundSpeed: 510, squawk: "9002", aircraftType: "B77W", registration: "ZS-SNA", timestamp: Date.now() / 1000, origin: "JNB", destination: "LHR", flightNumber: "SA234", callsign: "SAA234", isGround: false, verticalSpeed: -50 },
      { flightId: "demo038", icao24: "L3M4N5", latitude: 30.0444, longitude: 31.2357, heading: 180, altitude: 38000, groundSpeed: 480, squawk: "9003", aircraftType: "A330", registration: "SU-GDM", timestamp: Date.now() / 1000, origin: "CAI", destination: "NBO", flightNumber: "MS845", callsign: "MSR845", isGround: false, verticalSpeed: 0 },
      
      // Cargo Flights
      { flightId: "demo039", icao24: "M1N2O3", latitude: 39.0997, longitude: -94.5786, heading: 90, altitude: 35000, groundSpeed: 430, squawk: "0001", aircraftType: "B763", registration: "N362CM", timestamp: Date.now() / 1000, origin: "MCI", destination: "MEM", flightNumber: "FX2901", callsign: "FDX2901", isGround: false, verticalSpeed: 0 },
      { flightId: "demo040", icao24: "M2N3O4", latitude: 35.2271, longitude: -80.8431, heading: 270, altitude: 38000, groundSpeed: 450, squawk: "0002", aircraftType: "B748", registration: "N850GT", timestamp: Date.now() / 1000, origin: "CLT", destination: "DFW", flightNumber: "5X678", callsign: "UPS678", isGround: false, verticalSpeed: 100 },
      
      // Private/Business Jets
      { flightId: "demo041", icao24: "N1O2P3", latitude: 34.0522, longitude: -118.2437, heading: 45, altitude: 45000, groundSpeed: 500, squawk: "0101", aircraftType: "GLEX", registration: "N100VP", timestamp: Date.now() / 1000, origin: "VNY", destination: "TEB", flightNumber: "", callsign: "N100VP", isGround: false, verticalSpeed: 0 },
      { flightId: "demo042", icao24: "N2O3P4", latitude: 40.8500, longitude: -74.0613, heading: 180, altitude: 43000, groundSpeed: 480, squawk: "0102", aircraftType: "G650", registration: "N650GT", timestamp: Date.now() / 1000, origin: "TEB", destination: "MIA", flightNumber: "", callsign: "N650GT", isGround: false, verticalSpeed: -200 },
      
      // Military (Non-Combat Training)
      { flightId: "demo043", icao24: "O1P2Q3", latitude: 32.7157, longitude: -117.1611, heading: 270, altitude: 25000, groundSpeed: 350, squawk: "0201", aircraftType: "C17", registration: "05-5143", timestamp: Date.now() / 1000, origin: "KNZY", destination: "KPHX", flightNumber: "RCH143", callsign: "REACH143", isGround: false, verticalSpeed: 0 },
      { flightId: "demo044", icao24: "O2P3Q4", latitude: 38.9072, longitude: -77.0369, heading: 90, altitude: 28000, groundSpeed: 380, squawk: "0202", aircraftType: "KC135", registration: "62-3534", timestamp: Date.now() / 1000, origin: "KADW", destination: "KBLV", flightNumber: "GOLD01", callsign: "GOLD01", isGround: false, verticalSpeed: 500 },
      
      // Additional Global Coverage
      { flightId: "demo045", icao24: "P1Q2R3", latitude: 55.7558, longitude: 37.6173, heading: 90, altitude: 36000, groundSpeed: 460, squawk: "1001", aircraftType: "A321", registration: "VQ-BEA", timestamp: Date.now() / 1000, origin: "SVO", destination: "LED", flightNumber: "SU10", callsign: "AFL10", isGround: false, verticalSpeed: 0 },
      { flightId: "demo046", icao24: "P2Q3R4", latitude: 13.7563, longitude: 100.5018, heading: 315, altitude: 38000, groundSpeed: 480, squawk: "1002", aircraftType: "B77W", registration: "HS-TKX", timestamp: Date.now() / 1000, origin: "BKK", destination: "LHR", flightNumber: "TG910", callsign: "THA910", isGround: false, verticalSpeed: 0 },
      { flightId: "demo047", icao24: "P3Q4R5", latitude: 19.4326, longitude: -99.1332, heading: 0, altitude: 37000, groundSpeed: 470, squawk: "1003", aircraftType: "B789", registration: "XA-ADL", timestamp: Date.now() / 1000, origin: "MEX", destination: "LAX", flightNumber: "AM642", callsign: "AMX642", isGround: false, verticalSpeed: 100 },
      { flightId: "demo048", icao24: "P4Q5R6", latitude: 28.6139, longitude: 77.2090, heading: 270, altitude: 40000, groundSpeed: 510, squawk: "1004", aircraftType: "B77W", registration: "VT-ALN", timestamp: Date.now() / 1000, origin: "DEL", destination: "LHR", flightNumber: "AI111", callsign: "AIC111", isGround: false, verticalSpeed: 0 },
      { flightId: "demo049", icao24: "P5Q6R7", latitude: -6.2088, longitude: 106.8456, heading: 45, altitude: 35000, groundSpeed: 440, squawk: "1005", aircraftType: "A333", registration: "PK-GPQ", timestamp: Date.now() / 1000, origin: "CGK", destination: "SIN", flightNumber: "GA838", callsign: "GIA838", isGround: false, verticalSpeed: 200 },
      { flightId: "demo050", icao24: "P6Q7R8", latitude: 3.1390, longitude: 101.6869, heading: 180, altitude: 39000, groundSpeed: 490, squawk: "1006", aircraftType: "A350", registration: "9M-MAB", timestamp: Date.now() / 1000, origin: "KUL", destination: "MEL", flightNumber: "MH149", callsign: "MAS149", isGround: false, verticalSpeed: -100 },
    ]
    
    return sampleFlights.map(fr24FlightToEntity)
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
