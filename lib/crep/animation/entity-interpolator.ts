/**
 * Entity Position Interpolator — Smooth movement for planes, boats, satellites
 *
 * Stores previous + current positions per entity and interpolates between
 * them on each animation frame so entities glide smoothly instead of teleporting
 * between API update intervals.
 *
 * Usage:
 *   const interpolator = new EntityInterpolator()
 *   // On API update:
 *   interpolator.update("aircraft-ABC123", { lat: 40.1, lng: -74.2, heading: 90 })
 *   // On each frame:
 *   const pos = interpolator.getPosition("aircraft-ABC123", Date.now())
 *   // pos = { lat: 40.05, lng: -74.15, heading: 88 } (interpolated)
 */

export interface EntityPosition {
  lat: number
  lng: number
  heading?: number
  altitude?: number
  speed?: number
}

interface TrackedEntity {
  prev: EntityPosition
  curr: EntityPosition
  prevTs: number
  currTs: number
}

export class EntityInterpolator {
  private entities = new Map<string, TrackedEntity>()
  private maxAgeMs: number

  /**
   * @param maxAgeMs — Maximum age before position is considered stale and
   *                    interpolation stops (entity freezes at last known position).
   *                    Default: 60000 (60 seconds)
   */
  constructor(maxAgeMs = 60000) {
    this.maxAgeMs = maxAgeMs
  }

  /**
   * Record a new position for an entity (called on each API update).
   * Previous position is preserved for interpolation.
   */
  update(id: string, position: EntityPosition, timestamp?: number): void {
    const now = timestamp ?? Date.now()
    const existing = this.entities.get(id)

    if (existing) {
      // Shift current → previous, new → current
      this.entities.set(id, {
        prev: existing.curr,
        curr: position,
        prevTs: existing.currTs,
        currTs: now,
      })
    } else {
      // First observation — no interpolation yet
      this.entities.set(id, {
        prev: position,
        curr: position,
        prevTs: now,
        currTs: now,
      })
    }
  }

  /**
   * Batch update multiple entities at once.
   */
  updateBatch(
    entities: { id: string; position: EntityPosition }[],
    timestamp?: number
  ): void {
    const now = timestamp ?? Date.now()
    for (const { id, position } of entities) {
      this.update(id, position, now)
    }
  }

  /**
   * Get interpolated position for an entity at the given time.
   * Returns null if entity is not tracked or data is too stale.
   */
  getPosition(id: string, atTime?: number): EntityPosition | null {
    const entity = this.entities.get(id)
    if (!entity) return null

    const now = atTime ?? Date.now()
    const age = now - entity.currTs

    // If data is too old, return last known position without extrapolation
    if (age > this.maxAgeMs) {
      return entity.curr
    }

    // If prev and curr are the same timestamp, no interpolation possible
    const interval = entity.currTs - entity.prevTs
    if (interval <= 0) {
      return entity.curr
    }

    // Calculate interpolation factor
    // t=0 at currTs, t=1 at currTs + interval (extrapolation into the future)
    const t = Math.min(age / interval, 2.0) // Cap at 2x extrapolation

    // Linear interpolation / extrapolation
    return {
      lat: entity.curr.lat + (entity.curr.lat - entity.prev.lat) * t,
      lng: entity.curr.lng + (entity.curr.lng - entity.prev.lng) * t,
      heading: entity.curr.heading !== undefined && entity.prev.heading !== undefined
        ? lerpAngle(entity.prev.heading, entity.curr.heading, 1 + t)
        : entity.curr.heading,
      altitude: entity.curr.altitude !== undefined && entity.prev.altitude !== undefined
        ? lerp(entity.prev.altitude, entity.curr.altitude, 1 + t)
        : entity.curr.altitude,
      speed: entity.curr.speed,
    }
  }

  /**
   * Get all tracked entity positions at a given time.
   * Returns Map<id, interpolatedPosition>.
   */
  getAllPositions(atTime?: number): Map<string, EntityPosition> {
    const result = new Map<string, EntityPosition>()
    const now = atTime ?? Date.now()

    for (const [id] of this.entities) {
      const pos = this.getPosition(id, now)
      if (pos) result.set(id, pos)
    }

    return result
  }

  /**
   * Remove an entity from tracking.
   */
  remove(id: string): void {
    this.entities.delete(id)
  }

  /**
   * Remove all entities that haven't been updated since `olderThan` ms ago.
   */
  prune(olderThan?: number): number {
    const cutoff = Date.now() - (olderThan ?? this.maxAgeMs * 2)
    let pruned = 0
    for (const [id, entity] of this.entities) {
      if (entity.currTs < cutoff) {
        this.entities.delete(id)
        pruned++
      }
    }
    return pruned
  }

  /** Number of tracked entities */
  get size(): number {
    return this.entities.size
  }
}

// ─── Math helpers ─────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Interpolate angles handling the 360°/0° wrap-around */
function lerpAngle(a: number, b: number, t: number): number {
  let delta = ((b - a + 540) % 360) - 180
  return ((a + delta * t) % 360 + 360) % 360
}
