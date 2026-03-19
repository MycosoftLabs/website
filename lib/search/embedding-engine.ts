/**
 * Embedding Atlas Engine - Mar 2026
 *
 * Core engine that bridges CREP/Search data with embedding-atlas visualization.
 *
 * Features:
 * - Converts CREP entities and search results into embedding-space points
 * - Locality-Sensitive Hashing (LSH) for fast approximate nearest-neighbor search
 * - Delta compression for efficient data transfer
 * - Streaming ingestion with progressive rendering
 * - Category-aware clustering (entity types map to categories)
 * - Spatial hashing for geo-aware embedding layout
 */

import type {
  UnifiedSearchResults,
  ResultBucketKey,
} from "./unified-search-sdk"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single point in the embedding space. */
export interface EmbeddingPoint {
  id: string
  x: number
  y: number
  category: number
  label: string
  description: string
  type: ResultBucketKey | "crep"
  /** Original latitude/longitude for geo-linked points */
  lat?: number
  lng?: number
  /** Additional metadata passed through to tooltips */
  metadata: Record<string, unknown>
  /** Relevance/confidence score 0-1 */
  score: number
  /** Unix timestamp for temporal filtering */
  timestamp: number
}

/** Compressed embedding batch for wire transfer. */
export interface EmbeddingBatch {
  /** Base-64 encoded Float32Array (x,y interleaved) */
  coordinates: string
  /** Base-64 encoded Uint8Array categories */
  categories: string
  /** JSON metadata per point */
  points: Array<{
    id: string
    label: string
    description: string
    type: string
    score: number
    lat?: number
    lng?: number
    timestamp: number
  }>
  totalCount: number
  compressionRatio: number
}

/** Category mapping: entity type → numeric category index + color */
export const CATEGORY_MAP: Record<string, { index: number; color: string; label: string }> = {
  species:        { index: 0,  color: "#22c55e", label: "Species" },
  compounds:      { index: 1,  color: "#a855f7", label: "Compounds" },
  genetics:       { index: 2,  color: "#3b82f6", label: "Genetics" },
  research:       { index: 3,  color: "#f59e0b", label: "Research" },
  events:         { index: 4,  color: "#ef4444", label: "Events" },
  aircraft:       { index: 5,  color: "#06b6d4", label: "Aircraft" },
  vessels:        { index: 6,  color: "#0ea5e9", label: "Vessels" },
  satellites:     { index: 7,  color: "#8b5cf6", label: "Satellites" },
  weather:        { index: 8,  color: "#64748b", label: "Weather" },
  emissions:      { index: 9,  color: "#f97316", label: "Emissions" },
  infrastructure: { index: 10, color: "#78716c", label: "Infrastructure" },
  devices:        { index: 11, color: "#14b8a6", label: "Devices" },
  space_weather:  { index: 12, color: "#e879f9", label: "Space Weather" },
  crep:           { index: 13, color: "#06b6d4", label: "CREP" },
}

export const CATEGORY_COLORS = Object.values(CATEGORY_MAP).map((c) => c.color)
export const CATEGORY_LABELS = Object.values(CATEGORY_MAP).map((c) => c.label)

// ---------------------------------------------------------------------------
// Spatial hash for geo-aware layout
// ---------------------------------------------------------------------------

/** Simple spatial hash → deterministic x,y offset so geo-close items cluster. */
function geoToEmbedding(lat: number, lng: number, jitter = 0.02): { x: number; y: number } {
  // Normalize to 0-1 range then apply small jitter for overlap prevention
  const nx = (lng + 180) / 360
  const ny = (lat + 90) / 180
  const jx = (Math.sin(lat * 127.1 + lng * 311.7) * 0.5 + 0.5) * jitter
  const jy = (Math.sin(lat * 269.5 + lng * 183.3) * 0.5 + 0.5) * jitter
  return { x: nx + jx, y: ny + jy }
}

/** Hash a text string into a deterministic 2D position (for non-geo items). */
function textToEmbedding(text: string, category: number): { x: number; y: number } {
  let h1 = 0
  let h2 = 0
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    h1 = ((h1 << 5) - h1 + c) | 0
    h2 = ((h2 << 7) - h2 + c) | 0
  }
  // Category-based angular offset to separate clusters
  const angle = (category / 14) * Math.PI * 2
  const radius = 0.3
  const cx = 0.5 + Math.cos(angle) * radius
  const cy = 0.5 + Math.sin(angle) * radius
  // Spread within cluster
  const spread = 0.12
  const x = cx + ((h1 & 0xffff) / 0xffff - 0.5) * spread
  const y = cy + ((h2 & 0xffff) / 0xffff - 0.5) * spread
  return { x, y }
}

// ---------------------------------------------------------------------------
// Conversion: Search results → Embedding points
// ---------------------------------------------------------------------------

/** Convert unified search results into embedding points for atlas visualization. */
export function searchResultsToEmbeddings(results: UnifiedSearchResults): EmbeddingPoint[] {
  const points: EmbeddingPoint[] = []

  // Species
  for (const s of results.species) {
    const pos = textToEmbedding(s.scientificName + s.commonName, CATEGORY_MAP.species.index)
    points.push({
      id: s.id,
      x: pos.x,
      y: pos.y,
      category: CATEGORY_MAP.species.index,
      label: s.commonName || s.scientificName,
      description: `${s.scientificName} — ${s.observationCount} observations`,
      type: "species",
      metadata: { taxonomy: s.taxonomy, rank: s.rank, photos: s.photos?.length || 0 },
      score: Math.min(1, (s.observationCount || 0) / 10000),
      timestamp: Date.now(),
    })
  }

  // Compounds
  for (const c of results.compounds) {
    const pos = textToEmbedding(c.name + c.formula, CATEGORY_MAP.compounds.index)
    points.push({
      id: c.id,
      x: pos.x,
      y: pos.y,
      category: CATEGORY_MAP.compounds.index,
      label: c.name,
      description: `${c.formula} — ${c.chemicalClass}`,
      type: "compounds",
      metadata: { formula: c.formula, molecularWeight: c.molecularWeight, activity: c.biologicalActivity },
      score: 0.7,
      timestamp: Date.now(),
    })
  }

  // Genetics
  for (const g of results.genetics) {
    const pos = textToEmbedding(g.accession + g.speciesName, CATEGORY_MAP.genetics.index)
    points.push({
      id: g.id,
      x: pos.x,
      y: pos.y,
      category: CATEGORY_MAP.genetics.index,
      label: `${g.geneRegion} — ${g.speciesName}`,
      description: `Accession: ${g.accession}, ${g.sequenceLength}bp`,
      type: "genetics",
      metadata: { accession: g.accession, gcContent: g.gcContent, source: g.source },
      score: 0.6,
      timestamp: Date.now(),
    })
  }

  // Research
  for (const r of results.research) {
    const pos = textToEmbedding(r.title + r.journal, CATEGORY_MAP.research.index)
    points.push({
      id: r.id,
      x: pos.x,
      y: pos.y,
      category: CATEGORY_MAP.research.index,
      label: r.title.slice(0, 60),
      description: `${r.authors.slice(0, 2).join(", ")} — ${r.journal} (${r.year})`,
      type: "research",
      metadata: { doi: r.doi, authors: r.authors, year: r.year },
      score: 0.8,
      timestamp: Date.now(),
    })
  }

  // Events
  for (const e of results.events) {
    const pos = geoToEmbedding(e.lat, e.lng)
    points.push({
      id: e.id,
      x: pos.x,
      y: pos.y,
      category: CATEGORY_MAP.events.index,
      label: e.title,
      description: `${e.type} — ${e.severity || "unknown severity"}`,
      type: "events",
      lat: e.lat,
      lng: e.lng,
      metadata: { magnitude: e.magnitude, severity: e.severity, source: e.source },
      score: e.magnitude ? Math.min(1, e.magnitude / 10) : 0.6,
      timestamp: new Date(e.timestamp).getTime(),
    })
  }

  // Aircraft
  for (const a of results.aircraft) {
    const pos = geoToEmbedding(a.lat, a.lng)
    points.push({
      id: a.id,
      x: pos.x,
      y: pos.y,
      category: CATEGORY_MAP.aircraft.index,
      label: a.callsign || a.icao24,
      description: `${a.origin || "?"} → ${a.destination || "?"} @ ${a.altitude}ft`,
      type: "aircraft",
      lat: a.lat,
      lng: a.lng,
      metadata: { callsign: a.callsign, velocity: a.velocity, heading: a.heading },
      score: 0.5,
      timestamp: Date.now(),
    })
  }

  // Vessels
  for (const v of results.vessels) {
    const pos = geoToEmbedding(v.lat, v.lng)
    points.push({
      id: v.id,
      x: pos.x,
      y: pos.y,
      category: CATEGORY_MAP.vessels.index,
      label: v.name || v.mmsi,
      description: `${v.shipType || "Vessel"} → ${v.destination || "?"}`,
      type: "vessels",
      lat: v.lat,
      lng: v.lng,
      metadata: { mmsi: v.mmsi, speed: v.speed, heading: v.heading },
      score: 0.5,
      timestamp: Date.now(),
    })
  }

  // Satellites
  for (const s of results.satellites) {
    const pos = geoToEmbedding(s.lat, s.lng)
    points.push({
      id: s.id,
      x: pos.x,
      y: pos.y,
      category: CATEGORY_MAP.satellites.index,
      label: s.name,
      description: `NORAD ${s.noradId} — ${s.category || "active"} @ ${s.altitude}km`,
      type: "satellites",
      lat: s.lat,
      lng: s.lng,
      metadata: { noradId: s.noradId, category: s.category, altitude: s.altitude },
      score: 0.5,
      timestamp: Date.now(),
    })
  }

  // Weather
  for (const w of results.weather) {
    const pos = w.lat && w.lng ? geoToEmbedding(w.lat, w.lng) : textToEmbedding(w.title, CATEGORY_MAP.weather.index)
    points.push({
      id: w.id,
      x: pos.x,
      y: pos.y,
      category: CATEGORY_MAP.weather.index,
      label: w.title,
      description: w.description.slice(0, 100),
      type: "weather",
      lat: w.lat,
      lng: w.lng,
      metadata: { temperature: w.temperature, windSpeed: w.windSpeed, humidity: w.humidity },
      score: 0.6,
      timestamp: new Date(w.timestamp).getTime(),
    })
  }

  // Emissions
  for (const e of results.emissions) {
    const pos = geoToEmbedding(e.lat, e.lng)
    points.push({
      id: e.id,
      x: pos.x,
      y: pos.y,
      category: CATEGORY_MAP.emissions.index,
      label: e.title,
      description: `${e.type} — ${e.value || "?"} ${e.unit || ""}`,
      type: "emissions",
      lat: e.lat,
      lng: e.lng,
      metadata: { value: e.value, unit: e.unit, parameter: e.parameter },
      score: 0.6,
      timestamp: new Date(e.timestamp).getTime(),
    })
  }

  // Infrastructure
  for (const i of results.infrastructure) {
    const pos = geoToEmbedding(i.lat, i.lng)
    points.push({
      id: i.id,
      x: pos.x,
      y: pos.y,
      category: CATEGORY_MAP.infrastructure.index,
      label: i.name,
      description: `${i.type} ${i.operator ? `— ${i.operator}` : ""}`,
      type: "infrastructure",
      lat: i.lat,
      lng: i.lng,
      metadata: { type: i.type, operator: i.operator },
      score: 0.5,
      timestamp: Date.now(),
    })
  }

  // Devices
  for (const d of results.devices) {
    const pos = d.lat && d.lng ? geoToEmbedding(d.lat, d.lng) : textToEmbedding(d.name, CATEGORY_MAP.devices.index)
    points.push({
      id: d.id,
      x: pos.x,
      y: pos.y,
      category: CATEGORY_MAP.devices.index,
      label: d.name,
      description: `${d.deviceType} — ${d.status}`,
      type: "devices",
      lat: d.lat,
      lng: d.lng,
      metadata: { status: d.status, sporeCount: d.sporeCount, lastSeen: d.lastSeen },
      score: d.status === "online" ? 0.8 : 0.4,
      timestamp: new Date(d.lastSeen).getTime(),
    })
  }

  // Space weather
  for (const sw of results.space_weather) {
    const pos = textToEmbedding(sw.title + sw.type, CATEGORY_MAP.space_weather.index)
    points.push({
      id: sw.id,
      x: pos.x,
      y: pos.y,
      category: CATEGORY_MAP.space_weather.index,
      label: sw.title,
      description: `${sw.type} — ${sw.severity || "moderate"}`,
      type: "space_weather",
      metadata: { kpIndex: sw.kpIndex, xrayFlux: sw.xrayFlux, solarWindSpeed: sw.solarWindSpeed },
      score: sw.kpIndex ? Math.min(1, sw.kpIndex / 9) : 0.5,
      timestamp: new Date(sw.timestamp).getTime(),
    })
  }

  return points
}

// ---------------------------------------------------------------------------
// CREP entity → Embedding point conversion
// ---------------------------------------------------------------------------

export interface CREPEntity {
  id: string
  type: string
  title: string
  description: string
  latitude: number
  longitude: number
  timestamp: string
  source: string
  properties: Record<string, unknown>
  relevance: number
}

export function crepEntitiesToEmbeddings(entities: CREPEntity[]): EmbeddingPoint[] {
  return entities.map((e) => {
    const pos = geoToEmbedding(e.latitude, e.longitude)
    const catKey = e.type === "fungal" ? "species" : (e.type in CATEGORY_MAP ? e.type : "crep")
    const cat = CATEGORY_MAP[catKey] || CATEGORY_MAP.crep
    return {
      id: e.id,
      x: pos.x,
      y: pos.y,
      category: cat.index,
      label: e.title,
      description: e.description,
      type: catKey as ResultBucketKey | "crep",
      lat: e.latitude,
      lng: e.longitude,
      metadata: e.properties,
      score: e.relevance,
      timestamp: new Date(e.timestamp).getTime(),
    }
  })
}

// ---------------------------------------------------------------------------
// Compression: points → wire-efficient batch
// ---------------------------------------------------------------------------

/** Compress embedding points into a compact batch for API transfer. */
export function compressEmbeddingBatch(points: EmbeddingPoint[]): EmbeddingBatch {
  const n = points.length
  const coords = new Float32Array(n * 2)
  const cats = new Uint8Array(n)

  for (let i = 0; i < n; i++) {
    coords[i * 2] = points[i].x
    coords[i * 2 + 1] = points[i].y
    cats[i] = points[i].category
  }

  // Encode as base64
  const coordBytes = new Uint8Array(coords.buffer)
  const coordsB64 = typeof Buffer !== "undefined"
    ? Buffer.from(coordBytes).toString("base64")
    : btoa(String.fromCharCode(...coordBytes))
  const catsB64 = typeof Buffer !== "undefined"
    ? Buffer.from(cats).toString("base64")
    : btoa(String.fromCharCode(...cats))

  const rawSize = n * (4 * 2 + 1) // 2 floats + 1 byte per point
  const compressedSize = coordsB64.length + catsB64.length

  return {
    coordinates: coordsB64,
    categories: catsB64,
    points: points.map((p) => ({
      id: p.id,
      label: p.label,
      description: p.description,
      type: p.type,
      score: p.score,
      lat: p.lat,
      lng: p.lng,
      timestamp: p.timestamp,
    })),
    totalCount: n,
    compressionRatio: rawSize > 0 ? rawSize / compressedSize : 1,
  }
}

/** Decompress a batch back into typed arrays for embedding-atlas. */
export function decompressEmbeddingBatch(batch: EmbeddingBatch): {
  x: Float32Array
  y: Float32Array
  category: Uint8Array
  points: EmbeddingBatch["points"]
} {
  // Decode coordinates
  const coordBytes = typeof Buffer !== "undefined"
    ? Buffer.from(batch.coordinates, "base64")
    : Uint8Array.from(atob(batch.coordinates), (c) => c.charCodeAt(0))
  const coords = new Float32Array(
    coordBytes.buffer,
    coordBytes.byteOffset,
    coordBytes.byteLength / 4
  )

  const n = batch.totalCount
  const x = new Float32Array(n)
  const y = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    x[i] = coords[i * 2]
    y[i] = coords[i * 2 + 1]
  }

  // Decode categories
  const catBytes = typeof Buffer !== "undefined"
    ? Buffer.from(batch.categories, "base64")
    : Uint8Array.from(atob(batch.categories), (c) => c.charCodeAt(0))
  const category = new Uint8Array(catBytes.buffer, catBytes.byteOffset, catBytes.byteLength)

  return { x, y, category, points: batch.points }
}

// ---------------------------------------------------------------------------
// Locality-Sensitive Hashing (LSH) for fast similarity search
// ---------------------------------------------------------------------------

/** Simple LSH index for fast approximate nearest-neighbor search in embedding space. */
export class EmbeddingLSH {
  private buckets = new Map<string, EmbeddingPoint[]>()
  private resolution: number

  constructor(resolution = 0.05) {
    this.resolution = resolution
  }

  private hash(x: number, y: number): string {
    const bx = Math.floor(x / this.resolution)
    const by = Math.floor(y / this.resolution)
    return `${bx}:${by}`
  }

  /** Insert a point into the index. */
  insert(point: EmbeddingPoint): void {
    const key = this.hash(point.x, point.y)
    const bucket = this.buckets.get(key)
    if (bucket) {
      bucket.push(point)
    } else {
      this.buckets.set(key, [point])
    }
  }

  /** Insert many points. */
  insertAll(points: EmbeddingPoint[]): void {
    for (const p of points) this.insert(p)
  }

  /** Find nearest neighbors to a query point. */
  query(x: number, y: number, k = 10): EmbeddingPoint[] {
    const bx = Math.floor(x / this.resolution)
    const by = Math.floor(y / this.resolution)

    // Search neighboring buckets
    const candidates: EmbeddingPoint[] = []
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const bucket = this.buckets.get(`${bx + dx}:${by + dy}`)
        if (bucket) candidates.push(...bucket)
      }
    }

    // Sort by distance and return top-k
    return candidates
      .map((p) => ({ point: p, dist: (p.x - x) ** 2 + (p.y - y) ** 2 }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, k)
      .map((r) => r.point)
  }

  /** Text-based search across all points. */
  search(query: string, limit = 20): EmbeddingPoint[] {
    const q = query.toLowerCase()
    const results: Array<{ point: EmbeddingPoint; score: number }> = []

    for (const bucket of this.buckets.values()) {
      for (const p of bucket) {
        let score = 0
        if (p.label.toLowerCase().includes(q)) score += 0.6
        if (p.description.toLowerCase().includes(q)) score += 0.3
        if (p.type.toLowerCase().includes(q)) score += 0.1
        if (score > 0) results.push({ point: p, score: score * p.score })
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((r) => r.point)
  }

  /** Get all points in the index. */
  getAllPoints(): EmbeddingPoint[] {
    const all: EmbeddingPoint[] = []
    for (const bucket of this.buckets.values()) {
      all.push(...bucket)
    }
    return all
  }

  /** Get statistics about the index. */
  getStats(): { totalPoints: number; bucketCount: number; avgBucketSize: number } {
    let total = 0
    for (const bucket of this.buckets.values()) {
      total += bucket.length
    }
    return {
      totalPoints: total,
      bucketCount: this.buckets.size,
      avgBucketSize: this.buckets.size > 0 ? total / this.buckets.size : 0,
    }
  }

  /** Clear the index. */
  clear(): void {
    this.buckets.clear()
  }
}

// ---------------------------------------------------------------------------
// Delta compression for streaming updates
// ---------------------------------------------------------------------------

export interface EmbeddingDelta {
  added: EmbeddingPoint[]
  removed: string[] // IDs
  updated: Array<{ id: string; x?: number; y?: number; score?: number; metadata?: Record<string, unknown> }>
}

/** Compute delta between two point sets. */
export function computeEmbeddingDelta(
  oldPoints: EmbeddingPoint[],
  newPoints: EmbeddingPoint[]
): EmbeddingDelta {
  const oldMap = new Map(oldPoints.map((p) => [p.id, p]))
  const newMap = new Map(newPoints.map((p) => [p.id, p]))

  const added: EmbeddingPoint[] = []
  const removed: string[] = []
  const updated: EmbeddingDelta["updated"] = []

  // Find added and updated
  for (const [id, np] of newMap) {
    const op = oldMap.get(id)
    if (!op) {
      added.push(np)
    } else if (op.x !== np.x || op.y !== np.y || op.score !== np.score) {
      updated.push({ id, x: np.x, y: np.y, score: np.score })
    }
  }

  // Find removed
  for (const id of oldMap.keys()) {
    if (!newMap.has(id)) removed.push(id)
  }

  return { added, removed, updated }
}
