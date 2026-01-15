/**
 * AISstream Maritime Vessel Connector
 * 
 * Fetches real-time AIS vessel position data from AISstream.
 * API Docs: https://aisstream.io/documentation
 * 
 * Note: AISstream requires an API key (free tier available)
 * 
 * For REST API, we can also use MarineTraffic or VesselFinder as alternatives.
 * This connector provides a unified interface for maritime vessel tracking.
 */

import type { Entity, GeoLocation, GeoBounds, Provenance, VesselEntity } from "@/types/oei"
import { getEventBus } from "../event-bus"

// AISstream uses WebSocket for real-time, we'll also support REST alternatives
const AISSTREAM_WS = "wss://stream.aisstream.io/v0/stream"

// =============================================================================
// TYPES
// =============================================================================

interface AISPositionReport {
  MessageID: number
  RepeatIndicator: number
  UserID: number              // MMSI
  NavigationStatus: number
  RateOfTurn: number
  Sog: number                 // Speed over ground (knots)
  PositionAccuracy: boolean
  Longitude: number
  Latitude: number
  Cog: number                 // Course over ground
  TrueHeading: number
  Timestamp: number
  RegionalReserved: number
  Raim: boolean
  CommunicationState: number
}

interface AISStaticData {
  MessageID: number
  RepeatIndicator: number
  UserID: number              // MMSI
  AisVersion: number
  ImoNumber: number
  CallSign: string
  ShipName: string
  ShipType: number
  DimensionToBow: number
  DimensionToStern: number
  DimensionToPort: number
  DimensionToStarboard: number
  PositionFixType: number
  EtaMonth: number
  EtaDay: number
  EtaHour: number
  EtaMinute: number
  Draught: number
  Destination: string
}

interface AISMessage {
  MessageType: string
  MetaData: {
    MMSI: number
    MMSI_String: string
    ShipName: string
    latitude: number
    longitude: number
    time_utc: string
  }
  Message: {
    PositionReport?: AISPositionReport
    ShipStaticData?: AISStaticData
  }
}

export interface VesselQuery {
  bounds?: GeoBounds
  mmsi?: string[]
  shipType?: string[]
  limit?: number
}

// =============================================================================
// HELPERS
// =============================================================================

function getNavStatusName(status: number): string {
  const statuses: Record<number, string> = {
    0: "Under way using engine",
    1: "At anchor",
    2: "Not under command",
    3: "Restricted manoeuvrability",
    4: "Constrained by draught",
    5: "Moored",
    6: "Aground",
    7: "Engaged in Fishing",
    8: "Under way sailing",
    9: "Reserved for HSC",
    10: "Reserved for WIG",
    11: "Reserved",
    12: "Reserved",
    13: "Reserved",
    14: "AIS-SART active",
    15: "Not defined",
  }
  return statuses[status] || "Unknown"
}

function getShipTypeName(type: number): string {
  if (type >= 20 && type <= 29) return "Wing in ground"
  if (type === 30) return "Fishing"
  if (type === 31 || type === 32) return "Towing"
  if (type === 33) return "Dredging"
  if (type === 34) return "Diving ops"
  if (type === 35) return "Military ops"
  if (type === 36) return "Sailing"
  if (type === 37) return "Pleasure craft"
  if (type >= 40 && type <= 49) return "High speed craft"
  if (type === 50) return "Pilot vessel"
  if (type === 51) return "Search and rescue"
  if (type === 52) return "Tug"
  if (type === 53) return "Port tender"
  if (type === 54) return "Anti-pollution"
  if (type === 55) return "Law enforcement"
  if (type >= 60 && type <= 69) return "Passenger"
  if (type >= 70 && type <= 79) return "Cargo"
  if (type >= 80 && type <= 89) return "Tanker"
  if (type >= 90 && type <= 99) return "Other"
  return "Unknown"
}

function aisToVesselEntity(
  mmsi: string,
  position: AISPositionReport | null,
  staticData: AISStaticData | null,
  metaData: AISMessage["MetaData"]
): VesselEntity {
  const provenance: Provenance = {
    source: "aisstream",
    sourceId: mmsi,
    collectedAt: new Date().toISOString(),
    reliability: 1.0,
    metadata: {
      message_type: position ? "position" : "static",
    },
  }

  const lat = position?.Latitude ?? metaData.latitude
  const lon = position?.Longitude ?? metaData.longitude

  const location: GeoLocation = {
    latitude: lat,
    longitude: lon,
    source: "gps",
  }

  // Calculate vessel dimensions
  const length = staticData 
    ? staticData.DimensionToBow + staticData.DimensionToStern 
    : undefined
  const width = staticData 
    ? staticData.DimensionToPort + staticData.DimensionToStarboard 
    : undefined

  // Build ETA string
  let eta: string | undefined
  if (staticData && staticData.EtaMonth && staticData.EtaDay) {
    const year = new Date().getFullYear()
    eta = `${year}-${String(staticData.EtaMonth).padStart(2, "0")}-${String(staticData.EtaDay).padStart(2, "0")}T${String(staticData.EtaHour).padStart(2, "0")}:${String(staticData.EtaMinute).padStart(2, "0")}:00Z`
  }

  return {
    id: `ais_${mmsi}`,
    type: "vessel",
    name: staticData?.ShipName?.trim() || metaData.ShipName?.trim() || `MMSI ${mmsi}`,
    description: staticData ? getShipTypeName(staticData.ShipType) : "Vessel",
    location,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSeenAt: metaData.time_utc || new Date().toISOString(),
    status: "active",
    provenance,
    tags: [
      staticData ? getShipTypeName(staticData.ShipType) : "Unknown",
      position ? getNavStatusName(position.NavigationStatus) : "Unknown",
    ],
    properties: {
      mmsi,
      imo: staticData?.ImoNumber ? String(staticData.ImoNumber) : undefined,
      callsign: staticData?.CallSign?.trim(),
      shipName: staticData?.ShipName?.trim() || metaData.ShipName?.trim(),
      shipType: staticData ? getShipTypeName(staticData.ShipType) : undefined,
      destination: staticData?.Destination?.trim(),
      eta,
      length,
      width,
      draft: staticData?.Draught,
      heading: position?.TrueHeading,
      cog: position?.Cog,
      sog: position?.Sog,
      navStatus: position ? getNavStatusName(position.NavigationStatus) : undefined,
    },
  }
}

// =============================================================================
// API CLIENT
// =============================================================================

export class AISStreamClient {
  private apiKey?: string
  private vesselCache: Map<string, VesselEntity> = new Map()
  private staticDataCache: Map<string, AISStaticData> = new Map()

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.AISSTREAM_API_KEY
  }

  /**
   * Connect to AISstream WebSocket for real-time updates
   * Returns a cleanup function to disconnect
   */
  connectRealtime(
    bounds: GeoBounds,
    onVessel: (vessel: VesselEntity) => void,
    onError?: (error: Error) => void
  ): () => void {
    if (!this.apiKey) {
      onError?.(new Error("AISstream API key required"))
      return () => {}
    }

    // WebSocket connection (for real-time streaming)
    // Note: This would be used in a background worker/service
    const ws = new WebSocket(AISSTREAM_WS)
    
    ws.onopen = () => {
      const subscribeMessage = {
        APIKey: this.apiKey,
        BoundingBoxes: [[
          [bounds.south, bounds.west],
          [bounds.north, bounds.east],
        ]],
      }
      ws.send(JSON.stringify(subscribeMessage))
    }

    ws.onmessage = (event) => {
      try {
        const message: AISMessage = JSON.parse(event.data)
        const mmsi = String(message.MetaData.MMSI)
        
        // Cache static data
        if (message.Message.ShipStaticData) {
          this.staticDataCache.set(mmsi, message.Message.ShipStaticData)
        }
        
        // Create vessel entity
        const vessel = aisToVesselEntity(
          mmsi,
          message.Message.PositionReport || null,
          this.staticDataCache.get(mmsi) || null,
          message.MetaData
        )
        
        this.vesselCache.set(mmsi, vessel)
        onVessel(vessel)
      } catch (error) {
        console.error("[AISStream] Parse error:", error)
      }
    }

    ws.onerror = (event) => {
      onError?.(new Error(`WebSocket error: ${event}`))
    }

    return () => {
      ws.close()
    }
  }

  /**
   * Get cached vessels (from WebSocket updates)
   */
  getCachedVessels(query?: VesselQuery): VesselEntity[] {
    let vessels = Array.from(this.vesselCache.values())
    
    if (query?.bounds) {
      vessels = vessels.filter(v => {
        if (!v.location) return false
        return (
          v.location.latitude >= query.bounds!.south &&
          v.location.latitude <= query.bounds!.north &&
          v.location.longitude >= query.bounds!.west &&
          v.location.longitude <= query.bounds!.east
        )
      })
    }
    
    if (query?.mmsi) {
      const mmsiSet = new Set(query.mmsi)
      vessels = vessels.filter(v => mmsiSet.has(v.properties.mmsi))
    }
    
    if (query?.limit) {
      vessels = vessels.slice(0, query.limit)
    }
    
    return vessels
  }

  /**
   * Simulate vessel data for development (when no API key)
   * Returns sample vessels for UI testing
   */
  getSampleVessels(): VesselEntity[] {
    const sampleData: Array<{
      mmsi: string
      name: string
      type: string
      lat: number
      lon: number
      heading: number
      sog: number
      destination: string
    }> = [
      { mmsi: "366999999", name: "SAMPLE CARGO", type: "Cargo", lat: 37.8, lon: -122.4, heading: 45, sog: 12.5, destination: "OAKLAND CA" },
      { mmsi: "367000001", name: "SAMPLE TANKER", type: "Tanker", lat: 37.75, lon: -122.35, heading: 180, sog: 8.2, destination: "LONG BEACH CA" },
      { mmsi: "367000002", name: "SAMPLE FERRY", type: "Passenger", lat: 37.82, lon: -122.45, heading: 270, sog: 15.0, destination: "SAUSALITO CA" },
      { mmsi: "367000003", name: "SAMPLE TUG", type: "Tug", lat: 37.78, lon: -122.38, heading: 90, sog: 5.5, destination: "SF BAY" },
    ]

    return sampleData.map(s => ({
      id: `ais_${s.mmsi}`,
      type: "vessel" as const,
      name: s.name,
      description: s.type,
      location: {
        latitude: s.lat,
        longitude: s.lon,
        source: "gps" as const,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      status: "active" as const,
      provenance: {
        source: "aisstream",
        sourceId: s.mmsi,
        collectedAt: new Date().toISOString(),
        reliability: 0.5,
        metadata: { sample: true },
      },
      tags: [s.type],
      // Top-level vessel properties for marker rendering
      mmsi: s.mmsi,
      heading: s.heading,
      cog: s.heading, // Course over ground same as heading for sample
      sog: s.sog,
      shipType: s.type === "Cargo" ? 70 : s.type === "Tanker" ? 80 : s.type === "Passenger" ? 60 : s.type === "Tug" ? 52 : 0,
      navStatus: 0, // Under way using engine
      destination: s.destination,
      imo: null,
      flag: "US",
      length: 100 + Math.floor(Math.random() * 200),
      width: 20 + Math.floor(Math.random() * 30),
      draught: 5 + Math.random() * 10,
      // Legacy properties object
      properties: {
        mmsi: s.mmsi,
        shipName: s.name,
        shipType: s.type,
        destination: s.destination,
        heading: s.heading,
        sog: s.sog,
        navStatus: "Under way using engine",
      },
    }))
  }

  /**
   * Fetch and publish vessels to event bus
   */
  async publishCachedVessels(query?: VesselQuery): Promise<{ published: number; entities: VesselEntity[] }> {
    const vessels = this.getCachedVessels(query)
    const eventBus = getEventBus()

    let published = 0
    for (const vessel of vessels) {
      try {
        await eventBus.publishEntity(vessel)
        published++
      } catch (error) {
        console.error(`[AISStream] Failed to publish vessel ${vessel.id}:`, error)
      }
    }

    return { published, entities: vessels }
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

let clientInstance: AISStreamClient | null = null

export function getAISStreamClient(): AISStreamClient {
  if (!clientInstance) {
    clientInstance = new AISStreamClient()
  }
  return clientInstance
}
