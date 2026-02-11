/**
 * Fungi Compute - WebSocket Client
 * 
 * Real-time signal streaming client for FCI devices.
 * Handles connection management, message parsing, and reconnection.
 */

import {
  WSMessage,
  WSSamplePayload,
  WSSpectrumPayload,
  WSPatternPayload,
  WSEventPayload,
  SDRConfig,
  WSMessageType,
} from "./types"

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error" | "reconnecting"

export interface FCIWebSocketConfig {
  deviceId: string
  url?: string
  reconnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
  onSample?: (payload: WSSamplePayload) => void
  onSpectrum?: (payload: WSSpectrumPayload) => void
  onPattern?: (payload: WSPatternPayload) => void
  onEvent?: (payload: WSEventPayload) => void
  onStatusChange?: (status: ConnectionStatus) => void
  onError?: (error: Error) => void
}

export class FCIWebSocketClient {
  private ws: WebSocket | null = null
  private config: FCIWebSocketConfig
  private status: ConnectionStatus = "disconnected"
  private reconnectAttempts = 0
  private reconnectTimer: NodeJS.Timeout | null = null
  private pingInterval: NodeJS.Timeout | null = null
  private sdrConfig: SDRConfig | null = null

  constructor(config: FCIWebSocketConfig) {
    this.config = {
      url: process.env.NEXT_PUBLIC_MAS_WS_URL || "ws://192.168.0.188:8001",
      reconnect: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      ...config,
    }
  }

  get connectionStatus(): ConnectionStatus {
    return this.status
  }

  get isConnected(): boolean {
    return this.status === "connected"
  }

  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    this.setStatus("connecting")
    
    const wsUrl = `${this.config.url}/ws/fci/${this.config.deviceId}`
    
    try {
      this.ws = new WebSocket(wsUrl)
      this.setupEventHandlers()
    } catch (error) {
      this.handleError(error as Error)
    }
  }

  disconnect(): void {
    this.stopReconnect()
    this.stopPing()
    
    if (this.ws) {
      this.ws.close(1000, "Client disconnect")
      this.ws = null
    }
    
    this.setStatus("disconnected")
  }

  sendSDRConfig(config: SDRConfig): void {
    this.sdrConfig = config
    this.send({
      type: "config_update",
      deviceId: this.config.deviceId,
      timestamp: new Date().toISOString(),
      payload: { sdrConfig: config },
    })
  }

  sendStimulationCommand(command: {
    waveform: string
    frequency: number
    amplitude: number
    duration: number
    channel: number
  }): void {
    this.send({
      type: "config_update",
      deviceId: this.config.deviceId,
      timestamp: new Date().toISOString(),
      payload: { stimulation: command },
    })
  }

  private setupEventHandlers(): void {
    if (!this.ws) return

    this.ws.onopen = () => {
      this.setStatus("connected")
      this.reconnectAttempts = 0
      this.startPing()
      
      // Send SDR config if we have one
      if (this.sdrConfig) {
        this.sendSDRConfig(this.sdrConfig)
      }
    }

    this.ws.onclose = (event) => {
      this.stopPing()
      
      if (event.code === 1000) {
        this.setStatus("disconnected")
      } else if (this.config.reconnect) {
        this.scheduleReconnect()
      } else {
        this.setStatus("disconnected")
      }
    }

    this.ws.onerror = (event) => {
      console.error("[FCIWebSocket] Error:", event)
      this.handleError(new Error("WebSocket connection error"))
    }

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WSMessage
        this.handleMessage(message)
      } catch (error) {
        console.error("[FCIWebSocket] Failed to parse message:", error)
      }
    }
  }

  private handleMessage(message: WSMessage): void {
    switch (message.type as WSMessageType) {
      case "sample":
        this.config.onSample?.(message.payload as WSSamplePayload)
        break
      case "spectrum":
        this.config.onSpectrum?.(message.payload as WSSpectrumPayload)
        break
      case "pattern":
        this.config.onPattern?.(message.payload as WSPatternPayload)
        break
      case "event":
        this.config.onEvent?.(message.payload as WSEventPayload)
        break
      case "status":
        // Handle status updates
        break
      case "error":
        this.handleError(new Error(String(message.payload)))
        break
    }
  }

  private send(message: WSMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status
    this.config.onStatusChange?.(status)
  }

  private handleError(error: Error): void {
    this.setStatus("error")
    this.config.onError?.(error)
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= (this.config.maxReconnectAttempts || 10)) {
      this.setStatus("error")
      return
    }

    this.setStatus("reconnecting")
    this.reconnectAttempts++

    const delay = Math.min(
      (this.config.reconnectInterval || 3000) * Math.pow(1.5, this.reconnectAttempts - 1),
      30000
    )

    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay)
  }

  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }))
      }
    }, 30000)
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }
}

/**
 * Create a new FCI WebSocket client
 */
export function createFCIClient(config: FCIWebSocketConfig): FCIWebSocketClient {
  return new FCIWebSocketClient(config)
}
