/**
 * Entity WebSocket Stream Client
 *
 * Connects to MAS WebSocket for real-time entity position updates.
 * Features:
 * - Exponential backoff reconnection (1.5s → 3s → 6s → 12s → 24s max)
 * - Binary protobuf and JSON message support
 * - S2 cell-based viewport filtering
 * - Connection health monitoring
 * - Proper error logging (no silent drops)
 *
 * Uses centralized API_URLS config — no hard-coded development IPs.
 */

import {
  decodeEntityBatchFromBinary,
  decodeEntityFromBinary,
} from "@/lib/crep/proto/entity-codec"
import { getViewportCells, MapBounds } from "@/lib/crep/spatial/s2-indexer"
import type { UnifiedEntity } from "@/lib/crep/entities/unified-entity-schema"
import { getSecureWebSocketUrl } from "@/lib/utils/websocket-url"
import { API_URLS } from "@/lib/config/api-urls"

export interface EntityStreamConnectOptions {
  types?: string[]
  timeFrom?: string
}

export type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting"

const BASE_RECONNECT_MS = 1500
const MAX_RECONNECT_MS = 24000
const MAX_RECONNECT_ATTEMPTS = 10

export class EntityStreamClient {
  private ws: WebSocket | null = null
  private cells = new Set<string>()
  private readonly endpointBase: string
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private onEntityHandler: ((entity: UnifiedEntity) => void) | null = null
  private onConnectionStateChange: ((state: ConnectionState) => void) | null = null
  private onError: ((error: Error) => void) | null = null
  private options: EntityStreamConnectOptions = {}
  private _connectionState: ConnectionState = "disconnected"
  private messageCount = 0
  private lastMessageAt = 0
  /** Avoid flooding console when MAS stream is down or CSP blocked (notify once until reconnect succeeds). */
  private userErrorNotified = false

  constructor(endpointBase?: string) {
    // Use centralized API_URLS config with env var override — no hard-coded IPs
    const masUrl = endpointBase || API_URLS.MAS
    // Convert http(s) to ws(s)
    this.endpointBase = masUrl.replace(/^http/, "ws")
  }

  get connectionState(): ConnectionState {
    return this._connectionState
  }

  get stats() {
    return {
      messageCount: this.messageCount,
      lastMessageAt: this.lastMessageAt,
      reconnectAttempts: this.reconnectAttempts,
      connectionState: this._connectionState,
      cellCount: this.cells.size,
    }
  }

  connect(
    onEntity: (entity: UnifiedEntity) => void,
    options: EntityStreamConnectOptions = {},
    callbacks?: {
      onConnectionStateChange?: (state: ConnectionState) => void
      onError?: (error: Error) => void
    }
  ): void {
    this.onEntityHandler = onEntity
    this.options = options
    this.onConnectionStateChange = callbacks?.onConnectionStateChange || null
    this.onError = callbacks?.onError || null
    this.reconnectAttempts = 0
    this.openSocket()
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.onclose = null // Prevent reconnect on intentional close
      this.ws.close()
      this.ws = null
    }
    this.setConnectionState("disconnected")
  }

  updateViewport(bounds: MapBounds, zoom: number): void {
    const nextCells = new Set(getViewportCells(bounds, zoom))
    if (this.setsEqual(this.cells, nextCells)) return
    this.cells = nextCells
    this.reconnect()
  }

  private setConnectionState(state: ConnectionState): void {
    if (this._connectionState === state) return
    this._connectionState = state
    this.onConnectionStateChange?.(state)
  }

  private getReconnectDelay(): number {
    // Exponential backoff: 1.5s, 3s, 6s, 12s, 24s (capped)
    const delay = Math.min(
      BASE_RECONNECT_MS * Math.pow(2, this.reconnectAttempts),
      MAX_RECONNECT_MS
    )
    return delay
  }

  private openSocket(): void {
    if (!this.onEntityHandler) return

    this.setConnectionState("connecting")

    const wsBase = getSecureWebSocketUrl(this.endpointBase)
    const url = new URL(`${wsBase.replace(/\/$/, "")}/api/entities/stream`)
    if (this.cells.size > 0) {
      url.searchParams.set("cells", [...this.cells].join(","))
    }
    if (this.options.types?.length) {
      url.searchParams.set("types", this.options.types.join(","))
    }
    if (this.options.timeFrom) {
      url.searchParams.set("time_from", this.options.timeFrom)
    }

    try {
      this.ws = new WebSocket(url.toString())
      this.ws.binaryType = "arraybuffer"
    } catch (error) {
      console.warn("[EntityStream] WebSocket unavailable (optional):", (error as Error)?.message || error)
      this.onError?.(error instanceof Error ? error : new Error(String(error)))
      this.scheduleReconnect()
      return
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      this.userErrorNotified = false
      this.setConnectionState("connected")
      console.log("[EntityStream] Connected to MAS entity stream")
    }

    this.ws.onmessage = (event: MessageEvent<ArrayBuffer | string>) => {
      if (!this.onEntityHandler) return
      this.messageCount++
      this.lastMessageAt = Date.now()

      try {
        if (typeof event.data === "string") {
          const parsed = JSON.parse(event.data) as UnifiedEntity
          this.onEntityHandler(parsed)
          return
        }

        // Try batch decode first (most common for binary)
        const batch = decodeEntityBatchFromBinary(event.data)
        for (const entity of batch.entities) {
          this.onEntityHandler(entity)
        }
      } catch (batchError) {
        // Fallback: try single entity decode
        try {
          if (typeof event.data !== "string") {
            const entity = decodeEntityFromBinary(event.data)
            this.onEntityHandler(entity)
          }
        } catch (singleError) {
          // Log decode failures instead of silently dropping
          console.warn(
            "[EntityStream] Failed to decode message:",
            batchError instanceof Error ? batchError.message : "Unknown batch decode error"
          )
        }
      }
    }

    this.ws.onerror = () => {
      if (this.userErrorNotified) return
      this.userErrorNotified = true
      this.onError?.(new Error(`WebSocket connection error (${url.toString()})`))
    }

    this.ws.onclose = (event) => {
      console.log(
        `[EntityStream] Connection closed (code: ${event.code}, reason: ${event.reason || "none"})`
      )
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.warn(
        `[EntityStream] MAS entity stream unavailable (optional). Entities use direct API fetch instead.`
      )
      this.setConnectionState("disconnected")
      this.onError?.(
        new Error(`Failed to reconnect after ${MAX_RECONNECT_ATTEMPTS} attempts`)
      )
      return
    }

    this.setConnectionState("reconnecting")
    const delay = this.getReconnectDelay()
    this.reconnectAttempts++

    console.log(
      `[EntityStream] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`
    )

    this.reconnectTimer = setTimeout(() => this.openSocket(), delay)
  }

  private reconnect(): void {
    if (!this.onEntityHandler) return
    this.disconnect()
    this.reconnectAttempts = 0
    this.openSocket()
  }

  private setsEqual(a: Set<string>, b: Set<string>): boolean {
    if (a.size !== b.size) return false
    for (const value of a) {
      if (!b.has(value)) return false
    }
    return true
  }
}
