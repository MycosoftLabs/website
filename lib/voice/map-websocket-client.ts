/**
 * Map WebSocket Client - February 6, 2026
 * Connects to PersonaPlex Bridge for real-time voice command delivery
 * 
 * The PersonaPlex Bridge at localhost:8999 broadcasts frontend_commands
 * when voice commands are processed through the MAS VoiceCommandRouter.
 */

export interface FrontendCommand {
  type: string
  center?: [number, number]
  zoom?: number
  delta?: number
  offset?: [number, number]
  layer?: string
  duration?: number
  filterType?: string
  filterValue?: string
  model?: string
  lead_time?: number
  entity?: string
  [key: string]: unknown
}

export interface MapCommandMessage {
  type: "frontend_command" | "connected" | "pong"
  command?: FrontendCommand
  speak?: string
  message?: string
  timestamp?: string
}

export interface MapWebSocketClientOptions {
  url?: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  onConnect?: () => void
  onDisconnect?: () => void
  onCommand?: (command: FrontendCommand, speak?: string) => void
  onError?: (error: Error) => void
}

export class MapWebSocketClient {
  private ws: WebSocket | null = null
  private url: string
  private reconnectInterval: number
  private maxReconnectAttempts: number
  private reconnectAttempts: number = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private isConnecting: boolean = false
  
  private onConnect?: () => void
  private onDisconnect?: () => void
  private onCommand?: (command: FrontendCommand, speak?: string) => void
  private onError?: (error: Error) => void
  
  constructor(options: MapWebSocketClientOptions = {}) {
    // Connect to PersonaPlex Bridge CREP command channel
    this.url = options.url || "ws://localhost:8999/ws/crep/commands"
    this.reconnectInterval = options.reconnectInterval || 3000
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10
    
    this.onConnect = options.onConnect
    this.onDisconnect = options.onDisconnect
    this.onCommand = options.onCommand
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
        console.log("[MapWS] Connected to CREP voice command channel")
        
        // Start ping interval for keep-alive
        this.startPing()
        
        this.onConnect?.()
      }
      
      this.ws.onmessage = (event) => {
        try {
          const data: MapCommandMessage = JSON.parse(event.data)
          
          if (data.type === "frontend_command" && data.command) {
            console.log("[MapWS] Received command:", data.command.type)
            this.onCommand?.(data.command, data.speak)
          } else if (data.type === "connected") {
            console.log("[MapWS] Server confirmed connection")
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
        this.stopPing()
        console.log("[MapWS] Disconnected")
        this.onDisconnect?.()
        
        this.scheduleReconnect()
      }
    } catch (e) {
      this.isConnecting = false
      console.error("[MapWS] Connection failed:", e)
      this.scheduleReconnect()
    }
  }
  
  private startPing(): void {
    this.stopPing()
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }))
      }
    }, 30000)
  }
  
  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
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
    
    this.stopPing()
    
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
  
  /**
   * Send a text command directly (for typing instead of voice)
   */
  sendCommand(text: string): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.warn("[MapWS] Cannot send - not connected")
      return
    }
    
    this.ws.send(JSON.stringify({
      type: "command",
      text: text
    }))
  }
  
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
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

export function disconnectMapWebSocket(): void {
  if (globalClient) {
    globalClient.disconnect()
    globalClient = null
  }
}