/**
 * Mycorrhizae Protocol TypeScript Client
 *
 * Client SDK for interacting with the Mycorrhizae Protocol API.
 * Supports channel subscriptions, message publishing, and API key management.
 */

import { env } from "@/lib/env"

// ==================== Types ====================

export interface MycorrhizaeMessage {
  id: string
  channel: string
  timestamp: string
  ttl_seconds: number
  source: {
    type: string
    id?: string
    device_serial?: string
  }
  message_type: string
  payload: Record<string, unknown>
  tracing: {
    correlation_id?: string
    reply_to?: string
    api_key_id?: string
  }
  priority: number
  tags: string[]
}

export interface ChannelInfo {
  name: string
  type: string
  description: string
  required_scopes: string[]
  write_scopes: string[]
  message_count: number
  subscriber_count: number
  last_message_at?: string
  created_at: string
  persist_messages: boolean
  ttl_seconds: number
  tags: string[]
}

export interface APIKeyInfo {
  id: string
  key_prefix: string
  name: string
  description?: string
  service: string
  scopes: string[]
  rate_limit_per_minute: number
  rate_limit_per_day: number
  expires_at?: string
  last_used_at?: string
  usage_count: number
  is_active: boolean
  created_at: string
}

export interface ValidateKeyResponse {
  valid: boolean
  error?: string
  key_id?: string
  service?: string
  scopes?: string[]
  remaining_minute?: number
  remaining_day?: number
}

export interface PublishResponse {
  message_id: string
  channel: string
  subscribers_notified: number
  persisted: boolean
}

export type MessageCallback = (message: MycorrhizaeMessage) => void
export type ConnectionCallback = (connected: boolean) => void
export type ErrorCallback = (error: Error) => void

// ==================== Client Class ====================

export class MycorrhizaeClient {
  private apiUrl: string
  private apiKey: string
  private eventSource?: EventSource
  private messageCallbacks: Map<string, Set<MessageCallback>> = new Map()
  private connectionCallbacks: Set<ConnectionCallback> = new Set()
  private errorCallbacks: Set<ErrorCallback> = new Set()
  private connected: boolean = false
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 10
  private reconnectDelay: number = 1000

  constructor(apiUrl?: string, apiKey?: string) {
    this.apiUrl = apiUrl || env.mycorrhizaeApiUrl || "http://192.168.0.187:8002"
    // API key is optional for read operations, auto-generated for dev
    this.apiKey = apiKey || env.mycorrhizaePublishKey || this.generateDevKey()
  }

  /**
   * Generate a dev-mode API key if none provided (for local development only)
   */
  private generateDevKey(): string {
    if (typeof window === "undefined" && env.isDevelopment) {
      // Server-side dev key generation
      return `myco_dev_${Date.now().toString(36)}`
    }
    return ""
  }

  // ==================== Connection Management ====================

  /**
   * Connect to the Mycorrhizae Protocol SSE stream.
   */
  async connect(channelPattern: string = "*"): Promise<void> {
    if (this.eventSource) {
      this.disconnect()
    }

    const url = `${this.apiUrl}/api/stream/subscribe?channel=${encodeURIComponent(channelPattern)}`

    this.eventSource = new EventSource(url, {
      // Note: EventSource doesn't support custom headers in browser
      // API key must be passed via query param or we need to use fetch-based SSE
    })

    this.eventSource.onopen = () => {
      this.connected = true
      this.reconnectAttempts = 0
      this.notifyConnection(true)
    }

    this.eventSource.onmessage = (event) => {
      try {
        const message: MycorrhizaeMessage = JSON.parse(event.data)
        this.handleMessage(message)
      } catch (error) {
        console.error("[MycorrhizaeClient] Failed to parse message:", error)
      }
    }

    this.eventSource.addEventListener("connected", (event) => {
      const data = JSON.parse((event as MessageEvent).data)
      console.log("[MycorrhizaeClient] Connected:", data)
    })

    this.eventSource.addEventListener("ping", () => {
      // Keep-alive received
    })

    this.eventSource.onerror = (error) => {
      this.connected = false
      this.notifyConnection(false)
      this.notifyError(new Error("SSE connection error"))

      // Attempt reconnection
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++
        setTimeout(() => {
          this.connect(channelPattern)
        }, this.reconnectDelay * this.reconnectAttempts)
      }
    }
  }

  /**
   * Disconnect from the SSE stream.
   */
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = undefined
    }
    this.connected = false
    this.notifyConnection(false)
  }

  /**
   * Check if connected.
   */
  isConnected(): boolean {
    return this.connected
  }

  // ==================== Subscriptions ====================

  /**
   * Subscribe to messages on a channel pattern.
   */
  subscribe(channelPattern: string, callback: MessageCallback): () => void {
    if (!this.messageCallbacks.has(channelPattern)) {
      this.messageCallbacks.set(channelPattern, new Set())
    }
    this.messageCallbacks.get(channelPattern)!.add(callback)

    // Return unsubscribe function
    return () => {
      const callbacks = this.messageCallbacks.get(channelPattern)
      if (callbacks) {
        callbacks.delete(callback)
      }
    }
  }

  /**
   * Subscribe to connection state changes.
   */
  onConnection(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.add(callback)
    return () => {
      this.connectionCallbacks.delete(callback)
    }
  }

  /**
   * Subscribe to errors.
   */
  onError(callback: ErrorCallback): () => void {
    this.errorCallbacks.add(callback)
    return () => {
      this.errorCallbacks.delete(callback)
    }
  }

  private handleMessage(message: MycorrhizaeMessage): void {
    // Notify channel-specific callbacks
    for (const [pattern, callbacks] of this.messageCallbacks) {
      if (this.matchesPattern(message.channel, pattern)) {
        callbacks.forEach((cb) => cb(message))
      }
    }
  }

  private matchesPattern(channel: string, pattern: string): boolean {
    if (pattern === "*" || pattern === "#") {
      return true
    }
    // Simple glob matching
    const regex = new RegExp(
      "^" + pattern.replace(/\./g, "\\.").replace(/\*/g, "[^.]+").replace(/#/g, ".*") + "$"
    )
    return regex.test(channel)
  }

  private notifyConnection(connected: boolean): void {
    this.connectionCallbacks.forEach((cb) => cb(connected))
  }

  private notifyError(error: Error): void {
    this.errorCallbacks.forEach((cb) => cb(error))
  }

  // ==================== API Methods ====================

  /**
   * Publish a message to a channel.
   */
  async publish(
    channel: string,
    payload: Record<string, unknown>,
    options?: {
      messageType?: string
      sourceId?: string
      deviceSerial?: string
      priority?: number
      tags?: string[]
    }
  ): Promise<PublishResponse> {
    const response = await fetch(`${this.apiUrl}/api/channels/${encodeURIComponent(channel)}/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey,
      },
      body: JSON.stringify({
        payload,
        message_type: options?.messageType || "telemetry",
        source_id: options?.sourceId,
        device_serial: options?.deviceSerial,
        priority: options?.priority || 5,
        tags: options?.tags || [],
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || "Failed to publish message")
    }

    return response.json()
  }

  /**
   * List available channels.
   */
  async listChannels(type?: string, prefix?: string): Promise<ChannelInfo[]> {
    const params = new URLSearchParams()
    if (type) params.set("type", type)
    if (prefix) params.set("prefix", prefix)

    const response = await fetch(`${this.apiUrl}/api/channels?${params}`, {
      headers: {
        "X-API-Key": this.apiKey,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to list channels")
    }

    return response.json()
  }

  /**
   * Get channel info.
   */
  async getChannel(name: string): Promise<ChannelInfo> {
    const response = await fetch(`${this.apiUrl}/api/channels/${encodeURIComponent(name)}`, {
      headers: {
        "X-API-Key": this.apiKey,
      },
    })

    if (!response.ok) {
      throw new Error("Channel not found")
    }

    return response.json()
  }

  /**
   * Create a new channel.
   */
  async createChannel(
    name: string,
    options?: {
      type?: string
      description?: string
      requiredScopes?: string[]
      writeScopes?: string[]
      persistMessages?: boolean
      ttlSeconds?: number
      tags?: string[]
    }
  ): Promise<ChannelInfo> {
    const response = await fetch(`${this.apiUrl}/api/channels`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey,
      },
      body: JSON.stringify({
        name,
        type: options?.type || "device",
        description: options?.description || "",
        required_scopes: options?.requiredScopes || ["read"],
        write_scopes: options?.writeScopes || ["write"],
        persist_messages: options?.persistMessages ?? true,
        ttl_seconds: options?.ttlSeconds || 3600,
        tags: options?.tags || [],
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || "Failed to create channel")
    }

    return response.json()
  }

  // ==================== API Key Methods ====================

  /**
   * Validate an API key.
   */
  async validateKey(key: string, requiredScopes?: string[]): Promise<ValidateKeyResponse> {
    const response = await fetch(`${this.apiUrl}/api/keys/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key,
        required_scopes: requiredScopes,
      }),
    })

    return response.json()
  }

  /**
   * List API keys (admin only).
   */
  async listKeys(options?: {
    service?: string
    includeInactive?: boolean
    limit?: number
    offset?: number
  }): Promise<APIKeyInfo[]> {
    const params = new URLSearchParams()
    if (options?.service) params.set("service", options.service)
    if (options?.includeInactive) params.set("include_inactive", "true")
    if (options?.limit) params.set("limit", options.limit.toString())
    if (options?.offset) params.set("offset", options.offset.toString())

    const response = await fetch(`${this.apiUrl}/api/keys?${params}`, {
      headers: {
        "X-API-Key": this.apiKey,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to list keys")
    }

    return response.json()
  }

  /**
   * Get protocol stats.
   */
  async getStats(): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.apiUrl}/api/stats`, {
      headers: {
        "X-API-Key": this.apiKey,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to get stats")
    }

    return response.json()
  }

  /**
   * Health check.
   */
  async healthCheck(): Promise<{ status: string; database: boolean; protocol: boolean }> {
    const response = await fetch(`${this.apiUrl}/health`)

    if (!response.ok) {
      throw new Error("Health check failed")
    }

    return response.json()
  }
}

// ==================== Singleton Instance ====================

let _clientInstance: MycorrhizaeClient | null = null

export function getMycorrhizaeClient(): MycorrhizaeClient {
  if (!_clientInstance) {
    _clientInstance = new MycorrhizaeClient()
  }
  return _clientInstance
}
