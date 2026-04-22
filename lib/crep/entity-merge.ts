/**
 * Entity Merge — Apr 22, 2026
 *
 * Morgan (CREP rendering fidelity): "im working on a device sdr to get our
 * own data for that for now that needs to be suplamented with a full
 * satelite vessle/boat and plane registry".
 *
 * The entity pump was calling setAircraft(() => data.aircraft) on every
 * poll, which *replaced* the entire state. If one fetch returned 1 897
 * aircraft and the next returned 1 600 (normal churn), 297 planes
 * vanished from the map even though they were still flying.
 *
 * mergeById() keeps a union of everything we've ever received this
 * session, refreshed by id, stamped with lastSeen, and aged out after
 * a per-entity-type TTL so zombie positions don't linger indefinitely.
 */

export interface MergedEntity {
  id: string
  lastSeen: number
  [key: string]: any
}

/**
 * Merge incoming entities into the previous set by id.
 *
 * - Any entity in `incoming` overwrites the matching entry in `prev`
 *   (latest position wins).
 * - Entities in `prev` but not in `incoming` are *kept*, unless their
 *   lastSeen timestamp is older than `ttlMs`.
 * - Returns a new array so React state updates cleanly.
 *
 * idKey can be a string (field name) or a function (derive from entity).
 */
export function mergeById<T extends Record<string, any>>(
  prev: T[],
  incoming: T[],
  opts: {
    idKey: string | ((e: T) => string | undefined | null)
    ttlMs: number
    now?: number
    /**
     * Apr 22, 2026 — Morgan: "controls locking out after time". Unbounded
     * merge let the entity array grow for hours until React re-renders
     * choked the main thread. Hard cap per type (default 20 000) — when
     * the merged set exceeds it we drop the oldest lastSeen entries.
     * Set `Infinity` to disable.
     */
    maxEntries?: number
  },
): T[] {
  const now = opts.now ?? Date.now()
  // Apr 22, 2026 v2 — Morgan: "entire crep is locked". Previous 20 000
  // default was still too high. Probed heap at 1.3 GB / 4 GB with 20k
  // vessels in window.__crep_vessels — every pump created a fresh 20k
  // array which React diffed against the previous, MapLibre re-uploaded
  // 20k circle features to GPU, main thread pinned for seconds. Dropped
  // default to 6 000 so pump cycles stay fluid; callers override per type.
  const maxEntries = opts.maxEntries ?? 6_000
  const getId: (e: T) => string | undefined | null =
    typeof opts.idKey === "function"
      ? opts.idKey
      : (e: T) => (e as any)[opts.idKey as string]

  const byId = new Map<string, T & { lastSeen: number }>()

  // Keep previous entries that aren't expired
  for (const e of prev) {
    const id = getId(e)
    if (!id) continue
    const prevSeen = (e as any).lastSeen as number | undefined
    if (prevSeen && now - prevSeen > opts.ttlMs) continue
    byId.set(String(id), {
      ...e,
      lastSeen: prevSeen ?? now,
    })
  }

  // Overwrite with fresh positions
  for (const e of incoming) {
    const id = getId(e)
    if (!id) continue
    byId.set(String(id), {
      ...e,
      lastSeen: now,
    })
  }

  // Cap size — keep the N most-recently-seen entries, drop older ones.
  if (Number.isFinite(maxEntries) && byId.size > maxEntries) {
    const sorted = Array.from(byId.values()).sort((a, b) => b.lastSeen - a.lastSeen)
    return sorted.slice(0, maxEntries)
  }

  return Array.from(byId.values())
}

/**
 * Per-entity-type default TTLs. Tuned so that:
 *  - short-lived aircraft disappearances (callsign handoff, altitude-
 *    below-ADS-B floor) don't drop them from the map,
 *  - but genuinely-gone aircraft (landed, out-of-range) fade within
 *    one visual session.
 */
export const ENTITY_TTL_MS = {
  aircraft: 15 * 60 * 1000,  // 15 min
  vessel: 90 * 60 * 1000,    // 90 min — AIS towers have bigger gaps
  satellite: 60 * 60 * 1000, // 60 min — SGP4 should always be fresh, but cap
} as const
