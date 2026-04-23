/**
 * MYCA Entity Feed Bus — Apr 22, 2026
 *
 * Process-local publish/subscribe for verified entities so the
 * /api/myca/waypoint-verify handler can push onto the stream that
 * /api/myca/entity-feed (SSE) exposes to CREP dashboards.
 *
 * Not cross-process — in a multi-node deployment this would need a
 * Redis channel or MINDEX webhook. For our single-container Docker
 * deploy on VM 187, globalThis singleton is correct.
 */

type EntityListener = (entity: any) => void

interface Bus {
  listeners: Set<EntityListener>
}

const GLOBAL_KEY = "__myca_entity_feed_bus__"

function getBus(): Bus {
  const g = globalThis as any
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = { listeners: new Set<EntityListener>() } as Bus
  }
  return g[GLOBAL_KEY] as Bus
}

export function publishEntity(entity: any): void {
  const bus = getBus()
  for (const l of bus.listeners) {
    try { l(entity) } catch { /* ignore listener error */ }
  }
}

export function subscribe(listener: EntityListener): () => void {
  const bus = getBus()
  bus.listeners.add(listener)
  return () => { bus.listeners.delete(listener) }
}

export function subscriberCount(): number {
  return getBus().listeners.size
}
