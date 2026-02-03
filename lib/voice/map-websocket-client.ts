/**
 * Map WebSocket Client
 * Real-time map command channel for immediate updates
 */

export interface MapCommand {
  type: "navigate" | "layer" | "filter" | "marker" | "state"
  action: string
  params: Record<string, any>
  timestamp: number
  clientId: string
}

export interface MapStateUpdate {
  type: "state_sync"
  viewport: {
    center: [number, number]
    zoom: number
    bearing: number
    pitch: number
  }
  layers: Record<string, boolean>
  filters: Record<string, any>
  markers: Array<{
    id: string
    position: [number, number]
    type: string
  }>
}

export type MapWebSocketMessage = MapCommand | MapStateUpdate

export interface MapWebSocketClientOptions {
  url?: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  onConnect?: () => void
  onDisconnect?: () => void
  onCommand?: (command: MapCommand) => void
  onStateUpdate?: (state: MapStateUpdate) => void
  onError?: (error: Error) => void
}

export class MapWebSocketClient {
  private ws: WebSocket | null = null
  private url: string
  private reconnectInterval: number
  private maxReconnectAttempts: number
  private reconnectAttempts: number = 0
  private reconnectTimer: NodeJS.Timeout | null = null
  private clientId: string
  private isConnecting: boolean = false
  
  private onConnect?: () => void
  private onDisconnect?: () => void
  private onCommand?: (command: MapCommand) => void
  private onStateUpdate?: (state: MapStateUpdate) => void
  private onError?: (error: Error) => void
  
  constructor(options: MapWebSocketClientOptions = {}) {
    this.url = options.url || "ws://localhost:3010/api/crep/ws"
    this.reconnectInterval = options.reconnectInterval || 3000
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10
    this.clientId = `client-${Date.now()}-${Math.random().toString(36).slice(2)}`
    
    this.onConnect = options.onConnect
    this.onDisconnect = options.onDisconnect
    this.onCommand = options.onCommand
    this.onStateUpdate = options.onStateUpdate
    this.onError = options.onError
  }
  
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return
    }
    
    this.isConnecting = true
    
    try {
      this.ws = new WebSocket(this.url)
      
      this.ws.onopen = () => {
        this.isConnecting = false
        this.reconnectAttempts = 0
        console.log("[MapWS] Connected to map channel")
        
        // Send client identification
        this.send({
          type: "state",
          action: "identify",
          params: { clientId: this.clientId },
          timestamp: Date.now(),
          clientId: this.clientId,
        })
        
        this.onConnect?.()
      }
      
      this.ws.onmessage = (event) => {
        try {
          const data: MapWebSocketMessage = JSON.parse(event.data)
          
          if (data.type === "state_sync") {
            this.onStateUpdate?.(data as MapStateUpdate)
          } else {
            this.onCommand?.(data as MapCommand)
          }
        } catch (e) {
          console.error("[MapWS] Failed to parse message:", e)
        }
      }
      
      this.ws.onerror = (event) => {
        this.isConnecting = false
        const error = new Error("WebSocket error")
        console.error("[MapWS] Error:", event)
        this.onError?.(error)
      }
      
      this.ws.onclose = () => {
        this.isConnecting = false
        console.log("[MapWS] Disconnected")
        this.onDisconnect?.()
        
        // Attempt reconnection
        this.scheduleReconnect()
      }
    } catch (e) {
      this.isConnecting = false
      console.error("[MapWS] Connection failed:", e)
      this.scheduleReconnect()
    }
  }
  
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("[MapWS] Max reconnect attempts reached")
      return
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }
    
    this.reconnectAttempts++
    const delay = this.reconnectInterval * Math.min(this.reconnectAttempts, 5)
    
    console.log(`[MapWS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)
    
    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay)
  }
  
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
  
  send(command: MapCommand): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.warn("[MapWS] Cannot send - not connected")
      return
    }
    
    this.ws.send(JSON.stringify(command))
  }
  
  // Convenience methods for common commands
  flyTo(lng: number, lat: number, zoom?: number): void {
    this.send({
      type: "navigate",
      action: "flyTo",
      params: { lng, lat, zoom },
      timestamp: Date.now(),
      clientId: this.clientId,
    })
  }
  
  setZoom(level: number): void {
    this.send({
      type: "navigate",
      action: "setZoom",
      params: { level },
      timestamp: Date.now(),
      clientId: this.clientId,
    })
  }
  
  toggleLayer(layer: string, visible: boolean): void {
    this.send({
      type: "layer",
      action: visible ? "show" : "hide",
      params: { layer },
      timestamp: Date.now(),
      clientId: this.clientId,
    })
  }
  
  setFilter(filter: string, value: any): void {
    this.send({
      type: "filter",
      action: "set",
      params: { filter, value },
      timestamp: Date.now(),
      clientId: this.clientId,
    })
  }
  
  clearFilters(): void {
    this.send({
      type: "filter",
      action: "clear",
      params: {},
      timestamp: Date.now(),
      clientId: this.clientId,
    })
  }
  
  addMarker(id: string, position: [number, number], type: string): void {
    this.send({
      type: "marker",
      action: "add",
      params: { id, position, type },
      timestamp: Date.now(),
      clientId: this.clientId,
    })
  }
  
  removeMarker(id: string): void {
    this.send({
      type: "marker",
      action: "remove",
      params: { id },
      timestamp: Date.now(),
      clientId: this.clientId,
    })
  }
  
  requestStateSync(): void {
    this.send({
      type: "state",
      action: "requestSync",
      params: {},
      timestamp: Date.now(),
      clientId: this.clientId,
    })
  }
  
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
  
  get id(): string {
    return this.clientId
  }
}

// Singleton instance for global use
let globalClient: MapWebSocketClient | null = null

export function getMapWebSocketClient(options?: MapWebSocketClientOptions): MapWebSocketClient {
  if (!globalClient) {
    globalClient = new MapWebSocketClient(options)
  }
  return globalClient
}
