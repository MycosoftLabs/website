/**
 * CREP Level-of-Detail (LOD) Policy
 *
 * Morgan's vision (Apr 18, 2026):
 *   "zoom out shows newest first less assets to show as zoom in happens
 *    less in viewport to show globally but more historical assets like
 *    nature data as zoom in happens"
 *
 * Implementation: zoom tier drives BOTH a time-window contract AND a
 * render budget. Zoom out = narrow time window (only recent), fewer
 * total markers, higher severity threshold. Zoom in = wide time window
 * (more history), larger bbox-limited render budget, lower severity
 * threshold. The viewport tightens as the time window widens, so you
 * get dense history in a small area at high zoom rather than sparse
 * recent points globally.
 *
 * LIVE movers (aircraft, vessels, satellites) are always "now" — only
 * their count scales. NATURE observations invert the normal rule:
 * research-grade only at low zoom, all historical at high zoom.
 */

export type LODTier = "globe" | "continent" | "region" | "state" | "city" | "street"

export interface LODPolicy {
  /** Display tier name for UI + debug */
  tier: LODTier

  /** Zoom range [min, max) that this tier covers */
  zoomRange: [number, number]

  /** ─── EVENT-TYPE DATA (wildfires, earthquakes, storms, alerts) ─── */
  events: {
    /** Only events with timestamp > now - window are eligible. e.g. "6h", "24h", "7d", "30d", "1y", "all" */
    timeWindow: TimeWindow
    /** Minimum severity visible. Lower tiers show more. */
    minSeverity: "extreme" | "critical" | "high" | "medium" | "low" | "info"
    /** Hard cap on markers rendered at this tier. Upstream data never capped. */
    maxRendered: number
  }

  /** ─── LIVE MOVERS (always "now", count scales with zoom) ─── */
  movers: {
    aircraft: number
    vessels: number
    satellites: number
    /** If true, apply viewport bbox filter before capping. */
    bboxFilter: boolean
  }

  /** ─── STATIC INFRASTRUCTURE ─── */
  infra: {
    /** Show MINDEX-sourced viewport-scoped infra at this tier? */
    mindexEnabled: boolean
    /** Show bundled static GeoJSONs (cables, ports, DCs, US grid) at this tier? */
    bundledEnabled: boolean
    /** Max features rendered per layer. */
    maxPerLayer: number
  }

  /** ─── NATURE OBSERVATIONS (inverted — more history at higher zoom) ─── */
  nature: {
    timeWindow: TimeWindow
    /** Only research-grade observations, or all? */
    qualityGrade: "research" | "all"
    maxRendered: number
  }
}

export type TimeWindow = "6h" | "24h" | "7d" | "30d" | "6m" | "1y" | "5y" | "all"

/**
 * Convert a TimeWindow to a millisecond cutoff. "all" returns null (no filter).
 */
export function timeWindowToCutoffMs(w: TimeWindow): number | null {
  const now = Date.now()
  switch (w) {
    case "6h": return now - 6 * 3600_000
    case "24h": return now - 24 * 3600_000
    case "7d": return now - 7 * 86400_000
    case "30d": return now - 30 * 86400_000
    case "6m": return now - 180 * 86400_000
    case "1y": return now - 365 * 86400_000
    case "5y": return now - 5 * 365 * 86400_000
    case "all": return null
  }
}

/**
 * The LOD ladder. Lookup by zoom → return the tier whose range includes it.
 */
export const LOD_TIERS: LODPolicy[] = [
  // ─── Globe view: newest, high-signal only ───────────────────────────
  {
    tier: "globe",
    zoomRange: [0, 3],
    events: { timeWindow: "6h", minSeverity: "high", maxRendered: 500 },
    movers: { aircraft: 300, vessels: 100, satellites: 500, bboxFilter: false },
    infra: { mindexEnabled: false, bundledEnabled: true, maxPerLayer: 2000 },
    nature: { timeWindow: "7d", qualityGrade: "research", maxRendered: 300 },
  },
  // ─── Continent view: last day, medium+ severity ─────────────────────
  {
    tier: "continent",
    zoomRange: [3, 5],
    events: { timeWindow: "24h", minSeverity: "medium", maxRendered: 1500 },
    movers: { aircraft: 1000, vessels: 500, satellites: 2000, bboxFilter: true },
    infra: { mindexEnabled: false, bundledEnabled: true, maxPerLayer: 5000 },
    nature: { timeWindow: "30d", qualityGrade: "research", maxRendered: 1000 },
  },
  // ─── Region view: last week, low severity, MINDEX kicks in ──────────
  {
    tier: "region",
    zoomRange: [5, 7],
    events: { timeWindow: "7d", minSeverity: "low", maxRendered: 3000 },
    movers: { aircraft: 3000, vessels: 2000, satellites: 5000, bboxFilter: true },
    infra: { mindexEnabled: true, bundledEnabled: true, maxPerLayer: 15000 },
    nature: { timeWindow: "1y", qualityGrade: "research", maxRendered: 3000 },
  },
  // ─── State/metro view: last month, all severity, full infra ────────
  {
    tier: "state",
    zoomRange: [7, 10],
    events: { timeWindow: "30d", minSeverity: "info", maxRendered: 6000 },
    movers: { aircraft: 8000, vessels: 5000, satellites: 15000, bboxFilter: true },
    infra: { mindexEnabled: true, bundledEnabled: true, maxPerLayer: 30000 },
    nature: { timeWindow: "5y", qualityGrade: "all", maxRendered: 8000 },
  },
  // ─── City view: last 6 months, historical nature kicks in ──────────
  {
    tier: "city",
    zoomRange: [10, 13],
    events: { timeWindow: "6m", minSeverity: "info", maxRendered: 10000 },
    movers: { aircraft: 15000, vessels: 10000, satellites: 20000, bboxFilter: true },
    infra: { mindexEnabled: true, bundledEnabled: true, maxPerLayer: 60000 },
    nature: { timeWindow: "all", qualityGrade: "all", maxRendered: 20000 },
  },
  // ─── Street view: everything in bbox, uncapped ─────────────────────
  {
    tier: "street",
    zoomRange: [13, 25],
    events: { timeWindow: "all", minSeverity: "info", maxRendered: 50000 },
    movers: { aircraft: 50000, vessels: 50000, satellites: 50000, bboxFilter: true },
    infra: { mindexEnabled: true, bundledEnabled: true, maxPerLayer: Infinity },
    nature: { timeWindow: "all", qualityGrade: "all", maxRendered: 100000 },
  },
]

/**
 * Pick the LOD tier for a given zoom level.
 */
export function getLODForZoom(zoom: number): LODPolicy {
  for (const tier of LOD_TIERS) {
    if (zoom >= tier.zoomRange[0] && zoom < tier.zoomRange[1]) return tier
  }
  // Zoom > 25 or < 0 — use the edge tier
  return zoom >= 25 ? LOD_TIERS[LOD_TIERS.length - 1] : LOD_TIERS[0]
}

/**
 * Severity rank (higher = more severe). Used for minSeverity comparison.
 */
const SEVERITY_RANK: Record<string, number> = {
  extreme: 5,
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
}

/**
 * Test if an event's severity meets the tier's minimum.
 */
export function meetsSeverityFilter(
  eventSeverity: string | undefined,
  minSeverity: LODPolicy["events"]["minSeverity"],
): boolean {
  const eventRank = SEVERITY_RANK[eventSeverity || "info"] ?? 0
  const minRank = SEVERITY_RANK[minSeverity] ?? 0
  return eventRank >= minRank
}

/**
 * Filter + cap events for the given LOD tier.
 * Caller should pass the bbox-filtered candidate set.
 */
export function applyLODToEvents<T extends { timestamp?: string | number; severity?: string }>(
  events: T[],
  zoom: number,
): T[] {
  const lod = getLODForZoom(zoom)
  const cutoff = timeWindowToCutoffMs(lod.events.timeWindow)
  let filtered: T[] = events
  if (cutoff !== null) {
    filtered = filtered.filter((e) => {
      const t = typeof e.timestamp === "string" ? new Date(e.timestamp).getTime() : (e.timestamp || 0)
      return t >= cutoff
    })
  }
  if (lod.events.minSeverity !== "info") {
    filtered = filtered.filter((e) => meetsSeverityFilter(e.severity, lod.events.minSeverity))
  }
  // Sort by severity desc, then timestamp desc, then take the top maxRendered
  filtered.sort((a, b) => {
    const sa = SEVERITY_RANK[a.severity || "info"] ?? 0
    const sb = SEVERITY_RANK[b.severity || "info"] ?? 0
    if (sa !== sb) return sb - sa
    const ta = typeof a.timestamp === "string" ? new Date(a.timestamp).getTime() : (a.timestamp || 0)
    const tb = typeof b.timestamp === "string" ? new Date(b.timestamp).getTime() : (b.timestamp || 0)
    return tb - ta
  })
  return filtered.slice(0, lod.events.maxRendered)
}

/**
 * Filter + cap nature observations. Inverse rule: at low zoom, only
 * research-grade + recent; at high zoom, all history.
 */
export function applyLODToNature<T extends { observed_on?: string | null; quality_grade?: string | null }>(
  observations: T[],
  zoom: number,
): T[] {
  const lod = getLODForZoom(zoom)
  const cutoff = timeWindowToCutoffMs(lod.nature.timeWindow)
  let filtered: T[] = observations
  if (lod.nature.qualityGrade === "research") {
    filtered = filtered.filter((o) => o.quality_grade === "research")
  }
  if (cutoff !== null) {
    filtered = filtered.filter((o) => {
      if (!o.observed_on) return false
      return new Date(o.observed_on).getTime() >= cutoff
    })
  }
  return filtered.slice(0, lod.nature.maxRendered)
}

/**
 * Cap live mover arrays at the zoom's budget.
 */
export function applyLODToMovers<T>(
  items: T[],
  kind: "aircraft" | "vessels" | "satellites",
  zoom: number,
): T[] {
  const lod = getLODForZoom(zoom)
  return items.slice(0, lod.movers[kind])
}

/**
 * Expanded bbox for source-level culling. 2× viewport bbox gives a
 * generous halo so panning doesn't re-fetch immediately.
 */
export function expandedBbox(bbox: { north: number; south: number; east: number; west: number }) {
  const latSpan = bbox.north - bbox.south
  const lngSpan = bbox.east - bbox.west
  return {
    north: Math.min(90, bbox.north + latSpan / 2),
    south: Math.max(-90, bbox.south - latSpan / 2),
    east: bbox.east + lngSpan / 2,
    west: bbox.west - lngSpan / 2,
  }
}

/**
 * Live-event freshness tracking — Apr 19, 2026.
 *
 * Morgan: "make sure all event data is dynamic showing up live on map
 * as it shows up animated live earthquakes and fires and lightning as
 * they happen without map reload".
 *
 * Current state: batchFetch polls every 30 s and REPLACES the source.
 * New events don't animate in — they just suddenly exist on next poll.
 *
 * This utility computes a per-id freshness map from two consecutive
 * event arrays. Caller applies the result via map.setFeatureState so
 * MapLibre paint expressions can reference ["feature-state", "fresh"]
 * to animate newly-arrived events (pulse radius/opacity for 6-10 s).
 *
 * Usage (sketch, in CREPDashboardClient):
 *
 *   const prevIdsRef = useRef<Set<string>>(new Set())
 *   const freshTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
 *   const onEventsRefresh = (events: Array<{id: string}>) => {
 *     const delta = diffFreshness(prevIdsRef.current, events)
 *     for (const id of delta.newIds) {
 *       map.setFeatureState({ source: "crep-earthquakes", id }, { fresh: true })
 *       // clear after N ms
 *       const t = setTimeout(() => {
 *         map.setFeatureState({ source: "crep-earthquakes", id }, { fresh: false })
 *         freshTimersRef.current.delete(id)
 *       }, FRESH_DURATION_MS)
 *       freshTimersRef.current.set(id, t)
 *     }
 *     prevIdsRef.current = delta.nextSeenIds
 *   }
 */
export const FRESH_DURATION_MS = 8_000 // paint ripple window

export function diffFreshness<T extends { id?: string | number }>(
  prevSeenIds: Set<string | number>,
  nextEvents: T[],
): {
  newIds: (string | number)[]
  nextSeenIds: Set<string | number>
} {
  const nextSeenIds = new Set<string | number>()
  const newIds: (string | number)[] = []
  for (const e of nextEvents) {
    if (e.id == null) continue
    nextSeenIds.add(e.id)
    if (!prevSeenIds.has(e.id)) newIds.push(e.id)
  }
  return { newIds, nextSeenIds }
}

/**
 * Paint expression snippets for freshness-aware styling. Paste into a
 * layer's paint object to make new events pulse larger + brighter.
 *
 * Example (earthquakes circle layer):
 *   paint: {
 *     "circle-radius": freshnessRadiusExpr(baseRadiusExpr, 2.2),
 *     "circle-opacity": freshnessOpacityExpr(0.85),
 *   }
 */
export const freshnessRadiusExpr = (baseRadius: any, multiplier = 2.0) => [
  "case",
  ["boolean", ["feature-state", "fresh"], false],
  ["*", baseRadius, multiplier],
  baseRadius,
]

export const freshnessOpacityExpr = (baseOpacity = 0.85) => [
  "case",
  ["boolean", ["feature-state", "fresh"], false],
  1.0,
  baseOpacity,
]

/**
 * Apply bbox culling to any {lat, lng}-bearing records.
 */
export function cullByBbox<T extends { lat?: number | null; lng?: number | null }>(
  items: T[],
  bbox: { north: number; south: number; east: number; west: number },
): T[] {
  return items.filter((it) => {
    if (typeof it.lat !== "number" || typeof it.lng !== "number") return false
    if (it.lat < bbox.south || it.lat > bbox.north) return false
    // Handle antimeridian wrap
    if (bbox.west <= bbox.east) {
      return it.lng >= bbox.west && it.lng <= bbox.east
    } else {
      return it.lng >= bbox.west || it.lng <= bbox.east
    }
  })
}
