/**
 * OEI WebSocket Service
 * 
 * Manages real-time WebSocket connections for live data streaming:
 * - AISstream for vessel tracking
 * - FlightRadar24 for aircraft tracking (via polling)
 * - Custom WebSocket endpoints for internal data
 * 
 * Provides a unified interface for subscribing to real-time updates.
 */

import type { AircraftEntity, VesselEntity, SatelliteEntity, Event } from "@/types/oei"

// =============================================================================
// TYPES
// =============================================================================

export type StreamType = "vessels" | "aircraft" | "satellites" | "events" | "weather"

export interface StreamSubscription {
  id: string
  type: StreamType
  bounds?: {
    north: number
    south: number
    east: number
    west: number
  }
  filters?: Record<string, unknown>
}

export interface StreamMessage<T = unknown> {
  type: StreamType
  action: "update" | "add" | "remove"
  data: T
  timestamp: string
}

export interface StreamStatus {
  type: StreamType
  connected: boolean
  lastMessage?: string
  messageCount: number
  error?: string
}

type MessageHandler<T> = (message: StreamMessage<T>) => void
type StatusHandler = (status: StreamStatus) => void

// =============================================================================
// AISSTREAM WEBSOCKET CLIENT
// =============================================================================

const AISSTREAM_WS = "wss://stream.aisstream.io/v0/stream"

class AISStreamConnection {
  private ws: WebSocket | null = null
  private apiKey: string
  private handlers: Set<MessageHandler<VesselEntity>> = new Set()
  private statusHandlers: Set<StatusHandler> = new Set()
  private messageCount = 0
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private bounds: StreamSubscription["bounds"]
  private isConnecting = false

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  connect(bounds?: StreamSubscription["bounds"]): void {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    this.isConnecting = true
    this.bounds = bounds || { north: 90, south: -90, east: 180, west: -180 }

    try {
      this.ws = new WebSocket(AISSTREAM_WS)

      this.ws.onopen = () => {
        this.isConnecting = false
        this.reconnectAttempts = 0
        
        const subscribeMessage = {
          APIKey: this.apiKey,
          BoundingBoxes: [[
            [this.bounds!.south, this.bounds!.west],
            [this.bounds!.north, this.bounds!.east],
          ]],
        }
        
        this.ws?.send(JSON.stringify(subscribeMessage))
        this.notifyStatus({
          type: "vessels",
          connected: true,
          messageCount: this.messageCount,
        })
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.messageCount++
          
          const vessel = this.parseAISMessage(data)
          if (vessel) {
            const message: StreamMessage<VesselEntity> = {
              type: "vessels",
              action: "update",
              data: vessel,
              timestamp: new Date().toISOString(),
            }
            this.handlers.forEach(handler => handler(message))
          }

          this.notifyStatus({
            type: "vessels",
            connected: true,
            lastMessage: new Date().toISOString(),
            messageCount: this.messageCount,
          })
        } catch (error) {
          console.error("[AISStream] Parse error:", error)
        }
      }

      this.ws.onerror = (error) => {
        this.isConnecting = false
        this.notifyStatus({
          type: "vessels",
          connected: false,
          messageCount: this.messageCount,
          error: "WebSocket error",
        })
      }

      this.ws.onclose = () => {
        this.isConnecting = false
        this.notifyStatus({
          type: "vessels",
          connected: false,
          messageCount: this.messageCount,
        })
        this.attemptReconnect()
      }
    } catch (error) {
      this.isConnecting = false
      console.error("[AISStream] Connection error:", error)
    }
  }

  private parseAISMessage(data: any): VesselEntity | null {
    if (!data.MetaData) return null

    const mmsi = String(data.MetaData.MMSI)
    const position = data.Message?.PositionReport
    const staticData = data.Message?.ShipStaticData

    return {
      id: `ais_${mmsi}`,
      type: "vessel",
      name: staticData?.ShipName?.trim() || data.MetaData.ShipName?.trim() || `MMSI ${mmsi}`,
      description: staticData ? this.getShipTypeName(staticData.ShipType) : "Vessel",
      location: {
        latitude: position?.Latitude ?? data.MetaData.latitude,
        longitude: position?.Longitude ?? data.MetaData.longitude,
        source: "gps",
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastSeenAt: data.MetaData.time_utc || new Date().toISOString(),
      status: "active",
      provenance: {
        source: "aisstream",
        sourceId: mmsi,
        collectedAt: new Date().toISOString(),
        reliability: 1.0,
      },
      tags: [],
      properties: {
        mmsi,
        heading: position?.TrueHeading,
        cog: position?.Cog,
        sog: position?.Sog,
      },
    }
  }

  private getShipTypeName(type: number): string {
    if (type >= 60 && type <= 69) return "Passenger"
    if (type >= 70 && type <= 79) return "Cargo"
    if (type >= 80 && type <= 89) return "Tanker"
    if (type === 30) return "Fishing"
    if (type === 52) return "Tug"
    return "Vessel"
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("[AISStream] Max reconnect attempts reached")
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    setTimeout(() => {
      console.log(`[AISStream] Reconnecting (attempt ${this.reconnectAttempts})...`)
      this.connect(this.bounds)
    }, delay)
  }

  private notifyStatus(status: StreamStatus): void {
    this.statusHandlers.forEach(handler => handler(status))
  }

  onMessage(handler: MessageHandler<VesselEntity>): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler)
    return () => this.statusHandlers.delete(handler)
  }

  disconnect(): void {
    this.ws?.close()
    this.ws = null
    this.handlers.clear()
    this.statusHandlers.clear()
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  getMessageCount(): number {
    return this.messageCount
  }
}

// =============================================================================
// POLLING-BASED FLIGHT TRACKER
// =============================================================================

class FlightPollingService {
  private handlers: Set<MessageHandler<AircraftEntity>> = new Set()
  private statusHandlers: Set<StatusHandler> = new Set()
  private intervalId: NodeJS.Timeout | null = null
  private messageCount = 0
  private isActive = false
  private pollInterval = 10000 // 10 seconds
  private bounds?: StreamSubscription["bounds"]
  private lastAircraft: Map<string, AircraftEntity> = new Map()

  start(bounds?: StreamSubscription["bounds"]): void {
    if (this.isActive) return
    
    this.isActive = true
    this.bounds = bounds
    
    // Initial fetch
    this.fetchFlights()
    
    // Start polling
    this.intervalId = setInterval(() => {
      this.fetchFlights()
    }, this.pollInterval)

    this.notifyStatus({
      type: "aircraft",
      connected: true,
      messageCount: this.messageCount,
    })
  }

  private async fetchFlights(): Promise<void> {
    try {
      const params = new URLSearchParams()
      if (this.bounds) {
        params.set("lamin", String(this.bounds.south))
        params.set("lamax", String(this.bounds.north))
        params.set("lomin", String(this.bounds.west))
        params.set("lomax", String(this.bounds.east))
      }
      params.set("limit", "200")

      const response = await fetch(`/api/oei/flightradar24?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch flights")

      const data = await response.json()
      const aircraft: AircraftEntity[] = data.aircraft || []

      // Track new/updated aircraft
      const currentIds = new Set<string>()
      
      for (const plane of aircraft) {
        currentIds.add(plane.id)
        const existing = this.lastAircraft.get(plane.id)
        
        const action: "add" | "update" = existing ? "update" : "add"
        
        this.messageCount++
        const message: StreamMessage<AircraftEntity> = {
          type: "aircraft",
          action,
          data: plane,
          timestamp: new Date().toISOString(),
        }
        this.handlers.forEach(handler => handler(message))
        this.lastAircraft.set(plane.id, plane)
      }

      // Remove aircraft that are no longer in view
      for (const [id] of this.lastAircraft) {
        if (!currentIds.has(id)) {
          const removed = this.lastAircraft.get(id)!
          this.lastAircraft.delete(id)
          
          const message: StreamMessage<AircraftEntity> = {
            type: "aircraft",
            action: "remove",
            data: removed,
            timestamp: new Date().toISOString(),
          }
          this.handlers.forEach(handler => handler(message))
        }
      }

      this.notifyStatus({
        type: "aircraft",
        connected: true,
        lastMessage: new Date().toISOString(),
        messageCount: this.messageCount,
      })
    } catch (error) {
      console.error("[FlightPolling] Error:", error)
      this.notifyStatus({
        type: "aircraft",
        connected: false,
        messageCount: this.messageCount,
        error: String(error),
      })
    }
  }

  private notifyStatus(status: StreamStatus): void {
    this.statusHandlers.forEach(handler => handler(status))
  }

  onMessage(handler: MessageHandler<AircraftEntity>): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler)
    return () => this.statusHandlers.delete(handler)
  }

  stop(): void {
    this.isActive = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.handlers.clear()
    this.statusHandlers.clear()
    this.lastAircraft.clear()
  }

  setPollingInterval(ms: number): void {
    this.pollInterval = ms
    if (this.isActive) {
      this.stop()
      this.start(this.bounds)
    }
  }
}

// =============================================================================
// SATELLITE POLLING SERVICE
// =============================================================================

class SatellitePollingService {
  private handlers: Set<MessageHandler<SatelliteEntity>> = new Set()
  private statusHandlers: Set<StatusHandler> = new Set()
  private intervalId: NodeJS.Timeout | null = null
  private messageCount = 0
  private isActive = false
  private pollInterval = 60000 // 60 seconds (satellites move slower visually)
  private category = "stations"

  start(category?: string): void {
    if (this.isActive) return
    
    this.isActive = true
    this.category = category || "stations"
    
    // Initial fetch
    this.fetchSatellites()
    
    // Start polling
    this.intervalId = setInterval(() => {
      this.fetchSatellites()
    }, this.pollInterval)

    this.notifyStatus({
      type: "satellites",
      connected: true,
      messageCount: this.messageCount,
    })
  }

  private async fetchSatellites(): Promise<void> {
    try {
      const response = await fetch(`/api/oei/satellites?category=${this.category}`)
      if (!response.ok) throw new Error("Failed to fetch satellites")

      const data = await response.json()
      const satellites: SatelliteEntity[] = data.satellites || []

      for (const sat of satellites) {
        this.messageCount++
        const message: StreamMessage<SatelliteEntity> = {
          type: "satellites",
          action: "update",
          data: sat,
          timestamp: new Date().toISOString(),
        }
        this.handlers.forEach(handler => handler(message))
      }

      this.notifyStatus({
        type: "satellites",
        connected: true,
        lastMessage: new Date().toISOString(),
        messageCount: this.messageCount,
      })
    } catch (error) {
      console.error("[SatellitePolling] Error:", error)
      this.notifyStatus({
        type: "satellites",
        connected: false,
        messageCount: this.messageCount,
        error: String(error),
      })
    }
  }

  private notifyStatus(status: StreamStatus): void {
    this.statusHandlers.forEach(handler => handler(status))
  }

  onMessage(handler: MessageHandler<SatelliteEntity>): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler)
    return () => this.statusHandlers.delete(handler)
  }

  stop(): void {
    this.isActive = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.handlers.clear()
    this.statusHandlers.clear()
  }
}

// =============================================================================
// UNIFIED STREAMING SERVICE
// =============================================================================

export class OEIStreamingService {
  private aisClient: AISStreamConnection | null = null
  private flightService: FlightPollingService
  private satelliteService: SatellitePollingService
  private statusHandlers: Set<StatusHandler> = new Set()
  private statuses: Map<StreamType, StreamStatus> = new Map()

  constructor() {
    this.flightService = new FlightPollingService()
    this.satelliteService = new SatellitePollingService()

    // Initialize statuses
    const types: StreamType[] = ["vessels", "aircraft", "satellites", "events", "weather"]
    types.forEach(type => {
      this.statuses.set(type, { type, connected: false, messageCount: 0 })
    })
  }

  /**
   * Initialize AIS streaming (requires API key)
   */
  initAIS(apiKey: string): void {
    if (!apiKey) {
      console.warn("[OEIStreaming] AIS API key not provided")
      return
    }
    this.aisClient = new AISStreamConnection(apiKey)
  }

  /**
   * Subscribe to vessel updates
   */
  subscribeVessels(
    bounds: StreamSubscription["bounds"],
    onMessage: MessageHandler<VesselEntity>
  ): () => void {
    if (!this.aisClient) {
      console.warn("[OEIStreaming] AIS client not initialized")
      return () => {}
    }

    this.aisClient.connect(bounds)
    const unsubMessage = this.aisClient.onMessage(onMessage)
    const unsubStatus = this.aisClient.onStatus(status => {
      this.statuses.set("vessels", status)
      this.notifyStatus(status)
    })

    return () => {
      unsubMessage()
      unsubStatus()
    }
  }

  /**
   * Subscribe to aircraft updates
   */
  subscribeAircraft(
    bounds: StreamSubscription["bounds"],
    onMessage: MessageHandler<AircraftEntity>
  ): () => void {
    this.flightService.start(bounds)
    const unsubMessage = this.flightService.onMessage(onMessage)
    const unsubStatus = this.flightService.onStatus(status => {
      this.statuses.set("aircraft", status)
      this.notifyStatus(status)
    })

    return () => {
      unsubMessage()
      unsubStatus()
      this.flightService.stop()
    }
  }

  /**
   * Subscribe to satellite updates
   */
  subscribeSatellites(
    category: string,
    onMessage: MessageHandler<SatelliteEntity>
  ): () => void {
    this.satelliteService.start(category)
    const unsubMessage = this.satelliteService.onMessage(onMessage)
    const unsubStatus = this.satelliteService.onStatus(status => {
      this.statuses.set("satellites", status)
      this.notifyStatus(status)
    })

    return () => {
      unsubMessage()
      unsubStatus()
      this.satelliteService.stop()
    }
  }

  /**
   * Get all stream statuses
   */
  getStatuses(): StreamStatus[] {
    return Array.from(this.statuses.values())
  }

  /**
   * Subscribe to status updates
   */
  onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler)
    return () => this.statusHandlers.delete(handler)
  }

  private notifyStatus(status: StreamStatus): void {
    this.statusHandlers.forEach(handler => handler(status))
  }

  /**
   * Disconnect all streams
   */
  disconnectAll(): void {
    this.aisClient?.disconnect()
    this.flightService.stop()
    this.satelliteService.stop()
    this.statusHandlers.clear()
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let serviceInstance: OEIStreamingService | null = null

export function getOEIStreamingService(): OEIStreamingService {
  if (!serviceInstance) {
    serviceInstance = new OEIStreamingService()
  }
  return serviceInstance
}
