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

    ws.onmessage = async (event) => {
      try {
        // Handle both string and Blob data types
        // In Node.js WebSocket, data can be a Buffer, Blob, or string
        let jsonStr: string
        
        if (typeof event.data === "string") {
          jsonStr = event.data
        } else if (event.data instanceof Blob) {
          // Convert Blob to text (browser/some Node.js environments)
          jsonStr = await event.data.text()
        } else if (Buffer.isBuffer(event.data)) {
          // Node.js Buffer
          jsonStr = event.data.toString("utf-8")
        } else if (event.data instanceof ArrayBuffer) {
          // ArrayBuffer
          const decoder = new TextDecoder("utf-8")
          jsonStr = decoder.decode(event.data)
        } else {
          // Fallback - try to convert to string
          jsonStr = String(event.data)
        }
        
        const message = JSON.parse(jsonStr)
        
        // AISStream sends various message types - only process position/static messages
        // Ignore: connection confirmations, heartbeats, errors, etc.
        if (!message.MetaData || !message.MetaData.MMSI) {
          // Not a vessel position message - skip silently
          return
        }
        
        const aisMessage = message as AISMessage
        const mmsi = String(aisMessage.MetaData.MMSI)
        
        // Cache static data
        if (aisMessage.Message?.ShipStaticData) {
          this.staticDataCache.set(mmsi, aisMessage.Message.ShipStaticData)
        }
        
        // Create vessel entity
        const vessel = aisToVesselEntity(
          mmsi,
          aisMessage.Message?.PositionReport || null,
          this.staticDataCache.get(mmsi) || null,
          aisMessage.MetaData
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
