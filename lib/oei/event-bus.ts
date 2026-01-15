/**
 * NatureOS OEI Event Bus
 * 
 * Hybrid event bus implementation supporting:
 * - Redis Streams for real-time internal event flow
 * - Supabase Realtime for browser subscriptions
 * - In-memory fallback for development/testing
 * 
 * Events flow: Producers -> Redis Streams -> Consumers -> Supabase Broadcast -> Browsers
 */

import type {
  Entity,
  Observation,
  Event,
  OEISubscriptionMessage,
  EventType,
  EntityType,
  ObservationType,
} from "@/types/oei"

// =============================================================================
// TYPES
// =============================================================================

export type EventBusChannel = 
  | "entities"
  | "observations"
  | "events"
  | "alerts"
  | "devices"
  | "species"
  | "weather"
  | "space-weather"
  | "geological"

export interface EventBusMessage<T = unknown> {
  id: string
  channel: EventBusChannel
  type: string
  timestamp: string
  payload: T
  metadata?: {
    source?: string
    priority?: number
    ttlSeconds?: number
  }
}

export type EventHandler<T = unknown> = (message: EventBusMessage<T>) => void | Promise<void>

export interface EventBusConfig {
  redisUrl?: string
  supabaseUrl?: string
  supabaseKey?: string
  enableRedis?: boolean
  enableSupabase?: boolean
  enableInMemory?: boolean
  consumerGroup?: string
  consumerId?: string
}

// =============================================================================
// IN-MEMORY EVENT BUS (Development/Fallback)
// =============================================================================

class InMemoryEventBus {
  private handlers: Map<EventBusChannel, Set<EventHandler>> = new Map()
  private buffer: EventBusMessage[] = []
  private maxBufferSize = 1000

  subscribe<T>(channel: EventBusChannel, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set())
    }
    this.handlers.get(channel)!.add(handler as EventHandler)
    
    return () => {
      this.handlers.get(channel)?.delete(handler as EventHandler)
    }
  }

  async publish<T>(channel: EventBusChannel, type: string, payload: T): Promise<string> {
    const message: EventBusMessage<T> = {
      id: `inmem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      channel,
      type,
      timestamp: new Date().toISOString(),
      payload,
    }

    // Add to buffer
    this.buffer.push(message)
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer = this.buffer.slice(-this.maxBufferSize)
    }

    // Notify handlers
    const handlers = this.handlers.get(channel)
    if (handlers) {
      for (const handler of handlers) {
        try {
          await handler(message)
        } catch (error) {
          console.error(`[EventBus] Handler error for ${channel}:`, error)
        }
      }
    }

    return message.id
  }

  getRecentMessages(channel?: EventBusChannel, limit = 100): EventBusMessage[] {
    let messages = this.buffer
    if (channel) {
      messages = messages.filter(m => m.channel === channel)
    }
    return messages.slice(-limit)
  }
}

// =============================================================================
// HYBRID EVENT BUS
// =============================================================================

class HybridEventBus {
  private inMemory: InMemoryEventBus
  private config: EventBusConfig
  private isInitialized = false

  constructor(config: EventBusConfig = {}) {
    this.config = {
      enableInMemory: true,
      enableRedis: !!process.env.REDIS_URL,
      enableSupabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      consumerGroup: "natureos-oei",
      consumerId: `consumer-${Date.now()}`,
      ...config,
    }
    this.inMemory = new InMemoryEventBus()
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    // Note: Redis and Supabase clients would be initialized here
    // For now, we rely on in-memory bus with API routes handling Redis/Supabase
    
    console.log("[EventBus] Initialized with config:", {
      inMemory: this.config.enableInMemory,
      redis: this.config.enableRedis,
      supabase: this.config.enableSupabase,
    })

    this.isInitialized = true
  }

  /**
   * Subscribe to a channel
   */
  subscribe<T>(channel: EventBusChannel, handler: EventHandler<T>): () => void {
    return this.inMemory.subscribe(channel, handler)
  }

  /**
   * Publish an event to a channel
   */
  async publish<T>(
    channel: EventBusChannel, 
    type: string, 
    payload: T,
    options?: { priority?: number; ttlSeconds?: number }
  ): Promise<string> {
    const messageId = await this.inMemory.publish(channel, type, payload)

    // If Redis is enabled, also publish there (for other services)
    if (this.config.enableRedis && typeof window === "undefined") {
      try {
        // This would call a server-side Redis publishing function
        await this.publishToRedis(channel, type, payload, messageId, options)
      } catch (error) {
        console.error("[EventBus] Redis publish failed:", error)
      }
    }

    return messageId
  }

  /**
   * Publish to Redis Streams (server-side only)
   */
  private async publishToRedis<T>(
    channel: EventBusChannel,
    type: string,
    payload: T,
    messageId: string,
    options?: { priority?: number; ttlSeconds?: number }
  ): Promise<void> {
    // Server-side Redis publishing via API
    // In a real implementation, this would use ioredis directly
    if (typeof window === "undefined" && process.env.REDIS_URL) {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/oei/events/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          type,
          payload,
          messageId,
          ...options,
        }),
      }).catch(() => null)

      if (!response?.ok) {
        console.warn("[EventBus] Redis publish via API failed")
      }
    }
  }

  /**
   * Get recent messages from buffer
   */
  getRecentMessages(channel?: EventBusChannel, limit = 100): EventBusMessage[] {
    return this.inMemory.getRecentMessages(channel, limit)
  }

  // =============================================================================
  // CONVENIENCE METHODS
  // =============================================================================

  /**
   * Publish an entity update
   */
  async publishEntity(entity: Entity): Promise<string> {
    const channel = this.getChannelForEntityType(entity.type)
    return this.publish(channel, "entity_update", entity)
  }

  /**
   * Publish an observation
   */
  async publishObservation(observation: Observation): Promise<string> {
    return this.publish("observations", observation.type, observation)
  }

  /**
   * Publish an event/alert
   */
  async publishEvent(event: Event): Promise<string> {
    const channel = this.getChannelForEventType(event.type)
    const priority = this.getPriorityForSeverity(event.severity)
    return this.publish(channel, event.type, event, { priority })
  }

  /**
   * Subscribe to entity updates for a specific type
   */
  subscribeToEntities(
    entityType: EntityType | string,
    handler: EventHandler<Entity>
  ): () => void {
    const channel = this.getChannelForEntityType(entityType)
    return this.subscribe(channel, (msg) => {
      if (msg.type === "entity_update") {
        handler(msg as EventBusMessage<Entity>)
      }
    })
  }

  /**
   * Subscribe to all alerts/events
   */
  subscribeToAlerts(handler: EventHandler<Event>): () => void {
    return this.subscribe("alerts", handler)
  }

  // =============================================================================
  // HELPERS
  // =============================================================================

  private getChannelForEntityType(type: EntityType | string): EventBusChannel {
    switch (type) {
      case "device":
        return "devices"
      case "species":
        return "species"
      case "aircraft":
      case "vessel":
        return "entities"
      case "weather_station":
        return "weather"
      default:
        return "entities"
    }
  }

  private getChannelForEventType(type: EventType | string): EventBusChannel {
    if (type.includes("weather") && !type.includes("space")) {
      return "weather"
    }
    if (type.includes("space")) {
      return "space-weather"
    }
    if (type.includes("earthquake") || type.includes("volcan") || type.includes("tsunami")) {
      return "geological"
    }
    if (type.includes("device") || type.includes("sensor")) {
      return "devices"
    }
    if (type.includes("species")) {
      return "species"
    }
    return "alerts"
  }

  private getPriorityForSeverity(severity: string): number {
    switch (severity) {
      case "critical":
        return 5
      case "high":
        return 4
      case "medium":
        return 3
      case "low":
        return 2
      case "info":
        return 1
      default:
        return 2
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let eventBusInstance: HybridEventBus | null = null

export function getEventBus(): HybridEventBus {
  if (!eventBusInstance) {
    eventBusInstance = new HybridEventBus()
  }
  return eventBusInstance
}

export function createEventBus(config?: EventBusConfig): HybridEventBus {
  return new HybridEventBus(config)
}

// =============================================================================
// REACT HOOK (Client-side)
// =============================================================================

/**
 * React hook for subscribing to event bus channels
 * 
 * Usage:
 * ```tsx
 * const { messages, subscribe } = useEventBus("alerts")
 * 
 * useEffect(() => {
 *   return subscribe((msg) => {
 *     console.log("New alert:", msg.payload)
 *   })
 * }, [subscribe])
 * ```
 */
export function useEventBusState() {
  // This would be implemented with React hooks
  // For now, provide the core functionality
  const eventBus = getEventBus()
  
  return {
    subscribe: eventBus.subscribe.bind(eventBus),
    publish: eventBus.publish.bind(eventBus),
    publishEvent: eventBus.publishEvent.bind(eventBus),
    publishEntity: eventBus.publishEntity.bind(eventBus),
    publishObservation: eventBus.publishObservation.bind(eventBus),
    getRecentMessages: eventBus.getRecentMessages.bind(eventBus),
  }
}

export { HybridEventBus, InMemoryEventBus }
