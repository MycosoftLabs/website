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
   * Returns sample vessels for UI testing with global coverage
   */
  getSampleVessels(): VesselEntity[] {
    const sampleData: Array<{
      mmsi: string
      name: string
      type: string
      shipTypeCode: number
      lat: number
      lon: number
      heading: number
      sog: number
      cog: number
      destination: string
      flag: string
      length: number
      width: number
      draft: number
    }> = [
      // Pacific Ocean - US West Coast
      { mmsi: "366999999", name: "EVERGREEN EXCELLENCE", type: "Cargo", shipTypeCode: 70, lat: 37.8, lon: -122.4, heading: 45, sog: 12.5, cog: 48, destination: "OAKLAND CA", flag: "PA", length: 366, width: 51, draft: 14.5 },
      { mmsi: "367000001", name: "PACIFIC VOYAGER", type: "Tanker", shipTypeCode: 80, lat: 37.75, lon: -122.35, heading: 180, sog: 8.2, cog: 175, destination: "LONG BEACH CA", flag: "LR", length: 274, width: 42, draft: 15.2 },
      { mmsi: "367000002", name: "GOLDEN GATE FERRY", type: "Passenger", shipTypeCode: 60, lat: 37.82, lon: -122.45, heading: 270, sog: 15.0, cog: 265, destination: "SAUSALITO CA", flag: "US", length: 68, width: 15, draft: 3.8 },
      { mmsi: "367000003", name: "BAY PILOT", type: "Tug", shipTypeCode: 52, lat: 37.78, lon: -122.38, heading: 90, sog: 5.5, cog: 88, destination: "SF BAY", flag: "US", length: 32, width: 10, draft: 4.2 },
      { mmsi: "367000004", name: "PACIFIC HUNTER", type: "Fishing", shipTypeCode: 30, lat: 36.95, lon: -122.1, heading: 315, sog: 4.2, cog: 310, destination: "MONTEREY CA", flag: "US", length: 25, width: 8, draft: 2.8 },
      { mmsi: "367000005", name: "USS NIMITZ", type: "Military ops", shipTypeCode: 35, lat: 32.68, lon: -117.15, heading: 220, sog: 18.5, cog: 225, destination: "SAN DIEGO CA", flag: "US", length: 332, width: 76, draft: 11.3 },
      
      // Atlantic Ocean - US East Coast  
      { mmsi: "368000001", name: "MAERSK CHICAGO", type: "Cargo", shipTypeCode: 71, lat: 40.68, lon: -74.04, heading: 155, sog: 10.8, cog: 158, destination: "NEW YORK NY", flag: "DK", length: 398, width: 56, draft: 16.0 },
      { mmsi: "368000002", name: "CARNIVAL MAGIC", type: "Passenger", shipTypeCode: 69, lat: 25.77, lon: -80.13, heading: 340, sog: 22.0, cog: 335, destination: "MIAMI FL", flag: "PA", length: 306, width: 38, draft: 8.5 },
      { mmsi: "368000003", name: "ATLANTIC PROVIDER", type: "Tanker", shipTypeCode: 84, lat: 28.95, lon: -88.05, heading: 85, sog: 11.2, cog: 82, destination: "HOUSTON TX", flag: "BS", length: 244, width: 42, draft: 14.8 },
      
      // European Waters
      { mmsi: "244000001", name: "MSC OSCAR", type: "Cargo", shipTypeCode: 79, lat: 51.95, lon: 4.12, heading: 280, sog: 14.5, cog: 275, destination: "ROTTERDAM NL", flag: "PA", length: 395, width: 59, draft: 16.0 },
      { mmsi: "245000002", name: "QUEEN MARY 2", type: "Passenger", shipTypeCode: 68, lat: 50.82, lon: -1.09, heading: 195, sog: 24.5, cog: 190, destination: "SOUTHAMPTON UK", flag: "BM", length: 345, width: 41, draft: 10.3 },
      { mmsi: "246000003", name: "NORTH SEA FISHER", type: "Fishing", shipTypeCode: 30, lat: 56.45, lon: 3.25, heading: 45, sog: 3.8, cog: 42, destination: "ABERDEEN UK", flag: "UK", length: 28, width: 9, draft: 3.2 },
      { mmsi: "247000004", name: "HAMBURG TUG", type: "Tug", shipTypeCode: 52, lat: 53.55, lon: 9.95, heading: 125, sog: 6.5, cog: 120, destination: "HAMBURG DE", flag: "DE", length: 30, width: 11, draft: 4.5 },
      
      // Asian Waters
      { mmsi: "412000001", name: "COSCO SHIPPING UNIVERSE", type: "Cargo", shipTypeCode: 74, lat: 31.23, lon: 121.48, heading: 75, sog: 16.2, cog: 72, destination: "SHANGHAI CN", flag: "CN", length: 400, width: 58, draft: 16.0 },
      { mmsi: "440000002", name: "HMM ALGECIRAS", type: "Cargo", shipTypeCode: 79, lat: 35.08, lon: 129.08, heading: 190, sog: 12.8, cog: 185, destination: "BUSAN KR", flag: "KR", length: 399, width: 61, draft: 16.5 },
      { mmsi: "431000003", name: "NIPPON MARU", type: "Passenger", shipTypeCode: 67, lat: 35.45, lon: 139.65, heading: 165, sog: 18.5, cog: 160, destination: "TOKYO JP", flag: "JP", length: 166, width: 24, draft: 6.5 },
      { mmsi: "533000004", name: "SINGAPORE EXPRESS", type: "Cargo", shipTypeCode: 72, lat: 1.28, lon: 103.85, heading: 280, sog: 13.5, cog: 275, destination: "SINGAPORE SG", flag: "SG", length: 334, width: 42, draft: 14.2 },
      
      // Middle East / Suez Canal
      { mmsi: "470000001", name: "EMIRATES STAR", type: "Tanker", shipTypeCode: 81, lat: 29.88, lon: 32.58, heading: 340, sog: 10.5, cog: 335, destination: "SUEZ EG", flag: "AE", length: 330, width: 60, draft: 20.5 },
      { mmsi: "422000002", name: "GULF NAVIGATOR", type: "Tanker", shipTypeCode: 89, lat: 26.22, lon: 50.58, heading: 185, sog: 11.8, cog: 180, destination: "BAHRAIN BH", flag: "SA", length: 250, width: 44, draft: 11.5 },
      
      // South America  
      { mmsi: "710000001", name: "SANTOS EXPRESS", type: "Cargo", shipTypeCode: 77, lat: -23.98, lon: -46.31, heading: 25, sog: 14.2, cog: 22, destination: "SANTOS BR", flag: "BR", length: 294, width: 32, draft: 12.5 },
      { mmsi: "725000002", name: "PATAGONIA FISHER", type: "Fishing", shipTypeCode: 30, lat: -51.72, lon: -69.28, heading: 95, sog: 5.5, cog: 92, destination: "PUNTA ARENAS CL", flag: "CL", length: 48, width: 12, draft: 5.2 },
      
      // Africa / Mediterranean
      { mmsi: "636000001", name: "CAPE TRANSPORTER", type: "Cargo", shipTypeCode: 75, lat: -33.92, lon: 18.42, heading: 55, sog: 12.8, cog: 52, destination: "CAPE TOWN ZA", flag: "LR", length: 225, width: 32, draft: 10.5 },
      { mmsi: "247000005", name: "MED CRUISER", type: "Passenger", shipTypeCode: 66, lat: 35.90, lon: 14.52, heading: 275, sog: 19.5, cog: 270, destination: "VALLETTA MT", flag: "MT", length: 290, width: 32, draft: 8.2 },
      
      // Australia / Oceania
      { mmsi: "503000001", name: "SYDNEY STAR", type: "Cargo", shipTypeCode: 73, lat: -33.85, lon: 151.22, heading: 150, sog: 15.2, cog: 145, destination: "SYDNEY AU", flag: "AU", length: 280, width: 40, draft: 12.8 },
      { mmsi: "503000002", name: "REEF EXPLORER", type: "Passenger", shipTypeCode: 65, lat: -16.92, lon: 145.78, heading: 45, sog: 12.5, cog: 42, destination: "CAIRNS AU", flag: "AU", length: 72, width: 16, draft: 3.5 },
      
      // Additional Global Coverage - More vessels
      // Pacific Shipping Lanes
      { mmsi: "371000001", name: "PACIFIC PIONEER", type: "Cargo", shipTypeCode: 75, lat: 20.5, lon: -155.5, heading: 285, sog: 16.5, cog: 280, destination: "HONOLULU HI", flag: "PA", length: 320, width: 48, draft: 13.5 },
      { mmsi: "371000002", name: "ALOHA SPIRIT", type: "Passenger", shipTypeCode: 62, lat: 21.3, lon: -157.8, heading: 45, sog: 18.0, cog: 42, destination: "MAUI HI", flag: "US", length: 185, width: 28, draft: 6.5 },
      { mmsi: "372000001", name: "TRANS-PACIFIC EXPRESS", type: "Cargo", shipTypeCode: 79, lat: 35.0, lon: 160.0, heading: 90, sog: 20.5, cog: 88, destination: "LOS ANGELES CA", flag: "SG", length: 398, width: 58, draft: 15.5 },
      
      // Arctic/Polar Routes
      { mmsi: "261000001", name: "ARCTIC EXPLORER", type: "Cargo", shipTypeCode: 71, lat: 71.5, lon: 25.5, heading: 65, sog: 10.2, cog: 62, destination: "MURMANSK RU", flag: "NO", length: 220, width: 38, draft: 9.5 },
      { mmsi: "230000001", name: "NORDIC ICEBREAKER", type: "Tug", shipTypeCode: 52, lat: 68.0, lon: 15.0, heading: 0, sog: 8.5, cog: 355, destination: "HAMMERFEST NO", flag: "FI", length: 110, width: 25, draft: 8.0 },
      
      // Indian Ocean
      { mmsi: "419000001", name: "MUMBAI MERCHANT", type: "Cargo", shipTypeCode: 77, lat: 18.9, lon: 72.85, heading: 225, sog: 11.8, cog: 220, destination: "MUMBAI IN", flag: "IN", length: 275, width: 40, draft: 12.2 },
      { mmsi: "419000002", name: "INDIAN OCEAN TANKER", type: "Tanker", shipTypeCode: 83, lat: 8.5, lon: 78.0, heading: 310, sog: 12.5, cog: 305, destination: "COLOMBO LK", flag: "LR", length: 285, width: 46, draft: 14.5 },
      { mmsi: "601000001", name: "MADAGASCAR EXPRESS", type: "Cargo", shipTypeCode: 72, lat: -15.5, lon: 48.0, heading: 180, sog: 13.2, cog: 175, destination: "TOAMASINA MG", flag: "PA", length: 195, width: 32, draft: 10.5 },
      
      // Caribbean
      { mmsi: "305000001", name: "CARIBBEAN DREAM", type: "Passenger", shipTypeCode: 66, lat: 18.5, lon: -66.0, heading: 90, sog: 20.5, cog: 88, destination: "SAN JUAN PR", flag: "BS", length: 330, width: 38, draft: 8.8 },
      { mmsi: "306000001", name: "BAHAMAS TRADER", type: "Cargo", shipTypeCode: 70, lat: 25.0, lon: -77.4, heading: 180, sog: 12.0, cog: 175, destination: "NASSAU BS", flag: "BS", length: 150, width: 24, draft: 7.5 },
      
      // Baltic Sea
      { mmsi: "265000001", name: "VIKING GRACE", type: "Passenger", shipTypeCode: 64, lat: 59.4, lon: 24.8, heading: 280, sog: 22.0, cog: 275, destination: "STOCKHOLM SE", flag: "SE", length: 210, width: 31, draft: 6.8 },
      { mmsi: "273000001", name: "BALTIC CARRIER", type: "Cargo", shipTypeCode: 78, lat: 55.7, lon: 12.6, heading: 50, sog: 14.5, cog: 48, destination: "COPENHAGEN DK", flag: "DK", length: 180, width: 28, draft: 9.0 },
      
      // Black Sea
      { mmsi: "272000001", name: "BLACK SEA TRADER", type: "Tanker", shipTypeCode: 81, lat: 41.0, lon: 29.0, heading: 200, sog: 10.8, cog: 195, destination: "ISTANBUL TR", flag: "TR", length: 265, width: 44, draft: 13.5 },
      
      // More Pacific
      { mmsi: "520000001", name: "FIJI ISLANDER", type: "Passenger", shipTypeCode: 63, lat: -17.8, lon: 178.0, heading: 90, sog: 15.0, cog: 88, destination: "SUVA FJ", flag: "FJ", length: 95, width: 18, draft: 4.5 },
      { mmsi: "512000001", name: "KIWI FREIGHTER", type: "Cargo", shipTypeCode: 74, lat: -41.3, lon: 174.8, heading: 0, sog: 14.2, cog: 355, destination: "WELLINGTON NZ", flag: "NZ", length: 195, width: 30, draft: 10.0 },
      
      // Fishing vessels - Global
      { mmsi: "367500001", name: "BERING FISHER", type: "Fishing", shipTypeCode: 30, lat: 55.0, lon: -165.0, heading: 45, sog: 5.5, cog: 42, destination: "DUTCH HARBOR AK", flag: "US", length: 65, width: 14, draft: 5.5 },
      { mmsi: "440500001", name: "KOREAN TRAWLER", type: "Fishing", shipTypeCode: 30, lat: 36.0, lon: 130.0, heading: 180, sog: 4.8, cog: 175, destination: "BUSAN KR", flag: "KR", length: 45, width: 10, draft: 4.0 },
      { mmsi: "412500001", name: "YELLOW SEA FISHER", type: "Fishing", shipTypeCode: 30, lat: 34.0, lon: 122.0, heading: 270, sog: 3.5, cog: 265, destination: "QINGDAO CN", flag: "CN", length: 35, width: 8, draft: 3.5 },
      { mmsi: "256500001", name: "NORTH SEA TRAWLER", type: "Fishing", shipTypeCode: 30, lat: 58.0, lon: 1.5, heading: 120, sog: 4.2, cog: 115, destination: "PETERHEAD UK", flag: "UK", length: 32, width: 9, draft: 3.8 },
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
        reliability: 0.9, // Higher reliability for sample data in demo
        metadata: { sample: true },
      },
      tags: [s.type],
      // Top-level vessel properties for marker rendering
      mmsi: s.mmsi,
      heading: s.heading,
      cog: s.cog,
      sog: s.sog,
      shipType: s.shipTypeCode,
      navStatus: 0, // Under way using engine
      destination: s.destination,
      imo: null,
      flag: s.flag,
      length: s.length,
      width: s.width,
      draught: s.draft,
      // Legacy properties object
      properties: {
        mmsi: s.mmsi,
        shipName: s.name,
        shipType: s.type,
        shipTypeCode: s.shipTypeCode,
        destination: s.destination,
        heading: s.heading,
        cog: s.cog,
        sog: s.sog,
        navStatus: "Under way using engine",
        flag: s.flag,
        length: s.length,
        width: s.width,
        draft: s.draft,
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
