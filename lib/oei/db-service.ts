/**
 * NatureOS OEI Database Service
 * 
 * Provides CRUD operations for OEI entities, observations, and events
 * using Drizzle ORM with PostgreSQL.
 */

import { db } from "@/lib/db"
import { 
  entities, 
  observations, 
  events, 
  type Entity, 
  type NewEntity,
  type Observation,
  type NewObservation,
  type Event,
  type NewEvent,
} from "@/schema/oei"
import { eq, and, gte, lte, desc, asc, sql, inArray } from "drizzle-orm"
import type { 
  Entity as OEIEntity, 
  Observation as OEIObservation, 
  Event as OEIEvent,
  GeoBounds,
} from "@/types/oei"

// =============================================================================
// ENTITY OPERATIONS
// =============================================================================

export class EntityService {
  /**
   * Create or update an entity (upsert based on source + sourceId)
   */
  async upsert(entity: OEIEntity): Promise<Entity> {
    const existing = await this.findBySourceId(entity.provenance?.source || "unknown", entity.id)
    
    const data: NewEntity = {
      type: entity.type,
      name: entity.name,
      description: entity.description,
      sourceId: entity.id,
      source: entity.provenance?.source,
      location: entity.location as Record<string, unknown>,
      lastSeenAt: entity.lastSeenAt ? new Date(entity.lastSeenAt) : new Date(),
      status: entity.status || "active",
      properties: entity.properties as Record<string, unknown>,
      tags: entity.tags as string[],
      provenance: entity.provenance as Record<string, unknown>,
      updatedAt: new Date(),
    }

    if (existing) {
      const [updated] = await db
        .update(entities)
        .set(data)
        .where(eq(entities.id, existing.id))
        .returning()
      return updated
    } else {
      const [created] = await db
        .insert(entities)
        .values(data)
        .returning()
      return created
    }
  }

  /**
   * Find entity by source and source ID
   */
  async findBySourceId(source: string, sourceId: string): Promise<Entity | null> {
    const [result] = await db
      .select()
      .from(entities)
      .where(and(
        eq(entities.source, source),
        eq(entities.sourceId, sourceId)
      ))
      .limit(1)
    return result || null
  }

  /**
   * Find entities by type
   */
  async findByType(type: string, limit = 100): Promise<Entity[]> {
    return db
      .select()
      .from(entities)
      .where(eq(entities.type, type))
      .orderBy(desc(entities.lastSeenAt))
      .limit(limit)
  }

  /**
   * Find entities in bounding box
   */
  async findInBounds(bounds: GeoBounds, options?: { type?: string; limit?: number }): Promise<Entity[]> {
    // Note: This is a simplified query. For production, use PostGIS spatial queries
    const results = await db
      .select()
      .from(entities)
      .where(
        options?.type ? eq(entities.type, options.type) : sql`true`
      )
      .orderBy(desc(entities.lastSeenAt))
      .limit(options?.limit || 100)

    // Filter by bounds in memory (should use PostGIS in production)
    return results.filter(e => {
      if (!e.location) return false
      const loc = e.location as { latitude: number; longitude: number }
      return (
        loc.latitude >= bounds.south &&
        loc.latitude <= bounds.north &&
        loc.longitude >= bounds.west &&
        loc.longitude <= bounds.east
      )
    })
  }

  /**
   * Get entity count by type
   */
  async countByType(): Promise<Record<string, number>> {
    const results = await db
      .select({
        type: entities.type,
        count: sql<number>`count(*)`,
      })
      .from(entities)
      .groupBy(entities.type)

    return results.reduce((acc, r) => {
      acc[r.type] = Number(r.count)
      return acc
    }, {} as Record<string, number>)
  }

  /**
   * Delete stale entities (not seen in X days)
   */
  async deleteStale(days: number): Promise<number> {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)

    const result = await db
      .delete(entities)
      .where(lte(entities.lastSeenAt, cutoff))
      .returning({ id: entities.id })

    return result.length
  }
}

// =============================================================================
// OBSERVATION OPERATIONS
// =============================================================================

export class ObservationService {
  /**
   * Insert a new observation
   */
  async insert(observation: OEIObservation): Promise<Observation> {
    const data: NewObservation = {
      type: observation.type,
      entityId: observation.entityId ? observation.entityId as `${string}-${string}-${string}-${string}-${string}` : null,
      location: observation.location as Record<string, unknown>,
      observedAt: new Date(observation.observedAt),
      receivedAt: new Date(observation.receivedAt || new Date()),
      value: observation.value?.toString(),
      unit: observation.unit,
      values: observation.values as Record<string, unknown>,
      quality: observation.quality?.toString(),
      isValid: true,
      source: observation.source,
      sourceId: observation.sourceId,
      provenance: observation.provenance as Record<string, unknown>,
    }

    const [created] = await db
      .insert(observations)
      .values(data)
      .returning()
    return created
  }

  /**
   * Insert multiple observations (batch)
   */
  async insertBatch(observationList: OEIObservation[]): Promise<number> {
    if (observationList.length === 0) return 0

    const data: NewObservation[] = observationList.map(o => ({
      type: o.type,
      entityId: o.entityId ? o.entityId as `${string}-${string}-${string}-${string}-${string}` : null,
      location: o.location as Record<string, unknown>,
      observedAt: new Date(o.observedAt),
      receivedAt: new Date(o.receivedAt || new Date()),
      value: o.value?.toString(),
      unit: o.unit,
      values: o.values as Record<string, unknown>,
      quality: o.quality?.toString(),
      isValid: true,
      source: o.source,
      sourceId: o.sourceId,
      provenance: o.provenance as Record<string, unknown>,
    }))

    const result = await db
      .insert(observations)
      .values(data)
      .returning({ id: observations.id })

    return result.length
  }

  /**
   * Query observations by time range
   */
  async queryByTimeRange(
    startTime: Date,
    endTime: Date,
    options?: { type?: string; entityId?: string; limit?: number }
  ): Promise<Observation[]> {
    return db
      .select()
      .from(observations)
      .where(and(
        gte(observations.observedAt, startTime),
        lte(observations.observedAt, endTime),
        options?.type ? eq(observations.type, options.type) : sql`true`,
        options?.entityId ? eq(observations.entityId, options.entityId as `${string}-${string}-${string}-${string}-${string}`) : sql`true`
      ))
      .orderBy(desc(observations.observedAt))
      .limit(options?.limit || 1000)
  }

  /**
   * Get latest observation for an entity
   */
  async getLatest(entityId: string, type?: string): Promise<Observation | null> {
    const [result] = await db
      .select()
      .from(observations)
      .where(and(
        eq(observations.entityId, entityId as `${string}-${string}-${string}-${string}-${string}`),
        type ? eq(observations.type, type) : sql`true`
      ))
      .orderBy(desc(observations.observedAt))
      .limit(1)
    return result || null
  }

  /**
   * Get observation statistics
   */
  async getStats(entityId: string, type: string, hours = 24): Promise<{
    count: number
    avg: number
    min: number
    max: number
  }> {
    const since = new Date()
    since.setHours(since.getHours() - hours)

    const [result] = await db
      .select({
        count: sql<number>`count(*)`,
        avg: sql<number>`avg(value::numeric)`,
        min: sql<number>`min(value::numeric)`,
        max: sql<number>`max(value::numeric)`,
      })
      .from(observations)
      .where(and(
        eq(observations.entityId, entityId as `${string}-${string}-${string}-${string}-${string}`),
        eq(observations.type, type),
        gte(observations.observedAt, since)
      ))

    return {
      count: Number(result?.count || 0),
      avg: Number(result?.avg || 0),
      min: Number(result?.min || 0),
      max: Number(result?.max || 0),
    }
  }
}

// =============================================================================
// EVENT OPERATIONS
// =============================================================================

export class EventService {
  /**
   * Create or update an event
   */
  async upsert(event: OEIEvent): Promise<Event> {
    const existing = event.id ? await this.findBySourceId(
      event.provenance?.source || "unknown",
      event.id
    ) : null

    const data: NewEvent = {
      type: event.type,
      severity: event.severity,
      title: event.title,
      description: event.description,
      details: event.details as Record<string, unknown>,
      location: event.location as Record<string, unknown>,
      affectedArea: event.affectedArea as Record<string, unknown>,
      occurredAt: new Date(event.occurredAt),
      detectedAt: new Date(event.detectedAt),
      expiresAt: event.expiresAt ? new Date(event.expiresAt) : null,
      status: event.status || "active",
      actions: event.actions as Record<string, unknown>[],
      source: event.provenance?.source,
      sourceId: event.id,
      provenance: event.provenance as Record<string, unknown>,
    }

    if (existing) {
      const [updated] = await db
        .update(events)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(events.id, existing.id))
        .returning()
      return updated
    } else {
      const [created] = await db
        .insert(events)
        .values(data)
        .returning()
      return created
    }
  }

  /**
   * Find event by source ID
   */
  async findBySourceId(source: string, sourceId: string): Promise<Event | null> {
    const [result] = await db
      .select()
      .from(events)
      .where(and(
        eq(events.source, source),
        eq(events.sourceId, sourceId)
      ))
      .limit(1)
    return result || null
  }

  /**
   * Get active events
   */
  async getActive(options?: { 
    type?: string
    minSeverity?: string
    limit?: number 
  }): Promise<Event[]> {
    const severityOrder = ["info", "low", "medium", "high", "critical"]
    const minSeverityIndex = options?.minSeverity 
      ? severityOrder.indexOf(options.minSeverity) 
      : 0

    const activeSeverities = severityOrder.slice(minSeverityIndex)

    return db
      .select()
      .from(events)
      .where(and(
        eq(events.status, "active"),
        options?.type ? eq(events.type, options.type) : sql`true`,
        options?.minSeverity ? inArray(events.severity, activeSeverities) : sql`true`
      ))
      .orderBy(desc(events.occurredAt))
      .limit(options?.limit || 100)
  }

  /**
   * Acknowledge an event
   */
  async acknowledge(eventId: string, userId: string): Promise<Event | null> {
    const [updated] = await db
      .update(events)
      .set({
        acknowledged: true,
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
      })
      .where(eq(events.id, eventId as `${string}-${string}-${string}-${string}-${string}`))
      .returning()
    return updated || null
  }

  /**
   * Resolve an event
   */
  async resolve(eventId: string): Promise<Event | null> {
    const [updated] = await db
      .update(events)
      .set({
        status: "resolved",
        resolvedAt: new Date(),
      })
      .where(eq(events.id, eventId as `${string}-${string}-${string}-${string}-${string}`))
      .returning()
    return updated || null
  }

  /**
   * Expire old events
   */
  async expireOld(): Promise<number> {
    const result = await db
      .update(events)
      .set({ status: "expired" })
      .where(and(
        eq(events.status, "active"),
        lte(events.expiresAt, new Date())
      ))
      .returning({ id: events.id })

    return result.length
  }

  /**
   * Get event summary counts
   */
  async getSummary(): Promise<{
    total: number
    active: number
    bySeverity: Record<string, number>
    byType: Record<string, number>
  }> {
    const [total] = await db.select({ count: sql<number>`count(*)` }).from(events)
    const [active] = await db
      .select({ count: sql<number>`count(*)` })
      .from(events)
      .where(eq(events.status, "active"))

    const bySeverity = await db
      .select({
        severity: events.severity,
        count: sql<number>`count(*)`,
      })
      .from(events)
      .where(eq(events.status, "active"))
      .groupBy(events.severity)

    const byType = await db
      .select({
        type: events.type,
        count: sql<number>`count(*)`,
      })
      .from(events)
      .where(eq(events.status, "active"))
      .groupBy(events.type)

    return {
      total: Number(total?.count || 0),
      active: Number(active?.count || 0),
      bySeverity: bySeverity.reduce((acc, r) => {
        acc[r.severity] = Number(r.count)
        return acc
      }, {} as Record<string, number>),
      byType: byType.reduce((acc, r) => {
        acc[r.type] = Number(r.count)
        return acc
      }, {} as Record<string, number>),
    }
  }
}

// =============================================================================
// SINGLETON INSTANCES
// =============================================================================

let entityService: EntityService | null = null
let observationService: ObservationService | null = null
let eventService: EventService | null = null

export function getEntityService(): EntityService {
  if (!entityService) entityService = new EntityService()
  return entityService
}

export function getObservationService(): ObservationService {
  if (!observationService) observationService = new ObservationService()
  return observationService
}

export function getEventService(): EventService {
  if (!eventService) eventService = new EventService()
  return eventService
}
